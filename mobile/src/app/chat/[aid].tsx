import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Send,
  Video,
  MessageSquare,
  AlertCircle,
  CheckCheck,
} from 'lucide-react-native';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useDoctorIdentity, useDoctorProfile } from '@/hooks/queries/doctorQueries';
import { COLORS, FONTS } from '@/constants/theme';

const BRAND_GREEN = '#048256';
const BRAND_GREEN_LIGHT = '#EDF7E3';

const QUICK_TAGS = [
  'Hello! I am reviewing your chart now',
  'Please join the video call whenever you are ready',
  'Could you share when these symptoms started?',
  'Your prescription has been updated',
];

interface ChatMessage {
  message_id: string;
  aid: string;
  sender_uid: string;
  sender_role: 'patient' | 'doctor';
  sender_name?: string;
  sender_image?: string | null;
  content: string;
  media_url?: string | null;
  created_at: string;
  read_at?: string | null;
  status?: 'sending' | 'sent' | 'failed';
}

export default function DoctorAppointmentChatScreen() {
  const insets = useSafeAreaInsets();
  const { aid, pid, status: routeStatus, patientName: routePatientName, patientImage: routePatientImage } = useLocalSearchParams<{
    aid?: string;
    pid?: string;
    status?: string;
    patientName?: string;
    patientImage?: string;
  }>();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { data: identity } = useDoctorIdentity(getToken);
  const { data: profile } = useDoctorProfile(identity?.uid || userId || null, getToken);
  const queryClient = useQueryClient();

  const isConfirmedStatus = (s?: string) => {
    const val = String(s || '').trim().toLowerCase();
    return ['confirmed', 'in_progress', 'completed', 'scheduled', 'booked', 'requested'].includes(val) && val !== 'cancelled';
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputContent, setInputContent] = useState('');
  const [appointmentInfo, setAppointmentInfo] = useState<any>(() => ({
    aid: aid || '',
    pid: pid || '',
    status: routeStatus || 'confirmed',
    patient_name: routePatientName || 'Patient',
    patient_avatar: routePatientImage || '',
    doctor_avatar: '',
  }));
  const [canChat, setCanChat] = useState<boolean>(() => isConfirmedStatus(routeStatus));
  const [statusMessage, setStatusMessage] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const flatListRef = useRef<FlatList>(null);
  const pollTimerRef = useRef<any>(null);

  const doctorPhoto =
    appointmentInfo?.doctor_avatar ||
    profile?.user?.profile_image_url ||
    profile?.doctor?.profile_image_url ||
    '';

  const patientName = appointmentInfo?.patient_name || appointmentInfo?.patientName || routePatientName || 'Patient';
  const patientPhoto =
    appointmentInfo?.patient_avatar ||
    appointmentInfo?.patientAvatarUrl ||
    appointmentInfo?.patientImage ||
    routePatientImage ||
    '';

  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!aid || !getToken) return;
    try {
      const res = await fetchWithAuth(`/api/appointments/${aid}/messages`, getToken);
      if (!res.ok) {
        // If server 404s before deploy finishes, preserve route confirmation state
        if (isConfirmedStatus(routeStatus)) {
          setCanChat(true);
        }
        return;
      }
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        return;
      }
      if (data?.success) {
        const serverMessages: ChatMessage[] = data.messages || [];
        setMessages((prev) => {
          // Keep optimistic messages that haven't been reconciled yet
          const pendingOptimistic = prev.filter(
            (p) => p.status === 'sending' && !serverMessages.some((s) => s.message_id === p.message_id || (s.content === p.content && Math.abs(new Date(s.created_at).getTime() - new Date(p.created_at).getTime()) < 10000))
          );
          return [...serverMessages, ...pendingOptimistic];
        });

        if (data.appointment) {
          setAppointmentInfo((prev: any) => ({ ...prev, ...data.appointment }));
        }
        const effectiveCanChat = typeof data.canChat === 'boolean' 
          ? data.canChat 
          : isConfirmedStatus(data.appointmentStatus || routeStatus);
        setCanChat(effectiveCanChat);
        if (!effectiveCanChat) {
          setStatusMessage(
            `Chat unlocks when the appointment is confirmed (Current Status: ${data.appointmentStatus || 'pending'}).`
          );
        }
        if (isInitial) {
          queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] });
          queryClient.invalidateQueries({ queryKey: ['doctorNotifications'] });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch messages:', err);
      if (isConfirmedStatus(routeStatus)) {
        setCanChat(true);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [aid, getToken, queryClient, routeStatus]);

  useEffect(() => {
    void fetchMessages(true);
    pollTimerRef.current = setInterval(() => {
      void fetchMessages(false);
    }, 3000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctorNotifications'] });
    };
  }, [fetchMessages, queryClient]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputContent).trim();
    if (!text || !aid || !getToken) return;

    // Clear input right away
    setInputContent('');

    // Instant optimistic message - displayed IMMEDIATELY without delay
    const tempId = 'temp_' + Date.now();
    const optimisticMessage: ChatMessage = {
      message_id: tempId,
      aid: String(aid),
      sender_uid: identity?.uid || userId || 'me',
      sender_role: 'doctor',
      sender_name: identity?.name || 'Dr. ' + ((identity as any)?.last_name || 'Doctor'),
      sender_image: doctorPhoto,
      content: text,
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Instantly scroll down so the message is visible on screen right away
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    try {
      const res = await fetchWithAuth(`/api/appointments/${aid}/messages`, getToken, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        console.warn(`[Chat] Send response status ${res.status}`);
        setMessages((prev) =>
          prev.map((m) =>
            m.message_id === tempId ? { ...m, status: 'sent' } : m
          )
        );
        return;
      }

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }

      if (data?.success && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.message_id === tempId ? { ...data.message, status: 'sent' } : m))
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.message_id === tempId ? { ...m, status: 'sent' } : m))
        );
        await fetchMessages(false);
      }
    } catch (err) {
      console.warn('Failed to send message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.message_id === tempId ? { ...m, status: 'sent' } : m))
      );
    } finally {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    }
  };

  const handleStartCall = () => {
    router.push({
      pathname: '/video-call',
      params: {
        aid: String(aid),
        pid: String(pid || appointmentInfo?.pid || ''),
      },
    });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_role === 'doctor';
    const isRead = !!item.read_at;
    const isSending = item.status === 'sending';
    const timeFormatted = item.created_at
      ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    // Sender profile image: doctor profile for doctor messages, patient profile for patient messages
    const rowAvatarUri = isMe
      ? (item.sender_image || doctorPhoto)
      : (item.sender_image || patientPhoto);

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        {/* Patient Profile Picture on Left */}
        {!isMe && (
          <View style={styles.messageAvatarWrapperLeft}>
            {rowAvatarUri ? (
              <Image source={{ uri: rowAvatarUri }} style={styles.messageRowAvatar} />
            ) : null}
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleDoctor : styles.bubblePatient,
          ]}
        >
          {!isMe && (
            <Text style={styles.patientSenderTitle}>
              {item.sender_name || patientName || 'Patient'}
            </Text>
          )}

          <Text
            style={[
              styles.bubbleText,
              isMe ? styles.bubbleTextDoctor : styles.bubbleTextPatient,
            ]}
          >
            {item.content}
          </Text>

          <View style={styles.bubbleMeta}>
            <Text
              style={[
                styles.bubbleTime,
                isMe ? styles.bubbleTimeDoctor : styles.bubbleTimePatient,
              ]}
            >
              {timeFormatted}
            </Text>
            {isMe && (
              <CheckCheck
                size={14}
                color={isRead ? '#38BDF8' : 'rgba(255, 255, 255, 0.7)'}
                style={{ marginLeft: 4, opacity: isSending ? 0.5 : 1 }}
              />
            )}
          </View>
        </View>

        {/* Doctor Profile Picture on Right */}
        {isMe && (
          <View style={styles.messageAvatarWrapperRight}>
            {rowAvatarUri ? (
              <Image source={{ uri: rowAvatarUri }} style={styles.messageRowAvatar} />
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with Patient Profile, Name, Status and Call Action */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={22} color={COLORS.text} />
        </TouchableOpacity>

        {/* Patient Profile Picture */}
        <View style={styles.avatarContainer}>
          {patientPhoto ? (
            <Image source={{ uri: patientPhoto }} style={styles.headerAvatar} />
          ) : null}
          <View
            style={[
              styles.avatarStatusBadge,
              { backgroundColor: canChat ? '#10B981' : '#F59E0B' },
            ]}
          />
        </View>

        <View style={styles.headerPatientInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {patientName}
          </Text>
          <View style={styles.onlineBadgeRow}>
            <Text style={styles.onlineStatusText}>
              {appointmentInfo?.appointmentStatus === 'in_progress' || appointmentInfo?.status === 'in_progress' ? 'In Progress' : canChat ? 'Consultation Confirmed' : 'Waiting Confirmation'}
            </Text>
          </View>
        </View>

        {/* Action button: Call */}
        {canChat && (
          <TouchableOpacity
            style={styles.callActionButton}
            onPress={handleStartCall}
            activeOpacity={0.8}
            accessibilityLabel="Start Video Call"
          >
            <Video size={16} color="#FFFFFF" />
            <Text style={styles.callActionText}>Call</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Appointment Status Warning if Chat is locked */}
      {!canChat && !loading && (
        <View style={styles.bannerLocked}>
          <AlertCircle size={16} color="#B45309" style={{ marginRight: 8 }} />
          <Text style={styles.bannerLockedText}>
            {statusMessage || 'Chat is locked until appointment is confirmed.'}
          </Text>
        </View>
      )}

      {/* Message Feed with universal cross-platform keyboard avoidance */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND_GREEN} />
            <Text style={styles.loadingText}>Connecting to patient chat...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.message_id}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <MessageSquare size={28} color={BRAND_GREEN} />
                  </View>
                  <Text style={styles.emptyTitle}>Direct Patient Chat</Text>
                  <Text style={styles.emptySubtitle}>
                    You and the patient can coordinate timing, discuss symptoms, or share updates here ahead of the call.
                  </Text>
                </View>
              }
            />

            {/* Quick Tag Recommendations */}
            {canChat && (
              <View style={styles.quickTagsContainer}>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={QUICK_TAGS}
                  keyExtractor={(tag) => tag}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                  renderItem={({ item: tag }) => (
                    <TouchableOpacity
                      style={styles.quickTag}
                      onPress={() => handleSend(tag)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickTagText}>{tag}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Input Bar */}
            <View
              style={[
                styles.inputBar,
                {
                  paddingBottom: isKeyboardVisible
                    ? 8
                    : insets.bottom > 0
                    ? insets.bottom + 4
                    : 10,
                },
              ]}
            >
              <TextInput
                style={styles.textInput}
                placeholder={canChat ? 'Write a message to patient...' : 'Chat locked'}
                placeholderTextColor="#94A3B8"
                value={inputContent}
                onChangeText={setInputContent}
                editable={canChat}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!canChat || !inputContent.trim()) && styles.sendButtonDisabled,
                ]}
                onPress={() => handleSend()}
                disabled={!canChat || !inputContent.trim()}
                activeOpacity={0.8}
              >
                <Send size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BRAND_GREEN_LIGHT,
  },
  patientAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BRAND_GREEN_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C6E8D2',
  },
  avatarInitials: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: BRAND_GREEN,
    fontWeight: '700',
  },
  avatarStatusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerPatientInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17.5,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
  },
  onlineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineStatusText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#64748B',
  },
  callActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_GREEN,
    paddingHorizontal: 14,
    borderRadius: 8,
    height: 36,
    gap: 6,
  },
  callActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  bannerLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerLockedText: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: FONTS.medium,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontFamily: FONTS.regular,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BRAND_GREEN_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleDoctor: {
    backgroundColor: BRAND_GREEN,
    borderBottomRightRadius: 4,
  },
  bubblePatient: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  patientSenderTitle: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: BRAND_GREEN,
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  bubbleTextDoctor: {
    color: '#FFFFFF',
  },
  bubbleTextPatient: {
    color: COLORS.text,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 10,
    fontFamily: FONTS.regular,
  },
  bubbleTimeDoctor: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  bubbleTimePatient: {
    color: '#64748B',
  },
  quickTagsContainer: {
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  quickTag: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  quickTagText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginRight: 10,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BRAND_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  messageAvatarWrapperLeft: {
    marginRight: 8,
    marginBottom: 4,
  },
  messageAvatarWrapperRight: {
    marginLeft: 8,
    marginBottom: 4,
  },
  messageRowAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
});


