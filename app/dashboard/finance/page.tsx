'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, CheckCircle2, Loader2, ShieldCheck, ArrowRight, IndianRupee, TrendingUp, Clock, AlertCircle, CreditCard, ExternalLink, Landmark, Smartphone } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthToken } from '@/lib/auth-token-context';
import PageLoader from '@/app/components/PageLoader';
import { TranslatedText } from '@/app/components/TranslatedText';
import { formatDate } from '@/lib/shared/utils';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useDoctorIdentity } from '@/app/hooks/queries/useDoctorIdentity';
import { useDoctorFinance } from '@/app/hooks/queries/useDoctorFinance';
import { useSaveBankDetails } from '@/app/hooks/mutations/useSaveBankDetails';
import VerificationGuard from '@/app/components/VerificationGuard';

const inputCls = 'w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-blue-900 placeholder-blue-300 text-sm outline-none transition-all';

interface EarningRecord {
  appointment_id: string;
  patient_name: string;
  amount: number;
  created_at: string;
  status: string;
  transfer_status?: string;
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

  // ── TanStack Query ──
  const { data: identity } = useDoctorIdentity(token);
  const uid = identity?.uid || null;
  const { data: finance, isLoading } = useDoctorFinance(uid, token);
  const saveBankMutation = useSaveBankDetails();

  // Initialize local bankForm from cache once loaded
  if (finance && !bankFormInitialized && finance.bankDetailsAdded) {
    setBankForm(finance.bankForm);
    setPayoutMethod(finance.payoutMethod);
    setBankFormInitialized(true);
  }

  const isProfileComplete = finance?.isProfileComplete ?? false;
  const isVerified = finance?.isVerified ?? false;
  const bankDetailsAdded = finance?.bankDetailsAdded ?? false;
  const earnings = finance?.earnings ?? [];
  const totalEarnings = finance?.totalEarnings ?? 0;
  const pendingEarnings = finance?.pendingEarnings ?? 0;

  async function handleBankSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setSavingBank(true);
    try {
      await saveBankMutation.mutateAsync({ uid, token, bankDetails: { ...bankForm }, payoutMethod });
      toast.success(await translate('Banking details saved! Payouts will be activated shortly.'));
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch {
      toast.error(await translate('Failed to save banking details'));
    } finally {
      setSavingBank(false);
    }
  }

  if (isLoading && !finance) return <PageLoader />;

  // Gate: Profile must be complete first
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

  // Payout setup progress steps
  const setupSteps = [
    { label: 'Profile Complete', sublabel: 'Name, qualification, fee', done: isProfileComplete },
    { label: 'Banking Details Added', sublabel: 'Bank account or UPI saved', done: bankDetailsAdded },
  ];
  const completedSteps = setupSteps.filter(s => s.done).length;
  const setupPercent = Math.round((completedSteps / setupSteps.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-8">
      {/* Page Header */}
      <div>
        <span className="pill-badge mb-3 inline-block"><TranslatedText>Finance</TranslatedText></span>
        <h1 className="headline-lg mb-1"><TranslatedText>Your Earnings & Payouts</TranslatedText></h1>
        <p className="body-md text-blue-500"><TranslatedText>Track your income and manage how you receive payments</TranslatedText></p>
      </div>

      {/* Payout Setup Progress - Hide when complete */}
      {setupPercent < 100 && (
        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-blue-900"><TranslatedText>Payout Setup</TranslatedText></h3>
            <p className="text-xs text-blue-500 mt-0.5"><TranslatedText>Complete all steps to receive payments</TranslatedText></p>
          </div>
          <span className="text-2xl font-black text-blue-600">{setupPercent}%</span>
        </div>
        <div className="h-2 w-full bg-blue-100 rounded-full mb-5 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-700" style={{ width: `${setupPercent}%` }} />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {setupSteps.map((step, i) => (
            <div key={i} className={`flex-1 flex items-start gap-3 p-3 rounded-2xl border ${step.done ? 'bg-blue-50 border-blue-200' : 'bg-white border-blue-100'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${step.done ? 'bg-blue-600' : 'bg-blue-100'}`}>
                {step.done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="text-xs font-bold text-blue-400">{i + 1}</span>}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold leading-tight ${step.done ? 'text-blue-800' : 'text-blue-500'}`}><TranslatedText>{step.label}</TranslatedText></p>
                <p className="text-[10px] text-blue-400 mt-0.5"><TranslatedText>{step.sublabel}</TranslatedText></p>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Earnings Stats — only if verified & bank added */}
      {isVerified && bankDetailsAdded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
              <IndianRupee className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-blue-400 font-medium"><TranslatedText>Total Earned</TranslatedText></p>
              <p className="text-xl font-black text-blue-900">₹{totalEarnings.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-blue-400 font-medium"><TranslatedText>Pending</TranslatedText></p>
              <p className="text-xl font-black text-blue-900">₹{pendingEarnings.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-400 font-medium"><TranslatedText>Appointments</TranslatedText></p>
              <p className="text-xl font-black text-blue-900">{earnings.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Banking Details Form */}
      {!bankDetailsAdded ? (
        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-900"><TranslatedText>Add Payout Details</TranslatedText></h2>
              <p className="text-sm text-blue-500"><TranslatedText>Required to receive payments from appointments</TranslatedText></p>
            </div>
          </div>

          <div className="flex gap-2 mb-6 bg-blue-50 p-1 rounded-2xl">
            <button type="button" onClick={() => setPayoutMethod('bank')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${payoutMethod === 'bank' ? 'bg-white text-blue-800 shadow-sm border border-blue-100' : 'text-blue-500 hover:text-blue-700'}`}>
              <Landmark className="w-4 h-4" /> <TranslatedText>Bank Account</TranslatedText>
            </button>
            <button type="button" onClick={() => setPayoutMethod('upi')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${payoutMethod === 'upi' ? 'bg-white text-blue-800 shadow-sm border border-blue-100' : 'text-blue-500 hover:text-blue-700'}`}>
              <Smartphone className="w-4 h-4" /> <TranslatedText>UPI</TranslatedText>
            </button>
          </div>

          <form onSubmit={handleBankSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-blue-500 mb-2"><TranslatedText>Account Holder Name</TranslatedText> *</label>
                <input type="text" value={bankForm.accountHolderName} onChange={e => setBankForm({ ...bankForm, accountHolderName: e.target.value })} className={inputCls} placeholder="As per bank records" required />
              </div>
              {payoutMethod === 'bank' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-blue-500 mb-2"><TranslatedText>Account Number</TranslatedText> *</label>
                    <input type="text" value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })} className={inputCls} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-500 mb-2"><TranslatedText>IFSC Code</TranslatedText> *</label>
                    <input type="text" value={bankForm.ifscCode} onChange={e => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })} className={inputCls} placeholder="SBIN0001234" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-500 mb-2"><TranslatedText>Bank Name</TranslatedText> *</label>
                    <input type="text" value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} className={inputCls} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-500 mb-2"><TranslatedText>Account Type</TranslatedText> *</label>
                    <select value={bankForm.accountType} onChange={e => setBankForm({ ...bankForm, accountType: e.target.value })} className={inputCls}>
                      <option value="savings">Savings</option>
                      <option value="current">Current</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-blue-500 mb-2"><TranslatedText>Branch Name (Optional)</TranslatedText></label>
                    <input type="text" value={bankForm.branchName} onChange={e => setBankForm({ ...bankForm, branchName: e.target.value })} className={inputCls} />
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-blue-500 mb-2"><TranslatedText>UPI ID</TranslatedText> *</label>
                  <input type="text" value={bankForm.payoutUpiId} onChange={e => setBankForm({ ...bankForm, payoutUpiId: e.target.value.toLowerCase() })} className={inputCls} placeholder="yourname@upi" required />
                  <p className="text-xs text-blue-400 mt-1.5">Format: name@upi, name@okaxis, name@paytm etc.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={savingBank} className="flex items-center gap-2.5 px-8 py-3 rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-md disabled:opacity-50">
                {savingBank ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
                {savingBank ? <TranslatedText>Saving...</TranslatedText> : <TranslatedText>Save Payout Details</TranslatedText>}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center border border-emerald-200 shrink-0">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-emerald-800 text-lg"><TranslatedText>Payout Details Saved</TranslatedText></h3>
            <div className="text-emerald-700 text-sm mt-1 space-y-2">
              <p>
                {isVerified ? (
                  <TranslatedText>Your profile and finance details are verified. You will receive your consultancy fee in 1-2 hours only.</TranslatedText>
                ) : (
                  <TranslatedText>Your banking details are saved. Admins will transfer your earnings directly to your UPI or Bank Account within 3-5 hours of a completed consultation.</TranslatedText>
                )}
              </p>
              {!isVerified && (
                <p className="font-bold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 inline-block">
                  <TranslatedText>Note: Only verified doctors can accept appointments and receive payments. Your profile verification is currently pending.</TranslatedText>
                </p>
              )}
            </div>
          </div>
          <button onClick={() => router.push('/dashboard/profile?step=finance')} className="shrink-0 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2">
            <TranslatedText>Edit</TranslatedText>
          </button>
        </div>
      )}

      {/* Earnings Table */}
      {isVerified && earnings.length > 0 && (
        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-blue-100">
            <h2 className="font-bold text-blue-900 text-base"><TranslatedText>Transaction History</TranslatedText></h2>
          </div>
          <div className="divide-y divide-blue-50">
            {earnings.map((record) => (
              <div key={record.appointment_id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-blue-50/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-blue-900 truncate">{record.patient_name}</p>
                  <p className="text-xs text-blue-400">{formatDate(record.created_at)}</p>
                </div>
                <div className="shrink-0">
                  <Link href={`/dashboard/appointments`} title="View Appointment">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-100">
                      <ExternalLink className="w-3 h-3" />
                      <TranslatedText>Consultation</TranslatedText>
                    </span>
                  </Link>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-blue-900">₹{record.amount?.toLocaleString('en-IN')}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    record.transfer_status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                    record.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {record.transfer_status === 'success' ? 'paid' : record.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for earnings */}
      {isVerified && bankDetailsAdded && earnings.length === 0 && (
        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-10 text-center">
          <IndianRupee className="w-12 h-12 text-blue-200 mx-auto mb-4" />
          <h3 className="font-bold text-blue-700 text-lg mb-2"><TranslatedText>No earnings yet</TranslatedText></h3>
          <p className="text-blue-400 text-sm"><TranslatedText>Your completed appointment payments will appear here once you start seeing patients.</TranslatedText></p>
        </div>
      )}

      {/* Pending verification state */}
      {isProfileComplete && bankDetailsAdded && !isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 shrink-0">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-amber-800"><TranslatedText>Profile Under Review</TranslatedText></h3>
            <p className="text-amber-700 text-sm mt-0.5"><TranslatedText>Your earnings and transaction history will appear once your profile is verified by our team (1-2 business days).</TranslatedText></p>
          </div>
        </div>
      )}
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
