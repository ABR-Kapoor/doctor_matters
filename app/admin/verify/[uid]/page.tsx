'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminVerificationPage({ params }: { params: { uid: string } }) {
    const searchParams = useSearchParams();
    const action = searchParams?.get('action') || 'approve';
    const token = searchParams?.get('token');
    const uid = params.uid;

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [reason, setReason] = useState('');

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
                body: JSON.stringify({ uid, action, token, reason })
            });
            const data = await res.json();
            
            if (data.success) {
                setSuccess(true);
            } else {
                toast.error(data.error || 'Verification failed');
            }
        } catch (err) {
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
                        The doctor has been notified and their profile status has been updated in the system.
                    </p>
                    <p className="text-xs text-slate-400">You can safely close this window.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center">
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6 ${action === 'approve' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {action === 'approve' ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> : <AlertCircle className="w-8 h-8 text-red-600" />}
                </div>
                
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
                </h1>
                
                <p className="text-slate-500 mb-6">
                    You are about to {action} the doctor profile for ID: <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 break-all">{uid}</span>
                </p>

                {action === 'reject' && (
                    <div className="mb-6 text-left">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Reason for Rejection</label>
                        <textarea 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Please upload a clearer image of your medical license."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                            rows={4}
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
