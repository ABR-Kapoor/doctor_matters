'use client';

export const dynamic = 'force-dynamic';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FileSignature, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { TranslatedText } from '@/app/components/TranslatedText';
import { formatDate } from '@/lib/shared/utils';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import DoctorConsentModal from '@/app/components/DoctorConsentModal';
import { useCall } from '@/app/components/CallProvider';

export default function DoctorVideoCallPage() {
  const token = useAuthToken();
  const { translate } = useLanguage();
  const { session, recentTerminal, refresh, endCall } = useCall();
  const params = useParams();
  const router = useRouter();
  const aid = params?.aid as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<Date | null>(null);
  const hasLeftRef = useRef(false);
  const joinedRef = useRef(false);
  const sawActiveRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [showPostCallModal, setShowPostCallModal] = useState(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const destroyZego = () => {
    const zp = zpRef.current;
    zpRef.current = null;
    if (zp) {
      try { zp.destroy(); } catch {}
    }
  };

  const finishCall = (acceptedAt: string | null, endedAt: string | null) => {
    if (hasLeftRef.current && showPostCallModal) return;
    hasLeftRef.current = true;
    clearTimer();
    const start = acceptedAt ? new Date(acceptedAt) : startRef.current;
    const end = endedAt ? new Date(endedAt) : new Date();
    const seconds = start ? Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000)) : 0;
    setCallDurationSeconds(seconds);
    setShowPostCallModal(true);
    window.setTimeout(destroyZego, 800);
  };

  useEffect(() => {
    if (!consentAccepted) return;
    const timer = window.setTimeout(() => { void initializeCall(); }, 300);
    return () => window.clearTimeout(timer);
  }, [consentAccepted, aid]);

  useEffect(() => {
    if (!joinedRef.current || showPostCallModal || hasLeftRef.current) return;
    const activeForThisCall = session?.aid === aid && session.status === 'active';
    if (activeForThisCall) {
      sawActiveRef.current = true;
      return;
    }
    if (!sawActiveRef.current) return;
    const terminal = recentTerminal?.aid === aid ? recentTerminal : null;
    if (terminal || session === null) {
      finishCall(terminal?.acceptedAt ?? startRef.current?.toISOString() ?? null, terminal?.endedAt ?? null);
    }
  }, [aid, recentTerminal, session, showPostCallModal]);

  useEffect(() => () => {
    clearTimer();
    const zp = zpRef.current;
    zpRef.current = null;
    if (zp) {
      try { zp.destroy(); } catch {}
    }
  }, []);

  async function fetchActiveSession() {
    try {
      const response = await fetchWithAuth('/api/calls/active', token);
      const data = await response.json();
      if (data.success && data.session?.aid === aid && data.session.status === 'active') {
        return data.session;
      }
    } catch {}
    return null;
  }

  async function initializeCall() {
    const timeoutId = window.setTimeout(async () => {
      const message = await translate('Connection timeout - please check your camera/microphone permissions and internet connection');
      setError(message);
      setLoading(false);
    }, 15000);

    try {
      if (!containerRef.current) throw new Error('Video container not ready');

      let activeSession = session?.aid === aid && session.status === 'active' ? session : null;
      if (!activeSession) {
        activeSession = await fetchActiveSession();
        if (!activeSession) {
          await refresh();
          activeSession = await fetchActiveSession();
        }
      }
      if (!activeSession) throw new Error('This call is no longer active.');

      if (!appointmentData) {
        const response = await fetchWithAuth('/api/doctor/appointments', token);
        const data = await response.json();
        if (!data.success) throw new Error('Failed to load appointments');
        const allAppointments = [
          ...(data.appointments?.pending || []),
          ...(data.appointments?.confirmed || []),
          ...(data.appointments?.today || []),
          ...(data.appointments?.completed || []),
        ];
        const appointment = allAppointments.find((apt: any) => apt.aid === aid);
        if (!appointment) throw new Error('Appointment not found');
        setAppointmentData(appointment);
      }

      const tokenResponse = await fetchWithAuth('/api/calls/zego-token', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: `appointment_${aid}` }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.success || !tokenData.token) {
        throw new Error(tokenData.error || 'Failed to fetch secure ZegoCloud token from server');
      }

      const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');
      const zp = ZegoUIKitPrebuilt.create(tokenData.token);
      zpRef.current = zp;

      zp.joinRoom({
        container: containerRef.current,
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
        showPreJoinView: false,
        showScreenSharingButton: true,
        showRoomTimer: true,
        maxUsers: 2,
        onLeaveRoom: () => {
          if (zpRef.current === null) return;
          void leaveAndEnd();
        },
        onJoinRoom: () => {
          joinedRef.current = true;
          hasLeftRef.current = false;
          const start = activeSession.acceptedAt ? new Date(activeSession.acceptedAt) : new Date();
          startRef.current = start;
          clearTimer();
          timerRef.current = setInterval(() => {
            setCallDurationSeconds(Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)));
          }, 1000);
          setLoading(false);
        },
        onUserJoin: () => {},
        onUserLeave: () => {
          if (!hasLeftRef.current) toast('The patient left the call. You can wait for them to rejoin.');
        },
      });

      window.clearTimeout(timeoutId);
    } catch (err: any) {
      window.clearTimeout(timeoutId);
      console.error('[DOCTOR] Video call initialization error:', err);
      const message = await translate(err?.message || 'Failed to initialize video call');
      setError(message);
      setLoading(false);
    }
  }

  async function handleConsentAccept() {
    setConsentLoading(true);
    try {
      await fetchWithAuth(`/api/appointments/${aid}/consent`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_ip: '' }),
      });
    } catch {}
    setConsentAccepted(true);
    setConsentLoading(false);
  }

  function handleConsentDecline() {
    toast.error('You must accept the attestation to proceed with the video call.');
    router.push('/dashboard/appointments?tab=today');
  }

  async function leaveAndEnd() {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;
    clearTimer();
    try {
      await endCall();
    } catch {}
    finishCall(session?.acceptedAt ?? startRef.current?.toISOString() ?? null, new Date().toISOString());
  }

  function handlePrescribe() {
    if (!appointmentData) return;
    const minutes = Math.floor(callDurationSeconds / 60);
    router.push(`/dashboard/prescriptions/new?aid=${aid}&pid=${appointmentData.pid}&duration=${minutes}`);
  }

  return (
    <div className="fixed inset-0 z-30 bg-gray-900">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ display: loading || error || showPostCallModal ? 'none' : 'block' }}
      />

      {!consentAccepted && !error && !showPostCallModal && (
        <DoctorConsentModal
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
          isLoading={consentLoading}
          patientName={appointmentData?.patient?.user?.name}
        />
      )}

      {loading && consentAccepted && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 z-50">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-700 font-medium"><TranslatedText>Connecting to video call...</TranslatedText></p>
          <p className="text-gray-500 text-sm mt-2"><TranslatedText>Please allow camera and microphone access</TranslatedText></p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-red-100 z-50">
          <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-lg text-center max-w-[min(90vw,28rem)]">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2"><TranslatedText>Connection Failed</TranslatedText></h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard/appointments?tab=today')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <TranslatedText>Back to Appointments</TranslatedText>
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full z-10 max-w-[90vw]">
        <p className="text-[10px] text-white/80 whitespace-nowrap">
          <strong>AuraSutra</strong> is a practitioner directory. For emergencies, advise patients to <strong>call 112</strong>.
        </p>
      </div>

      {appointmentData && !loading && !error && !showPostCallModal && (
        <div className="absolute bottom-2 left-2 sm:bottom-auto sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl max-w-[min(80vw,280px)] shadow-lg z-10">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-100 to-blue-100 rounded-full flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-gray-900">
                <TranslatedText>{appointmentData.patient?.user?.name || 'Patient'}</TranslatedText>
              </p>
              <p className="text-xs text-gray-600">
                {formatDate(appointmentData.scheduled_date)} <TranslatedText>at</TranslatedText>{' '}
                {appointmentData.scheduled_time}
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !showPostCallModal && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/90 backdrop-blur-sm px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl shadow-lg z-10">
          <p className="text-sm font-bold text-gray-900">
            <TranslatedText>Duration</TranslatedText>: {Math.floor(callDurationSeconds / 60)}:{String(callDurationSeconds % 60).padStart(2, '0')}
          </p>
        </div>
      )}

      {showPostCallModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-8 max-w-[min(90vw,26rem)] w-full mx-4">
            <div className="text-center mb-4 sm:mb-8">
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                <Video className="w-7 h-7 sm:w-10 sm:h-10 text-blue-600" />
              </div>
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3"><TranslatedText>Call Ended Successfully</TranslatedText></h2>
              <p className="text-sm sm:text-lg text-gray-600">
                <TranslatedText>Duration</TranslatedText>: <span className="font-bold text-blue-600">
                  {Math.floor(callDurationSeconds / 60)} <TranslatedText>min</TranslatedText> {callDurationSeconds % 60} <TranslatedText>sec</TranslatedText>
                </span>
              </p>
            </div>

            {appointmentData && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-3 sm:p-6 mb-4 sm:mb-8">
                <div className="flex items-center space-x-4 mb-4">
                  {appointmentData.patient?.user?.profile_image_url ? (
                    <img
                      src={appointmentData.patient.user.profile_image_url}
                      alt={appointmentData.patient?.user?.name || 'Patient'}
                      className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover border border-blue-200"
                    />
                  ) : (
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm sm:text-lg">
                        {appointmentData.patient?.user?.name?.charAt(0) || 'P'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-600"><TranslatedText>Patient</TranslatedText></p>
                    <p className="font-bold text-gray-900 text-sm sm:text-lg"><TranslatedText>{appointmentData.patient?.user?.name}</TranslatedText></p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600 mb-1"><TranslatedText>Chief Complaint</TranslatedText></p>
                  <p className="text-gray-900"><TranslatedText>{appointmentData.chief_complaint || 'N/A'}</TranslatedText></p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handlePrescribe}
                className="w-full flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-sm sm:text-lg hover:shadow-xl smooth-transition transform hover:scale-105"
              >
                <FileSignature className="w-5 h-5 sm:w-6 sm:h-6" /> <TranslatedText>Prescribe Medicine</TranslatedText>
              </button>
              <button
                onClick={() => router.push('/dashboard/appointments?tab=today')}
                className="w-full px-4 sm:px-8 py-2.5 sm:py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 smooth-transition text-sm sm:text-base"
              >
                ← <TranslatedText>Back to Dashboard</TranslatedText>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
