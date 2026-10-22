'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Save, Loader2, Camera, CheckCircle2, Circle, ChevronRight, Banknote, BadgeCheck, ArrowRight, CreditCard, AlertCircle, Landmark, Smartphone } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import PageLoader from '@/app/components/PageLoader';
import { TranslatedText } from '@/app/components/TranslatedText';
import { useTranslation } from '@/app/hooks/useTranslation';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/app/components/CustomSelect';

import { useProfileStore } from '@/app/store/useProfileStore';


const AYURVEDIC_SPECIALIZATIONS = [
  'General Ayurveda', 'Panchakarma Specialist', 'Rasayana (Rejuvenation)',
  'Kayachikitsa (Internal Medicine)', 'Shalya Tantra (Surgery)',
  'Shalakya Tantra (ENT & Ophthalmology)', 'Kaumara Bhritya (Pediatrics)',
  'Prasuti Tantra (Gynecology & Obstetrics)', 'Agada Tantra (Toxicology)',
  'Swasthavritta (Preventive Medicine)', 'Ayurvedic Dietetics & Nutrition',
  'Yoga & Meditation Therapy', 'Marma Chikitsa (Vital Points Therapy)',
  'Vajikarana (Aphrodisiac Therapy)', 'Ayurvedic Dermatology',
  'Ayurvedic Cardiology', 'Ayurvedic Diabetes Management',
  'Stress & Anxiety Management', 'Weight Management',
  'Digestive Health Specialist', 'Joint & Pain Management', 'Detoxification Expert',
];

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Gujarati'];

const SectionBlock = ({ num, title, children }: { num: string; title: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-7 shadow-[var(--shadow-sm)] border border-blue-100 mb-10">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
        <span className="text-sm font-bold italic font-display text-blue-600">{num}</span>
      </div>
      <h2 className="text-xl font-display font-medium italic text-blue-900">{title}</h2>
    </div>
    {children}
  </div>
);

const inputCls = 'w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-blue-900 placeholder-blue-300 text-sm outline-none transition-all';

// ── Banking / Payout Progress Bar ──────────────────────────────────────────
interface SetupStep {
  id: number;
  label: string;
  sublabel: string;
  done: boolean;
  icon: React.ReactNode;
}

function ProfileCompletionBar({ overallPercentage, profilePercentage, payoutPercentage, steps, isVerified, verificationRequested, setVerificationRequested, uid, consentAgreed, setConsentAgreed }: { overallPercentage: number, profilePercentage: number, payoutPercentage: number, steps: SetupStep[], isVerified: boolean, verificationRequested: boolean, setVerificationRequested: (val: boolean) => void, uid: string, consentAgreed: boolean, setConsentAgreed: (val: boolean) => void }) {

  return (
    <div className="mb-8 bg-white/90 backdrop-blur-xl rounded-3xl border border-blue-100 shadow-xl shadow-blue-900/5 p-5 sm:p-6 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-display font-bold text-blue-900">
            <TranslatedText>Profile & Payout Setup</TranslatedText>
          </h3>
          <p className="text-xs text-blue-500 mt-0.5">
            <TranslatedText>Complete your profile and banking details to receive payments</TranslatedText>
          </p>
        </div>
        <span className="text-2xl font-black font-display text-blue-600">{overallPercentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full bg-blue-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-700"
          style={{ width: `${overallPercentage}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col sm:flex-row gap-3">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={`flex-1 flex items-start gap-3 p-3 rounded-2xl border transition-all ${
              step.done
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-blue-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              step.done ? 'bg-blue-600' : 'bg-blue-100'
            }`}>
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : (
                <span className="text-xs font-bold text-blue-400">{i + 1}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold leading-tight ${step.done ? 'text-blue-800' : 'text-blue-500'}`}>
                <TranslatedText>{step.label}</TranslatedText>
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-blue-400">
                  <TranslatedText>{step.sublabel}</TranslatedText>
                </p>
                <span className={`text-[10px] font-bold ${step.done ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {step.id === 1 ? `${profilePercentage}%` : `${payoutPercentage}%`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA if not complete */}
      {overallPercentage < 100 && (
        <button
          type="button"
          onClick={() => {
            const financeEl = document.getElementById('finance-section');
            if (financeEl) financeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all"
        >
          <Banknote className="w-4 h-4" />
          <TranslatedText>Complete Setup</TranslatedText>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Complete and unverified */}
      {overallPercentage === 100 && !isVerified && (
        <div className="mt-4">
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-4">
            <input
              type="checkbox"
              id="doctor-consent"
              checked={consentAgreed}
              onChange={(e) => setConsentAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 bg-white border-emerald-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer shrink-0"
            />
            <label htmlFor="doctor-consent" className="text-xs sm:text-sm text-emerald-900 leading-relaxed cursor-pointer">
              I acknowledge and agree to the <a href="/terms-and-conditions" target="_blank" className="font-semibold underline text-emerald-700 hover:text-emerald-800">Medical Liability Disclaimer</a>, <a href="/refund-policy" target="_blank" className="font-semibold underline text-emerald-700 hover:text-emerald-800">Payout & Refund Policy</a>, and <a href="/terms-and-conditions" target="_blank" className="font-semibold underline text-emerald-700 hover:text-emerald-800">Terms of Service</a>. I understand my profile is subject to manual verification.
            </label>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!consentAgreed) {
                toast.error('Please agree to the Terms, Refund Policy, and Medical Disclaimer to submit your profile.');
                return;
              }
              setVerificationRequested(true);
              if (typeof window !== 'undefined') localStorage.setItem('verificationRequested', 'true');
              
              const toastId = toast.loading('Sending verification request to admin...');
              try {
                const res = await fetch('/api/doctor/verification/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid })
                });
                if (res.ok) {
                    toast.success('Your profile has been submitted and is currently under review by our admin team! It will be verified shortly.', { id: toastId });
                } else {
                    toast.error('Failed to send verification request.', { id: toastId });
                    setVerificationRequested(false);
                    if (typeof window !== 'undefined') localStorage.setItem('verificationRequested', 'false');
                }
              } catch (e) {
                 toast.error('Network error', { id: toastId });
                 setVerificationRequested(false);
                 if (typeof window !== 'undefined') localStorage.setItem('verificationRequested', 'false');
              }
            }}
            disabled={!consentAgreed && !verificationRequested}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all shadow-md ${
              verificationRequested 
              ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
              : (!consentAgreed ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700')
            }`}
          >
            {verificationRequested ? 'Currently Under Review (Click to Resend)' : 'Submit for Verification'}
          </button>
        </div>
      )}

      {/* Complete and verified */}
      {overallPercentage === 100 && isVerified && (
        <div className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200">
          <BadgeCheck className="w-4 h-4" />
          <TranslatedText>Profile is Verified and Live</TranslatedText>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function DoctorProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthToken();
  const profileStore = useProfileStore();
  const { translate } = useLanguage();
  const financeRef = useRef<HTMLDivElement>(null);
  const { text: phSpecializations } = useTranslation('Chronic Pain, Arthritis, PCOS, Acidity...');
  const { text: phQualification } = useTranslation('BAMS, MD (Ayurveda)');
  const { text: phBio } = useTranslation('Tell patients about yourself and your practice...');
  const { text: phAddressLine1 } = useTranslation('Clinic/Hospital Name, Street');
  const { text: phAddressLine2 } = useTranslation('Area, Landmark');
  const [noClinicLabel, setNoClinicLabel] = useState('No Clinic (Independent Doctor)');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Two-step wizard: step 1 = profile, step 2 = finance
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    prefix: 'Dr.',
    name: '', phone: '', email: '',
    specialization: [] as string[],
    custom_specializations: '',
    qualification: '', registration_number: '',
    years_of_experience: 0, consultation_fee: 0,
    bio: '', clinic_id: null as string | null, clinic_name: '',
    languages: [] as string[],
    address_line1: '', address_line2: '', city: '', state: '', postal_code: '',
  });
  // Finance / Banking form state
  const [savingBank, setSavingBank] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi'>('bank');
  const [bankForm, setBankForm] = useState({
    accountHolderName: '', accountNumber: '', ifscCode: '',
    bankName: '', accountType: 'savings', branchName: '', payoutUpiId: '',
  });
  const [uid, setUid] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [clinics, setClinics] = useState<any[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Payout progress state
  const [bankDetailsAdded, setBankDetailsAdded] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [completionData, setCompletionData] = useState<{ overallPercentage: number, profilePercentage: number, payoutPercentage: number } | null>(null);
  const [verificationRequested, setVerificationRequested] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVerificationRequested(localStorage.getItem('verificationRequested') === 'true');
    }
  }, []);

  const fetchCompletion = async (currentUid: string) => {
    try {
      const response = await fetch(`/api/doctor/profile/completion?uid=${currentUid}`);
      const result = await response.json();
      if (result.success) {
        setCompletionData(result);
        if (result.verificationRejected && result.verificationNotes) {
            toast.error(`Verification Rejected: ${result.verificationNotes}`, { duration: 10000 });
            setVerificationRequested(false);
            if (typeof window !== 'undefined') localStorage.setItem('verificationRequested', 'false');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Real-time polling for admin action
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (verificationRequested && !isVerified && uid) {
      interval = setInterval(async () => {
         try {
           const res = await fetch(`/api/doctor/profile/completion?uid=${uid}`);
           const data = await res.json();
           
           if (data.isVerified) {
              setIsVerified(true);
              setVerificationRequested(false);
              if (typeof window !== 'undefined') localStorage.setItem('verificationRequested', 'false');
              toast.success('Congratulations! Your profile has been officially verified by the admin team!', { duration: 8000 });
              clearInterval(interval);
              window.location.href = '/dashboard';
           } else if (data.verificationRejected) {
              toast.error(`Verification Rejected: ${data.verificationNotes}`, { duration: 10000 });
              setVerificationRequested(false);
              if (typeof window !== 'undefined') localStorage.setItem('verificationRequested', 'false');
              clearInterval(interval);
           }
         } catch (e) {}
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [verificationRequested, isVerified, uid]);

  const stopSpace = (e: React.KeyboardEvent) => {
    if (e.key === ' ') e.stopPropagation();
  };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('uid', uid);
      const response = await fetchWithAuth('/api/upload-profile-picture', token, { method: 'POST', body: fd });
      const data = await response.json();
      if (data.success) {
        setProfileImage(data.url);
        toast.success(await translate('Profile picture updated!'));
      } else {
        toast.error(await translate(data.error || 'Failed to upload image'));
      }
    } catch {
      toast.error(await translate('Failed to upload image'));
    } finally {
      setUploadingImage(false);
    }
  }

  useEffect(() => { fetchProfile(); fetchClinics(); }, []);

  // Jump to finance step if ?step=finance in URL
  useEffect(() => {
    if (searchParams?.get('step') === 'finance' && !loading) {
      setWizardStep(2);
      setTimeout(() => financeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  }, [searchParams, loading]);

  useEffect(() => {
    translate('No Clinic (Independent Doctor)').then(setNoClinicLabel);
  }, [translate]);

  async function fetchClinics() {
    try {
      const response = await fetchWithAuth(`/api/clinics?t=${Date.now()}`, token, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
      });
      const data = await response.json();
      if (data.success) setClinics(data.clinics || []);
      else { setClinics([]); toast.error(await translate('Could not load clinics list.')); }
    } catch {
      setClinics([]);
      toast.error(await translate('Could not load clinics list.'));
    }
  }

  async function fetchBankDetails(doctorUid: string) {
    try {
      const bankResponse = await fetch(`/api/doctor/bank-details?uid=${doctorUid}`);
      const bankData = await bankResponse.json();
      if (bankData.bankDetails) {
        if (bankData.bankDetails?.addedAt) {
          setBankDetailsAdded(true);
        }
        if (bankData.bankDetails.accountHolderName) {
          setBankForm({
            accountHolderName: bankData.bankDetails.accountHolderName || '',
            accountNumber: bankData.bankDetails.accountNumber || '',
            ifscCode: bankData.bankDetails.ifscCode || '',
            bankName: bankData.bankDetails.bankName || '',
            accountType: bankData.bankDetails.accountType || 'savings',
            branchName: bankData.bankDetails.branchName || '',
            payoutUpiId: bankData.bankDetails.payoutUpiId || '',
          });
          setPayoutMethod(bankData.bankDetails.payoutMethod || 'bank');
        }
      }
    } catch { /* non-fatal */ }
  }

  async function fetchProfile() {
    try {
      const syncResponse = await fetchWithAuth('/api/sync-user', token, { cache: 'no-store' });
      if (!syncResponse.ok) { toast.error(await translate('Authentication failed.')); setLoading(false); return; }
      const { user } = await syncResponse.json();
      if (!user) { toast.error(await translate('User not found.')); setLoading(false); return; }
      setUid(user.uid);

      const profileResponse = await fetchWithAuth(`/api/doctor/profile?uid=${user.uid}&t=${Date.now()}`, token, { cache: 'no-store' });
      const data = await profileResponse.json();
      if (data.success) {
        setIsVerified(Boolean(data.doctor?.is_verified));
        setProfileImage(data.user?.profile_image_url || '');
        let dbName = data.user?.name || '';
        let currentPrefix = 'Dr.';
        const PREFIXES = ['Dr.', 'Mr.', 'Miss.', 'Smt.', 'Shri.'];
        for (const p of PREFIXES) {
          if (dbName.startsWith(p + ' ')) {
            currentPrefix = p;
            dbName = dbName.slice(p.length + 1);
            break;
          } else if (dbName.startsWith(p)) {
            // handle cases without space like "Dr.Maggie"
            currentPrefix = p;
            dbName = dbName.slice(p.length).trim();
            break;
          }
        }

        setFormData({
          prefix: currentPrefix,
          name: dbName, phone: data.user?.phone || '', email: data.user?.email || '',
          specialization: data.doctor?.specialization || [],
          custom_specializations: data.doctor?.custom_specializations || '',
          qualification: data.doctor?.qualification || '',
          registration_number: data.doctor?.registration_number || '',
          years_of_experience: data.doctor?.years_of_experience || 0,
          consultation_fee: data.doctor?.consultation_fee || 0,
          bio: data.doctor?.bio || '',
          clinic_id: data.doctor?.clinic_id || null,
          clinic_name: data.doctor?.clinic_name || '',
          languages: data.doctor?.languages || [],
          address_line1: data.doctor?.address_line1 || '',
          address_line2: data.doctor?.address_line2 || '',
          city: data.doctor?.city || '', state: data.doctor?.state || '', postal_code: data.doctor?.postal_code || '',
        });

        profileStore.setProfile({
          name: data.user?.name || '',
          imageUrl: data.user?.profile_image_url || '',
          email: data.user?.email || '',
          isVerified: Boolean(data.doctor?.is_verified),
        });

        if (data.doctor) {
            await fetchBankDetails(user.uid);
            await fetchCompletion(user.uid);
        }
      }
    } catch { toast.error(await translate('Failed to load profile')); }
    finally { setLoading(false); }
  }


  const isProfileComplete = Boolean(
    formData.name.trim() &&
    formData.qualification.trim() &&
    formData.registration_number.trim() &&
    formData.specialization.length > 0 &&
    Number(formData.consultation_fee) > 0
  );

  // Dynamic Progress Calculation
  const localProfileFields = [
    formData.name,
    formData.phone,
    profileImage,
    formData.specialization.length > 0 ? 'yes' : '',
    formData.qualification,
    formData.years_of_experience !== null ? 'yes' : '',
    formData.consultation_fee !== null ? 'yes' : '',
    formData.registration_number,
    formData.clinic_id ? 'yes' : formData.city,
    formData.clinic_id ? 'yes' : formData.state,
  ];
  const profileFilledCount = localProfileFields.filter(v => v && String(v).trim() !== '').length;
  const computedProfilePercentage = Math.round((profileFilledCount / 10) * 100);

  let payoutFields = [];
  if (payoutMethod === 'upi') {
      payoutFields = [bankForm.accountHolderName, bankForm.payoutUpiId];
  } else {
      payoutFields = [bankForm.accountHolderName, bankForm.accountNumber, bankForm.ifscCode, bankForm.bankName, bankForm.accountType];
  }
  const payoutFilledCount = payoutFields.filter(v => v && String(v).trim() !== '').length;
  const computedPayoutPercentage = Math.round((payoutFilledCount / payoutFields.length) * 100);

  const computedOverallPercentage = Math.round(((profileFilledCount + payoutFilledCount) / (10 + payoutFields.length)) * 100);

  const showKycBanner = (hasSubmitted || isProfileComplete) && !isVerified;

  // Payout setup steps
  const payoutSteps: SetupStep[] = [
    {
      id: 1,
      label: 'Profile Complete',
      sublabel: 'Name, qualification, fee',
      done: isProfileComplete,
      icon: <BadgeCheck className="w-4 h-4" />,
    },
    {
      id: 2,
      label: 'Payout Details',
      sublabel: 'Bank account or UPI for receiving payments',
      done: bankDetailsAdded,
      icon: <Banknote className="w-4 h-4" />,
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetchWithAuth('/api/doctor/profile', token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          user: { name: `${formData.prefix} ${formData.name.trim()}`, phone: formData.phone, profile_image_url: profileImage },
          doctor: {
            specialization: formData.specialization,
            custom_specializations: formData.custom_specializations,
            qualification: formData.qualification,
            registration_number: formData.registration_number,
            years_of_experience: formData.years_of_experience,
            consultation_fee: formData.consultation_fee,
            bio: formData.bio, clinic_id: formData.clinic_id, clinic_name: formData.clinic_name,
            languages: formData.languages,
            address_line1: formData.address_line1, address_line2: formData.address_line2,
            city: formData.city, state: formData.state, postal_code: formData.postal_code,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(await translate('Profile saved! Now complete your payout setup.'));
        profileStore.setProfile({
          name: `${formData.prefix} ${formData.name.trim()}`,
          imageUrl: profileImage,
          email: formData.email,
        });
        setHasSubmitted(true);
        // Open Step 2 finance section immediately — before awaiting fetchProfile
        setWizardStep(2);
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        // If complete, open Step 2, otherwise just stay here
        if (isProfileComplete) {
          setWizardStep(2);
          setTimeout(() => financeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
        }
        await fetchProfile();
        await fetchCompletion(uid);
      } else { toast.error(await translate('Failed to update profile')); }
    } catch { toast.error(await translate('Failed to update profile')); }
    finally { setSaving(false); }
  }

  async function handleBankSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingBank(true);
    try {
      const response = await fetchWithAuth('/api/doctor/bank-details', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          bankDetails: { ...bankForm, payoutMethod },
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(await translate('Banking details saved! Payouts will be activated shortly.'));
        setBankDetailsAdded(true);
        await fetchBankDetails(uid);
        await fetchCompletion(uid);
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      } else {
        toast.error(await translate(data.error || 'Failed to save banking details'));
      }
    } catch {
      toast.error(await translate('Failed to save banking details'));
    } finally {
      setSavingBank(false);
    }
  }

  function toggleSpecialization(spec: string) {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization.includes(spec)
        ? prev.specialization.filter(s => s !== spec)
        : [...prev.specialization, spec],
    }));
  }

  function toggleLanguage(lang: string) {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang],
    }));
  }

  if (loading) return <PageLoader />;

  const isStep2 = wizardStep === 2 || bankDetailsAdded;

  return (
    <div className="max-w-3xl mx-auto pb-12 p-4 sm:p-6 lg:p-8 xl:p-10">

      {showKycBanner && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <TranslatedText>After KYC your profile will be public. It can take 1-2 working days.</TranslatedText>
        </div>
      )}

      {!isProfileComplete && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-4 text-sm text-amber-800 shadow-sm smooth-transition animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-6 h-6 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <div className="font-bold text-base mb-1 text-amber-900"><TranslatedText>Profile Incomplete</TranslatedText></div>
            <TranslatedText>Please fill in all the required details to complete your profile. Your status updates as you type and save.</TranslatedText>
          </div>
        </div>
      )}

      {/* ── Payout Setup Progress Bar ── */}
      <div className="sticky top-4 z-40 transition-all duration-300 w-full">
        <ProfileCompletionBar 
          overallPercentage={computedOverallPercentage} 
          profilePercentage={computedProfilePercentage} 
          payoutPercentage={computedPayoutPercentage} 
          steps={payoutSteps} 
          isVerified={isVerified} 
          verificationRequested={verificationRequested}
          setVerificationRequested={setVerificationRequested}
          uid={uid}
          consentAgreed={consentAgreed}
          setConsentAgreed={setConsentAgreed}
        />
      </div>

      {/* Page Header with avatar */}
      <div className="flex items-start justify-between gap-3 sm:gap-6 mb-10">
        <div>
          <span className="pill-badge mb-4 inline-block"><TranslatedText>Your Record</TranslatedText></span>
          <h1 className="headline-lg mb-1 flex items-center gap-2">
            <div>
              <TranslatedText>Namaste</TranslatedText>,{' '}
              <span className="text-blue-600 italic">{formData.prefix} {formData.name || 'Doctor'}</span>
            </div>
            {isVerified && <BadgeCheck className="w-7 h-7 text-blue-500 shrink-0" />}
          </h1>
          <p className="body-md text-blue-600 max-w-xl">
            <TranslatedText>Keep your professional information accurate and up to date</TranslatedText>
          </p>
        </div>
        {/* Profile picture with camera button */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden border-2 border-blue-200">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                <User className="w-10 h-10 text-blue-400" />
              </div>
            )}
            {uploadingImage && (
              <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <label htmlFor="profile-picture-upload" className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-600 cursor-pointer flex items-center justify-center shadow-[var(--shadow-md)] hover:bg-blue-700 transition-colors">
            <Camera className="w-3.5 h-3.5 text-white" />
            <input id="profile-picture-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        <SectionBlock num="01" title={<TranslatedText>Personal Information</TranslatedText>}>
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Full Name</TranslatedText> *</label>
              <div className="flex items-stretch w-full border border-blue-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 bg-white transition-all overflow-hidden">
                <Select value={formData.prefix} onValueChange={v => setFormData({ ...formData, prefix: v })}>
                  <SelectTrigger className="w-[90px] sm:w-[110px] !h-auto rounded-none !border-none bg-blue-50/80 hover:bg-blue-100/50 px-3 sm:px-4 !py-2 sm:!py-2.5 shrink-0 text-blue-900 font-medium shadow-none outline-none focus:ring-0">
                    <SelectValue placeholder="Prefix" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Dr.', 'Mr.', 'Miss.', 'Smt.', 'Shri.'].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-[1px] bg-blue-200 shrink-0 my-1.5 mx-0.5"></div>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} onKeyDown={stopSpace} className="flex-1 w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-transparent text-blue-900 placeholder-blue-300 text-sm outline-none border-none focus:ring-0 shadow-none" required />
              </div>
            </div>
            <div>
              <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Phone Number</TranslatedText></label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} onKeyDown={stopSpace} className={inputCls} />
            </div>
            <div>
              <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Email (Read-only)</TranslatedText></label>
              <input type="email" value={formData.email} className={`${inputCls} bg-blue-50 text-blue-400`} disabled />
            </div>

          </div>
        </SectionBlock>

        <SectionBlock num="02" title={<TranslatedText>Professional Details</TranslatedText>}>
          <div className="space-y-6">
            <div>
              <label className="block label-lg text-blue-500 mb-3"><TranslatedText>Specializations</TranslatedText> * (<TranslatedText>Select multiple</TranslatedText>)</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {AYURVEDIC_SPECIALIZATIONS.map(spec => (
                  <button key={spec} type="button" onClick={() => toggleSpecialization(spec)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold smooth-transition text-left ${
                      formData.specialization.includes(spec) ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}>
                    <TranslatedText>{spec}</TranslatedText>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Other Specializations (SEO Keywords)</TranslatedText></label>
              <textarea value={formData.custom_specializations} onChange={e => setFormData({ ...formData, custom_specializations: e.target.value })}
                onKeyDown={stopSpace} rows={3} className={inputCls} placeholder={phSpecializations} />
              <p className="text-xs text-blue-600 mt-1.5"><TranslatedText>Add comma-separated conditions to help patients find you</TranslatedText></p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Qualification</TranslatedText> *</label>
                <input type="text" value={formData.qualification} onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                  onKeyDown={stopSpace} placeholder={phQualification} className={inputCls} required />
              </div>
              <div>
                <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Registration Number</TranslatedText> *</label>
                <input type="text" value={formData.registration_number} onChange={e => setFormData({ ...formData, registration_number: e.target.value })} onKeyDown={stopSpace} className={inputCls} required />
              </div>
              <div>
                <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Years of Experience</TranslatedText></label>
                <input type="number" value={formData.years_of_experience} onChange={e => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })}
                  onKeyDown={stopSpace} className={inputCls} min="0" />
              </div>
              <div>
                <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Consultation Fee (₹)</TranslatedText></label>
                <input type="number" value={formData.consultation_fee} onChange={e => setFormData({ ...formData, consultation_fee: parseFloat(e.target.value) || 0 })}
                  onKeyDown={stopSpace} className={inputCls} min="0" />
              </div>
            </div>

            <div>
              <label className="block label-lg text-blue-500 mb-3"><TranslatedText>Languages</TranslatedText> (<TranslatedText>Select multiple</TranslatedText>)</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold smooth-transition ${
                      formData.languages.includes(lang) ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}>
                    <TranslatedText>{lang}</TranslatedText>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Bio / About Me</TranslatedText></label>
              <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })}
                onKeyDown={stopSpace} rows={4} className={inputCls} placeholder={phBio} />
            </div>
          </div>
        </SectionBlock>

        <SectionBlock num="03" title={<TranslatedText>Clinic Affiliation</TranslatedText>}>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block label-lg text-blue-500"><TranslatedText>Select Clinic (Optional)</TranslatedText></label>
                <button type="button" onClick={async () => { toast.loading(await translate('Refreshing...')); fetchClinics().then(async () => { toast.dismiss(); toast.success(await translate('Refreshed!')); }); }}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium"><TranslatedText>Refresh</TranslatedText></button>
              </div>
              <select value={formData.clinic_id || ''} onChange={e => {
                const id = e.target.value || null;
                const clinic = clinics.find(c => c.clinic_id === id);
                setFormData({ ...formData, clinic_id: id, clinic_name: clinic?.clinic_name || '' });
              }} className={inputCls}>
                <option value="">{noClinicLabel}</option>
                {clinics.map(c => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name} — {c.city}, {c.state}</option>)}
              </select>
            </div>

            {formData.clinic_id && (() => {
              const c = clinics.find(cl => cl.clinic_id === formData.clinic_id);
              if (!c) return null;
              return (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                  <p className="label-lg text-blue-700 mb-3"><TranslatedText>Affiliated with</TranslatedText> <strong>{c.clinic_name}</strong></p>
                  <div className="grid md:grid-cols-2 gap-3 body-md text-blue-500">
                    <div>
                      <p className="font-semibold text-blue-700 mb-1"><TranslatedText>Address</TranslatedText></p>
                      <p>{c.address_line1 || 'No address provided'}</p>
                      {c.address_line2 && <p>{c.address_line2}</p>}
                      <p>{[c.city, c.state, c.postal_code].filter(Boolean).join(', ')}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-700 mb-1"><TranslatedText>Contact</TranslatedText></p>
                      {c.phone && <p>{c.phone}</p>}
                      {c.email && <p>{c.email}</p>}
                      {!c.phone && !c.email && <p className="italic text-blue-300"><TranslatedText>No contact details</TranslatedText></p>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {!formData.clinic_id && (
              <div className="space-y-4 pt-2">
                <p className="label-lg text-blue-400"><TranslatedText>Independent Practice Address</TranslatedText></p>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Address Line 1</TranslatedText></label>
                    <input type="text" value={formData.address_line1} onChange={e => setFormData({ ...formData, address_line1: e.target.value })}
                      onKeyDown={stopSpace} className={inputCls} placeholder={phAddressLine1} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Address Line 2</TranslatedText></label>
                    <input type="text" value={formData.address_line2} onChange={e => setFormData({ ...formData, address_line2: e.target.value })}
                      onKeyDown={stopSpace} className={inputCls} placeholder={phAddressLine2} />
                  </div>
                  <div>
                    <label className="block label-lg text-blue-500 mb-2"><TranslatedText>City</TranslatedText></label>
                    <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} onKeyDown={stopSpace} className={inputCls} />
                  </div>
                  <div>
                    <label className="block label-lg text-blue-500 mb-2"><TranslatedText>State</TranslatedText></label>
                    <input type="text" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} onKeyDown={stopSpace} className={inputCls} />
                  </div>
                  <div>
                    <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Postal Code</TranslatedText></label>
                    <input type="text" value={formData.postal_code} onChange={e => setFormData({ ...formData, postal_code: e.target.value })} onKeyDown={stopSpace} className={inputCls} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </SectionBlock>

          {/* Form Footer */}
        <div className="flex flex-col gap-6 mt-16 pt-10 border-t border-blue-100/50 pb-8">
          <p className="text-sm text-blue-600 font-display italic leading-relaxed max-w-md">
            <TranslatedText>By saving these changes, you acknowledge that all medical data is encrypted and stored according to clinical compliance standards.</TranslatedText>
          </p>

          {isVerified && (
            <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">
                <TranslatedText>Updating your profile will reset your verified status. You will need to submit your profile for re-verification.</TranslatedText>
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {saving && (
              <span className="text-xs text-blue-600 animate-pulse font-medium">
                <TranslatedText>Synchronizing records...</TranslatedText>
              </span>
            )}

            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 sm:flex-none px-8 py-3 rounded-full bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100 transition-all border border-blue-100 text-center"
            >
              <TranslatedText>Discard Changes</TranslatedText>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-8 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving
                ? <TranslatedText>Saving...</TranslatedText>
                : isProfileComplete && !bankDetailsAdded
                  ? <><TranslatedText>Save & Continue to Payout Setup</TranslatedText> <ArrowRight className="w-4 h-4" /></>
                  : isVerified
                    ? <TranslatedText>Save & Re-verify Account</TranslatedText>
                    : <TranslatedText>Save Progress</TranslatedText>
              }
            </button>
          </div>
        </div>
      </form>

      {/* ── STEP 2: Finance / Banking Section ── */}
      <div
        id="finance-section"
        ref={financeRef}
        className={`transition-all duration-700 ease-out overflow-hidden ${
          isStep2 ? 'max-h-[2000px] opacity-100 mt-12' : 'max-h-0 opacity-0 mt-0'
        }`}
      >
        <div className="border-t-2 border-dashed border-blue-200 pt-10">
          {/* Step 2 Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-blue-900">
                <TranslatedText>Step 2: Payout Setup</TranslatedText>
              </h2>
              <p className="text-sm text-blue-500 mt-0.5">
                <TranslatedText>Add your bank account or UPI to receive payments from patient appointments</TranslatedText>
              </p>
            </div>
            {bankDetailsAdded && (
              <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <TranslatedText>Saved</TranslatedText>
              </span>
            )}
          </div>

          {/* Payout method tabs */}
          <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6 mb-6">
            <div className="flex gap-2 mb-6 bg-blue-50 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setPayoutMethod('bank')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  payoutMethod === 'bank'
                    ? 'bg-white text-blue-800 shadow-sm border border-blue-100'
                    : 'text-blue-500 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Landmark className="w-4 h-4" />
                  <TranslatedText>Bank Account</TranslatedText>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPayoutMethod('upi')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  payoutMethod === 'upi'
                    ? 'bg-white text-blue-800 shadow-sm border border-blue-100'
                    : 'text-blue-500 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <TranslatedText>UPI</TranslatedText>
                </div>
              </button>
            </div>

            <form onSubmit={handleBankSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Account Holder Name</TranslatedText> *</label>
                  <input
                    type="text"
                    value={bankForm.accountHolderName}
                    onChange={e => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                    className={inputCls}
                    required
                    placeholder="As per bank records"
                  />
                </div>

                {payoutMethod === 'bank' ? (
                  <>
                    <div>
                      <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Account Number</TranslatedText> *</label>
                      <input type="text" value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block label-lg text-blue-500 mb-2"><TranslatedText>IFSC Code</TranslatedText> *</label>
                      <input type="text" value={bankForm.ifscCode} onChange={e => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })} className={inputCls} placeholder="SBIN0001234" required />
                    </div>
                    <div>
                      <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Bank Name</TranslatedText> *</label>
                      <input type="text" value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Account Type</TranslatedText> *</label>
                      <select value={bankForm.accountType} onChange={e => setBankForm({ ...bankForm, accountType: e.target.value })} className={inputCls}>
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block label-lg text-blue-500 mb-2"><TranslatedText>Branch Name (Optional)</TranslatedText></label>
                      <input type="text" value={bankForm.branchName} onChange={e => setBankForm({ ...bankForm, branchName: e.target.value })} className={inputCls} />
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <label className="block label-lg text-blue-500 mb-2"><TranslatedText>UPI ID</TranslatedText> *</label>
                    <input type="text" value={bankForm.payoutUpiId} onChange={e => setBankForm({ ...bankForm, payoutUpiId: e.target.value.toLowerCase() })} className={inputCls} placeholder="yourname@upi" required />
                    <p className="text-xs text-blue-400 mt-1.5">Format: name@upi, name@okaxis, name@paytm etc.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingBank}
                  className="flex items-center gap-2.5 px-8 py-3 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-md disabled:opacity-50"
                >
                  {savingBank ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
                  {savingBank ? <TranslatedText>Saving...</TranslatedText> : <TranslatedText>Save Payout Details</TranslatedText>}
                </button>
              </div>
            </form>
          </div>

          {bankDetailsAdded && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold text-emerald-800 text-lg mb-1"><TranslatedText>Payout Setup Complete!</TranslatedText></h3>
              <p className="text-emerald-600 text-sm max-w-sm mx-auto">
                <TranslatedText>Your banking details have been saved. Payments from appointments will be automatically transferred to your account.</TranslatedText>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


