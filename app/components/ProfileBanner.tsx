'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, ArrowUpRight, ShieldAlert, Banknote, ShieldCheck } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useAuthToken } from '@/lib/auth-token-context';
import { TranslatedText } from '@/app/components/TranslatedText';
import { checkDoctorProfileComplete } from '@/lib/shared/profile-utils';

type BannerState = 'incomplete' | 'finance_missing' | 'unverified' | 'all_done' | null;

interface ProfileBannerProps {
  user: any;
  uid?: string; // DB uid passed from server layout to avoid sync-user call
}

export default function ProfileBanner({ user, uid: uidProp }: ProfileBannerProps) {
  const [show, setShow] = useState(false);
  const [state, setState] = useState<BannerState>(null);
  const [percentage, setPercentage] = useState(100);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const token = useAuthToken();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user?.id) {
      checkProfileStatus();
    }
  }, [user]);

  async function checkProfileStatus() {
    try {
      // Use uidProp if passed (avoids the 401 sync-user call from client)
      // Otherwise fall back to Clerk user id for the profile fetch
      const uid = uidProp || user?.id;
      if (!uid) return;

      const profileRes = await fetchWithAuth(`/api/doctor/profile`, token);

      const profileData = await profileRes.json();
      if (!profileData.success || !profileData.doctor) return;

      const completeness = checkDoctorProfileComplete(profileData.doctor, profileData.user);
      const isVerified = Boolean(profileData.doctor.is_verified);

      if (!completeness.isComplete) {
        setPercentage(completeness.percentage);
        setMissingFields(completeness.missingFields);
        setState('incomplete');
        const isDismissed = localStorage.getItem('dismissed_banner_incomplete') === 'true';
        if (!isDismissed) {
          setTimeout(() => setShow(true), 400);
        }
        return;
      }

      // Profile complete — check bank details from the doctor object
      const doc = profileData.doctor;
      const hasBankDetails = Boolean(doc.bank_details_added_at || doc.payout_upi_id || doc.bank_account_number);
      if (!hasBankDetails) {
        setState('finance_missing');
        const isDismissed = localStorage.getItem('dismissed_banner_finance_missing') === 'true';
        if (!isDismissed) {
          setTimeout(() => setShow(true), 400);
        }
        return;
      }

      if (!isVerified) {
        setState('unverified');
        const isDismissed = localStorage.getItem('dismissed_banner_unverified') === 'true';
        if (!isDismissed) {
          setTimeout(() => setShow(true), 400);
        }
      } else {
        // Fully verified doctor with payouts set up! Replace banner entirely (do not show).
        setState(null);
        setShow(false);
      }
    } catch (e) {
      console.error('ProfileBanner: error checking status', e);
    }
  }

  const handleDismiss = () => {
    setShow(false);
    if (state) {
      localStorage.setItem(`dismissed_banner_${state}`, 'true');
    }
  };

  const HIDDEN_PATHS = ['/dashboard/profile', '/dashboard/finance'];
  if (HIDDEN_PATHS.some(p => pathname?.startsWith(p))) return null;
  if (!state) return null;

  const cfg = {
    incomplete: {
      bg: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-600',
      icon: <ArrowUpRight className="w-6 h-6 sm:w-7 sm:h-7 text-white" />,
      titleColor: 'text-blue-900',
      bodyColor: 'text-blue-600',
      dotColor: '#3b82f6',
      btnBg: 'bg-blue-600 hover:bg-blue-700',
      dismissHover: 'hover:bg-blue-100 text-blue-400',
      barBg: 'bg-blue-100',
      barFill: 'bg-blue-600',
    },
    finance_missing: {
      bg: 'bg-emerald-50 border-emerald-200',
      iconBg: 'bg-emerald-600',
      icon: <Banknote className="w-6 h-6 sm:w-7 sm:h-7 text-white" />,
      titleColor: 'text-emerald-900',
      bodyColor: 'text-emerald-700',
      dotColor: '#10b981',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700',
      dismissHover: 'hover:bg-emerald-100 text-emerald-400',
      barBg: '',
      barFill: '',
    },
    unverified: {
      bg: 'bg-amber-50 border-amber-200',
      iconBg: 'bg-amber-500',
      icon: <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 text-white" />,
      titleColor: 'text-amber-900',
      bodyColor: 'text-amber-700',
      dotColor: '#f59e0b',
      btnBg: 'bg-amber-500 hover:bg-amber-600',
      dismissHover: 'hover:bg-amber-100 text-amber-400',
      barBg: '',
      barFill: '',
    },
    all_done: {
      bg: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-600',
      icon: <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-white" />,
      titleColor: 'text-blue-900',
      bodyColor: 'text-blue-700',
      dotColor: '#3b82f6',
      btnBg: 'bg-blue-600 hover:bg-blue-700',
      dismissHover: 'hover:bg-blue-100 text-blue-400',
      barBg: '',
      barFill: '',
    },
  }[state];

  const titleMap = {
    incomplete: `Complete Your Profile (${percentage}%)`,
    finance_missing: 'Add Banking Details',
    unverified: 'Profile Pending Verification',
    all_done: 'You are Verified',
  };

  const ctaMap = {
    incomplete: 'Complete Now',
    finance_missing: 'Set Up Payouts',
    unverified: 'View Profile',
    all_done: 'View Appointments',
  };

  const hrefMap = {
    incomplete: '/dashboard/profile',
    finance_missing: '/dashboard/finance',
    unverified: '/dashboard/profile',
    all_done: '/dashboard/appointments',
  };

  return (
    <div
      className={`transition-all duration-500 ease-in-out grid ${
        show ? 'opacity-100 mt-6 mb-2' : 'opacity-0 mt-0 mb-0 pointer-events-none'
      }`}
      style={{
        gridTemplateRows: show ? '1fr' : '0fr',
        transition: 'grid-template-rows 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms ease-in-out, margin 500ms cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="overflow-hidden min-h-0 px-4 sm:px-6 md:px-8">
        <div className={`border p-5 rounded-3xl shadow-sm relative overflow-hidden ${cfg.bg}`}>
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ pointerEvents: 'none' }}>
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle, ${cfg.dotColor} 1.2px, transparent 1.2px)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 flex items-start sm:items-center space-x-4 sm:space-x-5">
            {/* Icon */}
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-md shrink-0 ${cfg.iconBg}`}>
              {cfg.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className={`text-base sm:text-lg font-bold mb-0.5 ${cfg.titleColor}`}>
                <TranslatedText>{titleMap[state]}</TranslatedText>
              </h3>

              {state === 'incomplete' && (
                <p className={`text-xs sm:text-sm font-medium ${cfg.bodyColor}`}>
                  {missingFields.length} <TranslatedText>fields remaining</TranslatedText>:{' '}
                  <span className="opacity-75">{missingFields.slice(0, 3).join(', ')}</span>
                  {missingFields.length > 3 && (
                    <span className="opacity-75"> +{missingFields.length - 3} <TranslatedText>more</TranslatedText></span>
                  )}
                </p>
              )}
              {state === 'finance_missing' && (
                <p className={`text-xs sm:text-sm font-medium ${cfg.bodyColor}`}>
                  <TranslatedText>Your profile is verified. Add your bank account or UPI to receive payments from patient appointments.</TranslatedText>
                </p>
              )}
              {state === 'unverified' && (
                <p className={`text-xs sm:text-sm font-medium max-w-2xl ${cfg.bodyColor}`}>
                  <TranslatedText>Your profile is under review. Once verified by our team, you'll be publicly listed to accept appointments.</TranslatedText>
                </p>
              )}
              {state === 'all_done' && (
                <p className={`text-xs sm:text-sm font-medium max-w-2xl ${cfg.bodyColor}`}>
                  <TranslatedText>Your profile and finance details are verified. You will receive your consultancy fee in 1-2 hours only.</TranslatedText>
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center w-full sm:w-auto gap-3 self-end sm:self-auto">
            <button
              onClick={() => router.push(hrefMap[state])}
              className={`flex-1 sm:flex-shrink-0 px-6 sm:px-8 py-2.5 sm:py-3 text-white text-sm font-bold rounded-full transition-all transform hover:scale-[1.03] shadow-sm whitespace-nowrap ${cfg.btnBg}`}
            >
              <TranslatedText>{ctaMap[state]}</TranslatedText>
            </button>
            <button
              onClick={handleDismiss}
              className={`flex-shrink-0 p-2 rounded-full transition-colors ${cfg.dismissHover}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar — only for incomplete */}
        {state === 'incomplete' && (
          <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${cfg.barBg}`}>
            <div
              className={`h-full transition-all duration-1000 ease-out ${cfg.barFill}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
