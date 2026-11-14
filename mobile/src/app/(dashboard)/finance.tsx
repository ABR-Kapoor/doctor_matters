import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, RefreshControl, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { Banknote, ShieldCheck, IndianRupee, Clock, AlertCircle, CreditCard, Landmark, Smartphone, ChevronLeft, ArrowDownLeft, ArrowUpRight, Wallet, X, Search, RotateCcw, Filter, Pencil, ChevronRight } from 'lucide-react-native';
import { TranslatedText } from '@/components/TranslatedText';
import { useDoctorIdentity, useDoctorFinance, useDoctorWallet } from '@/hooks/queries/doctorQueries';
import { useSaveBankDetails, useRequestPayout } from '@/hooks/mutations/doctorMutations';
import { globalShowToast as showToast } from '@/lib/NotificationContext';
import { useRouter, Tabs } from 'expo-router';
import { HeaderTitle } from '@/components/HeaderOptions';
import { COLORS, FONTS } from '@/constants/theme';

const Toast = { show: (opts: any) => { showToast && showToast(opts.text1, opts.text2, opts.type || 'info'); } };

const CATEGORY_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  refund: 'Refund',
  payout: 'Payout',
  payout_fee: 'Payout fee',
  adjustment: 'Adjustment',
};

const DATE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
];

function formatINR(value: number): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function rangeToDates(range: string): { from: string; to: string } {
  if (!range || range === 'all') return { from: '', to: '' };
  const now = new Date();
  const from = new Date(now);
  if (range === '7d') from.setDate(now.getDate() - 7);
  else if (range === '30d') from.setDate(now.getDate() - 30);
  else if (range === '90d') from.setDate(now.getDate() - 90);
  else if (range === 'year') from.setMonth(0, 1);
  const iso = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return { from: iso(from), to: iso(now) };
}

function statusColor(status: string) {
  if (status === 'completed') return { bg: COLORS.successBg, text: COLORS.successText };
  if (status === 'pending') return { bg: COLORS.notes, text: COLORS.notesText };
  return { bg: '#dbeafe', text: '#1d4ed8' };
}

export default function FinanceScreen() {
  const router = useRouter();
  const [savingBank, setSavingBank] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi'>('bank');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountHolderName: '', accountNumber: '', ifscCode: '',
    bankName: '', accountType: 'savings', branchName: '', payoutUpiId: '',
  });

  const [walletDirection, setWalletDirection] = useState('');
  const [walletCategory, setWalletCategory] = useState('');
  const [walletStatus, setWalletStatus] = useState('');
  const [walletFrom, setWalletFrom] = useState('');
  const [walletTo, setWalletTo] = useState('');
  const [walletSearch, setWalletSearch] = useState('');
  const [walletRange, setWalletRange] = useState('all');
  const [walletPage, setWalletPage] = useState(1);

  const [filterOpen, setFilterOpen] = useState(false);
  const [draftDirection, setDraftDirection] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [draftRange, setDraftRange] = useState('all');

  const { getToken, userId } = useAuth();
  const { data: identity } = useDoctorIdentity(getToken);
  const uid = identity?.uid || userId;
  const { data: finance, isLoading, isError, error, refetch: refetchFinance } = useDoctorFinance(uid, getToken);
  const {
    data: walletData,
    isLoading: walletLoading,
    isFetching: walletFetching,
    error: walletError,
    refetch: refetchWallet,
  } = useDoctorWallet(getToken, {
    direction: walletDirection || undefined,
    category: walletCategory || undefined,
    status: walletStatus || undefined,
    search: walletSearch || undefined,
    from: walletFrom || undefined,
    to: walletTo || undefined,
    page: walletPage,
    limit: 20,
  });
  const saveBankMutation = useSaveBankDetails();
  const requestPayoutMutation = useRequestPayout();

  if (isLoading) return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} animated />
      <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
    </SafeAreaView>
  );

  if (isError || !finance) return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} animated />
      <View style={styles.center}>
        <Text style={styles.centerTitle}>Could not load wallet</Text>
        <Text style={styles.centerText}>{isError && error ? (error as Error).message : 'Please try again.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const { isProfileComplete, isVerified, bankDetailsAdded } = finance;

  if (!isProfileComplete) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} animated />
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.push('/');
            }}
            style={styles.headerBack}
          >
            <ChevronLeft size={20} color="#374151" />
          </TouchableOpacity>
          <View style={styles.navHeaderCenter}>
            <Text style={styles.navHeaderTitle}>Wallet</Text>
            <Text style={styles.navHeaderSubtitle}>Earnings, payouts & history</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
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

  const wallet = walletData?.wallet;
  const walletTransactions = walletData?.transactions || [];
  const payoutRequests = walletData?.payouts || [];
  const walletPagination = walletData?.pagination;
  const payoutFee = walletData?.config?.payoutFee ?? 9;
  const minPayoutAmount = walletData?.config?.minPayoutAmount ?? 100;
  const payoutReady = walletData?.payoutProfile?.ready ?? false;
  const savedPayoutMethod = walletData?.payoutProfile?.method || finance.payoutMethod || 'bank';
  const hasOpenPayout = payoutRequests.some(
    (payout: any) => payout.status === 'pending' || payout.status === 'processing',
  );

  const savedBank = finance.bankForm;
  const maskedAccount = savedBank.accountNumber ? `•••• ${savedBank.accountNumber.slice(-4)}` : null;
  const activeFilterCount = [walletDirection, walletCategory, walletStatus, walletSearch, walletRange !== 'all' ? walletRange : '']
    .filter(Boolean).length;

  const activeTab =
    !walletDirection && !walletCategory && !walletStatus ? 'all'
      : walletDirection === 'credit' && !walletCategory && !walletStatus ? 'credits'
        : walletDirection === 'debit' && !walletCategory && !walletStatus ? 'debits'
          : walletCategory === 'refund' && !walletStatus ? 'refunds'
            : walletCategory === 'payout' && !walletStatus ? 'payouts'
              : 'custom';

  const selectTab = (tab: string) => {
    setWalletPage(1);
    setWalletStatus('');
    if (tab === 'all') {
      setWalletDirection('');
      setWalletCategory('');
    } else if (tab === 'credits') {
      setWalletDirection('credit');
      setWalletCategory('');
    } else if (tab === 'debits') {
      setWalletDirection('debit');
      setWalletCategory('');
    } else if (tab === 'refunds') {
      setWalletDirection('');
      setWalletCategory('refund');
    } else if (tab === 'payouts') {
      setWalletDirection('');
      setWalletCategory('payout');
    }
  };

  const openFilters = () => {
    setDraftDirection(walletDirection);
    setDraftCategory(walletCategory);
    setDraftStatus(walletStatus);
    setDraftSearch(walletSearch);
    setDraftRange(walletRange);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    const dates = rangeToDates(draftRange);
    setWalletDirection(draftDirection);
    setWalletCategory(draftCategory);
    setWalletStatus(draftStatus);
    setWalletSearch(draftSearch.trim());
    setWalletRange(draftRange);
    setWalletFrom(dates.from);
    setWalletTo(dates.to);
    setWalletPage(1);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftDirection('');
    setDraftCategory('');
    setDraftStatus('');
    setDraftSearch('');
    setDraftRange('all');
    setWalletDirection('');
    setWalletCategory('');
    setWalletStatus('');
    setWalletSearch('');
    setWalletRange('all');
    setWalletFrom('');
    setWalletTo('');
    setWalletPage(1);
  };

  const handleBankSubmit = async () => {
    setSavingBank(true);
    try {
      const token = await getToken();
      await saveBankMutation.mutateAsync({ uid, payoutMethod, bankDetails: bankForm, token });
      Toast.show({ type: 'success', text1: 'Payout details saved' });
      await refetchWallet();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Failed to save bank details' });
    } finally {
      setSavingBank(false);
    }
  };

  const handlePayoutRequest = async () => {
    const amount = Number(payoutAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid payout amount' });
      return;
    }
    try {
      const result = await requestPayoutMutation.mutateAsync({ token: getToken, amount });
      Toast.show({ type: 'success', text1: result.message || 'Payout request submitted' });
      setPayoutAmount('');
      setShowPayoutForm(false);
      await refetchWallet();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Failed to request payout' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} animated />
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push('/');
          }}
          style={styles.headerBack}
        >
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>
        <View style={styles.navHeaderCenter}>
          <Text style={styles.navHeaderTitle}>Wallet</Text>
          <Text style={styles.navHeaderSubtitle}>Earnings, payouts & history</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                if (refetchFinance) await refetchFinance();
                if (refetchWallet) await refetchWallet();
              } finally {
                setRefreshing(false);
              }
            }}
            colors={['#048256']}
            tintColor={'#048256'}
          />
        }>
        {walletError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText} numberOfLines={2}>Could not load wallet: {(walletError as Error).message}</Text>
            <TouchableOpacity onPress={() => refetchWallet()} style={styles.retrySmall}>
              <Text style={styles.retrySmallText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}><Wallet size={22} color="#16a34a" /></View>
            <Text style={[styles.statLabel, { color: '#15803d' }]}>Available</Text>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>{formatINR(wallet?.availableBalance ?? 0)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
            <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}><Clock size={22} color="#d97706" /></View>
            <Text style={[styles.statLabel, { color: '#b45309' }]}>On hold</Text>
            <Text style={[styles.statValue, { color: '#d97706' }]}>{formatINR(wallet?.heldAmount ?? 0)}</Text>
          </View>
        </View>

        <View style={styles.singleLineStatsRow}>
          <View style={[styles.singleLineCard, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <View style={styles.singleLineCardHeader}>
              <View style={[styles.singleLineIconBox, { backgroundColor: '#d1fae5' }]}>
                <ArrowDownLeft size={13} color="#059669" />
              </View>
              <Text style={[styles.singleLineLabel, { color: '#047857' }]} numberOfLines={1}>Credited</Text>
            </View>
            <Text style={[styles.singleLineValue, { color: '#059669' }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatINR(wallet?.lifetimeCredited ?? 0)}
            </Text>
          </View>

          <View style={[styles.singleLineCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <View style={styles.singleLineCardHeader}>
              <View style={[styles.singleLineIconBox, { backgroundColor: '#fee2e2' }]}>
                <ArrowUpRight size={13} color="#dc2626" />
              </View>
              <Text style={[styles.singleLineLabel, { color: '#b91c1c' }]} numberOfLines={1}>Debited</Text>
            </View>
            <Text style={[styles.singleLineValue, { color: '#dc2626' }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatINR(wallet?.lifetimeDebited ?? 0)}
            </Text>
          </View>

          <View style={[styles.singleLineCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <View style={styles.singleLineCardHeader}>
              <View style={[styles.singleLineIconBox, { backgroundColor: '#dbeafe' }]}>
                <Banknote size={13} color="#2563eb" />
              </View>
              <Text style={[styles.singleLineLabel, { color: '#1d4ed8' }]} numberOfLines={1}>Withdrawn</Text>
            </View>
            <Text style={[styles.singleLineValue, { color: '#1e40af' }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatINR(wallet?.lifetimeWithdrawn ?? 0)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.surface }]}><CreditCard size={20} color={COLORS.text} /></View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.cardTitle}>Payout Account</Text>
              <Text style={styles.cardDesc}>{bankDetailsAdded ? 'Saved payout destination' : 'Required to receive payments'}</Text>
            </View>
            {bankDetailsAdded && (
              <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/profile?step=finance')}>
                <Pencil size={14} color={COLORS.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {!bankDetailsAdded ? (
            <>
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
            </>
          ) : (
            <View style={[styles.card, styles.accountCard]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 }}>
                  {savedPayoutMethod === 'upi' ? <Smartphone size={14} color={COLORS.primary} /> : <Landmark size={14} color={COLORS.primary} />}
                  <Text style={{ fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary }}>{savedPayoutMethod === 'upi' ? 'UPI' : 'Bank'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: payoutReady ? COLORS.white : '#fef3c7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <ShieldCheck size={14} color={payoutReady ? '#059669' : '#b45309'} />
                  <Text style={{ fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: payoutReady ? '#059669' : '#b45309' }}>{payoutReady ? 'Ready' : 'Setup incomplete'}</Text>
                </View>
              </View>
              <Text style={styles.accountName}>{savedBank.accountHolderName || 'Account holder'}</Text>
              {savedPayoutMethod === 'upi' ? (
                <Text style={styles.accountMeta}>{savedBank.payoutUpiId || 'UPI ID missing'}</Text>
              ) : (
                <>
                  <Text style={styles.accountMeta}>{savedBank.bankName || 'Bank'}{maskedAccount ? ` · ${maskedAccount}` : ''}</Text>
                  <Text style={styles.accountMetaSmall}>{savedBank.ifscCode || 'IFSC missing'}{savedBank.branchName ? ` · ${savedBank.branchName}` : ''}</Text>
                </>
              )}
              {!isVerified && (
                <Text style={styles.warnText}>Your profile is under review. Payouts unlock after verification.</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.successBg }]}><Banknote size={20} color="#059669" /></View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.cardTitle}>Withdraw Earnings</Text>
              <Text style={styles.cardDesc}>{formatINR(wallet?.availableBalance ?? 0)} available · Fee {formatINR(payoutFee)} · Min {formatINR(minPayoutAmount)}</Text>
            </View>
          </View>

          {!payoutReady && (
            <Text style={styles.warnText}>Add your bank or UPI payout details to withdraw earnings.</Text>
          )}
          {payoutReady && hasOpenPayout && (
            <Text style={[styles.warnText, { color: COLORS.primary }]}>A payout request is already in progress.</Text>
          )}

          {!showPayoutForm ? (
            <TouchableOpacity
              style={[styles.primaryBtn, (!payoutReady || hasOpenPayout || (wallet?.availableBalance ?? 0) < minPayoutAmount) && { opacity: 0.4 }]}
              onPress={() => setShowPayoutForm(true)}
              disabled={!payoutReady || hasOpenPayout || (wallet?.availableBalance ?? 0) < minPayoutAmount}
            >
              <Text style={styles.primaryBtnText}>Request Payout</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.label}>Amount (INR)</Text>
              <TextInput
                style={styles.input}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="decimal-pad"
                placeholder={`Min ${formatINR(minPayoutAmount)}`}
                placeholderTextColor={COLORS.gray}
              />
              {Number(payoutAmount) > payoutFee && (
                <Text style={styles.accountMetaSmall}>You will receive {formatINR(Number(payoutAmount) - payoutFee)} after the fee.</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0, backgroundColor: '#059669' }]}
                  onPress={handlePayoutRequest}
                  disabled={requestPayoutMutation.isPending}
                >
                  {requestPayoutMutation.isPending
                    ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={styles.primaryBtnText}>Submit</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0, backgroundColor: COLORS.surface }]}
                  onPress={() => { setShowPayoutForm(false); setPayoutAmount(''); }}
                >
                  <Text style={[styles.primaryBtnText, { color: COLORS.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.cardTitle}>Transactions</Text>
              {walletFetching && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>
            <TouchableOpacity style={styles.filterBtn} onPress={openFilters}>
              <Filter size={14} color={COLORS.primary} />
              <Text style={styles.filterBtnText}>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            {[
              { key: 'all', label: 'All' },
              { key: 'credits', label: 'Credits' },
              { key: 'debits', label: 'Debits' },
              { key: 'refunds', label: 'Refunds' },
              { key: 'payouts', label: 'Payouts' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.chip, activeTab === tab.key && styles.chipActive]}
                onPress={() => selectTab(tab.key)}
              >
                <Text style={[styles.chipText, activeTab === tab.key && styles.chipTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeFilterCount > 0 && (
            <View style={styles.activeFiltersRow}>
              <Text style={styles.activeFiltersText}>{activeFilterCount} filter(s) active</Text>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={resetFilters}>
                <RotateCcw size={12} color={COLORS.primary} />
                <Text style={styles.clearText}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}

          {walletLoading && !walletData ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
          ) : walletTransactions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <IndianRupee size={32} color={COLORS.gray} />
              <Text style={[styles.accountMeta, { marginTop: 8 }]}>No transactions match these filters.</Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity onPress={resetFilters} style={{ marginTop: 8 }}>
                  <Text style={styles.clearText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            walletTransactions.map((txn: any, index: number) => {
              const colors = statusColor(txn.status);
              return (
                <View key={txn.id} style={[styles.historyRow, index === walletTransactions.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.txnIcon, { backgroundColor: txn.direction === 'credit' ? COLORS.successBg : COLORS.notes }]}>
                    {txn.direction === 'credit'
                      ? <ArrowDownLeft size={18} color="#059669" />
                      : <ArrowUpRight size={18} color="#d97706" />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.historyName} numberOfLines={1}>{txn.description || CATEGORY_LABELS[txn.category] || txn.category}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(txn.createdAt).toLocaleDateString()}{txn.patientName ? ` · ${txn.patientName}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{CATEGORY_LABELS[txn.category] || txn.category}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: colors.bg, marginTop: 0 }]}>
                        <Text style={[styles.historyStatus, { color: colors.text }]}>{txn.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.historyAmount, { color: txn.direction === 'credit' ? '#059669' : COLORS.text }]}>
                    {txn.direction === 'credit' ? '+' : '−'}{formatINR(txn.amount)}
                  </Text>
                </View>
              );
            })
          )}

          {(walletPagination?.totalPages ?? 1) > 1 && (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[styles.pageBtn, walletPage <= 1 && { opacity: 0.4 }]}
                onPress={() => setWalletPage(p => Math.max(1, p - 1))}
                disabled={walletPage <= 1}
              >
                <ChevronLeft size={16} color={COLORS.primary} />
                <Text style={styles.pageBtnText}>Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>{walletPagination?.page} / {walletPagination?.totalPages} · {walletPagination?.total} txns</Text>
              <TouchableOpacity
                style={[styles.pageBtn, !walletPagination?.hasMore && { opacity: 0.4 }]}
                onPress={() => setWalletPage(p => p + 1)}
                disabled={!walletPagination?.hasMore}
              >
                <Text style={styles.pageBtnText}>Next</Text>
                <ChevronRight size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {payoutRequests.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Payout Requests</Text>
            {payoutRequests.map((payout: any) => {
              const colors = payout.status === 'processed' ? { bg: COLORS.successBg, text: COLORS.successText }
                : payout.status === 'pending' || payout.status === 'processing' ? { bg: COLORS.notes, text: COLORS.notesText }
                  : { bg: '#fee2e2', text: '#dc2626' };
              return (
                <View key={payout.id} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName}>{formatINR(payout.amount)}</Text>
                    <Text style={styles.historyDate}>
                      Fee {formatINR(payout.payoutFeeAmount)} · Net {formatINR(payout.netAmount)} · {new Date(payout.requestedAt).toLocaleDateString()}
                    </Text>
                    {payout.failureReason ? (
                      <Text style={[styles.historyDate, { color: '#dc2626' }]}>{payout.failureReason}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg, marginTop: 0 }]}>
                    <Text style={[styles.historyStatus, { color: colors.text }]}>{payout.status.toUpperCase()}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setFilterOpen(false)} 
          />
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter transactions</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)} style={styles.modalClose}>
                <X size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Search</Text>
              <View style={styles.searchBox}>
                <Search size={16} color={COLORS.gray} />
                <TextInput
                  style={styles.searchInput}
                  value={draftSearch}
                  onChangeText={setDraftSearch}
                  placeholder="Patient, note or reference"
                  placeholderTextColor={COLORS.gray}
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>Type</Text>
              <View style={styles.chipRow}>
                {[
                  { value: '', label: 'All' },
                  { value: 'credit', label: 'Credits' },
                  { value: 'debit', label: 'Debits' },
                ].map(item => (
                  <TouchableOpacity key={`dir-${item.value || 'all'}`} style={[styles.chip, draftDirection === item.value && styles.chipActive]} onPress={() => setDraftDirection(item.value)}>
                    <Text style={[styles.chipText, draftDirection === item.value && styles.chipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Category</Text>
              <View style={styles.chipRow}>
                {[
                  { value: '', label: 'All' },
                  { value: 'consultation', label: 'Consultation' },
                  { value: 'refund', label: 'Refund' },
                  { value: 'payout', label: 'Payout' },
                  { value: 'payout_fee', label: 'Payout fee' },
                  { value: 'adjustment', label: 'Adjustment' },
                ].map(item => (
                  <TouchableOpacity key={`cat-${item.value || 'all'}`} style={[styles.chip, draftCategory === item.value && styles.chipActive]} onPress={() => setDraftCategory(item.value)}>
                    <Text style={[styles.chipText, draftCategory === item.value && styles.chipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Status</Text>
              <View style={styles.chipRow}>
                {[
                  { value: '', label: 'Any' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'reversed', label: 'Reversed' },
                ].map(item => (
                  <TouchableOpacity key={`status-${item.value || 'any'}`} style={[styles.chip, draftStatus === item.value && styles.chipActive]} onPress={() => setDraftStatus(item.value)}>
                    <Text style={[styles.chipText, draftStatus === item.value && styles.chipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Date range</Text>
              <View style={styles.chipRow}>
                {DATE_OPTIONS.map(item => (
                  <TouchableOpacity key={`range-${item.value}`} style={[styles.chip, draftRange === item.value && styles.chipActive]} onPress={() => setDraftRange(item.value)}>
                    <Text style={[styles.chipText, draftRange === item.value && styles.chipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.surface }]} onPress={resetFilters}>
                <RotateCcw size={16} color={COLORS.text} />
                <Text style={[styles.modalBtnText, { color: COLORS.text }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={applyFilters}>
                <Text style={[styles.modalBtnText, { color: COLORS.white }]}>Apply filters</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 130 },
  centerCard: { width: '100%', maxWidth: 340, alignItems: 'center', justifyContent: 'center', marginTop: -20 },
  alertIconBg: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#EBF2FC', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  completeProfileBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  centerTitle: { fontSize: 17, fontFamily: FONTS.serif, color: COLORS.text, textAlign: 'center' },
  centerText: { fontSize: 13, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.gray, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  retryText: { color: COLORS.white, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 13 },
  
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHeaderTitle: {
    fontSize: 19,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#111827',
  },
  navHeaderSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 38,
  },

  title: { fontSize: 21, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  desc: { fontSize: 14.5, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, textAlign: 'center', marginTop: 10, lineHeight: 21, paddingHorizontal: 8 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#fee2e2', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: '#b91c1c', lineHeight: 18 },
  retrySmall: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fecaca' },
  retrySmallText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: '#b91c1c' },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 14, borderRadius: 14, shadowColor: COLORS.black, alignItems: 'flex-start', borderWidth: 1, borderColor: '#e2e8f0' },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statLabel: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: '#64748b' },
  statValue: { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text, marginTop: 5 },

  singleLineStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  singleLineCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  singleLineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
    width: '100%',
  },
  singleLineIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleLineLabel: {
    fontSize: 11.5,
    fontFamily: FONTS.medium,
    fontWeight: '600',
    flexShrink: 1,
  },
  singleLineValue: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },

  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: COLORS.black, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontFamily: FONTS.serif, color: COLORS.text },
  cardDesc: { fontSize: 13.5, fontFamily: FONTS.medium, fontWeight: '500', color: '#64748b', marginTop: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: COLORS.surface },
  editBtnText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },

  toggleRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 5, borderRadius: 14, marginBottom: 20 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  toggleBtnActive: { backgroundColor: COLORS.white, shadowColor: COLORS.black },
  toggleText: { fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray },
  toggleTextActive: { color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700' },

  formGroup: { marginBottom: 18 },
  label: { fontSize: 13.5, fontFamily: FONTS.bold, fontWeight: '700', color: '#334155', marginBottom: 8, marginTop: 4 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', color: COLORS.text, fontFamily: FONTS.medium, fontWeight: '500', fontSize: 15 },
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14, minHeight: 50, shadowColor: COLORS.black },
  primaryBtnText: { color: COLORS.white, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 16 },

  accountCard: { marginBottom: 0, padding: 14, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  accountName: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },
  accountMeta: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, marginTop: 4 },
  accountMetaSmall: { fontSize: 12, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, marginTop: 4 },
  warnText: { fontSize: 12, fontFamily: FONTS.medium, fontWeight: '500', color: '#b45309', backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginTop: 8 },

  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  filterBtnText: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: COLORS.surface },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 12, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray },
  chipTextActive: { color: COLORS.white, fontFamily: FONTS.bold, fontWeight: '700' },
  activeFiltersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  activeFiltersText: { fontSize: 11, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray },
  clearText: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },

  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surface },
  txnIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  historyName: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },
  historyDate: { fontSize: 11, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, marginTop: 2 },
  historyAmount: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  historyStatus: { fontSize: 9, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: 0.6 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: COLORS.surface },
  categoryBadgeText: { fontSize: 9, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase' },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.surface },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 4 },
  pageBtnText: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.primary },
  pageInfo: { fontSize: 10, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 16, maxHeight: '86%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: FONTS.serif, color: COLORS.text },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontFamily: FONTS.medium, fontWeight: '500', fontSize: 14, color: COLORS.text, paddingVertical: 2 },
  modalActions: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.surface },
  modalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  modalBtnText: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700' },
});
