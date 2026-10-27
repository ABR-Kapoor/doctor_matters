import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { X, CheckCircle2, FileText } from 'lucide-react-native';
import { useDoctorIdentity } from '@/hooks/queries/doctorQueries';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

let LiveKitCall: any = null;
try {
  LiveKitCall = require('@/components/LiveKitCall').default;
} catch (e) {
  // Ignored
}

// The LiveKit host is public client configuration; only the room token is minted
// server-side. The server also does not return a url, so it is read from the env
// exactly like the patient app does.
const liveKitServerUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL;

// The token route is room-scoped, so the room name has to be derived from the
// appointment id in the form the server expects.
const roomIdForAid = (aid: unknown) => ('appointment_' + String(aid ?? '')).trim().slice(0, 64);

export default function DoctorVideoCallScreen() {
  const router = useRouter();
  const { aid, pid } = useLocalSearchParams();
  const { getToken, userId } = useAuth();
  const { data: identity, isLoading: isIdentityLoading, refetch: refetchIdentity } = useDoctorIdentity(getToken);
  
  const [liveToken, setLiveToken] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const tokenFetchedRef = useRef(false);
  const mountedRef = useRef(true);
  
  const [callEnded, setCallEnded] = useState(false);
  const [completing, setCompleting] = useState(false);
  
  const joinedRef = useRef(false);
  const endedRef = useRef(false);
  const navigatedRef = useRef(false);

  const nativeMissing = !LiveKitCall;
  const urlMissing = !liveKitServerUrl;
  // Derived rather than stored: the identity query already owns this, so copying it
  // into local state would only duplicate it and add a second render pass.
  const identityUnavailable = !isIdentityLoading && !identity?.uid;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleRetry = () => {
    setFatalError(null);
    setLiveToken(null);
    tokenFetchedRef.current = false;
  };

  const reportCallStartRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    reportCallStartRef.current = async () => {
      if (!aid) return;
      try {
        const res = await fetchWithAuth(`/api/appointments/${String(aid)}/start-call`, getToken, { method: 'POST' });
        const data = await res.json();
        console.log('[Doctor] Call start reported:', data.success, data.error ?? '');
      } catch (e) {
        console.warn('[Doctor] Failed to report call start:', e);
      }
    };
  }, [aid, getToken]);

  const reportCallEndRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    reportCallEndRef.current = async () => {
      if (!aid) return;
      try {
        const res = await fetchWithAuth(`/api/appointments/${String(aid)}/call-duration`, getToken, {
          method: 'PATCH',
          body: JSON.stringify({ end_time: new Date().toISOString() }),
        });
        const data = await res.json();
        console.log('[Doctor] Call end logged:', data.success, data.error ?? '');
      } catch (e) {
        console.warn('[Doctor] Failed to log call end:', e);
      }
    };
  }, [aid, getToken]);

  useEffect(() => {
    if (!aid || !identity?.uid || urlMissing) return;
    if (tokenFetchedRef.current) return;
    tokenFetchedRef.current = true;

    const getRoomToken = async () => {
      try {
        // The room id is the only thing the client sends. The server derives the
        // LiveKit identity from the Clerk session and verifies this doctor owns
        // the appointment, so the token can only ever open this consultation.
        const res = await fetchWithAuth('/api/calls/livekit-token', getToken, {
          method: 'POST',
          body: JSON.stringify({ roomId: roomIdForAid(aid) }),
        });
        const data = await res.json();

        // Only a real unmount invalidates the result. A dependency change must not,
        // or the fetch that is already in flight gets silently dropped and the
        // screen waits on a token that will never arrive.
        if (!mountedRef.current) return;

        if (res.status === 401) {
          tokenFetchedRef.current = false;
          setFatalError('Your session has expired. Sign in again to rejoin.');
          return;
        }
        if (res.status === 403) {
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
      } catch (err: any) {
        if (!mountedRef.current) return;
        tokenFetchedRef.current = false;
        setFatalError(err.message || 'Could not reach the token server. Check your network and try again.');
      }
    };

    getRoomToken();
  }, [aid, identity?.uid, getToken, urlMissing]);

  const handleConnected = useCallback(() => {
    joinedRef.current = true;
    reportCallStartRef.current();
  }, []);

  const handleDisconnected = useCallback(() => {
    if (!endedRef.current && joinedRef.current) {
      endedRef.current = true;
      reportCallEndRef.current();
    }
    setCallEnded(true);
  }, []);

  const handleRemoteLeft = useCallback(() => {
    if (!endedRef.current) {
      endedRef.current = true;
      reportCallEndRef.current();
    }
    setCallEnded(true);
  }, []);

  // If the screen unmounts right after both sides cut the call, still record the duration.
  useEffect(() => {
    return () => {
      if (joinedRef.current && !endedRef.current) {
        endedRef.current = true;
        reportCallEndRef.current();
      }
    };
  }, []);

  const handleError = useCallback((err: Error) => {
    setFatalError(err.message || 'The connection failed.');
  }, []);

  const handleHangUp = useCallback(() => {
    if (!endedRef.current) {
      endedRef.current = true;
      reportCallEndRef.current();
    }
    setCallEnded(true);
  }, []);

  const goBackOnce = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    // Starting the call flips the appointment to `in_progress`, which the
    // server buckets under Confirmed (or Completed once marked done). Going
    // plain `back()` strands the doctor on whatever tab they came from while
    // the card now lives elsewhere, which reads as "the card disappeared".
    // Carry the aid along so the schedule can jump to the tab holding it.
    router.replace({ pathname: '/(dashboard)', params: { focusAid: aid ? String(aid) : '' } } as any);
  }, [aid, router]);
  const goBackOnceRef = useRef(goBackOnce);
  useEffect(() => {
    goBackOnceRef.current = goBackOnce;
  }, [goBackOnce]);

  const handleLeave = useCallback(() => {
    if (navigatedRef.current) return;
    if (callEnded) {
      goBackOnceRef.current();
      return;
    }
    if (joinedRef.current) {
      handleHangUp();
      return;
    }
    goBackOnceRef.current();
  }, [callEnded, handleHangUp]);

  const handleComplete = useCallback(async () => {
    if (navigatedRef.current) return;
    if (!aid) return;
    setCompleting(true);
    try {
      if (joinedRef.current && !endedRef.current) {
        endedRef.current = true;
        await reportCallEndRef.current();
      }
      const res = await fetchWithAuth('/api/doctor/appointments', getToken, {
        method: 'PATCH',
        body: JSON.stringify({ aid: String(aid), status: 'completed' }),
      });
      const data = await res.json();
      console.log('[Doctor] Appointment marked completed:', data.success);
      if (!data.success) {
        Alert.alert('Could not update', data.error || 'The appointment could not be marked completed.');
        return;
      }
      goBackOnce();
    } catch (err) {
      console.error('[Doctor] Mark completed error:', err);
      Alert.alert('Network error', 'Could not reach the server. Please try again.');
    } finally {
      setCompleting(false);
    }
  }, [aid, getToken, goBackOnce]);

  const handleCreatePrescription = useCallback(() => {
    if (!pid) {
      Alert.alert('Patient unavailable', 'This call was opened without patient details, so a prescription cannot be attached.');
      return;
    }
    router.push({ pathname: '/prescriptions/new', params: { pid: String(pid), aid: aid ? String(aid) : '', ai: '1' } });
  }, [pid, aid, router]);

          const postCallPanel = (
    <View style={styles.postCallPanel}>
      <Text style={styles.postCallTitle}>Consultation ended</Text>
      <Text style={styles.postCallSubtitle}>
        The call is over. Mark the visit as completed so the patient sees the update, and add a prescription if needed.
      </Text>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={handleComplete}
          disabled={completing}
          style={[styles.completeButton, completing && styles.completeButtonDisabled]}
        >
          {completing ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <>
              <CheckCircle2 size={18} color={COLORS.text} strokeWidth={1.5} />
              <Text style={styles.completeButtonText}>Mark as Completed</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCreatePrescription} style={styles.prescriptionButton}>
          <FileText size={18} color={COLORS.text} strokeWidth={1.5} />
          <Text style={styles.prescriptionButtonText}>Create Prescription</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={goBackOnce} style={styles.laterButton}>
        <Text style={styles.laterButtonText}>Later, back to schedule</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{callEnded ? 'Consultation Ended' : 'Live Consultation'}</Text>
        <TouchableOpacity onPress={handleLeave} style={styles.closeButton}>
          <X size={16} color={COLORS.error} />
          <Text style={styles.closeText}>{callEnded ? 'Close' : 'Leave'}</Text>
        </TouchableOpacity>
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
              onHangUp={handleHangUp}
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
          ) : fatalError || identityUnavailable ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Could not join the call</Text>
              <Text style={styles.errorText}>
                {fatalError || 'Could not load your doctor profile. Please ensure you are signed in correctly.'}
              </Text>
              {identityUnavailable && (
                <TouchableOpacity onPress={() => refetchIdentity()} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Reload profile</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : liveToken ? null : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>
                {isIdentityLoading ? 'Loading your profile...' : 'Connecting to the consultation room...'}
              </Text>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  title: { color: COLORS.text, fontSize: 16, fontFamily: FONTS.serif, },
  closeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.tertiary, height: 44, borderRadius: 12 },
  closeText: { color: COLORS.error, fontFamily: FONTS.medium, fontWeight: '500', marginLeft: 6, fontSize: 14 },
  
  postCallPanel: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, backgroundColor: COLORS.white },
  
  postCallTitle: { color: COLORS.text, fontSize: 32, fontFamily: FONTS.serif,  marginBottom: 12, letterSpacing: -0.5, textAlign: 'center' },
  postCallSubtitle: { color: COLORS.gray, fontSize: 16, fontFamily: FONTS.regular, fontWeight: '400', lineHeight: 24, marginBottom: 48, textAlign: 'center' },
  
  actionsContainer: { width: '100%', gap: 12 },
  
  completeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primaryLight, paddingVertical: 12, borderRadius: 12 },
  completeButtonDisabled: { opacity: 0.6 , },
  completeButtonText: { color: COLORS.text, fontFamily: FONTS.medium, fontWeight: '500', fontSize: 16 , },
  
  prescriptionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.white, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  prescriptionButtonText: { color: COLORS.text, fontFamily: FONTS.medium, fontWeight: '500', fontSize: 16 , },
  
  laterButton: { alignItems: 'center', paddingVertical: 12, marginTop: 12 },
  laterButtonText: { color: COLORS.gray, fontSize: 16, fontFamily: FONTS.medium, fontWeight: '500' , },
  
  loadingContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white, zIndex: 10 },
  loadingText: { color: COLORS.gray, marginTop: 16, fontSize: 14, fontFamily: FONTS.regular, fontWeight: '400' },
  
  errorContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white, padding: 8, zIndex: 20 },
  errorTitle: { color: COLORS.error, fontSize: 18, fontFamily: FONTS.serif,  marginBottom: 12 },
  errorText: { color: COLORS.gray, fontSize: 14, textAlign: 'center', lineHeight: 22, fontFamily: FONTS.regular, fontWeight: '400' },
  retryButton: { marginTop: 24, backgroundColor: COLORS.text,  paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12, minHeight: 48 },
  retryButtonText: { color: COLORS.white, fontFamily: FONTS.medium, fontWeight: '500', fontSize: 16 },
});












