import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator , RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { Banknote, CheckCircle2, ShieldCheck, IndianRupee, TrendingUp, Clock, AlertCircle, CreditCard, Landmark, Smartphone, ChevronLeft } from 'lucide-react-native';
import { TranslatedText } from '@/components/TranslatedText';
import { useDoctorIdentity, useDoctorFinance } from '@/hooks/queries/doctorQueries';
import { useSaveBankDetails } from '@/hooks/mutations/doctorMutations';
import { globalShowToast as showToast } from '@/lib/NotificationContext';
const Toast = { show: (opts: any) => { showToast && showToast(opts.text1, opts.text2, opts.type || 'info'); } };
import { useRouter, Tabs } from 'expo-router';
import { HeaderTitle } from '@/components/HeaderOptions';
import { COLORS, FONTS } from '@/constants/theme';

export default function FinanceScreen() {
  const router = useRouter();
  const [savingBank, setSavingBank] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi'>('bank');
  const [bankForm, setBankForm] = useState({
    accountHolderName: '', accountNumber: '', ifscCode: '',
    bankName: '', accountType: 'savings', branchName: '', payoutUpiId: '',
  });

  const { getToken, userId } = useAuth();
  const { data: identity } = useDoctorIdentity(getToken);
  const uid = identity?.uid || userId;
  const { data: finance, isLoading, isError, error, refetch: refetchFinance } = useDoctorFinance(uid, getToken);
  const saveBankMutation = useSaveBankDetails();

  if (isLoading) return <SafeAreaView style={styles.container} edges={['left', 'right']}><View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;

  // Without this the old `isLoading || !finance` guard span forever on error.
  if (isError || !finance) return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.center}>
        <Text style={styles.centerTitle}>Could not load payouts</Text>
        <Text style={styles.centerText}>{isError && error ? (error as Error).message : 'Please try again.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const { isProfileComplete, isVerified, bankDetailsAdded, totalEarnings, pendingEarnings, earnings } = finance;

  if (!isProfileComplete) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <Tabs.Screen options={{ 
          headerTitle: () => <HeaderTitle title="Finance" subtitle="Your Earnings & Payouts" />,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.push('/');
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 14,
                marginVertical: 6,
              }}
            >
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
          ),
        }} />
        <View style={styles.centerContainer}>
          <View style={styles.centerCard}>
            <View style={styles.alertIconBg}>
              <AlertCircle size={44} color={COLORS.primary} />
            </View>
            <Text style={styles.title}><TranslatedText>Complete Your Profile First</TranslatedText></Text>
            <Text style={styles.desc}>
              <TranslatedText>Your doctor profile must be 100% complete before you can set up payouts and view earnings.</TranslatedText>
            </Text>
            <TouchableOpacity style={styles.completeProfileBtn} onPress={() => router.push('/profile')} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}><TranslatedText>Complete Profile</TranslatedText></Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleBankSubmit = async () => {
    setSavingBank(true);
    try {
      const token = await getToken();
      await saveBankMutation.mutateAsync({ uid, payoutMethod, bankDetails: bankForm, token });
      Toast.show({ type: 'success', text1: 'Payout details saved' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Failed to save bank details' });
    } finally {
      setSavingBank(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={async () => {
              setRefreshing(true);
              try {
                if (refetchFinance) await refetchFinance();
              } finally {
                setRefreshing(false);
              }
            }} 
            colors={['#048256']} 
            tintColor={'#048256'} 
          />
        }>
        <Tabs.Screen options={{ 
          headerTitle: () => <HeaderTitle title="Finance" subtitle="Your Earnings & Payouts" />,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.push('/');
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 14,
                marginVertical: 6,
              }}
            >
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
          ),
        }} />


        {isVerified && bankDetailsAdded && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.iconBox, { backgroundColor: COLORS.secondary }]}><IndianRupee size={24} color={COLORS.secondary} /></View>
              <Text style={styles.statLabel}><TranslatedText>Total Earned</TranslatedText></Text>
              <Text style={styles.statValue}>₹{totalEarnings}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.iconBox, { backgroundColor: COLORS.tertiary }]}><Clock size={24} color="#d97706" /></View>
              <Text style={styles.statLabel}><TranslatedText>Pending</TranslatedText></Text>
              <Text style={styles.statValue}>₹{pendingEarnings}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.iconBox, { backgroundColor: COLORS.surface }]}><TrendingUp size={24} color={COLORS.text} /></View>
              <Text style={styles.statLabel}><TranslatedText>Appointments</TranslatedText></Text>
              <Text style={styles.statValue}>{earnings.length}</Text>
            </View>
          </View>
        )}

        {!bankDetailsAdded ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: COLORS.surface }]}><CreditCard size={20} color={COLORS.text} /></View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.cardTitle}><TranslatedText>Add Payout Details</TranslatedText></Text>
                <Text style={styles.cardDesc}><TranslatedText>Required to receive payments</TranslatedText></Text>
              </View>
            </View>

            <View style={styles.toggleRow}>
              <TouchableOpacity onPress={() => setPayoutMethod('bank')} style={[styles.toggleBtn, payoutMethod === 'bank' && styles.toggleBtnActive]}>
                <Landmark size={16} color={payoutMethod === 'bank' ? COLORS.text : COLORS.gray} />
                <Text style={[styles.toggleText, payoutMethod === 'bank' && styles.toggleTextActive]}>Bank Account</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPayoutMethod('upi')} style={[styles.toggleBtn, payoutMethod === 'upi' && styles.toggleBtnActive]}>
                <Smartphone size={16} color={payoutMethod === 'upi' ? COLORS.text : COLORS.gray} />
                <Text style={[styles.toggleText, payoutMethod === 'upi' && styles.toggleTextActive]}>UPI</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Account Holder Name</Text>
              <TextInput style={styles.input} value={bankForm.accountHolderName} onChangeText={t => setBankForm({ ...bankForm, accountHolderName: t })} placeholderTextColor={COLORS.gray} />
            </View>

            {payoutMethod === 'bank' ? (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Account Number</Text>
                  <TextInput style={styles.input} value={bankForm.accountNumber} onChangeText={t => setBankForm({ ...bankForm, accountNumber: t })} placeholderTextColor={COLORS.gray} />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>IFSC Code</Text>
                  <TextInput style={styles.input} value={bankForm.ifscCode} onChangeText={t => setBankForm({ ...bankForm, ifscCode: t })} placeholderTextColor={COLORS.gray} />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Bank Name</Text>
                  <TextInput style={styles.input} value={bankForm.bankName} onChangeText={t => setBankForm({ ...bankForm, bankName: t })} placeholderTextColor={COLORS.gray} />
                </View>
              </>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.label}>UPI ID</Text>
                <TextInput style={styles.input} value={bankForm.payoutUpiId} onChangeText={t => setBankForm({ ...bankForm, payoutUpiId: t })} placeholder="name@upi" placeholderTextColor={COLORS.gray} />
              </View>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleBankSubmit} disabled={savingBank}>
              {savingBank ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.primaryBtnText}><TranslatedText>Save Payout Details</TranslatedText></Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: COLORS.primary, borderColor: '#a7f3d0' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <ShieldCheck size={24} color="#059669" />
              <Text style={[styles.cardTitle, { color: '#065f46', marginLeft: 8 }]}>Payout Details Saved</Text>
            </View>
            <Text style={{ color: COLORS.secondary, fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500', lineHeight: 20 }}>
              {isVerified ? 'Your profile is verified. You will receive payments shortly after consultations.' : 'Your banking details are saved. Waiting for profile verification before processing payments.'}
            </Text>
          </View>
        )}

        {isVerified && earnings.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { marginBottom: 20 }]}>Transaction History</Text>
            {earnings.map((record: any, index: number) => (
              <View key={record.appointment_id} style={[styles.historyRow, index === earnings.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{record.patient_name}</Text>
                  <Text style={styles.historyDate}>{new Date(record.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.historyAmount}>₹{record.amount}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: record.transfer_status === 'success' ? COLORS.successBg : COLORS.notes }]}>
                     <Text style={[styles.historyStatus, { color: record.transfer_status === 'success' ? COLORS.successText : COLORS.notesText }]}>{record.transfer_status === 'success' ? 'PAID' : record.status?.toUpperCase() || 'PENDING'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 130, // Shifts content slightly upwards above optical center
  },
  centerCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  alertIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EBF2FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  completeProfileBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  centerTitle: { fontSize: 17, fontFamily: FONTS.serif,  color: COLORS.text, textAlign: 'center' },
  centerText: { fontSize: 13, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.gray, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  retryText: { color: COLORS.white, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 13 },
  
  header: { marginBottom: 32 },
  headline: { fontSize: 28, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },
  title: { fontSize: 21, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  desc: { fontSize: 14.5, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, textAlign: 'center', marginTop: 10, lineHeight: 21, paddingHorizontal: 8 },
  
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 8, borderRadius: 12, shadowColor: COLORS.black, alignItems: 'flex-start' },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 12, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray },
  statValue: { fontSize: 20, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: COLORS.black, marginBottom: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontFamily: FONTS.serif,  color: COLORS.text },
  cardDesc: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray },
  
  toggleRow: { flexDirection: 'row', backgroundColor: COLORS.surface, padding: 4, borderRadius: 20, marginBottom: 24 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  toggleBtnActive: { backgroundColor: COLORS.white, shadowColor: COLORS.black, },
  toggleText: { fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray },
  toggleTextActive: { color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700' },
  
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray, marginBottom: 8 },
  input: { borderRadius: 16, padding: 8, backgroundColor: COLORS.white, color: COLORS.text, fontFamily: FONTS.medium, fontWeight: '500', fontSize: 14 },
  
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: COLORS.black, },
  primaryBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 16 },
  
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surface },
  historyName: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },
  historyDate: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, marginTop: 4 },
  historyAmount: { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  historyStatus: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: 1 },
});
