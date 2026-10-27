import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCircle2, Clock, CheckCheck, X } from 'lucide-react-native';
import { fetchWithAuth } from '../../lib/fetchWithAuth';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { COLORS, FONTS } from '@/constants/theme';

const formatTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function NotificationsPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleOpenNotification = (notification: any) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      markAsRead(notification.notification_id);
    }
  };

  const getNotificationImage = (notification: any) => {
    if (!notification) return null;
    if (notification.image_url) return notification.image_url;
    let meta = notification.metadata;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch {
        meta = null;
      }
    }
    return meta?.image_url || meta?.avatar_url || null;
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetchWithAuth('/api/doctor/notifications', getToken);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [getToken])
  );

  const markAsRead = async (notification_id: string | null = null, markAll: boolean = false) => {
    try {
      if (markAll) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } else {
        setNotifications(prev => prev.map(n => n.notification_id === notification_id ? { ...n, is_read: true } : n));
      }

      await fetchWithAuth('/api/doctor/notifications/read', getToken, {
        method: 'PATCH',
        body: JSON.stringify({ notification_id, markAll })
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      fetchNotifications();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Notifications',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: COLORS.background }, 
          headerShadowVisible: false, 
          headerTintColor: COLORS.text,
          headerRight: () => null,
        }} 
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} colors={[COLORS.primary]} />
        }
      >
        {notifications.length > 0 && (
          <View style={styles.topActionBar}>
            <Text style={styles.allNotificationsLabel}>All notifications</Text>
            <TouchableOpacity 
              onPress={() => markAsRead(null, true)} 
              disabled={unreadCount === 0}
              style={[styles.markAllButton, unreadCount === 0 && { opacity: 0.45 }]}
              activeOpacity={0.7}
            >
              <CheckCheck size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.markAllButtonText}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        )}

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={32} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>You have no new notifications.</Text>
          </View>
        ) : (
          notifications.map(notification => {
            const notifImage = getNotificationImage(notification);
            return (
            <TouchableOpacity 
              key={notification.notification_id} 
              style={[styles.notificationCard, !notification.is_read && styles.unreadCard]}
              onPress={() => handleOpenNotification(notification)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                {notifImage ? (
                  <Image source={{ uri: notifImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Image 
                      source={require('../../../assets/images/app-icon.png')} 
                      style={styles.logoWatermark}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </View>
              
              <View style={styles.notificationContent}>
                <Text style={[styles.notificationTitle, !notification.is_read && styles.unreadText]} numberOfLines={1}>
                  {notification.title || 'Notification'}
                </Text>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {notification.body || notification.message || 'No details provided'}
                </Text>
              </View>

              <View style={styles.rightSide}>
                <Text style={styles.notificationTime}>
                  {formatTime(notification.created_at)}
                </Text>
                <View style={styles.statusIcon}>
                  {notification.is_read ? (
                    <CheckCircle2 size={18} color="#059669" fill="#059669" stroke="#FFF" />
                  ) : (
                    <CheckCircle2 size={18} color="#A7F3D0" fill="#A7F3D0" stroke="#FFF" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
        )}
      </ScrollView>

      {/* Full Notification Detail Modal */}
      <Modal
        visible={Boolean(selectedNotification)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalLogoBadge}>
                  {getNotificationImage(selectedNotification) ? (
                    <Image 
                      source={{ uri: getNotificationImage(selectedNotification) }} 
                      style={styles.modalLogoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image 
                      source={require('../../../assets/images/app-icon.png')} 
                      style={styles.modalLogoImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedNotification?.title || 'Notification'}
                  </Text>
                  <View style={styles.modalMetaRow}>
                    <Clock size={12} color={COLORS.gray} style={{ marginRight: 4 }} />
                    <Text style={styles.modalMetaText}>
                      {selectedNotification?.created_at ? formatTime(selectedNotification.created_at) : 'Just now'}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedNotification(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalBodyText}>
                {selectedNotification?.body || selectedNotification?.message || 'No additional details provided.'}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalActionDoneBtn}
              onPress={() => setSelectedNotification(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalActionDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 8,
  },
  allNotificationsLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  markAllButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 40 },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 32, 
    marginTop: 32,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#f8fafc',
  },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 12, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: COLORS.gray, fontFamily: FONTS.regular, textAlign: 'center' },
  
  notificationCard: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.white, 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    marginBottom: 12, 
    borderRadius: 16, 
    shadowColor: '#0f172a', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 3, 
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center' 
  },
  unreadCard: { 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1.5, 
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  
  avatarContainer: { marginRight: 16 },
  avatar: { width: 56, height: 56, borderRadius: 14 },
  avatarPlaceholder: { 
    width: 56, 
    height: 56, 
    borderRadius: 14, 
    backgroundColor: '#F1F5F9', 
    alignItems: 'center', 
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  logoWatermark: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  
  notificationContent: { flex: 1, justifyContent: 'center', paddingRight: 8 },
  notificationTitle: { fontSize: 16, fontFamily: FONTS.medium, color: COLORS.text, marginBottom: 4 },
  unreadText: { fontFamily: FONTS.bold },
  notificationMessage: { fontSize: 14, color: COLORS.gray, fontFamily: FONTS.regular, lineHeight: 20 },
  
  rightSide: { alignItems: 'flex-end', justifyContent: 'space-between', height: 56 },
  notificationTime: { fontSize: 12, color: COLORS.gray, fontFamily: FONTS.regular },
  statusIcon: { marginTop: 'auto', marginBottom: 2 },

  // Notification Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  modalLogoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalLogoImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    lineHeight: 22,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  modalMetaText: {
    fontSize: 12,
    color: COLORS.gray,
    fontFamily: FONTS.regular,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBodyScroll: {
    maxHeight: 260,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  modalBodyText: {
    fontSize: 15,
    color: COLORS.text,
    fontFamily: FONTS.regular,
    lineHeight: 22,
  },
  modalActionDoneBtn: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalActionDoneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
});
