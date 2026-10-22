'use client';
 
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pill, Send, TrendingUp, Edit, Clock, Trash, Plus, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { TranslatedText } from '@/app/components/TranslatedText';
import { NameText } from '@/app/components/NameText';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import PageLoader from '@/app/components/PageLoader';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'isomorphic-dompurify';
import { formatDate } from '@/lib/shared/utils';
import { useDoctorIdentity } from '@/app/hooks/queries/useDoctorIdentity';
import { useDoctorPrescriptions } from '@/app/hooks/queries/useDoctorPrescriptions';
import { useQueryClient, useQueries } from '@tanstack/react-query';
import VerificationGuard from '@/app/components/VerificationGuard';

interface Prescription {
  prescription_id: string;
  diagnosis: string;
  medicines: any[];
  created_at: string;
  sent_to_patient: boolean;
  sent_at: string | null;
  patients: {
    pid: string;
    city: string;
    state: string;
    users: {
      name: string;
      email: string;
      profile_image_url: string;
    };
  };
}

function PrescriptionsContent() {
  const token = useAuthToken();
  const { translate } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modal & Stats State
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, 'schedule' | 'progress'>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // ── TanStack Query ──
  const { data: identity } = useDoctorIdentity(token);
  const did = identity?.did || null;
  const { data: prescriptions = [], isLoading } = useDoctorPrescriptions(did, token);

  async function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(await translate('✅ Copied to clipboard!'));
  }

  async function sendPrescription(prescriptionId: string) {
    setSendingId(prescriptionId);
    try {
      const response = await fetchWithAuth(`/api/doctor/prescriptions/${prescriptionId}/send`, token, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(await translate('Prescription sent to patient!'));
        queryClient.invalidateQueries({ queryKey: ['doctor', 'prescriptions', did] });
      } else {
        toast.error(await translate(data.error || 'Failed to send prescription'));
      }
    } catch (error) {
      console.error('Error sending prescription:', error);
      toast.error(await translate('Failed to send prescription'));
    } finally {
      setSendingId(null);
    }
  }

  const statsQueries = useQueries({
    queries: prescriptions.map(rx => ({
      queryKey: ['prescriptionStats', rx.prescription_id],
      queryFn: async () => {
        const res = await fetchWithAuth(`/api/doctor/adherence/${rx.prescription_id}`, token);
        const data = await res.json();
        if (data.success && data.stats) {
          return {
            overallPercentage: data.stats.adherence_rate ?? 0,
            daily_adherence_rate: data.stats.daily_adherence_rate ?? 0,
            takenDoses: data.stats.taken ?? 0,
            totalDoses: data.stats.total_doses ?? 0,
            skippedDoses: data.stats.skipped ?? 0,
            notTakenDoses: data.stats.not_taken ?? 0,
            todayScheduled: data.stats.today_scheduled ?? 0,
            todayTaken: data.stats.today_taken ?? 0,
            todaySkipped: data.stats.today_skipped ?? 0,
            todayNotTaken: data.stats.today_not_taken ?? 0,
            breakdown: Array.isArray(data.stats.medicine_breakdown) ? data.stats.medicine_breakdown.map((m: any) => ({
              medicineName: m.medicine_name || 'Unknown Medicine',
              percentage: m.adherence_rate ?? 0,
              taken: m.taken ?? 0,
              elapsedTotal: m.elapsedTotal ?? 0,
              total: m.total ?? 0
            })) : []
          };
        }
        return {
            overallPercentage: 0,
            daily_adherence_rate: 0,
            takenDoses: 0,
            totalDoses: 0,
            skippedDoses: 0,
            notTakenDoses: 0,
            todayScheduled: 0,
            todayTaken: 0,
            todaySkipped: 0,
            todayNotTaken: 0,
            breakdown: []
        };
      },
      enabled: !!token,
      staleTime: Infinity,
      refetchInterval: 15000,
    }))
  });

  const stats = useMemo(() => {
    const map: Record<string, any> = {};
    prescriptions.forEach((rx, index) => {
      const q = statsQueries[index];
      if (q.data) {
        map[rx.prescription_id] = q.data;
      }
    });
    return map;
  }, [statsQueries, prescriptions]);

  const loadingStats = statsQueries.some(q => q.isLoading);
  async function deletePrescription(prescriptionId: string) {
    setConfirmDialog({
      message: await translate('Are you sure you want to delete this prescription? This action cannot be undone.'),
      onConfirm: () => _doDeletePrescription(prescriptionId),
    });
  }

  async function _doDeletePrescription(prescriptionId: string) {
    try {
      const response = await fetchWithAuth(`/api/doctor/prescriptions/${prescriptionId}`, token, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success(await translate('Prescription deleted successfully'));
        queryClient.invalidateQueries({ queryKey: ['doctor', 'prescriptions', did] });
      } else {
        toast.error(await translate(data.error || 'Failed to delete prescription'));
      }
    } catch (error) {
      console.error('Error deleting prescription:', error);
      toast.error(await translate('Failed to delete prescription'));
    }
  }

  if (isLoading && !prescriptions.length) return <PageLoader />;

  // Helper function to parse medicines if it's a string
  const parseMedicines = (medicines: any) => {
    if (typeof medicines === 'string') {
      try {
        return JSON.parse(medicines);
      } catch {
        return [];
      }
    }
    return Array.isArray(medicines) ? medicines : [];
  };

  const sentPrescriptions = prescriptions.filter(p => p.sent_to_patient);
  const draftPrescriptions = prescriptions.filter(p => !p.sent_to_patient);

  return (
    <div className="space-y-8 pb-12 p-4 sm:p-6 lg:p-8 xl:p-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <span className="pill-badge mb-4 inline-block">
            <Pill className="w-3 h-3" /> <TranslatedText>Prescriptions</TranslatedText>
          </span>
          <h1 className="headline-lg mb-1">
            <TranslatedText>Patient</TranslatedText>{' '}
            <span className="text-blue-600 italic"><TranslatedText>Prescriptions</TranslatedText></span>
          </h1>
          <p className="body-md text-blue-600 max-w-xl">
            <TranslatedText>Manage patient prescriptions and track adherence</TranslatedText>
          </p>
        </div>
        <Link href="/dashboard/prescriptions/new" className="btn-primary shrink-0 self-start">
          <Plus className="w-4 h-4" />
          <span><TranslatedText>New Prescription</TranslatedText></span>
        </Link>
      </div>

      {/* Drafts/Unsent */}
      {draftPrescriptions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="pill-badge bg-blue-50 text-blue-700 border-blue-100">
              <Clock className="w-3 h-3" /> <TranslatedText>Drafts</TranslatedText>
            </span>
            <h2 className="headline-md text-blue-900">
              <TranslatedText>Draft Prescriptions</TranslatedText>{' '}
              <span className="text-blue-400 text-base font-sans">({draftPrescriptions.length})</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {draftPrescriptions.map((prescription) => (
              <div
                key={prescription.prescription_id}
                className="group relative bg-blue-50 rounded-2xl overflow-hidden shadow-md border border-blue-100 transition-all duration-300 hover:shadow-xl flex flex-col"
              >
                {/* Main Visual (Patient Image or Placeholder) */}
                <div className="flex-1 relative bg-blue-50/50 flex flex-col items-center justify-center p-6 min-h-[220px]">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white border-4 border-white shadow-lg mb-4 transform transition-transform duration-500 group-hover:scale-110">
                    {prescription.patients?.users?.profile_image_url ? (
                      <img
                        src={prescription.patients.users.profile_image_url}
                        alt={prescription.patients.users.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-2xl">
                        {prescription.patients?.users?.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 text-center px-4 truncate w-full">
                    <NameText name={prescription.patients?.users?.name} fallback="Unknown Patient" />
                  </h3>
                  <p className="text-sm text-gray-500 mt-1"><TranslatedText>{prescription.diagnosis}</TranslatedText></p>

                  <span className="absolute top-4 right-4 pill-badge bg-blue-50 text-blue-700 border-blue-100">
                    <TranslatedText>DRAFT</TranslatedText>
                  </span>
                </div>

                {/* Always-visible mobile action bar */}
                <div className="md:hidden px-4 pb-4 flex flex-col gap-2 bg-white/80 border-t border-blue-100">
                  <p className="text-xs font-medium text-gray-500 pt-2 truncate">
                    ID: #{prescription.prescription_id.slice(-8).toUpperCase()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/prescriptions/${prescription.prescription_id}/edit`)}
                      className="flex-1 py-2 px-3 bg-white text-gray-900 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" /><span><TranslatedText>Edit</TranslatedText></span>
                    </button>
                    <button
                      onClick={() => sendPrescription(prescription.prescription_id)}
                      disabled={sendingId === prescription.prescription_id}
                      className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-700 disabled:opacity-70 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" /><span><TranslatedText>Send</TranslatedText></span>
                    </button>
                    <button
                      onClick={() => deletePrescription(prescription.prescription_id)}
                      className="py-2 px-3 text-red-500 hover:bg-red-50 rounded-xl text-xs transition-colors border border-transparent hover:border-red-200"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Hover Overlay — desktop only */}
                <div className="hidden md:flex absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col items-center justify-center p-6 text-center">
                  <p className="text-white font-medium mb-1"><TranslatedText>ID</TranslatedText>: #{prescription.prescription_id.slice(-8).toUpperCase()}</p>
                  <p className="text-gray-200 text-sm mb-6">{parseMedicines(prescription.medicines).map((med: any) => med.name).join(', ')}</p>

                  <div className="flex flex-col space-y-3 w-full max-w-xs">
                    <button
                      onClick={() => router.push(`/dashboard/prescriptions/${prescription.prescription_id}/edit`)}
                      className="py-2.5 px-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span><TranslatedText>Edit Draft</TranslatedText></span>
                    </button>
                    <button
                      onClick={() => sendPrescription(prescription.prescription_id)}
                      disabled={sendingId === prescription.prescription_id}
                      className="py-2.5 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-70"
                    >
                      <Send className="w-4 h-4" />
                      <span><TranslatedText>{sendingId === prescription.prescription_id ? 'Sending...' : 'Send Now'}</TranslatedText></span>
                    </button>
                    <button
                      onClick={() => deletePrescription(prescription.prescription_id)}
                      className="py-2 px-4 text-red-300 hover:text-red-200 text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Trash className="w-4 h-4" />
                      <span><TranslatedText>Delete</TranslatedText></span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Prescriptions */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="pill-badge">
            <Pill className="w-3 h-3" /> <TranslatedText>Active</TranslatedText>
          </span>
          <h2 className="headline-md text-blue-900">
            <TranslatedText>Sent Prescriptions</TranslatedText>{' '}
            <span className="text-blue-400 text-base font-sans">({sentPrescriptions.length})</span>
          </h2>
        </div>

        {sentPrescriptions.length === 0 ? (
          <div className="card-base p-12 text-center">
            <Pill className="w-12 h-12 text-blue-200 mx-auto mb-4" />
            <p className="body-md text-blue-600"><TranslatedText>No sent prescriptions yet</TranslatedText></p>
            <Link href="/dashboard/prescriptions/new" className="text-blue-600 hover:underline mt-2 inline-block text-sm font-semibold">
              <TranslatedText>Create your first prescription</TranslatedText>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sentPrescriptions.map((prescription) => (
              <div
                key={prescription.prescription_id}
                className="group bg-blue-50 rounded-xl overflow-hidden shadow-sm border border-blue-100 transition-all duration-300 hover:shadow-lg hover:border-blue-300 cursor-pointer"
                onClick={() => {
                  setSelectedPrescription(prescription);
                  setActiveTab(prev => ({ ...prev, [prescription.prescription_id]: 'schedule' }));
                }}
              >
                <div className="p-4 flex items-center gap-3">
                  <div className="w-11 h-11 min-w-[2.75rem] rounded-full overflow-hidden border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-100">
                    {prescription.patients?.users?.profile_image_url ? (
                      <img src={prescription.patients.users.profile_image_url} alt={prescription.patients.users.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-blue-400 font-bold text-lg">
                        {prescription.patients?.users?.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 truncate">
                      <NameText name={prescription.patients?.users?.name} fallback="Unknown Patient" />
                    </h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      <TranslatedText>{prescription.diagnosis}</TranslatedText>
                    </p>
                  </div>
                </div>
                <div className="px-4 pb-3 flex items-center justify-between">
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="text-xs font-semibold text-gray-600">
                      <TranslatedText>ID</TranslatedText>: #{prescription.prescription_id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-700">
                      <span className="font-medium"><TranslatedText>Medicines</TranslatedText>:</span> {parseMedicines(prescription.medicines).map((med: any) => med.name).join(', ')}
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(prescription.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/prescriptions/${prescription.prescription_id}/edit`); }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePrescription(prescription.prescription_id); }}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal (Copied/Adapted from Patient View) */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-200 px-4 pb-4 !mt-0 pt-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0 gap-3">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 min-w-[2.5rem] min-h-[2.5rem] sm:min-w-[3rem] sm:min-h-[3rem] rounded-full overflow-hidden border border-gray-200 shrink-0">
                  {selectedPrescription.patients?.users?.profile_image_url ? (
                    <img src={selectedPrescription.patients.users.profile_image_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                      {selectedPrescription.patients?.users?.name?.[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate"><NameText name={selectedPrescription.patients?.users?.name} fallback="Patient" /></h2>
                  <p className="text-gray-500 text-xs sm:text-sm truncate"><TranslatedText>Diagnosis</TranslatedText>: <TranslatedText>{selectedPrescription.diagnosis}</TranslatedText></p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPrescription(null)}
                className="p-2 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-red-500" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">

              {/* Tabs Navigation */}
              <div className="flex justify-center mb-4">
                <div className="flex space-x-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                  <button
                    onClick={() => setActiveTab(prev => ({ ...prev, [selectedPrescription.prescription_id]: 'schedule' }))}
                    className={`flex-1 sm:flex-none px-3 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${(activeTab[selectedPrescription.prescription_id] || 'schedule') === 'schedule'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <TranslatedText>View Schedule</TranslatedText>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab(prev => ({ ...prev, [selectedPrescription.prescription_id]: 'progress' }));
                    }}
                    className={`flex-1 sm:flex-none px-3 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab[selectedPrescription.prescription_id] === 'progress'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <TranslatedText>Progress & Stats</TranslatedText>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {(activeTab[selectedPrescription.prescription_id] || 'schedule') === 'schedule' ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Medicine List (Read-only for Doctor) */}
                  <div className="bg-white p-5 rounded-3xl shadow-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                          <Pill className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            <TranslatedText>Prescribed Medicines</TranslatedText>
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            <TranslatedText>Total</TranslatedText>: {parseMedicines(selectedPrescription.medicines).length} <TranslatedText>medicines</TranslatedText>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {parseMedicines(selectedPrescription.medicines).map((med: any, idx: number) => (
                        <div key={idx} className="group relative p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/5 transition-all duration-300" />
                          
                          <div className="relative flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                                <h4 className="text-lg font-bold text-gray-900"><TranslatedText>{med.name}</TranslatedText></h4>
                              </div>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pl-5">
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    <TranslatedText>Dosage</TranslatedText>
                                  </p>
                                  <p className="text-sm font-semibold text-gray-900">{med.dosage}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    <TranslatedText>Frequency</TranslatedText>
                                  </p>
                                  <p className="text-sm font-semibold text-gray-900"><TranslatedText>{med.frequency}</TranslatedText></p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    <TranslatedText>Duration</TranslatedText>
                                  </p>
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                    <TranslatedText>{med.duration}</TranslatedText>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions Block */}
                  {selectedPrescription.instructions && (
                    <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                      <h4 className="font-bold text-blue-800 mb-2 text-sm uppercase tracking-wide"><TranslatedText>Your Instructions</TranslatedText></h4>
                      <div className="prose prose-sm prose-blue max-w-none text-blue-900 leading-relaxed">
                        <ReactMarkdown>{DOMPurify.sanitize(selectedPrescription.instructions || '')}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Diet Advice Block */}
                  {selectedPrescription.diet_advice && (
                    <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 mt-4">
                      <h4 className="font-bold text-orange-800 mb-2 text-sm uppercase tracking-wide"><TranslatedText>Dietary Advice</TranslatedText></h4>
                      <div className="prose prose-sm prose-orange max-w-none text-orange-900 leading-relaxed">
                        <ReactMarkdown>{DOMPurify.sanitize(selectedPrescription.diet_advice || '')}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  {loadingStats ? (
                    <div className="py-12"><PageLoader /></div>
                  ) : stats[selectedPrescription.prescription_id] ? (
                    <div className="grid sm:grid-cols-2 gap-6">
                      {/* Prominent Cards Area */}
                      <div className="flex flex-col gap-4">
                        {/* Today's Dose Record */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                              <TranslatedText>Today's Dose Record</TranslatedText>
                            </span>
                            <span className="text-sm font-bold text-gray-900">{stats[selectedPrescription.prescription_id]?.daily_adherence_rate}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats[selectedPrescription.prescription_id]?.daily_adherence_rate || 0}%` }}></div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <div className="text-sm font-bold text-gray-900">{stats[selectedPrescription.prescription_id]?.todayScheduled || 0}</div>
                              <div className="text-[8px] font-bold tracking-widest text-gray-500 uppercase"><TranslatedText>Total</TranslatedText></div>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded-lg">
                              <div className="text-sm font-bold text-emerald-600">{stats[selectedPrescription.prescription_id]?.todayTaken || 0}</div>
                              <div className="text-[8px] font-bold tracking-widest text-emerald-600 uppercase"><TranslatedText>Taken</TranslatedText></div>
                            </div>
                            <div className="p-2 bg-yellow-50 rounded-lg">
                              <div className="text-sm font-bold text-yellow-600">{stats[selectedPrescription.prescription_id]?.todaySkipped || 0}</div>
                              <div className="text-[8px] font-bold tracking-widest text-yellow-600 uppercase"><TranslatedText>Skipped</TranslatedText></div>
                            </div>
                            <div className="p-2 bg-red-50 rounded-lg">
                              <div className="text-sm font-bold text-red-600">{stats[selectedPrescription.prescription_id]?.todayNotTaken || 0}</div>
                              <div className="text-[8px] font-bold tracking-widest text-red-600 uppercase"><TranslatedText>Not Taken</TranslatedText></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Overall Dose Record */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                              <TranslatedText>Overall Dose Record</TranslatedText>
                            </span>
                            <span className="text-sm font-bold text-gray-900">{stats[selectedPrescription.prescription_id]?.overallPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                            <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats[selectedPrescription.prescription_id]?.overallPercentage || 0}%` }}></div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <div className="text-sm font-bold text-gray-900">{stats[selectedPrescription.prescription_id]?.totalDoses || 0}</div>
                              <div className="text-[8px] font-bold tracking-widest text-gray-500 uppercase"><TranslatedText>Total</TranslatedText></div>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded-lg">
                              <div className="text-sm font-bold text-emerald-600">{stats[selectedPrescription.prescription_id]?.takenDoses || 0}</div>
                              <div className="text-[8px] font-bold tracking-widest text-emerald-600 uppercase"><TranslatedText>Taken</TranslatedText></div>
                            </div>
                            <div className="p-2 bg-yellow-50 rounded-lg">
                              <div className="text-sm font-bold text-yellow-600">{stats[selectedPrescription.prescription_id]?.skippedDoses || 0}</div>
                              <div className="text-[8px] font-bold tracking-widest text-yellow-600 uppercase"><TranslatedText>Skipped</TranslatedText></div>
                            </div>
                            <div className="p-2 bg-red-50 rounded-lg">
                              <div className="text-sm font-bold text-red-600">{stats[selectedPrescription.prescription_id]?.notTakenDoses || 0}</div>
                              <div className="text-[8px] font-bold tracking-widest text-red-600 uppercase"><TranslatedText>Not Taken</TranslatedText></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Medicine Breakdown */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                          <Pill className="w-5 h-5 text-gray-400" />
                          <TranslatedText>Detailed Breakdown</TranslatedText>
                        </h3>
                        <div className="space-y-6">
                          {stats[selectedPrescription.prescription_id]?.breakdown?.map((med: any, idx: number) => (
                            <div key={idx} className="group">
                              <div className="flex justify-between items-end mb-2">
                                <div>
                                  <span className="font-bold text-gray-700 block text-sm"><TranslatedText>{med.medicineName}</TranslatedText></span>
                                  <span className="text-xs text-gray-400 font-medium">{med.taken}/{med.total} <TranslatedText>doses taken</TranslatedText></span>
                                </div>
                                <span className="font-bold text-blue-600 text-lg">{med.percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${med.percentage >= 80 ? 'bg-blue-500' :
                                    med.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                  style={{ width: `${med.percentage}%` }}
                                >
                                  <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!stats[selectedPrescription.prescription_id]?.breakdown || stats[selectedPrescription.prescription_id]?.breakdown.length === 0) && (
                            <p className="text-center text-gray-400 py-4"><TranslatedText>No data available for individual medicines.</TranslatedText></p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : !selectedPrescription.sent_to_patient ? (
                    <div className="text-center py-24">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-gray-500 font-medium mb-4"><TranslatedText>Send this prescription to the patient to enable adherence tracking</TranslatedText></p>
                      <button
                        onClick={() => {
                          sendPrescription(selectedPrescription.prescription_id);
                          setSelectedPrescription(null);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        <Send className="w-4 h-4 inline mr-2" />
                        <span><TranslatedText>Send Now</TranslatedText></span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-24">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium"><TranslatedText>No adherence data recorded yet. Patient will start tracking once they take their medications.</TranslatedText></p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <p className="text-sm font-semibold text-blue-900 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <TranslatedText>Cancel</TranslatedText>
              </button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                <TranslatedText>Delete</TranslatedText>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DoctorPrescriptionsPage() {
  return (
    <VerificationGuard>
      <PrescriptionsContent />
    </VerificationGuard>
  );
}
