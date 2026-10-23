'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, AlertCircle, User, ShieldCheck, Building, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminVerificationPage({ params }: { params: { uid: string } }) {
    const searchParams = useSearchParams();
    const initialAction = searchParams?.get('action') || 'approve';
    const uid = params.uid;

    const [action, setAction] = useState<'approve' | 'reject'>(initialAction === 'reject' ? 'reject' : 'approve');
    const [loading, setLoading] = useState(false);
    const [fetchingDoctor, setFetchingDoctor] = useState(true);
    const [doctorData, setDoctorData] = useState<any>(null);
    const [success, setSuccess] = useState(false);
    const [reason, setReason] = useState('');

    useEffect(() => {
        async function fetchDetails() {
            try {
                const res = await fetch(`/api/admin/verify?uid=${uid}`);
                const data = await res.json();
                if (data.success) {
                    setDoctorData(data);
                }
            } catch {
                // Ignore fetch errors, fallback to ID only
            } finally {
                setFetchingDoctor(false);
            }
        }
        if (uid) fetchDetails();
    }, [uid]);

    const handleAction = async () => {
        if (action === 'reject' && !reason.trim()) {
            toast.error('Please provide a reason for rejection.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, action, reason })
            });
            const data = await res.json();

            if (res.status === 401 || res.status === 403) {
                toast.error(data.message || 'Administrator access required. Please sign in as an admin.');
                return;
            }

            if (data.success) {
                setSuccess(true);
            } else {
                toast.error(data.error || 'Verification failed');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center">
                    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6 ${action === 'approve' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                        {action === 'approve' ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> : <XCircle className="w-8 h-8 text-amber-600" />}
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">
                        Profile {action === 'approve' ? 'Approved' : 'Rejected'}
                    </h1>
                    <p className="text-slate-500 mb-8">
                        The doctor has been notified and their profile verification status has been updated.
                    </p>
                    <p className="text-xs text-slate-400">You can safely close this window.</p>
                </div>
            </div>
        );
    }

    const user = doctorData?.user;
    const doctor = doctorData?.doctor;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
            <div className="max-w-xl w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3 bg-blue-100 text-blue-600">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Doctor Verification Review</h1>
                    <p className="text-xs text-slate-500 mt-1 font-mono">UID: {uid}</p>
                </div>

                {/* Doctor Summary Card */}
                {fetchingDoctor ? (
                    <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
                ) : user && doctor ? (
                    <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100 space-y-3">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                            {user.profile_image_url ? (
                                <img src={user.profile_image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500"><User className="w-6 h-6" /></div>
                            )}
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">{user.name}</h3>
                                <p className="text-xs text-slate-500">{user.email} • {user.phone || 'No phone'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-slate-400">Reg No:</span> <strong className="text-slate-700">{doctor.registration_number || 'N/A'}</strong></div>
                            <div><span className="text-slate-400">Experience:</span> <strong className="text-slate-700">{doctor.years_of_experience || 0} years</strong></div>
                            <div><span className="text-slate-400">Qualification:</span> <strong className="text-slate-700">{doctor.qualification || 'N/A'}</strong></div>
                            <div><span className="text-slate-400">Fee:</span> <strong className="text-slate-700">₹{doctor.consultation_fee || 0}</strong></div>
                        </div>

                        {doctor.clinic_name && (
                            <div className="text-xs flex items-center gap-1.5 text-slate-600 pt-1">
                                <Building className="w-3.5 h-3.5 text-slate-400" />
                                <span>{doctor.clinic_name} ({doctor.city || ''}, {doctor.state || ''})</span>
                            </div>
                        )}

                        <div className="text-xs flex items-center gap-1.5 text-slate-600 pt-1">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span>Payout: {doctor.payout_method === 'upi' ? `UPI: ${doctor.payout_upi_id || 'N/A'}` : `${doctor.bank_name || 'Bank'} (${doctor.bank_account_number ? '••••' + doctor.bank_account_number.slice(-4) : 'N/A'})`}</span>
                        </div>
                    </div>
                ) : null}

                {/* Approve / Reject Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button
                        type="button"
                        onClick={() => setAction('approve')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            action === 'approve' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Approve Doctor
                    </button>
                    <button
                        type="button"
                        onClick={() => setAction('reject')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            action === 'reject' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Reject Request
                    </button>
                </div>

                {action === 'reject' && (
                    <div className="mb-6 text-left">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reason for Rejection</label>
                        <textarea 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Medical registration number cannot be verified with the council registry."
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-xs"
                            rows={3}
                            required
                        />
                    </div>
                )}

                <button
                    onClick={handleAction}
                    disabled={loading}
                    className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                        action === 'approve' 
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                        : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                    }`}
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
                </button>
            </div>
        </div>
    );
}
