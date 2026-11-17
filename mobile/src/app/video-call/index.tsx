import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { CheckCircle2, FileText, PhoneOff, X, Check, VideoOff } from 'lucide-react-native';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useDoctorIdentity } from '@/hooks/queries/doctorQueries';
import { callTerminalMessage, useCall } from '@/components/CallProvider';
import { callSoundService } from '@/lib/callSoundService';
import { COLORS, FONTS } from '../../constants/theme';

let LiveKitCall: any = null;
try {
  LiveKitCall = require('@/components/LiveKitCall').default;
} catch {
  // The native module is absent in Expo Go; the screen shows a clear message.
}

const liveKitServerUrl =
  process.env.EXPO_PUBLIC_LIVEKIT_URL || 'wss://dev-42vzlprn.livekit.cloud';
const roomIdForAid = (aid: unknown) => ('appointment_' + String(aid ?? '')).trim().slice(0, 64);

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function DoctorVideoCallScreen() {
  const router = useRouter();
  const { aid, pid } = useLocalSearchParams<{ aid?: string; pid?: string }>();
  const { getToken } = useAuth();
  const { data: identity, isLoading: isIdentityLoading } = useDoctorIdentity(getToken);
  const { initialized, session, recentTerminal, endCall, cancelCall } = useCall();

  const [liveToken, setLiveToken] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [callEnded, setCallEnded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [remoteLeft, setRemoteLeft] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const tokenFetchedRef = useRef(false);
  const navigatedRef = useRef(false);
  const wasLiveRef = useRef(false);
  const currentSession = session?.aid === String(aid) ? session : null;
  const terminal = recentTerminal?.aid === String(aid) ? recentTerminal : null;
  const terminalCopy = terminal && terminal.status !== 'ended' ? callTerminalMessage(terminal) : null;
  const callActive = currentSession?.status === 'active';
  const waiting = currentSession?.status === 'ringing';
  const nativeMissing = !LiveKitCall;
  const urlMissing = !liveKitServerUrl;

  useEffect(() => {
    if (callActive && !wasLiveRef.current) wasLiveRef.current = true;
  }, [callActive]);

  useEffect(() => {
    if (initialized && !currentSession && wasLiveRef.current && !callEnded) {
      setCallEnded(true);
      void callSoundService.stopWaitingRing();
    }
  }, [callEnded, currentSession, initialized]);

  useEffect(() => {
    if (!callActive || !aid || !identity?.uid || urlMissing) return;
    if (tokenFetchedRef.current) return;
    tokenFetchedRef.current = true;

    const getRoomToken = async () => {
      try {
        const res = await fetchWithAuth('/api/calls/livekit-token', getToken, {
          method: 'POST',
          body: JSON.stringify({ roomId: roomIdForAid(aid) }),
        });
        const data = await res.json();

        if (res.status === 401) {
          tokenFetchedRef.current = false;
          setFatalError('Your session has expired. Sign in again to rejoin.');
          return;
        }
        if (res.status === 403 || res.status === 426) {
          tokenFetchedRef.current = false;
          setFatalError(data.message || data.error || 'You are not the doctor for this consultation.');
          return;
        }
        if (data.success && data.token) {
          setLiveToken(data.token);
        } else {
          tokenFetchedRef.current = false;
          setFatalError(data.error || 'Failed to generate a secure call token.');
        }
      } catch (error: any) {
        tokenFetchedRef.current = false;
        setFatalError(error?.message || 'Could not reach the token server. Check your network and try again.');
      }
    };

    void getRoomToken();
  }, [aid, callActive, getToken, identity?.uid, urlMissing]);

  useEffect(() => {
    if (!callActive || !currentSession?.acceptedAt) return;
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(currentSession.acceptedAt as string).getTime()) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [callActive, currentSession?.acceptedAt]);

  const goBackOnce = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace({ pathname: '/(dashboard)', params: { focusAid: aid ? String(aid) : '' } } as any);
  }, [aid, router]);

  const handleConnected = useCallback(() => {
    wasLiveRef.current = true;
    setJoined(true);
    setFatalError(null);
    void callSoundService.playJoinChime();
  }, []);

  const handleDisconnected = useCallback(() => {
    setJoined(false);
  }, []);

  const handleRemoteLeft = useCallback(() => {
    setRemoteLeft(true);
  }, []);

  const handleError = useCallback((error: Error) => {
    setFatalError(error.message || 'The connection failed.');
  }, []);

  const handleHangUp = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    if (callActive) await endCall();
    else if (waiting) await cancelCall();
    await callSoundService.stopWaitingRing();
    setCallEnded(true);
    setEnding(false);
  }, [callActive, cancelCall, endCall, ending, waiting]);

  const handleLeave = useCallback(async () => {
    if (callEnded) {
      goBackOnce();
      return;
    }
    if (callActive || waiting) {
      await handleHangUp();
      return;
    }
    goBackOnce();
  }, [callActive, callEnded, goBackOnce, handleHangUp, waiting]);

  const handleComplete = useCallback(async () => {
    if (navigatedRef.current || !aid) return;
    setCompleting(true);
    try {
      if (callActive) await endCall();
      const res = await fetchWithAuth('/api/doctor/appointments', getToken, {
        method: 'PATCH',
        body: JSON.stringify({ aid: String(aid), status: 'completed' }),
      });
      const data = await res.json();
      if (!data.success) {
        Alert.alert('Could not update', data.error || 'The appointment could not be marked completed.');
        return;
      }
      goBackOnce();
    } catch (error) {
      console.error('[Doctor] Mark completed error:', error);
      Alert.alert('Network error', 'Could not reach the server. Please try again.');
    } finally {
      setCompleting(false);
    }
  }, [aid, callActive, endCall, getToken, goBackOnce]);

  const handleCreatePrescription = useCallback(() => {
    if (!pid) {
      Alert.alert('Patient unavailable', 'This call was opened without patient details, so a prescription cannot be attached.');
      return;
    }
    router.push({ pathname: '/prescriptions/new', params: { pid: String(pid), aid: aid ? String(aid) : '', ai: '1' } });
  }, [pid, aid, router]);

  const postCallPanel = (
    <View style={styles.postCallPanel}>
      <View style={styles.postCallIconContainer}>
        <View style={styles.postCallIconCircle}>
          <Check size={32} color="#15803D" strokeWidth={2.8} />
        </View>
      </View>

      <Text style={styles.postCallTitle}>Consultation Ended</Text>
      <Text style={styles.postCallSubtitle}>
        The call is over. Mark the visit as completed so the patient sees the update, and add a prescription if needed.
      </Text>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={() => { void handleComplete(); }}
          disabled={completing}
          style={[styles.completeButton, completing && styles.completeButtonDisabled]}
          activeOpacity={0.8}
        >
          {completing ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <View style={styles.completeIconBg}>
                <Check size={16} color={COLORS.primary} strokeWidth={3} />
              </View>
              <View style={styles.buttonTextWrapper}>
                <Text style={styles.completeButtonText}>Mark as Completed</Text>
                <Text style={styles.completeButtonSubtext}>Finalize consultation</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleCreatePrescription} 
          style={styles.prescriptionButton}
          activeOpacity={0.8}
        >
          <View style={styles.prescriptionIconBg}>
            <FileText size={18} color="#9333EA" strokeWidth={2} />
          </View>
          <View style={styles.buttonTextWrapper}>
            <Text style={styles.prescriptionButtonText}>Create Prescription</Text>
            <Text style={styles.prescriptionButtonSubtext}>Attach Rx for patient</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={goBackOnce} style={styles.laterButton} activeOpacity={0.7}>
        <Text style={styles.laterButtonText}>Later, back to schedule</Text>
      </TouchableOpacity>
    </View>
  );

  if (!initialized || isIdentityLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" animated />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading consultation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentSession && !callEnded) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" animated />
        <View style={styles.header}>
          <Text style={styles.title}>Live Consultation</Text>
          <TouchableOpacity onPress={goBackOnce} style={styles.closeButton}>
            <X size={16} color={COLORS.error} />
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.noCallContent}>
          <View style={styles.noCallIcon}>
            <PhoneOff size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.noCallTitle}>
            {terminalCopy ? terminalCopy.title : 'No active call'}
          </Text>
          <Text style={styles.noCallText}>
            {terminalCopy
              ? terminalCopy.detail ?? 'The call ended before it was connected.'
              : 'Start or accept a call from the schedule or chat when the consultation window is open.'}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={goBackOnce}>
            <Text style={styles.primaryButtonText}>Back to schedule</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, callEnded && styles.postCallContainer]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={callEnded ? '#F0FDF4' : '#FFFFFF'} 
        animated 
      />
      <View style={[styles.header, callEnded && styles.postCallHeader]}>
        <View>
          <Text style={styles.title}>{callEnded ? 'Consultation Ended' : waiting ? 'Calling Patient' : 'Live Consultation'}</Text>
          {!callEnded && currentSession?.peer?.name ? (
            <Text style={styles.subtitle}>{currentSession.peer.name}</Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          {callActive && !callEnded ? <Text style={styles.timer}>{formatDuration(elapsed)}</Text> : null}
          <TouchableOpacity onPress={() => { void handleLeave(); }} style={styles.closeButton} disabled={ending}>
            <X size={16} color={COLORS.error} />
            <Text style={styles.closeText}>{callEnded ? 'Close' : waiting ? 'Cancel' : 'Leave'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {callEnded ? (
        postCallPanel
      ) : (
        <>
          {LiveKitCall && liveToken && liveKitServerUrl ? (
            <LiveKitCall
              serverUrl={liveKitServerUrl}
              token={liveToken}
              onConnected={handleConnected}
              onDisconnected={handleDisconnected}
              onError={handleError}
              onRemoteLeft={handleRemoteLeft}
              onHangUp={() => { void handleHangUp(); }}
            />
          ) : null}

          {nativeMissing ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Native module not found</Text>
              <Text style={styles.errorText}>
                The LiveKit video engine is not linked into this build. Rebuild the app with {'\n'}
                npx expo run:android {'\n'}
                and install it on the device (this will not work in Expo Go).
              </Text>
            </View>
          ) : urlMissing ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Video service not configured</Text>
              <Text style={styles.errorText}>
                EXPO_PUBLIC_LIVEKIT_URL is missing from .env. Add the wss:// host from your LiveKit
                Cloud project and restart the bundler.
              </Text>
            </View>
          ) : fatalError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Could not join the call</Text>
              <Text style={styles.errorText}>{fatalError}</Text>
              <TouchableOpacity onPress={() => { void handleHangUp(); }} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>End call</Text>
              </TouchableOpacity>
            </View>
          ) : waiting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Waiting for the patient to answer...</Text>
            </View>
          ) : callActive && !liveToken ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Connecting to the consultation room...</Text>
            </View>
          ) : callActive && !joined ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Joining secure room...</Text>
            </View>
          ) : null}

          {remoteLeft && !callEnded ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>The patient left the call.</Text>
              <TouchableOpacity onPress={() => { void handleHangUp(); }} style={styles.noticeButton}>
                <Text style={styles.noticeButtonText}>End call</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  postCallHeader: {
    backgroundColor: '#F0FDF4',
    borderBottomColor: '#DCFCE7',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: COLORS.text, fontSize: 17, fontFamily: FONTS.bold, fontWeight: '700' },
  subtitle: { color: COLORS.gray, fontSize: 12, marginTop: 2, fontFamily: FONTS.regular },
  timer: { color: COLORS.primary, fontSize: 13, fontFamily: FONTS.medium, fontVariant: ['tabular-nums'] },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
  },
  closeText: { color: COLORS.error, fontFamily: FONTS.bold, fontWeight: '700', marginLeft: 4, fontSize: 13 },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    zIndex: 10,
    padding: 24,
  },
  loadingText: { color: COLORS.gray, marginTop: 16, fontSize: 14, fontFamily: FONTS.regular, fontWeight: '400' },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 24,
    zIndex: 20,
  },
  errorTitle: { color: COLORS.error, fontSize: 18, fontFamily: FONTS.serif, marginBottom: 12, textAlign: 'center' },
  errorText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: FONTS.regular,
    fontWeight: '400',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.text,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  retryButtonText: { color: COLORS.white, fontFamily: FONTS.medium, fontWeight: '500', fontSize: 16 },
  postCallContainer: {
    backgroundColor: '#F0FDF4',
  },
  postCallPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F0FDF4',
  },
  postCallIconContainer: {
    marginBottom: 20,
  },
  postCallIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCallTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  postCallSubtitle: {
    color: COLORS.gray,
    fontSize: 14,
    fontFamily: FONTS.regular,
    fontWeight: '400',
    lineHeight: 22,
    marginBottom: 28,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  completeButtonDisabled: { opacity: 0.7 },
  completeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  buttonTextWrapper: {
    flex: 1,
  },
  completeButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 16,
  },
  completeButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  prescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF5FF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  prescriptionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  prescriptionButtonText: {
    color: COLORS.text,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 16,
  },
  prescriptionButtonSubtext: {
    color: COLORS.gray,
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 16,
  },
  laterButtonText: {
    color: COLORS.gray,
    fontSize: 14,
    fontFamily: FONTS.medium,
    fontWeight: '600',
  },
  noCallContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  noCallIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  noCallTitle: { color: COLORS.text, fontSize: 22, fontFamily: FONTS.serif, marginBottom: 8 },
  noCallText: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: FONTS.regular,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 46,
  },
  primaryButtonText: { color: COLORS.white, fontFamily: FONTS.medium, fontWeight: '500', fontSize: 14 },
  notice: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  noticeText: { color: COLORS.text, fontSize: 13, fontFamily: FONTS.medium, marginBottom: 10 },
  noticeButton: {
    backgroundColor: COLORS.error,
    height: 38,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  noticeButtonText: { color: COLORS.white, fontFamily: FONTS.medium, fontWeight: '500', fontSize: 13 },
});
