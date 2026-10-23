'use client';

export const dynamic = 'force-dynamic';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Video, FileSignature } from 'lucide-react';
import toast from 'react-hot-toast';
import { TranslatedText } from '@/app/components/TranslatedText';
import { formatDate } from '@/lib/shared/utils';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import DoctorConsentModal from '@/app/components/DoctorConsentModal';

export default function DoctorVideoCallPage() {
  const token = useAuthToken();
  const { translate } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const aid = params?.aid as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const zpRef = useRef<any>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(0);
  const [showPostCallModal, setShowPostCallModal] = useState(false);
  const [liveTimerInterval, setLiveTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const liveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedRoom = useRef(false);
  const hasInitialized = useRef(false);
  const hasLeftRoom = useRef(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const callStartTimeRef = useRef<Date | null>(null); // Ref for stale-closure-safe access
  const endPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[DOCTOR] Component mounted, starting initialization...');

    // Only run on client side
    if (typeof window === 'undefined') {
      console.log('[DOCTOR] Not in browser, skipping');
      return;
    }

    // Suppress ZegoCloud internal async errors that fire after destroy()
    const suppressErrors = (e: ErrorEvent) => {
      if (e.message?.includes('createSpan') || e.message?.includes('Cannot read properties of null')) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const suppressRejections = (e: PromiseRejectionEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('error', suppressErrors as any, true);
    window.addEventListener('unhandledrejection', suppressRejections, true);

    return () => {
      window.removeEventListener('error', suppressErrors as any, true);
      window.removeEventListener('unhandledrejection', suppressRejections, true);
      console.log('[DOCTOR] Cleanup called');

      // Reset flags
      hasJoinedRoom.current = false;
      hasInitialized.current = false;
      hasLeftRoom.current = false;

      // Cleanup timer
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
        setLiveTimerInterval(null);
      }
      if (endPollRef.current) {
        clearInterval(endPollRef.current);
        endPollRef.current = null;
      }

      // Cleanup ZegoCloud instance
      if (zpRef.current) {
        try {
          console.log('[DOCTOR] Destroying ZegoCloud instance');
          zpRef.current.destroy();
          zpRef.current = null;
        } catch (e) {
          console.log('[DOCTOR] ZegoCloud cleanup error:', e);
        }
      }
    };
  }, [aid]);

  useEffect(() => {
    if (consentAccepted && !hasInitialized.current) {
      const timer = setTimeout(() => {
        console.log('[DOCTOR] Consent accepted, firing init function');
        fetchAppointmentAndInitCall();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [consentAccepted]);

  async function handleConsentAccept() {
    setConsentLoading(true);
    try {
      await fetchWithAuth(`/api/appointments/${aid}/consent`, token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_ip: '' }),
      });
    } catch { /* consent recording is non-critical */ }
    setConsentAccepted(true);
    setConsentLoading(false);
  }

  function handleConsentDecline() {
    toast.error('You must accept the attestation to proceed with the video call.');
    router.push('/dashboard/appointments?tab=today');
  }

  async function fetchAppointmentAndInitCall() {
    // Prevent multiple initializations
    if (hasInitialized.current) {
      console.log('[DOCTOR] Already initialized, skipping');
      return;
    }

    hasInitialized.current = true;
    console.log('[DOCTOR] Starting initialization...');

    const timeoutId = setTimeout(async () => {
      const errorMsg = await translate('Connection timeout - please check your camera/microphone permissions and internet connection');
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }, 15000); // 15 second timeout

    try {
      console.log('Starting video call initialization...');

      // Check if container is available
      if (!containerRef.current) {
        throw new Error('Video container not ready');
      }

      // Sync user
      const syncResponse = await fetchWithAuth('/api/sync-user', token);
      const { user } = await syncResponse.json();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch appointment details
      const response = await fetchWithAuth(`/api/doctor/appointments`, token);
      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to load appointments');
      }

      // Find the specific appointment
      const allAppointments = [
        ...data.appointments.pending,
        ...data.appointments.confirmed,
        ...data.appointments.today,
      ];
      const appointment = allAppointments.find((apt: any) => apt.aid === aid);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      console.log('Appointment found:', appointment.aid);
      setAppointmentData(appointment);

      // Dynamically import ZegoCloud SDK (client-side only)
      console.log('Loading ZegoCloud SDK...');
      const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');

      const roomID = `appointment_${aid}`;

      // The kit token is minted SERVER-SIDE by /api/calls/zego-token, which
      // verifies the Clerk session, checks this doctor owns the appointment, and
      // never exposes ZEGO_SERVER_SECRET. This page used to read the secret from
      // NEXT_PUBLIC_ZEGO_SERVER_SECRET (publishing it to every browser) and then
      // re-wrap the server token with the client-side
      // `generateKitTokenForProduction` helper.
      console.log('Requesting kit token for room:', roomID);

      const tokenResponse = await fetchWithAuth('/api/calls/zego-token', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomID })
      });
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.success || !tokenData.token) {
        throw new Error(tokenData.error || 'Failed to fetch secure ZegoCloud token from server');
      }

      console.log('Kit token received');
      console.log('Creating ZegoCloud instance...');

      const zp = ZegoUIKitPrebuilt.create(tokenData.token);

      if (!zp) {
        throw new Error('Failed to create ZegoCloud instance');
      }

      zpRef.current = zp;

      // Double-check container is still available
      if (!containerRef.current) {
        throw new Error('Video container disappeared during initialization');
      }

      console.log('[DOCTOR] Joining room...');

      // Don't await - just start the join process
      zp.joinRoom({
        container: containerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        showPreJoinView: false,
        showScreenSharingButton: true,
        showRoomTimer: true,
        maxUsers: 2,
        onLeaveRoom: () => {
          console.log('[DOCTOR] onLeaveRoom triggered!');

          // Ignore duplicate leave notifications from SDK
          if (hasLeftRoom.current) {
            console.log('[DOCTOR] Ignoring duplicate onLeaveRoom');
            return;
          }
          hasLeftRoom.current = true;

          // Only process if user has actually joined the room
          if (!hasJoinedRoom.current) {
            console.log('[DOCTOR] Ignoring onLeaveRoom - user never joined');
            return;
          }

          clearTimeout(timeoutId);

          // Stop live timer
          if (liveTimerRef.current) {
            clearInterval(liveTimerRef.current);
            liveTimerRef.current = null;
            setLiveTimerInterval(null);
          }
          if (endPollRef.current) {
            clearInterval(endPollRef.current);
            endPollRef.current = null;
          }

          // Calculate final duration
          const st = callStartTimeRef.current || new Date();
          const endTime = new Date();
          const durationMs = endTime.getTime() - st.getTime();
          const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));
          const durationMinutes = durationSeconds / 60;

          setCallDurationSeconds(durationSeconds);
          updateCallDuration(st, endTime, durationMinutes);

          setShowPostCallModal(true);
          
          setTimeout(() => {
            const zp = zpRef.current;
            zpRef.current = null;
            if (zp) { try { zp.destroy(); } catch (_) {} }
          }, 1000);
        },
        onJoinRoom: async () => {
          console.log('[DOCTOR] Successfully joined room!');

          // Prevent duplicate onJoinRoom calls
          if (hasJoinedRoom.current) {
            console.log('[DOCTOR] Already joined, ignoring duplicate onJoinRoom');
            return;
          }

          hasJoinedRoom.current = true; // Mark that user has joined
          hasLeftRoom.current = false;
          clearTimeout(timeoutId);

          // Start call on server and get synchronized start time
          const startTime = await startCall();
          setCallStartTime(startTime);
          callStartTimeRef.current = startTime;

          // Start live timer (updates every second)
          const timer = setInterval(() => {
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            setCallDurationSeconds(elapsed >= 0 ? elapsed : 0);
          }, 1000);
          liveTimerRef.current = timer;
          setLiveTimerInterval(timer);

          // Start polling for end status
          startEndPoll();
        },
        onUserJoin: (users: any) => {
          console.log('[DOCTOR] User joined:', users);
        },
        onUserLeave: (users: any) => {
          console.log('[DOCTOR] Patient left:', users);
          if (users.length > 0 && !hasLeftRoom.current) {
            setTimeout(() => {
              if (!hasLeftRoom.current) {
                hasLeftRoom.current = true;
                if (liveTimerRef.current) {
                  clearInterval(liveTimerRef.current);
                  liveTimerRef.current = null;
                  setLiveTimerInterval(null);
                }
                if (endPollRef.current) {
                  clearInterval(endPollRef.current);
                  endPollRef.current = null;
                }
                const st = callStartTimeRef.current || new Date();
                const endTime = new Date();
                const durationMs = endTime.getTime() - st.getTime();
                const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));
                const durationMinutes = durationSeconds / 60;
                setCallDurationSeconds(durationSeconds);
                updateCallDuration(st, endTime, durationMinutes);
                setShowPostCallModal(true);
                
                setTimeout(() => {
                  const zp = zpRef.current;
                  zpRef.current = null;
                  if (zp) { try { zp.destroy(); } catch (_) {} }
                }, 1000);
              }
            }, 2000);
          }
        },
      });

      // Set loading to false immediately after starting join
      console.log('Video call initialized, waiting for connection...');
      clearTimeout(timeoutId);
      setLoading(false);
    } catch (error: any) {
      console.error('[DOCTOR] Video call initialization error:', error);
      clearTimeout(timeoutId);

      // Reset initialization flag to allow retry
      hasInitialized.current = false;

      const errorMsg = await translate(error.message || 'Failed to initialize video call');
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);

      // Redirect after showing error
      setTimeout(() => {
        router.push('/dashboard/appointments?tab=today');
      }, 3000);
    }
  }

  async function startCall() {
    try {
      console.log('[DOCTOR] Notifying server: Call Started');
      const response = await fetchWithAuth(`/api/appointments/${aid}/start-call`, token, { method: 'POST' });
      const data = await response.json();

      if (data.success && data.data?.call_started_at) {
        return new Date(data.data.call_started_at);
      }
      return new Date(); // Fallback
    } catch (error) {
      console.error('[DOCTOR] Failed to start call on server:', error);
      return new Date();
    }
  }

  function startEndPoll() {
    if (endPollRef.current) return;
    const interval = setInterval(async () => {
      if (hasLeftRoom.current) { clearInterval(interval); endPollRef.current = null; return; }
      try {
        const response = await fetchWithAuth(`/api/appointments/${aid}/status`, token);
        const data = await response.json();
        if (data.success && data.data?.status === 'completed' && !hasLeftRoom.current) {
          clearInterval(interval);
          endPollRef.current = null;
          hasLeftRoom.current = true;
          
          if (liveTimerRef.current) {
            clearInterval(liveTimerRef.current);
            liveTimerRef.current = null;
            setLiveTimerInterval(null);
          }

          const st = callStartTimeRef.current || new Date();
          const endTime = new Date(data.data.callEndedAt || new Date());
          const durationSeconds = Math.max(0, Math.floor((endTime.getTime() - st.getTime()) / 1000));
          
          setCallDurationSeconds(durationSeconds);
          
          // Cleanup ZegoCloud
          if (zpRef.current) {
            try {
              zpRef.current.destroy();
              zpRef.current = null;
            } catch (e) {}
          }
          
          setShowPostCallModal(true);
        }
      } catch {}
    }, 5000);
    endPollRef.current = interval;
  }

  async function updateCallDuration(startTime: Date, endTime: Date, durationMins: number) {
    try {
      console.log('[DOCTOR] Updating call duration:', {
        aid,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMins
      });

      const response = await fetchWithAuth(`/api/appointments/${aid}/call-duration`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: durationMins,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[DOCTOR] ✅ Call duration updated successfully:', data);
      } else {
        console.error('[DOCTOR] ❌ API returned error:', data);
      }
    } catch (err) {
      console.error('[DOCTOR] ❌ Failed to update call duration:', err);
    }
  }

  function handlePrescribe() {
    if (appointmentData) {
      const minutes = Math.floor(callDurationSeconds / 60);
      router.push(`/dashboard/prescriptions/new?aid=${aid}&pid=${appointmentData.pid}&duration=${minutes}`);
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-gray-900">
      {/* Video Call Container - Hidden when call ends */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ display: showPostCallModal ? 'none' : 'block' }}
      />

      {/* Consent Modal */}
      {!consentAccepted && !error && !showPostCallModal && (
        <DoctorConsentModal
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
          isLoading={consentLoading}
          patientName={appointmentData?.patient?.user?.name}
        />
      )}

      {/* Loading Overlay */}
      {loading && consentAccepted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 z-50">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-700 font-medium"><TranslatedText>Connecting to video call...</TranslatedText></p>
          <p className="text-gray-500 text-sm mt-2"><TranslatedText>Please allow camera and microphone access</TranslatedText></p>
        </div>
      )}

      {/* Error Overlay */}
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

      {/* Emergency disclaimer */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full z-10 max-w-[90vw]">
        <p className="text-[10px] text-white/80 whitespace-nowrap">
          <strong>AuraSutra</strong> is a practitioner directory. For emergencies, advise patients to <strong>call 112</strong>.
        </p>
      </div>

      {/* Patient Info Overlay - Only during call */}
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

      {/* Live Timer Badge - Only during call */}
      {callStartTime && !showPostCallModal && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/90 backdrop-blur-sm px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl shadow-lg z-10">
          <p className="text-sm font-bold text-gray-900">
            <TranslatedText>Duration</TranslatedText>: {Math.floor(callDurationSeconds / 60)}:{String(callDurationSeconds % 60).padStart(2, '0')}
          </p>
        </div>
      )}

      {/* Post-Call Screen - Replaces video frame */}
      {showPostCallModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-8 max-w-[min(90vw,26rem)] w-full mx-4">
            {/* Success Icon */}
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

            {/* Patient Summary Card */}
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

            {/* Action Buttons */}
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




