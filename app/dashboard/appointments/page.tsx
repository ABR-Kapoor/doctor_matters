'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect } from 'react';
import { Calendar, Video, MapPin, Check, X, Clock, User, CheckCircle, Phone, MoreVertical, Plus, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { TranslatedText } from '@/app/components/TranslatedText';
import { formatDate } from '@/lib/shared/utils';
import { NameText } from '@/app/components/NameText';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuthToken } from '@/lib/auth-token-context';
import PageLoader from '@/app/components/PageLoader';
import { useDoctorIdentity } from '@/app/hooks/queries/useDoctorIdentity';
import { useDoctorAppointments } from '@/app/hooks/queries/useDoctorAppointments';
import { useUpdateAppointmentStatus } from '@/app/hooks/mutations/useUpdateAppointmentStatus';
import { useChangeAppointmentMode } from '@/app/hooks/mutations/useChangeAppointmentMode';
import VerificationGuard from '@/app/components/VerificationGuard';

interface Appointment {
  aid: string;
  scheduled_date: string;
  scheduled_time: string;
  mode: string;
  status: string;
  complaint_description: string;
  symptoms?: string[];
  duration_minutes?: number;
  start_time?: string;
  end_time?: string;
  payment_status: string;
  queue_position?: number;
  token_number?: number;
  estimated_wait_minutes?: number;
  cancellation_reason?: string;
  refund_requested?: boolean;
  refund_amount?: number;
  refund_reason?: string;
  refund_status?: string;
  patient: {
    pid: string;
    user: {
      name: string;
      email: string;
      phone: string;
      profile_image_url?: string;
    };
  };
}

function MiniCalendar({ appointments }: { appointments: Appointment[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Count active appointments per date (exclude completed and cancelled)
  const aptCountMap = appointments.reduce<Record<string, number>>((acc, a) => {
    if (!a) return acc;
    const s = String(a.status || '').toLowerCase();
    if (s === 'completed' || s === 'complete' || s === 'done' || s === 'cancelled' || s === 'canceled' || s === 'rejected') {
      return acc;
    }

    const dateStr = String(a.scheduled_date || '').slice(0, 10);
    if (!dateStr || !dateStr.includes('-')) return acc;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return acc;

    const key = `${y}-${m - 1}-${d}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-blue-100 shadow-[var(--shadow-sm)]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-xl font-bold font-display text-blue-900">
            {monthName} {year}
          </h3>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-blue-50 text-blue-400 hover:text-blue-600 smooth-transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-blue-50 text-blue-400 hover:text-blue-600 smooth-transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="label-md text-blue-600"><TranslatedText>Calendar Overview</TranslatedText></p>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-blue-600 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const key = `${year}-${month}-${day}`;
          const count = aptCountMap[key] || 0;
          const hasApt = count > 0;
          const isHovered = hoveredKey === key;

          return (
            <div
              key={i}
              className="flex flex-col items-center relative"
              onMouseEnter={() => hasApt && setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {/* Tooltip */}
              {hasApt && isHovered && (
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                  <div className="bg-blue-900 text-white text-[9px] font-bold tracking-[0.1em] uppercase whitespace-nowrap px-2.5 py-1.5 rounded-full shadow-lg">
                    {count} <TranslatedText>{count === 1 ? 'Consultation' : 'Consultations'}</TranslatedText>
                  </div>
                  <div className="w-2 h-2 bg-blue-900 rotate-45 mx-auto -mt-1" />
                </div>
              )}

              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium smooth-transition cursor-default
                ${isToday ? 'bg-blue-600 text-white font-bold' : hasApt ? 'hover:bg-blue-100 text-blue-700' : 'text-blue-700 hover:bg-blue-50'}`}>
                {day}
              </div>
              {hasApt && (
                <div className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? 'bg-blue-300' : 'bg-blue-400'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentsContent() {
  const token = useAuthToken();
  const { translate } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as any;
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'today' | 'completed' | 'cancelled'>(
    (tabParam && ['pending', 'confirmed', 'today', 'completed', 'cancelled'].includes(tabParam)) ? tabParam : 'pending'
  );
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ── TanStack Query ──
  const { data: identity } = useDoctorIdentity(token);
  const uid = identity?.uid || null;
  const [hasActiveCall, setHasActiveCall] = useState(false);
  const { data: appointments, isLoading } = useDoctorAppointments(uid, token, hasActiveCall);
  const updateStatus = useUpdateAppointmentStatus();
  const changeMode = useChangeAppointmentMode();

  const aptsData = appointments || { pending: [], confirmed: [], today: [], completed: [], cancelled: [] };

  useEffect(() => {
    const handleClickOutside = () => { if (openDropdown) setOpenDropdown(null); };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  useEffect(() => {
    if (tabParam && ['pending', 'confirmed', 'today', 'completed', 'cancelled'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  async function updateAppointmentStatus(aid: string, status: string) {
    if (!uid) return;
    try {
      await updateStatus.mutateAsync({ aid, status, uid, token });
      toast.success(await translate(`Appointment ${status}`));
    } catch {
      toast.error(await translate('Failed to update appointment'));
    }
  }

  async function changeAppointmentMode(aid: string, newMode: 'online' | 'offline') {
    if (!uid) return;
    try {
      await changeMode.mutateAsync({ aid, mode: newMode, uid, token });
      toast.success(await translate(`Mode changed to ${newMode}`));
    } catch {
      toast.error(await translate('Failed to change mode'));
    }
  }

  if (isLoading && !appointments) return <PageLoader />;

  const tabs = [
    { id: 'pending', label: 'Pending', count: aptsData.pending.length },
    { id: 'confirmed', label: 'Confirmed', count: aptsData.confirmed.length },
    { id: 'today', label: 'Today', count: aptsData.today.length },
    { id: 'completed', label: 'Completed', count: aptsData.completed.length },
    { id: 'cancelled', label: 'Cancelled', count: aptsData.cancelled.length },
  ];

  const currentAppointments = aptsData[activeTab];
  const totalToday = aptsData.today.length;
  const totalPending = aptsData.pending.length;
  const totalCompleted = aptsData.completed.length;

  return (
    <div className="flex flex-col lg:flex-row gap-10 pb-12 p-4 sm:p-6 lg:p-8 xl:p-10">

      {/* Main Content */}
      <div className="flex-1 min-w-0">

        {/* Page Header */}
        <div className="mb-10">
          <span className="pill-badge mb-4 inline-block">
            <Calendar className="w-3 h-3" /><TranslatedText>Appointments</TranslatedText>
          </span>
          <h1 className="headline-lg mb-1">
            <TranslatedText>Consultation</TranslatedText>{' '}
            <span className="text-blue-600 italic"><TranslatedText>Schedule</TranslatedText></span>
          </h1>
          <p className="body-md text-blue-600 max-w-xl">
            <TranslatedText>Manage your appointments and patient consultations</TranslatedText>
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 sm:gap-8 border-b border-blue-100 overflow-x-auto scrollbar-hide mb-8 -mx-1 px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-xs font-bold tracking-[0.12em] uppercase smooth-transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-blue-700 border-b-2 border-blue-600'
                  : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              <TranslatedText>{tab.label}</TranslatedText>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Appointment List */}
        {currentAppointments.length === 0 ? (
          <div className="card-base p-12 text-center">
            <Calendar className="w-12 h-12 text-blue-200 mx-auto mb-4" />
            <p className="body-md text-blue-600"><TranslatedText>No appointments in this category</TranslatedText></p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentAppointments.map((apt, idx) => {
              const statusColor = apt.status === 'confirmed' ? 'border-blue-200' :
                apt.status === 'cancelled' ? 'border-red-200' :
                apt.status === 'completed' ? 'border-blue-100' : 'border-blue-100';

              const isFirst = idx === 0;

              return (
                <div
                  key={apt.aid}
                  className={`bg-white border ${statusColor} smooth-transition ${
                    isFirst ? 'rounded-[1.75rem] sm:rounded-[2.5rem] p-4 sm:p-8 shadow-[var(--shadow-md)]' : 'rounded-[1.75rem] p-5 hover:shadow-[var(--shadow-sm)]'
                  }`}
                >
                  <div className={`flex ${isFirst ? 'flex-col md:flex-row gap-6 items-start' : 'items-center gap-4'}`}>

                    {/* Avatar */}
                    <div className={`overflow-hidden border-2 border-white shadow-sm shrink-0 ${
                      isFirst ? 'w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl' : 'w-12 h-12 rounded-2xl'
                    }`}>
                      {apt.patient?.user?.profile_image_url ? (
                        <img src={apt.patient.user.profile_image_url} alt={apt.patient.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                          <User className={`text-blue-600 ${isFirst ? 'w-6 h-6 sm:w-10 sm:h-10' : 'w-5 h-5'}`} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className={`font-bold text-blue-900 ${isFirst ? 'text-xl mb-1' : 'text-sm'}`}>
                            <NameText name={apt.patient?.user?.name} fallback="Patient" />
                          </h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              {apt.mode === 'online' ? <Video className="w-3.5 h-3.5 text-blue-500" /> : <MapPin className="w-3.5 h-3.5 text-blue-500" />}
                              <span className="text-xs font-semibold text-blue-600 capitalize"><TranslatedText>{apt.mode}</TranslatedText></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-xs text-blue-600">
                                {formatDate(apt.scheduled_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-xs text-blue-600">{apt.scheduled_time}</span>
                            </div>
                            {apt.patient?.user?.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-blue-600" />
                                <span className="text-xs text-blue-600">{apt.patient.user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                          <span className={`pill-badge shrink-0 ${
                          apt.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          apt.status === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-50' :
                          apt.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          <TranslatedText>{apt.status}</TranslatedText>
                        </span>
                      </div>

                      {apt.complaint_description && (
                        <div className="bg-blue-50 rounded-2xl p-4 mb-4 mt-2">
                          <p className="label-md text-blue-600 mb-1"><TranslatedText>Patient's Complaint</TranslatedText></p>
                          <p className="body-md text-blue-700"><TranslatedText>{apt.complaint_description}</TranslatedText></p>
                          {apt.symptoms && apt.symptoms.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {apt.symptoms.map((sym, i) => (
                                <span key={i} className="px-2 py-1 bg-white text-blue-600 text-[10px] font-bold rounded-md border border-blue-100 uppercase tracking-wider">{sym}</span>
                              ))}
                            </div>
                          )}
                           {apt.status === 'cancelled' && apt.cancellation_reason && (
                             <div className="mt-3 bg-red-50 rounded-2xl p-4 border border-red-100">
                               <p className="label-md text-red-600 mb-1"><TranslatedText>Reason for Cancellation</TranslatedText></p>
                               <p className="body-md text-red-700 italic"><TranslatedText>{apt.cancellation_reason}</TranslatedText></p>
                             </div>
                           )}

                           {/* Refund Request Banner — visible to doctor */}
                           {apt.status === 'cancelled' && apt.refund_requested && (
                             <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                               <div className="flex items-center gap-2 mb-2">
                                 <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                 <span className="text-xs font-black text-amber-700 uppercase tracking-widest">
                                   <TranslatedText>Refund Requested</TranslatedText>
                                 </span>
                                 <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                   apt.refund_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                   apt.refund_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                   apt.refund_status === 'processed' ? 'bg-blue-100 text-blue-700' :
                                   'bg-amber-100 text-amber-700'
                                 }`}>
                                   {apt.refund_status || 'pending'}
                                 </span>
                               </div>
                               {apt.refund_reason && (
                                 <p className="text-sm text-amber-800 italic mb-2">
                                   &ldquo;{apt.refund_reason}&rdquo;
                                 </p>
                               )}
                               {apt.refund_amount && (
                                 <p className="text-xs font-bold text-amber-700">
                                   <TranslatedText>Refund Amount</TranslatedText>: ₹{Number(apt.refund_amount).toFixed(2)}
                                 </p>
                               )}
                             </div>
                           )}

                           <div className="mt-3 flex items-center gap-4 border-t border-blue-100 pt-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest"><TranslatedText>Payment</TranslatedText></span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                apt.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                <TranslatedText>{apt.payment_status || 'pending'}</TranslatedText>
                              </span>
                            </div>
                            {apt.mode === 'offline' && apt.token_number && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest"><TranslatedText>Token No.</TranslatedText></span>
                                <span className="text-xs font-black text-blue-800">{apt.token_number}</span>
                              </div>
                            )}
                            {apt.mode === 'offline' && apt.queue_position && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest"><TranslatedText>Queue Pos</TranslatedText></span>
                                <span className="text-xs font-black text-blue-800">{apt.queue_position}</span>
                              </div>
                            )}
                            {apt.mode === 'offline' && apt.estimated_wait_minutes && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest"><TranslatedText>Est. Wait</TranslatedText></span>
                                <span className="text-xs font-black text-blue-800">{apt.estimated_wait_minutes}m</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {['scheduled', 'pending'].includes(apt.status) && (
                          <>
                            <button
                              onClick={() => updateAppointmentStatus(apt.aid, 'confirmed')}
                              className="btn-primary py-2 px-4 text-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <TranslatedText>Confirm</TranslatedText>
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(apt.aid, 'cancelled')}
                              className="px-3 py-2 text-xs bg-red-50 text-red-600 rounded-full font-semibold hover:bg-red-100 transition-colors"
                            >
                              <TranslatedText>Decline</TranslatedText>
                            </button>
                          </>
                        )}
                        {((apt.status === 'confirmed' || apt.status === 'in_progress') || (apt.status === 'scheduled' && apt.mode === 'online')) && (
                          <>
                            <button
                              onClick={() => {
                                if (apt.mode === 'online') {
                                  window.location.href = `/dashboard/video-call/${apt.aid}`;
                                } else {
                                  router.push(`/dashboard/prescriptions/new?aid=${apt.aid}`);
                                }
                              }}
                              className="btn-primary py-2 px-4 text-xs"
                            >
                              {apt.mode === 'online' ? <Video className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              <TranslatedText>
                                {apt.mode === 'online' 
                                  ? (apt.status === 'in_progress' ? 'Rejoin Call' : 'Join Video Call') 
                                  : 'Complete Visit'}
                              </TranslatedText>
                            </button>
                            {apt.status === 'in_progress' && (apt.mode !== 'online' || !!((apt as any).call_ended_at || (typeof (apt as any).call_duration_minutes === 'number' && (apt as any).call_duration_minutes > 0))) && (
                              <button
                                onClick={() => updateAppointmentStatus(apt.aid, 'completed')}
                                className="btn-secondary py-2 px-4 text-xs bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <TranslatedText>Mark as Completed</TranslatedText>
                              </button>
                            )}
                          </>
                        )}
                        {/* Mode Toggle — always visible for non-completed/cancelled */}
                        {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                          <button
                            onClick={() => changeAppointmentMode(apt.aid, apt.mode === 'online' ? 'offline' : 'online')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold hover:bg-blue-100 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <TranslatedText>{apt.mode === 'online' ? 'Switch to In-Clinic' : 'Switch to Online'}</TranslatedText>
                          </button>
                        )}
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === apt.aid ? null : apt.aid); }}
                            className="px-3 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold hover:bg-blue-100 transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {openDropdown === apt.aid && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[var(--shadow-xl)] border border-blue-100 z-50">
                              <div className="py-2">
                                <button onClick={() => { setOpenDropdown(null); window.location.href = `/dashboard/patients/${apt.patient?.pid}`; }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors">
                                  <TranslatedText>View Patient History</TranslatedText>
                                </button>
                                {/* Mark as Completed: only for non-cancelled, non-completed */}
                                {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                                  <button onClick={() => { setOpenDropdown(null); updateAppointmentStatus(apt.aid, 'completed'); }}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                                    <TranslatedText>Mark as Completed</TranslatedText>
                                  </button>
                                )}
                                {apt.status !== 'cancelled' && apt.status !== 'completed' && apt.status !== 'confirmed' && apt.status !== 'in_progress' && (
                                  <button onClick={() => { setOpenDropdown(null); updateAppointmentStatus(apt.aid, 'cancelled'); }}
                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                                    <TranslatedText>Cancel Appointment</TranslatedText>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-5">

        {/* Quick Stats */}
        <div className="bg-blue-50 rounded-[2rem] p-6 border border-blue-100">
          <p className="label-md text-blue-600 mb-4"><TranslatedText>Overview</TranslatedText></p>
          <div className="space-y-3">
            {[
              { label: "Today's Appointments", value: totalToday, color: 'text-blue-700' },
              { label: 'Pending Requests', value: totalPending, color: 'text-blue-600' },
              { label: 'Completed', value: totalCompleted, color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="body-md text-blue-500"><TranslatedText>{label}</TranslatedText></span>
                <span className={`text-xl font-black font-display ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini Calendar - only active/pending/confirmed/today appointments */}
        <MiniCalendar appointments={[
          ...aptsData.pending,
          ...aptsData.confirmed,
          ...aptsData.today,
        ]} />

        {/* Today's Appointments */}
        {aptsData.today.length > 0 && (
          <div className="bg-white rounded-[2rem] p-6 border border-blue-100 shadow-[var(--shadow-sm)]">
            <p className="label-md text-blue-600 mb-4"><TranslatedText>Today's Schedule</TranslatedText></p>
            <div className="space-y-3">
              {aptsData.today.slice(0, 4).map((apt) => (
                <div key={apt.aid} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl overflow-hidden bg-blue-100 shrink-0">
                    {apt.patient?.user?.profile_image_url ? (
                      <img src={apt.patient.user.profile_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-blue-900 truncate"><NameText name={apt.patient?.user?.name} /></p>
                    <p className="text-[10px] text-blue-600">{apt.scheduled_time}</p>
                  </div>
                  {apt.mode === 'online' ? <Video className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

export default function DoctorAppointmentsPage() {
  return (
    <VerificationGuard>
      <AppointmentsContent />
    </VerificationGuard>
  );
}
