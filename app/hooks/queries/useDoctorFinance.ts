import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { checkDoctorProfileComplete } from '@/lib/shared/profile-utils';

export interface FinanceData {
  uid: string;
  isProfileComplete: boolean;
  isVerified: boolean;
  bankDetailsAdded: boolean;
  bankForm: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountType: string;
    branchName: string;
    payoutUpiId: string;
  };
  payoutMethod: 'bank' | 'upi';
  earnings: any[];
  totalEarnings: number;
  pendingEarnings: number;
}

export function useDoctorFinance(uid: string | null, token: string | null) {
  return useQuery<FinanceData>({
    queryKey: ['doctor', 'finance', uid],
    queryFn: async () => {
      const [profileRes, bankRes, financeRes] = await Promise.all([
        fetchWithAuth(`/api/doctor/profile?uid=${uid}`, token),
        fetch(`/api/doctor/bank-details?uid=${uid}`),
        fetchWithAuth(`/api/doctor/finance?uid=${uid}`, token).catch(() => null),
      ]);

      const profileData = await profileRes.json();
      let isProfileComplete = false;
      let isVerified = false;
      if (profileData.success) {
        const completeness = checkDoctorProfileComplete(profileData.doctor, profileData.user);
        isProfileComplete = completeness.isComplete;
        isVerified = Boolean(profileData.doctor?.is_verified);
      }

      let bankDetailsAdded = false;
      let bankForm = {
        accountHolderName: '', accountNumber: '', ifscCode: '',
        bankName: '', accountType: 'savings', branchName: '', payoutUpiId: '',
      };
      let payoutMethod: 'bank' | 'upi' = 'bank';
      try {
        const bankData = await bankRes.json();
        if (bankData.bankDetails?.addedAt) {
          bankDetailsAdded = true;
          if (bankData.bankDetails.accountHolderName) {
            bankForm = {
              accountHolderName: bankData.bankDetails.accountHolderName || '',
              accountNumber: bankData.bankDetails.accountNumber || '',
              ifscCode: bankData.bankDetails.ifscCode || '',
              bankName: bankData.bankDetails.bankName || '',
              accountType: bankData.bankDetails.accountType || 'savings',
              branchName: bankData.bankDetails.branchName || '',
              payoutUpiId: bankData.bankDetails.payoutUpiId || '',
            };
            payoutMethod = bankData.bankDetails.payoutMethod || 'bank';
          }
        }
      } catch { /* non-fatal */ }

      let earnings: any[] = [];
      let totalEarnings = 0;
      let pendingEarnings = 0;
      try {
        if (financeRes?.ok) {
          const financeData = await financeRes.json();
          if (financeData.success && financeData.earnings) {
            earnings = financeData.earnings.transactions || [];
            totalEarnings = financeData.earnings.total_doctor_earned || 0;
            pendingEarnings = financeData.earnings.total_pending_amount || 0;
          }
        }
      } catch { /* non-fatal */ }

      return {
        uid: uid as string,
        isProfileComplete,
        isVerified,
        bankDetailsAdded,
        bankForm,
        payoutMethod,
        earnings,
        totalEarnings,
        pendingEarnings,
      };
    },
    staleTime: 5 * 60_000,
    enabled: !!(uid && uid.length > 0 && token),
  });
}
