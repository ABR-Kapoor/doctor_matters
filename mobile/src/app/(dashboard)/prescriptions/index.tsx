import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image , RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Edit, Trash, Send, Pill, Clock, FileText, User, ChevronLeft } from 'lucide-react-native';
import { TranslatedText } from '@/components/TranslatedText';
import { MarkdownText } from '@/components/MarkdownText';
import { NameText } from '@/components/NameText';
import { useDoctorPrescriptions, useDoctorIdentity, prescriptionStatsQueryOptions } from '@/hooks/queries/doctorQueries';
import { useDeletePrescription, useSendPrescription } from '@/hooks/mutations/doctorMutations';
import { useRouter, Stack } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import { HeaderTitle } from '@/components/HeaderOptions';
import { useAuth } from '@clerk/expo';
import { globalShowToast as showToast } from '@/lib/NotificationContext';
const Toast = { show: (opts: any) => { showToast && showToast(opts.text1, opts.text2, opts.type || 'info'); } };
import { COLORS, FONTS } from '@/constants/theme';

function AdherenceSummary({ stats }: { stats: any }) {
  if (!stats || !stats.total_doses) return null;

  const total = stats.total_doses || 0;
  const taken = stats.taken || 0;
  const skipped = stats.skipped || 0;
  const missed = stats.not_taken || 0;
  const todayScheduled = stats.today_scheduled || 0;
  const todayTaken = stats.today_taken || 0;
  const percent = total > 0 ? Math.min(100, Math.round((taken / total) * 100)) : 0;

  return (
    <View style={styles.adherenceBox}>
      <View style={styles.adherenceHeaderRow}>
        <Text style={styles.adherenceTitle}><TranslatedText>Patient Adherence</TranslatedText></Text>
        <Text style={styles.adherencePercent}>{percent}%</Text>
      </View>
      <View style={styles.adherenceBarBg}>
        <View style={[styles.adherenceBarFill, { width: `${percent}%` }]} />
      </View>
      <View style={styles.adherenceStatsRow}>
        <Text style={[styles.adherenceStat, { color: COLORS.text }]}>{taken}/{total} <TranslatedText>taken</TranslatedText></Text>
        <Text style={[styles.adherenceStat, { color: COLORS.gray }]}>{skipped} <TranslatedText>skipped</TranslatedText></Text>
        <Text style={[styles.adherenceStat, { color: COLORS.error }]}>{missed} <TranslatedText>missed</TranslatedText></Text>
        {todayScheduled > 0 && (
          <Text style={[styles.adherenceStat, { color: COLORS.text }]}>
            <TranslatedText>Today</TranslatedText> {todayTaken}/{todayScheduled}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function PrescriptionsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { getToken, userId } = useAuth();
  
  const { data: identity } = useDoctorIdentity(getToken);
  const uid = identity?.uid || userId;

  const { data: prescriptions = [], isLoading, isError, error, refetch } = useDoctorPrescriptions(uid, getToken);
  const deletePrescription = useDeletePrescription();
  const sendPrescription = useSendPrescription();

  // The list route has no `status` column — it returns `sent_to_patient`. Partitioning
  // on `p.status` therefore matched nothing at all and the whole screen, including the
  // Send button, rendered empty.
  const draftPrescriptions = prescriptions.filter((p: any) => !p.sent_to_patient);
  const sentPrescriptions = prescriptions.filter((p: any) => !!p.sent_to_patient);

  // One adherence request per sent prescription, the same way the doctor
  // dashboard does it — the card shows how the patient is actually doing
  // before anyone opens the Progress screen.
  const sentStatsQueries = useQueries({
    queries: sentPrescriptions.map((p: any) => prescriptionStatsQueryOptions(p.prescription_id, getToken)),
  });

  const statsByPrescription = new Map<string, any>();
  sentPrescriptions.forEach((p: any, index: number) => {
    const data = sentStatsQueries[index]?.data;
    if (data) statsByPrescription.set(p.prescription_id, data);
  });

  const handleDelete = (id: string) => {
    deletePrescription.mutate({ id: id, token: getToken }, {
      onSuccess: () => Toast.show({ type: 'success', text1: 'Deleted successfully' })
    });
  };

  const handleSend = (id: string) => {
    sendPrescription.mutate({ id: id, token: getToken }, {
      onSuccess: () => Toast.show({ type: 'success', text1: 'Prescription sent to patient' })
    });
  };

  const sendInFlight = sendPrescription.isPending ? sendPrescription.variables?.id : null;


  if (isLoading && !prescriptions.length) return <SafeAreaView style={styles.container} ><View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;

  // A failed request must not masquerade as "no prescriptions yet".
  if (isError) return (
    <SafeAreaView style={styles.container} >
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Could not load prescriptions</Text>
        <Text style={styles.errorText}>{(error as Error)?.message}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { void refetch(); }}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

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
                if (refetch) await refetch();
              } finally {
                setRefreshing(false);
              }
            }} 
            colors={['#048256']} 
            tintColor={'#048256'} 
          />
        }>
        
        {/* Header Section */}
        <Stack.Screen options={{ 
          headerTitle: () => <HeaderTitle title="Prescriptions" subtitle="Create and Manage Prescriptions" />, 
          headerLeft: () => (
            <TouchableOpacity 
              style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginVertical: 6 }} 
              onPress={() => router.push('/')}
            >
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
          ), 
          headerRight: () => (
            <TouchableOpacity 
              style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }} 
              onPress={() => router.push('/prescriptions/new')}
            >
              <Plus size={20} color="#374151" />
            </TouchableOpacity>
          ) 
        }} />

        {/* Draft Section */}
        {draftPrescriptions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Drafts ({draftPrescriptions.length})</Text>
            </View>
            <View style={styles.list}>
              {draftPrescriptions.map((prescription: any) => (
                <View key={prescription.prescription_id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      {prescription.patients?.users?.profileImageUrl || prescription.patients?.users?.profile_image_url ? <Image source={{ uri: prescription.patients?.users?.profileImageUrl || prescription.patients?.users?.profile_image_url }} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <User size={22} color={COLORS.primary} />}
                    </View>
                    <View style={styles.cardInfo}>
                      <NameText name={prescription.patients?.users?.name} fallback="Patient" />
                      <MarkdownText style={styles.timeText}>{prescription.diagnosis || 'No diagnosis recorded'}</MarkdownText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: COLORS.tertiary }]}>
                      <Text style={[styles.statusText, { color: COLORS.text }]}>DRAFT</Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity style={[styles.actionBtn, styles.btnOutline]} onPress={() => router.push(`/prescriptions/${prescription.prescription_id}/edit`)}>
                      <Edit size={14} color={COLORS.text} />
                      <Text style={styles.btnOutlineText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnPrimary, sendInFlight === prescription.prescription_id && styles.btnDisabled]}
                      onPress={() => handleSend(prescription.prescription_id)}
                      disabled={sendInFlight === prescription.prescription_id}
                    >
                      {sendInFlight === prescription.prescription_id ? (
                        <ActivityIndicator size="small" color={COLORS.text} />
                      ) : (
                        <Send size={14} color={COLORS.text} />
                      )}
                      <Text style={styles.btnPrimaryText}>
                        {sendInFlight === prescription.prescription_id ? 'Sending...' : 'Send'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDelete(prescription.prescription_id)}>
                      <Trash size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sent Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Pill size={18} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Sent Prescriptions ({sentPrescriptions.length})</Text>
          </View>

          {sentPrescriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Pill size={48} color={COLORS.gray} />
              <Text style={styles.emptyText}><TranslatedText>No sent prescriptions yet</TranslatedText></Text>
            </View>
          ) : (
            <View style={styles.list}>
              {sentPrescriptions.map((prescription: any) => (
                <View
                  key={prescription.prescription_id}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      {prescription.patients?.users?.profileImageUrl || prescription.patients?.users?.profile_image_url ? <Image source={{ uri: prescription.patients?.users?.profileImageUrl || prescription.patients?.users?.profile_image_url }} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <User size={22} color={COLORS.primary} />}
                    </View>
                    <View style={styles.cardInfo}>
                      <NameText name={prescription.patients?.users?.name} fallback="Patient" />
                      <MarkdownText style={styles.timeText}>{prescription.diagnosis || 'No diagnosis recorded'}</MarkdownText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: COLORS.secondary }]}>
                      <Text style={[styles.statusText, { color: COLORS.text }]}>SENT</Text>
                    </View>
                  </View>

                  <View style={styles.complaintBox}>
                    <Text style={styles.complaintLabel}>Prescription ID</Text>
                    <Text style={styles.complaintText}>#{prescription.prescription_id.slice(-8).toUpperCase()} • Sent {new Date(prescription.created_at).toLocaleDateString()}</Text>
                  </View>

                  <AdherenceSummary stats={statsByPrescription.get(prescription.prescription_id)} />


                  <View style={styles.actions}>
                    <TouchableOpacity style={[styles.actionBtn, styles.btnOutline]} onPress={() => router.push(`/prescriptions/${prescription.prescription_id}/edit`)}>
                      <Edit size={14} color={COLORS.text} />
                      <Text style={styles.btnOutlineText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnPrimary]}
                      onPress={() => router.push(`/prescriptions/${prescription.prescription_id}/progress`)}
                    >
                      <FileText size={14} color={COLORS.text} />
                      <Text style={styles.btnPrimaryText}>Progress</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleDelete(prescription.prescription_id)}>
                      <Trash size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.badge, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 12 },
  badgeText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.badgeText, marginLeft: 6 },
  title: { fontSize: 24, fontFamily: FONTS.serif,  color: COLORS.text },
  titleHighlight: { fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  subtitle: { fontSize: 14, fontFamily: FONTS.serif,  color: COLORS.gray, marginTop: 4 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginTop: 4, justifyContent: 'center', minHeight: 48 },
  headerBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 15, marginLeft: 6 },
  
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.serif,  color: COLORS.text, marginLeft: 8 },
  
  emptyState: { padding: 40, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 24, marginTop: 4 },
  emptyText: { marginTop: 16, color: COLORS.gray, fontFamily: FONTS.medium, fontWeight: '500' },
  errorTitle: { fontSize: 17, fontFamily: FONTS.serif,  color: COLORS.text, textAlign: 'center' },
  errorText: { marginTop: 8, color: COLORS.gray, fontFamily: FONTS.regular, fontWeight: '400', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  retryText: { color: COLORS.white, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 13 },
  
  list: { gap: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: COLORS.black, },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.badge, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  timeText: { fontSize: 13, color: COLORS.gray, fontFamily: FONTS.medium, fontWeight: '500', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', textTransform: 'uppercase' },
  
  complaintBox: { backgroundColor: COLORS.badge, padding: 8, borderRadius: 12, marginBottom: 16 },
  complaintLabel: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray, marginBottom: 4 },
  complaintText: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text },

  adherenceBox: { backgroundColor: COLORS.badge, padding: 10, borderRadius: 12, marginBottom: 16, },
  adherenceHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  adherenceTitle: { fontSize: 12, fontFamily: FONTS.serif,  color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  adherencePercent: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  adherenceBarBg: { width: '100%', height: 6, backgroundColor: '#cbd5e1', borderRadius: 3, marginBottom: 10 },
  adherenceBarFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  adherenceStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  adherenceStat: { fontSize: 12, fontFamily: FONTS.medium, fontWeight: '600', color: COLORS.text },
  
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, minHeight: 36, gap: 4 },
  btnOutline: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#cbd5e1' },
  btnOutlineText: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 13 },
  btnPrimary: { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 36 },
  btnPrimaryText: { color: COLORS.white, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.6 },
  actionBtnDanger: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
});






