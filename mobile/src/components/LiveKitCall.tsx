import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, RefreshCw } from 'lucide-react-native';
import {
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  registerGlobals,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from '@livekit/react-native';
import { COLORS } from '@/constants/theme';
import {
  ConnectionState,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RoomOptions,
} from 'livekit-client';

registerGlobals();

const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
};

type LiveKitCallProps = {
  serverUrl: string;
  token: string;
  footer?: React.ReactNode;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: Error) => void;
  onRemoteLeft: () => void;
  onHangUp?: () => void;
};

export default function LiveKitCall({
  serverUrl,
  token,
  footer,
  onConnected,
  onDisconnected,
  onError,
  onRemoteLeft,
  onHangUp,
}: LiveKitCallProps) {
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      audio
      video
      connect
      options={ROOM_OPTIONS}
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      onError={onError}
      onMediaDeviceFailure={(failure) =>
        onError(new Error(`Camera or microphone unavailable (${String(failure ?? 'unknown')}).`))
      }
    >
      <CallStage onRemoteLeft={onRemoteLeft} isFrontCamera={isFrontCamera} />
      {onHangUp ? <EndCallButton onHangUp={onHangUp} /> : null}
      {footer}
      <CallControls isFrontCamera={isFrontCamera} onToggleFrontCamera={setIsFrontCamera} />
    </LiveKitRoom>
  );
}

function EndCallButton({ onHangUp }: { onHangUp: () => void }) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const onHangUpRef = useRef(onHangUp);
  useEffect(() => {
    onHangUpRef.current = onHangUp;
  }, [onHangUp]);

  const hangUp = useCallback(async () => {
    try {
      await room.disconnect();
    } catch (e) {
      console.error('[call] Disconnect failed:', e);
    } finally {
      onHangUpRef.current();
    }
  }, [room]);

  if (connectionState !== ConnectionState.Connected) return null;

  return (
    <View style={styles.endCallRow}>
      <TouchableOpacity onPress={hangUp} style={styles.endCallButton} activeOpacity={0.8}>
        <PhoneOff size={16} color="#FFFFFF" />
        <Text style={styles.endCallText}>End Call</Text>
      </TouchableOpacity>
    </View>
  );
}

function CallStage({
  onRemoteLeft,
  isFrontCamera,
}: {
  onRemoteLeft: () => void;
  isFrontCamera: boolean;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]).filter(isTrackReference);

  const remoteRef = useMemo(() => tracks.find((t) => !t.participant.isLocal), [tracks]);
  const localRef = useMemo(() => tracks.find((t) => t.participant.isLocal), [tracks]);

  const onRemoteLeftRef = useRef(onRemoteLeft);
  useEffect(() => {
    onRemoteLeftRef.current = onRemoteLeft;
  }, [onRemoteLeft]);

  useEffect(() => {
    const handleDisconnected = (participant: RemoteParticipant) => {
      if (participant.isLocal) return;
      onRemoteLeftRef.current();
    };
    room.on(RoomEvent.ParticipantDisconnected, handleDisconnected);
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, handleDisconnected);
    };
  }, [room]);

  const connected = connectionState === ConnectionState.Connected;

  return (
    <View style={styles.videoArea}>
      {connected && remoteRef ? (
        <View style={styles.remoteView}>
          <VideoTrack trackRef={remoteRef} style={StyleSheet.absoluteFill} objectFit="cover" zOrder={0} />
        </View>
      ) : (
        <View style={styles.emptyRemote}>
          <Text style={styles.emptyText}>
            {connected ? 'Waiting for the patient to join…' : 'Connecting to consultation…'}
          </Text>
        </View>
      )}

      {connected && localRef ? (
        <View style={styles.localView}>
          <VideoTrack
            trackRef={localRef}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
            mirror={isFrontCamera}
            zOrder={1}
          />
        </View>
      ) : null}
    </View>
  );
}

function CallControls({
  isFrontCamera,
  onToggleFrontCamera,
}: {
  isFrontCamera: boolean;
  onToggleFrontCamera: (nextFront: boolean) => void;
}) {
  const { isMicrophoneEnabled, isCameraEnabled, localParticipant } = useLocalParticipant();

  const toggleMic = useCallback(() => {
    localParticipant
      .setMicrophoneEnabled(!isMicrophoneEnabled)
      .catch((e) => console.error('[call] Microphone toggle failed:', e));
  }, [localParticipant, isMicrophoneEnabled]);

  const toggleCam = useCallback(() => {
    localParticipant
      .setCameraEnabled(!isCameraEnabled)
      .catch((e) => console.error('[call] Camera toggle failed:', e));
  }, [localParticipant, isCameraEnabled]);

  const flipCam = useCallback(async () => {
    const nextFront = !isFrontCamera;
    onToggleFrontCamera(nextFront);

    try {
      const videoPub = localParticipant.getTrackPublication(Track.Source.Camera);
      const localTrack: any = videoPub?.track;

      const mediaStreamTrack = localTrack?.mediaStreamTrack;
      if (mediaStreamTrack && typeof mediaStreamTrack._switchCamera === 'function') {
        mediaStreamTrack._switchCamera();
        return;
      }

      if (localTrack && typeof localTrack.restartTrack === 'function') {
        await localTrack.restartTrack({
          facingMode: nextFront ? 'user' : 'environment',
        });
        return;
      }

      await localParticipant.setCameraEnabled(false);
      await localParticipant.setCameraEnabled(true, {
        facingMode: nextFront ? 'user' : 'environment',
      });
    } catch (e) {
      console.error('[call] Camera flip failed:', e);
    }
  }, [isFrontCamera, onToggleFrontCamera, localParticipant]);

  return (
    <View style={styles.controls}>
      <TouchableOpacity
        onPress={toggleMic}
        style={[styles.controlButton, !isMicrophoneEnabled && styles.controlOff]}
        activeOpacity={0.8}
      >
        {isMicrophoneEnabled ? <Mic size={22} color="#048256" /> : <MicOff size={22} color="#EF4444" />}
        <Text style={[styles.controlText, !isMicrophoneEnabled && styles.controlTextDanger]}>
          {isMicrophoneEnabled ? 'Mute' : 'Muted'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={toggleCam}
        style={[styles.controlButton, !isCameraEnabled && styles.controlOff]}
        activeOpacity={0.8}
      >
        {isCameraEnabled ? <Camera size={22} color="#048256" /> : <CameraOff size={22} color="#EF4444" />}
        <Text style={[styles.controlText, !isCameraEnabled && styles.controlTextDanger]}>
          {isCameraEnabled ? 'Camera' : 'Off'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={flipCam} style={styles.controlButton} activeOpacity={0.8}>
        <RefreshCw size={22} color="#030315" />
        <Text style={styles.controlText}>Flip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  videoArea: { flex: 1, backgroundColor: '#F8FAFC' },
  remoteView: { flex: 1, backgroundColor: '#F1F5F9' },
  emptyRemote: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  emptyText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  localView: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 110,
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  controlOff: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  controlText: {
    color: '#334155',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  controlTextDanger: {
    color: '#EF4444',
  },
  endCallRow: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  endCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    height: 36,
  },
  endCallText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
