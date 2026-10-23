'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface CompletionData {
  overallPercentage: number;
  profilePercentage: number;
  payoutPercentage: number;
  missingFields: string[];
  isVerified: boolean;
  verificationRejected: boolean;
  verificationNotes: string | null;
}

export default function VerificationGuard({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [data, setData] = useState<CompletionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchCompletion() {
      try {
        const response = await fetch(`/api/doctor/profile/completion?t=${Date.now()}`, { cache: 'no-store' });
        const result = await response.json();
        if (result.success) {
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch completion:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCompletion();
  }, [userId]);

  const isProfilePage = pathname.includes('/dashboard/profile');
  const isDashboardRoot = pathname === '/dashboard';
  const is100Percent = data ? data.overallPercentage >= 100 : false;

  // Perform redirect if needed, safe to call unconditionally since it checks conditions inside
  useEffect(() => {
    if (!loading && data) {
      if (!isProfilePage && !isDashboardRoot && !data.isVerified) {
        router.replace('/dashboard/profile');
      }
    }
  }, [loading, data, isProfilePage, isDashboardRoot, router]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4" />
        <p className="text-gray-500">Checking verification status...</p>
      </div>
    );
  }

  if (!data) return <>{children}</>;


  // If verified, allow access
  if (data.isVerified) {
    return <>{children}</>;
  }

  // If on profile page, allow access but we will show the banner there
  if (isProfilePage) {
    return <>{children}</>;
  }

  // If on dashboard root, allow access but show a BIG overlay/banner button
  if (isDashboardRoot && !data.isVerified) {
    return (
      <div className="relative w-full h-full">
        {children}
        {/* Full screen fixed overlay with big button */}
        <div className="fixed inset-0 z-[9999] bg-white/50 backdrop-blur-md flex items-center justify-center p-6">
           <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden text-center p-10 relative animate-in fade-in zoom-in duration-300">
             <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-white shadow-sm">
                <ShieldAlert className="w-10 h-10 text-amber-500" />
             </div>
             <h2 className="text-3xl font-black text-gray-900 mb-4">Complete Verification</h2>
             <p className="text-gray-600 mb-8 text-lg font-medium leading-relaxed">
               You need to complete your profile and get verified by an admin before you can manage patients and appointments.
             </p>
             <Link 
               href="/dashboard/profile"
               className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-emerald-500/30 text-lg"
             >
               Go to Profile
               <ArrowRight className="w-5 h-5" />
             </Link>
           </div>
        </div>
      </div>
    );
  }

  // Otherwise, block access and wait for the redirect to happen
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[500px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4" />
      <p className="text-gray-500">Redirecting to Profile Setup...</p>
    </div>
  );
}
