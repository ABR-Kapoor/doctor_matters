'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  IndianRupee,
  Landmark,
  Loader2,
  Pencil,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthToken } from '@/lib/auth-token-context';
import PageLoader from '@/app/components/PageLoader';
import { TranslatedText } from '@/app/components/TranslatedText';
import { formatDate } from '@/lib/shared/utils';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useDoctorIdentity } from '@/app/hooks/queries/useDoctorIdentity';
import { useDoctorFinance } from '@/app/hooks/queries/useDoctorFinance';
import { useDoctorWallet } from '@/app/hooks/queries/useDoctorWallet';
import { useSaveBankDetails } from '@/app/hooks/mutations/useSaveBankDetails';
import { useRequestPayout } from '@/app/hooks/mutations/useRequestPayout';
import VerificationGuard from '@/app/components/VerificationGuard';

const inputCls = 'w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-blue-900 placeholder-blue-300 text-sm outline-none transition-all';
const selectCls = 'w-full px-3 py-2 border border-blue-200 rounded-xl text-xs font-semibold text-blue-700 bg-white outline-none focus:border-blue-500';

const CATEGORY_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  refund: 'Refund',
  payout: 'Payout',
  payout_fee: 'Payout fee',
  adjustment: 'Adjustment',
};

function formatINR(value: number): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function statusClasses(status: string): string {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (status === 'reversed' || status === 'failed') return 'bg-blue-50 text-blue-600 border-blue-100';
  return 'bg-blue-50 text-blue-600 border-blue-100';
}

function FinanceContent() {
  const router = useRouter();
  const token = useAuthToken();
  const { translate } = useLanguage();

  const [savingBank, setSavingBank] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi'>('bank');
  const [bankForm, setBankForm] = useState({
    accountHolderName: '', accountNumber: '', ifscCode: '',
    bankName: '', accountType: 'savings', branchName: '', payoutUpiId: '',
  });
  const [bankFormInitialized, setBankFormInitialized] = useState(false);

  const [walletDirection, setWalletDirection] = useState('');
  const [walletCategory, setWalletCategory] = useState('');
  const [walletStatus, setWalletStatus] = useState('');
  const [walletFrom, setWalletFrom] = useState('');
  const [walletTo, setWalletTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [walletSearch, setWalletSearch] = useState('');
  const [walletPage, setWalletPage] = useState(1);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  const { data: identity } = useDoctorIdentity(token);
  const uid = identity?.uid || null;
  const { data: finance, isLoading } = useDoctorFinance(uid, token);
  const {
    data: walletData,
    isLoading: walletLoading,
    isFetching: walletFetching,
    error: walletError,
    refetch: refetchWallet,
  } = useDoctorWallet(token, {
    direction: walletDirection || undefined,
    category: walletCategory || undefined,
    status: walletStatus || undefined,
    search: walletSearch || undefined,
    from: walletFrom || undefined,
    to: walletTo || undefined,
    page: walletPage,
    limit: 15,
  });
  const saveBankMutation = useSaveBankDetails();
  const requestPayoutMutation = useRequestPayout();

  useEffect(() => {
    const timer = setTimeout(() => {
      setWalletSearch(searchInput.trim());
      setWalletPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  if (finance && !bankFormInitialized && finance.bankDetailsAdded) {
    setBankForm(finance.bankForm);
    setPayoutMethod(finance.payoutMethod);
    setBankFormInitialized(true);
  }

  const isProfileComplete = finance?.isProfileComplete ?? false;
  const isVerified = finance?.isVerified ?? false;
  const bankDetailsAdded = finance?.bankDetailsAdded ?? false;

  const wallet = walletData?.wallet;
  const walletTransactions = walletData?.transactions ?? [];
  const payoutRequests = walletData?.payouts ?? [];
  const walletPagination = walletData?.pagination;
  const payoutFee = walletData?.config?.payoutFee ?? 9;
  const minPayoutAmount = walletData?.config?.minPayoutAmount ?? 100;
  const payoutReady = walletData?.payoutProfile?.ready ?? false;
  const savedPayoutMethod = walletData?.payoutProfile?.method || finance?.payoutMethod || 'bank';
  const hasOpenPayout = payoutRequests.some(
    (payout) => payout.status === 'pending' || payout.status === 'processing',
  );

  const maskedAccount = bankForm.accountNumber
    ? `•••• ${bankForm.accountNumber.slice(-4)}`
    : null;

  const activeFilterCount = [walletDirection, walletCategory, walletStatus, walletFrom, walletTo, searchInput.trim()]
    .filter(Boolean).length;

  const activeTab =
    !walletDirection && !walletCategory && !walletStatus ? 'all'
      : walletDirection === 'credit' && !walletCategory && !walletStatus ? 'credits'
        : walletDirection === 'debit' && !walletCategory && !walletStatus ? 'debits'
          : walletCategory === 'refund' && !walletStatus ? 'refunds'
            : walletCategory === 'payout' && !walletStatus ? 'payouts'
              : 'custom';

  function selectTab(tab: string) {
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
  }

  function resetFilters() {
    setWalletDirection('');
    setWalletCategory('');
    setWalletStatus('');
    setWalletFrom('');
    setWalletTo('');
    setSearchInput('');
    setWalletSearch('');
    setWalletPage(1);
  }

  async function handleBankSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setSavingBank(true);
    try {
      await saveBankMutation.mutateAsync({ uid, token, bankDetails: { ...bankForm }, payoutMethod });
      toast.success(await translate('Banking details saved! Payouts will be activated shortly.'));
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      refetchWallet();
    } catch {
      toast.error(await translate('Failed to save banking details'));
    } finally {
      setSavingBank(false);
    }
  }

  async function handlePayoutRequest(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(payoutAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid payout amount');
      return;
    }
    try {
      const result = await requestPayoutMutation.mutateAsync({ token, amount });
      toast.success(result.message || 'Payout request submitted');
      setPayoutAmount('');
      setShowPayoutForm(false);
      refetchWallet();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to request payout');
    }
  }

  if (isLoading && !finance) return <PageLoader />;

  if (!isProfileComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-10 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-100">
            <AlertCircle className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-blue-900 mb-3">
            <TranslatedText>Complete Your Profile First</TranslatedText>
          </h1>
          <p className="text-blue-500 text-base mb-8 max-w-md mx-auto leading-relaxed">
            <TranslatedText>
              Your doctor profile must be 100% complete before you can set up payouts and view earnings. This helps us verify your identity and enable payments.
            </TranslatedText>
          </p>
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md"
          >
            <TranslatedText>Complete Profile</TranslatedText>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-6">
      <div>
        <span className="pill-badge mb-3 inline-block"><TranslatedText>Wallet</TranslatedText></span>
        <h1 className="headline-lg mb-1"><TranslatedText>Wallet Dashboard</TranslatedText></h1>
        <p className="body-md text-blue-500">
          <TranslatedText>Earnings, payouts, refunds and every wallet movement in one place</TranslatedText>
        </p>
      </div>

      {walletError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-red-700">
            <TranslatedText>Could not load wallet data.</TranslatedText> {walletError.message}
          </p>
          <button
            type="button"
            onClick={() => refetchWallet()}
            className="self-start sm:self-auto text-xs font-bold text-red-700 underline"
          >
            <TranslatedText>Retry</TranslatedText>
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 text-blue-400">
                <Wallet className="w-4 h-4" />
                <p className="text-xs font-medium"><TranslatedText>Available</TranslatedText></p>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-600">{formatINR(wallet?.availableBalance ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 text-blue-400">
                <Clock className="w-4 h-4" />
                <p className="text-xs font-medium"><TranslatedText>On hold</TranslatedText></p>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-amber-500">{formatINR(wallet?.heldAmount ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 text-blue-400">
                <ArrowDownLeft className="w-4 h-4" />
                <p className="text-xs font-medium"><TranslatedText>Lifetime credited</TranslatedText></p>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-blue-900">{formatINR(wallet?.lifetimeCredited ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 text-blue-400">
                <ArrowUpRight className="w-4 h-4" />
                <p className="text-xs font-medium"><TranslatedText>Lifetime debited</TranslatedText></p>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-blue-900">{formatINR(wallet?.lifetimeDebited ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 text-blue-400">
                <Banknote className="w-4 h-4" />
                <p className="text-xs font-medium"><TranslatedText>Withdrawn</TranslatedText></p>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-blue-900">{formatINR(wallet?.lifetimeWithdrawn ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 text-blue-400">
                <IndianRupee className="w-4 h-4" />
                <p className="text-xs font-medium"><TranslatedText>Payout fees</TranslatedText></p>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-blue-900">{formatINR(wallet?.lifetimePayoutFees ?? 0)}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-blue-100 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-blue-900 text-base"><TranslatedText>Transactions</TranslatedText></h2>
                  {walletFetching && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                </div>
                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 text-blue-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className={`${inputCls} pl-9`}
                    placeholder="Search patient, note, reference"
                  />
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'credits', label: 'Credits' },
                  { key: 'debits', label: 'Debits' },
                  { key: 'refunds', label: 'Refunds' },
                  { key: 'payouts', label: 'Payouts' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => selectTab(tab.key)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      activeTab === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <TranslatedText>{tab.label}</TranslatedText>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <select
                  value={walletDirection}
                  onChange={(e) => { setWalletDirection(e.target.value); setWalletPage(1); }}
                  className={selectCls}
                >
                  <option value="">All types</option>
                  <option value="credit">Credits</option>
                  <option value="debit">Debits</option>
                </select>
                <select
                  value={walletCategory}
                  onChange={(e) => { setWalletCategory(e.target.value); setWalletPage(1); }}
                  className={selectCls}
                >
                  <option value="">All categories</option>
                  <option value="consultation">Consultation</option>
                  <option value="refund">Refund</option>
                  <option value="payout">Payout</option>
                  <option value="payout_fee">Payout fee</option>
                  <option value="adjustment">Adjustment</option>
                </select>
                <select
                  value={walletStatus}
                  onChange={(e) => { setWalletStatus(e.target.value); setWalletPage(1); }}
                  className={selectCls}
                >
                  <option value="">Any status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="reversed">Reversed</option>
                </select>
                <input
                  type="date"
                  value={walletFrom}
                  onChange={(e) => { setWalletFrom(e.target.value); setWalletPage(1); }}
                  className={selectCls}
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={walletTo}
                  onChange={(e) => { setWalletTo(e.target.value); setWalletPage(1); }}
                  className={selectCls}
                  aria-label="To date"
                />
              </div>

              {activeFilterCount > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-blue-400">
                    {activeFilterCount} <TranslatedText>filter(s) active</TranslatedText>
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <TranslatedText>Clear all</TranslatedText>
                  </button>
                </div>
              )}
            </div>

            {walletLoading && !walletData ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
            ) : walletTransactions.length === 0 ? (
              <div className="p-10 text-center">
                <IndianRupee className="w-10 h-10 text-blue-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-blue-500">
                  <TranslatedText>No transactions match these filters.</TranslatedText>
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-3 text-xs font-bold text-blue-600 underline"
                  >
                    <TranslatedText>Clear filters</TranslatedText>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-blue-50">
                {walletTransactions.map((txn) => (
                  <div key={txn.id} className="px-5 sm:px-6 py-4 flex items-start gap-3 sm:gap-4 hover:bg-blue-50/30 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${txn.direction === 'credit' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                      {txn.direction === 'credit'
                        ? <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                        : <ArrowUpRight className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-blue-900 truncate">
                          {txn.description || CATEGORY_LABELS[txn.category] || txn.category}
                        </p>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">
                          {CATEGORY_LABELS[txn.category] || txn.category}
                        </span>
                      </div>
                      <p className="text-xs text-blue-400 mt-0.5">
                        {formatDate(txn.createdAt)}
                        {txn.patientName ? ` · ${txn.patientName}` : ''}
                        {txn.referenceId ? ` · Ref ${txn.referenceId.slice(0, 8)}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${txn.direction === 'credit' ? 'text-emerald-600' : 'text-blue-900'}`}>
                        {txn.direction === 'credit' ? '+' : '−'}{formatINR(txn.amount)}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        {txn.appointmentId && (
                          <Link
                            href="/dashboard/appointments"
                            className="text-blue-400 hover:text-blue-600"
                            title="View appointment"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusClasses(txn.status)}`}>
                          {txn.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(walletPagination?.totalPages ?? 1) > 1 && (
              <div className="px-5 sm:px-6 py-3 border-t border-blue-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setWalletPage((p) => Math.max(1, p - 1))}
                  disabled={walletPage <= 1}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <TranslatedText>Previous</TranslatedText>
                </button>
                <span className="text-xs text-blue-400">
                  {walletPagination?.page} / {walletPagination?.totalPages} · {walletPagination?.total} <TranslatedText>transactions</TranslatedText>
                </span>
                <button
                  type="button"
                  onClick={() => setWalletPage((p) => p + 1)}
                  disabled={!walletPagination?.hasMore}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 disabled:opacity-40"
                >
                  <TranslatedText>Next</TranslatedText>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-blue-900"><TranslatedText>Payout Account</TranslatedText></h2>
                  <p className="text-xs text-blue-400"><TranslatedText>Where your earnings are sent</TranslatedText></p>
                </div>
              </div>
              {bankDetailsAdded && (
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/profile?step=finance')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <TranslatedText>Edit</TranslatedText>
                </button>
              )}
            </div>

            {!bankDetailsAdded ? (
              <form onSubmit={handleBankSubmit} className="space-y-4">
                <div className="flex gap-2 bg-blue-50 p-1 rounded-2xl">
                  <button type="button" onClick={() => setPayoutMethod('bank')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${payoutMethod === 'bank' ? 'bg-white text-blue-800 shadow-sm border border-blue-100' : 'text-blue-500'}`}>
                    <Landmark className="w-4 h-4" /> <TranslatedText>Bank</TranslatedText>
                  </button>
                  <button type="button" onClick={() => setPayoutMethod('upi')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${payoutMethod === 'upi' ? 'bg-white text-blue-800 shadow-sm border border-blue-100' : 'text-blue-500'}`}>
                    <Smartphone className="w-4 h-4" /> <TranslatedText>UPI</TranslatedText>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-500 mb-1.5"><TranslatedText>Account Holder Name</TranslatedText> *</label>
                  <input type="text" value={bankForm.accountHolderName} onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })} className={inputCls} required />
                </div>

                {payoutMethod === 'bank' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-blue-500 mb-1.5"><TranslatedText>Account Number</TranslatedText> *</label>
                      <input type="text" value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-500 mb-1.5"><TranslatedText>IFSC Code</TranslatedText> *</label>
                      <input type="text" value={bankForm.ifscCode} onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })} className={inputCls} placeholder="SBIN0001234" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-500 mb-1.5"><TranslatedText>Bank Name</TranslatedText> *</label>
                      <input type="text" value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-500 mb-1.5"><TranslatedText>Account Type</TranslatedText> *</label>
                      <select value={bankForm.accountType} onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })} className={inputCls}>
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-blue-500 mb-1.5"><TranslatedText>UPI ID</TranslatedText> *</label>
                    <input type="text" value={bankForm.payoutUpiId} onChange={(e) => setBankForm({ ...bankForm, payoutUpiId: e.target.value.toLowerCase() })} className={inputCls} placeholder="yourname@upi" required />
                  </div>
                )}

                <button type="submit" disabled={savingBank} className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50">
                  {savingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                  {savingBank ? <TranslatedText>Saving...</TranslatedText> : <TranslatedText>Save Payout Details</TranslatedText>}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {savedPayoutMethod === 'upi' ? <Smartphone className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />}
                    {savedPayoutMethod === 'upi' ? 'UPI' : 'Bank account'}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    payoutReady ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {payoutReady ? 'Ready' : 'Setup incomplete'}
                  </span>
                </div>
                <div className="text-sm text-blue-700 space-y-1">
                  <p className="font-semibold text-blue-900">{bankForm.accountHolderName || 'Account holder'}</p>
                  {savedPayoutMethod === 'upi' ? (
                    <p>{bankForm.payoutUpiId || 'UPI ID missing'}</p>
                  ) : (
                    <>
                      <p>{bankForm.bankName || 'Bank'}{maskedAccount ? ` · ${maskedAccount}` : ''}</p>
                      <p className="text-xs text-blue-400">{bankForm.ifscCode || 'IFSC missing'}{bankForm.branchName ? ` · ${bankForm.branchName}` : ''}</p>
                    </>
                  )}
                </div>
                {!isVerified && (
                  <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <TranslatedText>Your profile is under review. Payouts unlock after verification.</TranslatedText>
                  </p>
                )}
                {isVerified && (
                  <p className="text-xs text-blue-400">
                    <TranslatedText>Payouts are processed by the AuraSutra team after review.</TranslatedText>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-blue-900"><TranslatedText>Withdraw Earnings</TranslatedText></h2>
                <p className="text-xs text-blue-400">{formatINR(wallet?.availableBalance ?? 0)} <TranslatedText>available</TranslatedText></p>
              </div>
            </div>
            <p className="text-xs text-blue-500 mb-3">
              <TranslatedText>Minimum</TranslatedText> {formatINR(minPayoutAmount)} · <TranslatedText>Fee</TranslatedText> {formatINR(payoutFee)}
            </p>

            {!payoutReady && (
              <p className="mb-3 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <TranslatedText>Add your bank or UPI payout details to withdraw earnings.</TranslatedText>
              </p>
            )}
            {payoutReady && hasOpenPayout && (
              <p className="mb-3 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                <TranslatedText>A payout request is already in progress.</TranslatedText>
              </p>
            )}

            {!showPayoutForm ? (
              <button
                type="button"
                onClick={() => setShowPayoutForm(true)}
                disabled={!payoutReady || hasOpenPayout || (wallet?.availableBalance ?? 0) < minPayoutAmount}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Banknote className="w-4 h-4" />
                <TranslatedText>Request Payout</TranslatedText>
              </button>
            ) : (
              <form onSubmit={handlePayoutRequest} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-500 mb-1.5"><TranslatedText>Amount (INR)</TranslatedText></label>
                  <input
                    type="number"
                    min={minPayoutAmount}
                    step="0.01"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className={inputCls}
                    placeholder={String(Math.max(minPayoutAmount, Math.floor(wallet?.availableBalance ?? 0)))}
                    required
                  />
                  {Number(payoutAmount) > payoutFee && (
                    <p className="text-[11px] text-blue-400 mt-1.5">
                      <TranslatedText>You will receive</TranslatedText> {formatINR(Number(payoutAmount) - payoutFee)} <TranslatedText>after the fee</TranslatedText>
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={requestPayoutMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50"
                  >
                    {requestPayoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <TranslatedText>Submit</TranslatedText>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPayoutForm(false); setPayoutAmount(''); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                    <TranslatedText>Cancel</TranslatedText>
                  </button>
                </div>
              </form>
            )}
          </div>

          {payoutRequests.length > 0 && (
            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-blue-100">
                <h2 className="font-bold text-blue-900 text-base"><TranslatedText>Payout Requests</TranslatedText></h2>
              </div>
              <div className="divide-y divide-blue-50">
                {payoutRequests.map((payout) => (
                  <div key={payout.id} className="px-5 sm:px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-blue-900">{formatINR(payout.amount)}</p>
                        <p className="text-xs text-blue-400 mt-0.5">
                          <TranslatedText>Fee</TranslatedText> {formatINR(payout.payoutFeeAmount)} · <TranslatedText>Net</TranslatedText> {formatINR(payout.netAmount)}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        payout.status === 'processed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : payout.status === 'pending' || payout.status === 'processing' ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {payout.status}
                      </span>
                    </div>
                    <p className="text-xs text-blue-400 mt-1.5">
                      {formatDate(payout.requestedAt)}
                      {payout.payoutMethod === 'upi' && payout.upiId ? ` · ${payout.upiId}` : payout.accountNumberLast4 ? ` · ••••${payout.accountNumberLast4}` : ''}
                    </p>
                    {payout.failureReason && (
                      <p className="text-xs text-red-600 mt-1">{payout.failureReason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function FinancePage() {
  return (
    <VerificationGuard>
      <FinanceContent />
    </VerificationGuard>
  );
}
