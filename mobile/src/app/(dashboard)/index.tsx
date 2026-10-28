import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet, Image, Dimensions, Linking, RefreshControl } from 'react-native';
import { Calendar, Video, MapPin, Check, CheckCircle2, User, RefreshCw, MoreVertical, FileText, ChevronRight, ChevronLeft, X, MessageSquare, Bell, ArrowRight, Activity, Users, Pill, Banknote, ShieldCheck } from 'lucide-react-native';
import { TranslatedText } from '@/components/TranslatedText';
import { SwipeAction } from '@/components/SwipeAction';
import { MarkdownText } from '@/components/MarkdownText';
import { NameText } from '@/components/NameText';
import { MiniCalendar } from '@/components/MiniCalendar';
import { useDoctorIdentity, useDoctorAppointments, useDoctorProfile, useDoctorFinance, useDoctorNotifications } from '@/hooks/queries/doctorQueries';
import { useUpdateAppointmentStatus, useChangeAppointmentMode } from '@/hooks/mutations/doctorMutations';
import { useRouter, useFocusEffect, useLocalSearchParams, Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS } from '@/constants/theme';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { focusAid } = useLocalSearchParams<{ focusAid?: string }>();
  const [activeTab, setActiveTab] = useState('pending');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const { getToken, userId, signOut } = useAuth();
  const { data: identity, isLoading: isIdentityLoading, error: identityError } = useDoctorIdentity(getToken);
  const uid = identity?.uid || userId;
  const { data: aptsData, isLoading: isAptsLoading, error: aptsError, refetch: refetchApts } = useDoctorAppointments(uid, getToken, false);
  const { data: profile, refetch: refetchProfile } = useDoctorProfile(uid, getToken);
  const { data: finance, refetch: refetchFinance } = useDoctorFinance(uid, getToken);
  const { data: notifData } = useDoctorNotifications(getToken);
  const unreadNotifs = notifData?.unreadCount ?? aptsData?.pending?.length ?? 0;
  const queryClient = useQueryClient();

  useFocusEffect(
    React.useCallback(() => {
      if (uid) {
        queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] });
        queryClient.invalidateQueries({ queryKey: ['doctorProfile'] });
        queryClient.invalidateQueries({ queryKey: ['doctorFinance'] });
        queryClient.invalidateQueries({ queryKey: ['doctorNotifications'] });
      }
    }, [uid, queryClient])
  );
  const updateStatus = useUpdateAppointmentStatus();
  const changeMode = useChangeAppointmentMode();

  useEffect(() => {
    if (!focusAid || !aptsData) return;
    const order = ['pending', 'confirmed', 'today', 'completed', 'cancelled'] as const;
    const hit = order.find((t) =>
      (aptsData[t] as any[]).some((a) => String(a?.aid ?? a?.id ?? a?._id ?? '') === String(focusAid))
    );
    if (hit && hit !== activeTab) setActiveTab(hit);
    router.setParams({ focusAid: undefined } as any);
  }, [focusAid, aptsData, activeTab, router]);

  const canJoinVideoCall = (apt: any, currentTime: number) => {
    if (apt.status === 'in_progress') return true;
    if (apt.status !== 'confirmed') return false;
    const dateStr = String(apt.scheduled_date ?? apt.scheduledDate ?? '').slice(0, 10);
    const timeStr = String(apt.scheduled_time ?? apt.scheduledTime ?? '').slice(0, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) return false;
    const start = new Date(`${dateStr}T${timeStr}:00`).getTime();
    const fiveMinBefore = start - 5 * 60 * 1000;
    return currentTime >= fiveMinBefore;
  };

  const isWrongRole = (identityError as any)?.code === 'ROLE_MISMATCH';
  if (isWrongRole) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8, gap: 12 }}>
          <User size={48} color={COLORS.error} />
          <Text style={{ color: COLORS.text, fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', textAlign: 'center' }}>
            This is a patient account
          </Text>
          <Text style={{ color: COLORS.gray, fontSize: 14, fontFamily: FONTS.regular, fontWeight: '400', textAlign: 'center', lineHeight: 20 }}>
            You are signed in as a patient. Please use the patient app to book and join consultations.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => signOut()}>
            <Text style={styles.primaryBtnText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (identityError && !aptsData) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
        <View style={styles.emptyState}>
          <User size={48} color={COLORS.error} />
          <Text style={styles.emptyText}><TranslatedText>Failed to load doctor profile</TranslatedText></Text>
          <Text style={styles.errorDetail}>{String((identityError as any)?.message || 'Could not load doctor identity')}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => refetchApts()}>
            <RefreshCw size={16} color={COLORS.white} />
            <Text style={styles.primaryBtnText}><TranslatedText>Retry</TranslatedText></Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isLoading = (!aptsData && !aptsError && !identityError && (isIdentityLoading || isAptsLoading));
  if (isLoading) return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <ActivityIndicator size='large' color={COLORS.primary} />
        <Text style={{ color: COLORS.gray, fontSize: 14, fontFamily: FONTS.medium }}>
          <TranslatedText>Loading appointments...</TranslatedText>
        </Text>
      </View>
    </SafeAreaView>
  );

  if (!aptsData) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
        <View style={styles.emptyState}>
          <Calendar size={48} color={COLORS.error} />
          <Text style={styles.emptyText}>
            <TranslatedText>Could not load appointments</TranslatedText>
          </Text>
          <Text style={styles.errorDetail}>
            {String((aptsError as any)?.message || 'Unknown error')}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => refetchApts()}>
            <RefreshCw size={16} color={COLORS.white} />
            <Text style={styles.primaryBtnText}><TranslatedText>Retry</TranslatedText></Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPendingStatus = (status: any) =>
    ['scheduled', 'booked', 'pending', 'requested', 'awaiting', 'awaiting_confirmation', 'new'].includes(
      String(status || '').trim().toLowerCase()
    );
  const aptDate = (apt: any) => {
    const d = String(apt?.scheduled_date ?? apt?.scheduledDate ?? apt?.date ?? '').slice(0, 10);
    if (!d) return '';
    try { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d)); } catch(e) { return d; }
  };
  const aptTime = (apt: any) => {
    const t = String(apt?.scheduled_time ?? apt?.scheduledTime ?? apt?.time ?? '').slice(0, 5);
    if (!t || !t.includes(':')) return t;
    const [h, m] = t.split(':');
    const hd = parseInt(h, 10);
    const ampm = hd >= 12 ? 'PM' : 'AM';
    const hr12 = hd % 12 || 12;
    return hr12 + ':' + m + ' ' + ampm;
  };
  const aptComplaint = (apt: any) =>
    apt?.complaint_description ?? apt?.chief_complaint ?? apt?.complaint ?? apt?.symptoms ?? '';
  const aptKey = (apt: any, index: number) => String(apt?.aid ?? apt?.id ?? apt?._id ?? index);
  const aptPatientName = (apt: any) =>
    apt?.patient?.user?.name ?? apt?.patient?.name ?? apt?.patientName ?? apt?.user?.name ?? undefined;
  const aptPatientImage = (apt: any) => apt?.patient?.user?.profileImageUrl ?? apt?.patient?.user?.profile_image_url ?? apt?.patient?.profileImageUrl ?? apt?.patient?.profile_image_url ?? apt?.user?.profileImageUrl ?? apt?.user?.profile_image_url ?? undefined;

  const isInClinicMode = (apt: any) =>
    ['offline', 'clinic', 'in-person', 'in_person'].includes(String(apt?.mode || '').toLowerCase());

  const clinicLocation = profile?.doctor?.clinicLocation ?? null;
  const clinicAddress = [
    profile?.doctor?.address_line1,
    profile?.doctor?.city,
    profile?.doctor?.state,
    profile?.doctor?.postal_code,
  ].filter(Boolean).join(', ');
  const hasClinicLocation =
    (clinicLocation?.latitude != null && clinicLocation?.longitude != null) || !!clinicAddress;

  const openClinicMap = () => {
    if (clinicLocation?.latitude != null && clinicLocation?.longitude != null) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${clinicLocation.latitude},${clinicLocation.longitude}`
      ).catch(() => {});
    } else if (clinicAddress) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicAddress)}`
      ).catch(() => {});
    }
  };

  const tabs = [
    { id: 'pending', label: 'Pending', count: aptsData.pending.length },
    { id: 'confirmed', label: 'Confirmed', count: aptsData.confirmed.length },
    { id: 'today', label: 'Today', count: aptsData.today.length },
    { id: 'completed', label: 'Completed', count: aptsData.completed.length },
    { id: 'cancelled', label: 'Cancelled', count: aptsData.cancelled.length },
  ];

  const currentAppointments = (aptsData as any)[activeTab] || [];
  const doctorName = profile?.user?.name || identity?.name || 'Doctor';
  const profileImage = profile?.user?.profile_image_url || profile?.doctor?.profile_image_url || '';
  const specialization = profile?.doctor?.specialization?.[0] || 'Ayurveda Specialist';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await Promise.all([refetchApts(), refetchProfile?.(), refetchFinance?.()]);
              } finally {
                setRefreshing(false);
              }
            }} 
            colors={[COLORS.primary]} 
            tintColor={COLORS.primary} 
          />
        }>
        
        {/* Top Header Section like Patient App */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <View style={styles.greetingRow}>
              <Text style={styles.emoji}>{"\uD83D\uDC4B"}</Text>
              <Text style={styles.greeting}>
                Hello, <Text style={styles.name}>{doctorName.split(' ')[0]}</Text>
              </Text>
            </View>
            <Text style={styles.subtitle}>
              {(!specialization || specialization.toLowerCase().includes('general medicine')) 
                ? 'Ready for consultations' 
                : specialization}
            </Text>
          </View>

          {/* Profile & Action Buttons on Top Right */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.circleIconButton} 
              onPress={() => router.push('/notifications' as any)}
              activeOpacity={0.7}
              accessibilityLabel={"Notifications, " + unreadNotifs + " unread"}
            >
              <Bell size={21} color="#374151" />
              {unreadNotifs > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.circleIconButton, { marginLeft: 8 }]} 
              onPress={() => router.push('/profile' as any)}
              activeOpacity={0.8}
              accessibilityLabel="Doctor Profile"
            >
              <View style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                overflow: 'hidden',
                backgroundColor: '#EAEFF5',
                borderWidth: 1.5,
                borderColor: '#D0DCEB',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Image source={require('@/assets/images/doctor-placeholder.jpg')} style={{ width: '100%', height: '100%' }} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>


        {/* Dashboard Banner matching Patient App with Patient Image */}
        <TouchableOpacity 
          style={styles.bannerCard} 
          onPress={() => setActiveTab('today')}
          activeOpacity={0.9}
        >
          <View style={styles.bannerLeftCol}>
            <Text style={styles.bannerHeadline}>Patient Care{'\n'}&amp; OPD Queue</Text>
            <Text style={styles.bannerSubtext}>
              {aptsData.today.length} scheduled today • {aptsData.pending.length} pending
            </Text>
            <View style={styles.bannerCta}>
              <Text style={styles.bannerCtaText}>View Queue</Text>
              <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </View>
          </View>

          <View style={styles.bannerRightCol}>
            <View style={styles.bannerDoctorCircleBg} />
            <Image 
              source={require('../../../assets/images/indian_patient_banner.png')}
              style={styles.bannerDoctorPhoto}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>

        {/* Quick Links Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}><TranslatedText>Quick Links</TranslatedText></Text>
          </View>
          
          <View style={styles.quickLinksGrid}>
            <TouchableOpacity 
              style={[styles.quickLinkBox, { backgroundColor: '#DCFCE7' }]} 
              onPress={() => setActiveTab('today')}
            >
              <Calendar size={24} color={COLORS.text} style={styles.qlIcon} />
              <Text style={styles.qlTitle}>Today's{'\n'}Visits</Text>
              <View style={styles.qlCountBadge}>
                <Text style={styles.qlCount}>{aptsData.today.length}</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkBox, { backgroundColor: '#E0F2FE' }]} 
              onPress={() => router.push('/patients')}
            >
              <Users size={24} color={COLORS.text} style={styles.qlIcon} />
              <Text style={styles.qlTitle}>Patients{'\n'}Directory</Text>
              <View style={styles.qlCountBadge}>
                <Text style={styles.qlCount}>{aptsData.confirmed.length + aptsData.completed.length}</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkBox, { backgroundColor: '#FEF3C7' }]} 
              onPress={() => router.push('/prescriptions/new')}
            >
              <Pill size={24} color={COLORS.text} style={styles.qlIcon} />
              <Text style={styles.qlTitle}>New{'\n'}Prescription</Text>
              <View style={styles.qlCountBadge}>
                <Text style={styles.qlCount}>+ Create</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickLinkBox, { backgroundColor: '#F3E8FF' }]} 
              onPress={() => router.push('/finance')}
            >
              <Banknote size={24} color={COLORS.text} style={styles.qlIcon} />
              <Text style={styles.qlTitle}>Finance &amp;{'\n'}Earnings</Text>
              <View style={styles.qlCountBadge}>
                <Text style={styles.qlCount}>₹{finance?.totalEarnings || 0}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Consultations Header & Tabs */}
        <View style={styles.tabsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}><TranslatedText>Appointments &amp; Queue</TranslatedText></Text>
          </View>
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              {tabs.map((tab) => (
                <TouchableOpacity 
                  key={tab.id} 
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                    <TranslatedText>{tab.label}</TranslatedText>
                  </Text>
                  {tab.count >= 0 && (
                    <View 
                      style={[styles.badge, activeTab === tab.id ? styles.activeBadge : styles.inactiveBadge]}
                      pointerEvents="none"
                    >
                      <Text style={[styles.badgeText, activeTab === tab.id ? styles.activeBadgeText : styles.inactiveBadgeText]}>{tab.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

      {currentAppointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Calendar size={48} color={COLORS.gray} />
          <Text style={styles.emptyText}><TranslatedText>No appointments in this category</TranslatedText></Text>
        </View>
      ) : (
        <View style={styles.list}>
          {currentAppointments.map((apt: any, index: number) => {
            const hasVideo = (apt.mode === 'online' || apt.mode === 'video') && (apt.status === 'confirmed' || apt.status === 'in_progress') && canJoinVideoCall(apt, now);
            const hasCompleteVisit = (apt.mode === 'offline' || apt.mode === 'clinic' || apt.mode === 'in-person' || apt.mode === 'in_person') && (apt.status === 'confirmed' || apt.status === 'in_progress');
            const hasMap = isInClinicMode(apt) && apt.status !== 'cancelled' && hasClinicLocation;
            const canConfirm = isPendingStatus(apt.status);
            const canChat = apt.status === 'confirmed' || apt.status === 'in_progress';
            const canSwitchMode = apt.status !== 'completed' && apt.status !== 'cancelled';
            const canPrescribe = apt.status === 'completed' || (apt.status === 'in_progress' && (apt.mode === 'online' || apt.mode === 'video'));
            const canCancel = apt.status === 'confirmed' || isPendingStatus(apt.status);
            const isOnlineMode = apt.mode === 'online' || apt.mode === 'video';
            const isOfflineMode = isInClinicMode(apt);
            // Online: requires video call to be completed/ended (call_ended_at set or call duration logged)
            const hasEndedCall = !!(
              apt.call_ended_at ||
              apt.end_time ||
              (typeof apt.call_duration_minutes === 'number' && apt.call_duration_minutes > 0) ||
              (typeof apt.duration_minutes === 'number' && apt.duration_minutes > 0)
            );
            const canComplete = isOnlineMode && apt.status === 'in_progress' && hasEndedCall;

            return (
              <View key={aptKey(apt, index)} style={styles.card}>
                {/* Patient Info Row */}
                <View style={styles.patientInfoRow}>
                  <View style={styles.avatar}>
                    {aptPatientImage(apt) ? (
                      <Image source={{uri: aptPatientImage(apt)}} style={{width: 44, height: 44, borderRadius: 22}} />
                    ) : (
                      <User size={24} color={COLORS.primary} />
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <NameText name={aptPatientName(apt)} fallback="Patient" style={{fontSize: 19.5, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text}} />
                    <Text style={styles.timeText}>{aptDate(apt)} • {aptTime(apt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, apt.status === 'in_progress' ? {backgroundColor: COLORS.completeBtnBg} : {}]}>
                    {apt.status === 'in_progress' && <View style={{width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.completeBtnText, marginRight: 4}} />}
                    <Text style={[styles.statusText, apt.status === 'in_progress' ? {color: COLORS.completeBtnText} : {}]}>
                      <TranslatedText>{String(apt.status || 'pending')}</TranslatedText>
                    </Text>
                  </View>
                </View>

                {/* Complaint Row */}
                {aptComplaint(apt) ? (
                  <View style={styles.complaintBox}>
                    <View style={styles.complaintIconContainer}>
                      <FileText size={14} color={COLORS.text} />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.complaintLabel}><TranslatedText>PATIENT'S COMPLAINT</TranslatedText></Text>
                      <MarkdownText style={styles.complaintText}>{String(Array.isArray(aptComplaint(apt)) ? aptComplaint(apt).join(', ') : aptComplaint(apt))}</MarkdownText>
                    </View>
                  </View>
                ) : null}

                {/* Primary Action Row */}
                {hasVideo && (
                  <TouchableOpacity 
                    style={styles.mainActionBtn}
                    onPress={() => router.push({ pathname: '/video-call', params: { aid: apt.aid ?? apt.id ?? apt._id, pid: apt.pid ?? apt.patient_id ?? apt.patientId } })}
                  >
                    <View style={styles.mainActionIconBg}>
                      <Video size={20} color={COLORS.white} />
                    </View>
                    <View style={styles.mainActionTextContainer}>
                      <Text style={styles.mainActionTitle}>
                        <TranslatedText>{apt.status === 'in_progress' ? 'Rejoin Call' : 'Join Video Call'}</TranslatedText>
                      </Text>
                      <Text style={styles.mainActionSubtitle}><TranslatedText>Continue video consultation</TranslatedText></Text>
                    </View>
                    <ChevronRight size={20} color={COLORS.white} />
                  </TouchableOpacity>
                )}

                {hasCompleteVisit && (
                  <TouchableOpacity 
                    style={styles.mainActionBtn}
                    disabled={updateStatus.isPending && updateStatus.variables?.aid === (apt.aid ?? apt.id ?? apt._id)}
                    onPress={() => updateStatus.mutate(
                      { aid: apt.aid ?? apt.id ?? apt._id, status: 'completed', uid: uid || '', token: getToken },
                      { onSuccess: () => setActiveTab('completed') }
                    )}
                  >
                    <View style={styles.mainActionIconBg}>
                      <Check size={20} color={COLORS.white} />
                    </View>
                    <View style={styles.mainActionTextContainer}>
                      <Text style={styles.mainActionTitle}>
                        <TranslatedText>
                          {updateStatus.isPending && updateStatus.variables?.aid === (apt.aid ?? apt.id ?? apt._id)
                            ? 'Marking...'
                            : 'Mark as Completed'}
                        </TranslatedText>
                      </Text>
                      <Text style={styles.mainActionSubtitle}><TranslatedText>Finish in-person clinic consultation</TranslatedText></Text>
                    </View>
                    <ChevronRight size={20} color={COLORS.white} />
                  </TouchableOpacity>
                )}

                {canConfirm && (
                  <TouchableOpacity 
                    style={styles.mainActionBtn}
                    onPress={() => updateStatus.mutate(
                      { aid: apt.aid ?? apt.id ?? apt._id, status: 'confirmed', uid: uid || '', token: getToken },
                      { onSuccess: () => setActiveTab('confirmed') }
                    )}
                  >
                    <View style={styles.mainActionIconBg}>
                      <Check size={20} color={COLORS.white} />
                    </View>
                    <View style={styles.mainActionTextContainer}>
                      <Text style={styles.mainActionTitle}><TranslatedText>Confirm Appointment</TranslatedText></Text>
                      <Text style={styles.mainActionSubtitle}><TranslatedText>Accept this consultation</TranslatedText></Text>
                    </View>
                    <ChevronRight size={20} color={COLORS.white} />
                  </TouchableOpacity>
                )}

                {/* Quick Actions Grid */}
                {(canChat || canSwitchMode || canPrescribe || hasMap || canCancel) && (
                  <View style={{marginTop: 16}}>
                    <Text style={styles.quickActionsLabel}><TranslatedText>QUICK ACTIONS</TranslatedText></Text>
                    <View style={styles.quickActionsGrid}>
                        {canChat && (
                        <TouchableOpacity
                          style={[styles.quickActionBox, { width: 'auto', paddingVertical: 8,
    marginVertical: 6, paddingHorizontal: 12, marginRight: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDF7E3', borderWidth: 1, borderColor: '#C6E8D2', position: 'relative' }]}
                          onPress={() => router.push({ 
                            pathname: '/chat/[aid]', 
                            params: { 
                              aid: apt.aid ?? apt.id ?? apt._id, 
                              pid: apt.pid ?? apt.patient_id ?? apt.patientId,
                              status: apt.status || 'confirmed',
                              patientName: aptPatientName(apt) || 'Patient',
                              patientImage: aptPatientImage(apt) || ''
                            } 
                          })}
                        >
                          <MessageSquare size={16} color="#048256" style={{ marginRight: 6 }} />
                          <Text style={[styles.quickActionTitle, { color: '#048256', fontWeight: '700' }]}>
                            <TranslatedText>Chat</TranslatedText>
                          </Text>
                          {Number(apt.unread_messages_count || apt.unreadMessagesCount || 0) > 0 && (
                            <View style={{
                              marginLeft: 6,
                              backgroundColor: '#EF4444',
                              borderRadius: 10,
                              minWidth: 18,
                              height: 18,
                              paddingHorizontal: 4,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                                {(apt.unread_messages_count || apt.unreadMessagesCount) > 99 ? '99+' : (apt.unread_messages_count || apt.unreadMessagesCount)}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                      {canSwitchMode && (
                        <TouchableOpacity 
                          style={[styles.quickActionBox, { width: 'auto', paddingVertical: 8, marginVertical: 6, paddingHorizontal: 12, marginRight: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#5c85d9', borderRadius: 12 }]} 
                          onPress={() => changeMode.mutate({ aid: apt.aid ?? apt.id ?? apt._id, mode: apt.mode === 'online' ? 'offline' : 'online', uid: uid || '', token: getToken })}
                        >
                          <RefreshCw size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={[styles.quickActionTitle, { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }]}>
                            <TranslatedText>Switch Mode</TranslatedText>
                          </Text>
                        </TouchableOpacity>
                      )}

                      {canPrescribe && (
                        <TouchableOpacity 
                          style={[styles.quickActionBox, { width: 'auto', paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E8FF' }]} 
                          onPress={() => router.push({ pathname: '/prescriptions/new', params: { pid: apt.pid ?? apt.patient_id ?? apt.patientId, aid: apt.aid ?? apt.id ?? apt._id, ...(apt.status === 'in_progress' ? { ai: '1' } : {}) } })}
                        >
                          <FileText size={16} color={COLORS.text} style={{ marginRight: 6 }} />
                          <Text style={styles.quickActionTitle}>
                            <TranslatedText>Create Prescription</TranslatedText>
                          </Text>
                        </TouchableOpacity>
                      )}

                      {canCancel && (<TouchableOpacity style={[styles.quickActionBox, { width: 'auto', paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2' }]} onPress={() => updateStatus.mutate({ aid: apt.aid ?? apt.id ?? apt._id, status: 'cancelled', uid: uid || '', token: getToken }, { onSuccess: () => setActiveTab('cancelled') })}><X size={16} color={COLORS.text} style={{marginRight: 6}} /><Text style={styles.quickActionTitle}><TranslatedText>Cancel</TranslatedText></Text></TouchableOpacity>)}
                    </View>
                  </View>
                )}

                {/* Bottom Complete Action - Only shown if video call actually joined/started (online) or visit recorded/in progress (offline) */}
                {canComplete && (
                  <TouchableOpacity
                    style={styles.bottomCompleteBtn}
                    disabled={updateStatus.isPending && updateStatus.variables?.aid === (apt.aid ?? apt.id ?? apt._id)}
                    onPress={() => updateStatus.mutate(
                      { aid: apt.aid ?? apt.id ?? apt._id, status: 'completed', uid: uid || '', token: getToken },
                      { onSuccess: () => setActiveTab('completed') }
                    )}
                  >
                    <View style={styles.bottomCompleteIconBg}>
                      <Check size={18} color="#5c85d9" strokeWidth={3} />
                    </View>
                    <View style={styles.bottomCompleteTextContainer}>
                      <Text style={styles.bottomCompleteTitle}>
                        {updateStatus.isPending && updateStatus.variables?.aid === (apt.aid ?? apt.id ?? apt._id)
                          ? 'Marking...'
                          : 'Mark as Completed'}
                      </Text>
                      <Text style={styles.bottomCompleteSubtitle}><TranslatedText>End this consultation</TranslatedText></Text>
                    </View>
                  </TouchableOpacity>
                )}

              </View>
            );
          })}
        </View>
      )}

        <View style={styles.sidebar}>
          <MiniCalendar appointments={[...aptsData.pending, ...aptsData.confirmed, ...aptsData.today]} />
        </View>
        <View style={styles.footerImageContainer}>
          <Image 
            source={require('../../../assets/images/Proudly_Made_in_India_Skyline.png')} 
            style={styles.footerImage} 
            resizeMode="cover" 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 160,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    marginTop: 2,
    paddingVertical: 2,
  },
  headerTextContainer: { flex: 1 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  emoji: { fontSize: 24, marginRight: 8 },
  greeting: { fontSize: 22, fontFamily: FONTS.semiBold, color: '#030315', lineHeight: 28 },
  name: { fontFamily: FONTS.bold, color: '#030315' },
  subtitle: { fontSize: 14.5, fontFamily: FONTS.regular, color: '#6B7280', lineHeight: 20, marginTop: 3 },
  circleIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 52,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 12 },
  searchInputPlaceholder: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },

  bannerCard: {
    borderRadius: 20,
    backgroundColor: '#EEF3FB', // COLORS.secondary / primaryLight
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  bannerLeftCol: {
    flex: 1,
    paddingRight: 18,
    zIndex: 2,
    justifyContent: 'center',
  },
  bannerHeadline: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 25,
    marginBottom: 6,
  },
  bannerSubtext: {
    fontSize: 13.5,
    fontFamily: FONTS.medium,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  bannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary, // Theme primary blue (#5c85d9)
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerCtaText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 13,
  },
  bannerRightCol: {
    position: 'absolute',
    right: 8,
    bottom: 0,
    width: 125,
    height: 145,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bannerDoctorCircleBg: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#D9E5F9', // Soft theme blue circle
    opacity: 0.95,
    bottom: 10,
    right: 8,
  },
  bannerDoctorPhoto: {
    width: 120,
    height: 140,
    zIndex: 2,
  },

  section: { marginBottom: 20 },
  tabsSection: { marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18.5, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },

  quickLinksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickLinkBox: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    minHeight: 105,
    justifyContent: 'space-between',
  },
  qlIcon: { marginBottom: 6 },
  qlTitle: { fontSize: 14.5, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text, lineHeight: 19 },
  qlCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  qlCount: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },

  tabsContainer: { flexDirection: 'row', marginTop: 2, marginBottom: 2, minHeight: 32 },
  tab: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    height: 32,
    paddingHorizontal: 13, 
    marginRight: 6, 
    borderRadius: 16, 
    backgroundColor: '#F1F5F9',
  },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: COLORS.gray, letterSpacing: 0.2 },
  activeTabText: { color: COLORS.white },
  badge: {
    padding: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: { backgroundColor: 'rgba(255,255,255,0.28)' },
  inactiveBadge: {
    backgroundColor: COLORS.badge,
  },
  badgeText: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', textAlign: 'center', includeFontPadding: false },
  activeBadgeText: {
    color: COLORS.white,
  },
  inactiveBadgeText: {
    color: COLORS.badgeText,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.text,
    fontFamily: FONTS.medium, fontWeight: '500',
    fontSize: 15,
  },
  errorDetail: {
    marginTop: 8,
    marginBottom: 20,
    color: COLORS.gray,
    fontFamily: FONTS.medium, fontWeight: '500',
    fontSize: 13,
    textAlign: 'center',
  },
  list: {
    gap: 16,
  },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.badge, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardInfo: {
    flex: 1,
  },
  timeText: {
    fontSize: 13.5,
    color: COLORS.gray,
    fontFamily: FONTS.medium, fontWeight: '500',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: COLORS.badge,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.badgeText,
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  complaintBox: { 
    backgroundColor: '#F3F5F8', 
    padding: 13, 
    borderRadius: 12, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8ECF2',
  },
  complaintLabel: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray, marginBottom: 4, letterSpacing: 0.5 },
  complaintText: {
    fontSize: 15,
    fontFamily: FONTS.regular, fontWeight: '400',
    color: COLORS.text,
    lineHeight: 21,
  },
  patientInfoRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 12 },
  complaintRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  complaintIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAEFF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mainActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.text, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, marginBottom: 12, shadowColor: COLORS.text, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  mainActionIconBg: { width: 40, height: 40, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mainActionTextContainer: {
    flex: 1,
  },
  mainActionTitle: { color: COLORS.white, fontFamily: FONTS.serif, fontSize: 16.5, marginBottom: 2, },
  mainActionSubtitle: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.serif, fontSize: 12.5, },
  quickActionsLabel: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray, marginBottom: 8, },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, },
  quickActionBox: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, },
  quickActionIconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  quickActionTextContainer: { flex: 1 },
  quickActionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  quickActionTitle: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
  quickActionDesc: { fontSize: 12, color: COLORS.gray, fontFamily: FONTS.regular, lineHeight: 15 },
  bottomCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.completeBtnBg,
    padding: 10,
    borderRadius: 16,
    marginTop: 16,
  },
  bottomCompleteIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.completeBtnText,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bottomCompleteTextContainer: {
    flex: 1,
  },
  bottomCompleteTitle: {
    color: COLORS.completeBtnText,
    fontFamily: FONTS.serif,
    fontSize: 16,
    marginBottom: 2,
  },
  bottomCompleteSubtitle: {
    color: COLORS.completeBtnText,
    opacity: 0.85,
    fontFamily: FONTS.serif,
    fontSize: 13.5,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6, minHeight: 52 },
  primaryBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold, fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6, minHeight: 52 },
  secondaryBtnText: {
    color: COLORS.text,
    fontFamily: FONTS.bold, fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6, minHeight: 52 },
  cancelBtnText: {
    color: COLORS.error,
    fontFamily: FONTS.bold, fontWeight: '700',
    fontSize: 15,
  },
  videoCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6, minHeight: 52 },
  videoCallBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold, fontWeight: '700',
    fontSize: 15,
  },
  prescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6, minHeight: 52 },
  prescriptionBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold, fontWeight: '700',
    fontSize: 15,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: COLORS.completeBtnBg,
    borderWidth: 1,
    borderColor: COLORS.completeBtnBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    minHeight: 52,
  },
  completeBtnText: {
    color: COLORS.completeBtnText,
    fontFamily: FONTS.bold, fontWeight: '700',
    fontSize: 14,
  },
  sidebar: {
    marginTop: 24,
  },
  footerImageContainer: {
    marginTop: 10,
    marginBottom: 0,
    width: '100%',
    alignSelf: 'center',
    aspectRatio: 0.95,
    overflow: 'hidden',
  },
  footerImage: {
    width: '100%',
    height: '100%',
  }
});


