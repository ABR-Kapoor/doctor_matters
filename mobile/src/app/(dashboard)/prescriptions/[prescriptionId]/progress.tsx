import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill, CheckCircle, XCircle, Clock, History, ChevronLeft } from 'lucide-react-native';
import { TranslatedText } from '@/components/TranslatedText';
import { useDoctorPrescriptionStats } from '@/hooks/queries/doctorQueries';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { COLORS } from '@/constants/theme';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  taken: { bg: COLORS.secondary, color: COLORS.text, label: 'TAKEN' },
  skipped: { bg: COLORS.tertiary, color: COLORS.text, label: 'SKIPPED' },
  missed: { bg: COLORS.tertiary, color: COLORS.text, label: 'MISSED' },
  pending: { bg: COLORS.primary, color: '#64748b', label: 'UPCOMING' },
};

const DOSES_PER_GROUP = 30;

function formatDoseDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatLoggedAt(value: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PrescriptionProgressScreen() {
  const router = useRouter();
  const { prescriptionId } = useLocalSearchParams<{ prescriptionId: string }>();
  const { getToken } = useAuth();

  const { data: stats, isLoading } = useDoctorPrescriptionStats(prescriptionId, getToken as any, { withDoses: true });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [medFilter, setMedFilter] = useState<string>('all');
  const [showAllDoses, setShowAllDoses] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <SafeAreaView style={styles.container} edges={['left', 'right']}><View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View></SafeAreaView>;

  if (!stats || stats.total_doses === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.center}>
          <Pill size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}><TranslatedText>No Adherence Data Yet</TranslatedText></Text>
          <Text style={styles.emptyText}><TranslatedText>Adherence tracking will appear once records are created for this prescription.</TranslatedText></Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}><TranslatedText>Go Back</TranslatedText></Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const doseLog: any[] = Array.isArray(stats.dose_log) ? stats.dose_log : [];
  const visibleGroups = doseLog.filter((group) => medFilter === 'all' || group.medicine_name === medFilter);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Stack.Screen options={{ 
        title: 'Adherence', 
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.push('/prescriptions');
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 18,
            }}
          >
            <ChevronLeft size={20} color="#374151" />
          </TouchableOpacity>
        ),
      }} />
      <ScrollView contentContainerStyle={styles.content}>


      <View style={styles.statsWrapper}>
        <View style={[styles.statBox, { backgroundColor: COLORS.primary, marginBottom: 12, paddingVertical: 16 }]}>
          <CheckCircle size={20} color={COLORS.text} />
          <Text style={[styles.statValue, { color: COLORS.text, fontSize: 24 }]}>{stats.adherence_rate}%</Text>
          <Text style={[styles.statLabel, { color: COLORS.text, fontSize: 12 }]}><TranslatedText>Overall Adherence</TranslatedText></Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: COLORS.primary }]}>
            <Pill size={16} color="#64748b" />
            <Text style={[styles.statValue, { fontSize: 16 }]}>{stats.total_doses}</Text>
            <Text style={[styles.statLabel, { fontSize: 10 }]}><TranslatedText>Total</TranslatedText></Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: COLORS.secondary }]}>
            <CheckCircle size={16} color={COLORS.text} />
            <Text style={[styles.statValue, { color: COLORS.text, fontSize: 16 }]}>{stats.taken}</Text>
            <Text style={[styles.statLabel, { color: COLORS.text, fontSize: 10 }]}><TranslatedText>Taken</TranslatedText></Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: COLORS.tertiary }]}>
            <XCircle size={16} color={COLORS.text} />
            <Text style={[styles.statValue, { color: COLORS.text, fontSize: 16 }]}>{stats.skipped}</Text>
            <Text style={[styles.statLabel, { color: COLORS.text, fontSize: 10 }]}><TranslatedText>Skip</TranslatedText></Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: COLORS.primary }]}>
            <Clock size={16} color={COLORS.text} />
            <Text style={[styles.statValue, { color: COLORS.text, fontSize: 16 }]}>{stats.daily_adherence_rate}%</Text>
            <Text style={[styles.statLabel, { color: COLORS.text, fontSize: 10 }]}><TranslatedText>Daily</TranslatedText></Text>
          </View>
        </View>
      </View>

      {stats.medicine_breakdown?.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Pill size={16} color={COLORS.secondary} />
            <Text style={styles.cardTitle}><TranslatedText>Medicine-wise Adherence</TranslatedText></Text>
          </View>
          {stats.medicine_breakdown.map((med: any, idx: number) => (
            <View key={idx} style={styles.medBox}>
              <View style={styles.medHeaderRow}>
                <Text style={styles.medName}>{med.medicine_name}</Text>
                <Text style={styles.medRate}>{med.adherence_rate}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${med.adherence_rate}%` }]} />
              </View>
              <Text style={styles.medSub}>{med.taken} of {med.elapsedTotal} doses taken</Text>
            </View>
          ))}
        </View>
      )}

      {doseLog.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <History size={16} color={COLORS.secondary} />
            <Text style={styles.cardTitle}><TranslatedText>Dose Log</TranslatedText></Text>
          </View>

          {doseLog.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} style={styles.filterScrollView}>
              <TouchableOpacity
                style={[styles.filterChip, medFilter === 'all' && styles.filterChipActive]}
                onPress={() => setMedFilter('all')}
              >
                <Text style={[styles.filterChipText, medFilter === 'all' && styles.filterChipTextActive]}>
                  <TranslatedText>All medicines</TranslatedText>
                </Text>
              </TouchableOpacity>
              {doseLog.map((group) => (
                <TouchableOpacity
                  key={group.medicine_name}
                  style={[styles.filterChip, medFilter === group.medicine_name && styles.filterChipActive]}
                  onPress={() => setMedFilter(group.medicine_name)}
                >
                  <Text style={[styles.filterChipText, medFilter === group.medicine_name && styles.filterChipTextActive]} numberOfLines={1}>
                    {group.medicine_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {visibleGroups.map((group) => {
            const dosesDesc = [...group.doses].sort((a: any, b: any) =>
              `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
            );
            const visible = showAllDoses ? dosesDesc : dosesDesc.slice(0, DOSES_PER_GROUP);
            let lastDate = '';

            // Find medicine info
            const medInfo = stats?.prescription?.medicines?.find((m: any) => m.name === group.medicine_name) || {};
            // Find overall stats for this med
            const medStats = Array.isArray(stats?.medicine_breakdown) ? stats.medicine_breakdown.find((m: any) => m.medicine_name === group.medicine_name) : null;
            const takenCount = medStats?.taken || 0;
            const totalCount = medStats?.elapsedTotal || 0;
            const adherenceRate = medStats?.adherence_rate || 0;

            return (
              <View key={group.medicine_name} style={styles.premiumDoseCard}>
                <View style={styles.premiumDoseHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={styles.premiumIconContainer}>
                      <Pill size={18} color="#1E293B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.premiumDoseTitle}>{group.medicine_name}</Text>
                      <Text style={styles.premiumDoseInstructions}>
                        {[medInfo.strength, medInfo.frequency, medInfo.duration].filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>{takenCount}/{totalCount} Taken</Text>
                  </View>
                </View>
                
                {medInfo.notes ? (
                  <Text style={styles.premiumDoseNotes}>{medInfo.notes}</Text>
                ) : null}

                <View style={styles.premiumDoseList}>
                  {visible.map((dose: any, index: number) => {
                    const showDateHeader = dose.date !== lastDate;
                    lastDate = dose.date;
                    const statusStyle = STATUS_STYLES[dose.status] || STATUS_STYLES.pending;

                    return (
                      <View key={dose.adherence_id}>
                        {showDateHeader && (
                          <View style={styles.premiumDateHeaderRow}>
                            <Text style={styles.premiumDateHeader}>{formatDoseDate(dose.date).toUpperCase()}</Text>
                            <View style={styles.premiumDateLine} />
                          </View>
                        )}
                        <View style={[styles.premiumDoseRow, index === visible.length - 1 && { borderBottomWidth: 0 }]}>
                          <View style={styles.premiumDoseTimeContainer}>
                            <Text style={styles.premiumDoseTime}>{dose.time}</Text>
                          </View>
                          
                          <View style={styles.premiumDoseStatusWrapper}>
                            <Text style={styles.premiumDoseMeta} numberOfLines={1}>
                              {dose.status === 'taken' && dose.taken_at
                                ? `${formatLoggedAt(dose.taken_at)}`
                                : dose.status === 'skipped' && dose.skipped_at
                                  ? `${formatLoggedAt(dose.skipped_at)}`
                                  : dose.status === 'missed'
                                    ? 'Missed'
                                    : 'Scheduled'}
                            </Text>
                            <View style={[styles.premiumStatusPill, { backgroundColor: statusStyle.bg }]}>
                              <Text style={[styles.premiumStatusPillText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {!showAllDoses && dosesDesc.length > DOSES_PER_GROUP && (
                  <TouchableOpacity style={styles.premiumShowAllBtn} onPress={() => setShowAllDoses(true)}>
                    <Text style={styles.premiumShowAllText}>
                      <TranslatedText>View All History</TranslatedText>
                      {' ('}{dosesDesc.length}{')'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {stats.recent_activity?.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CheckCircle size={16} color={COLORS.text} />
            <Text style={styles.cardTitle}><TranslatedText>Recent Activity</TranslatedText></Text>
          </View>
          {stats.recent_activity.map((activity: any, idx: number) => (
            <View key={idx} style={styles.activityBox}>
              <View style={styles.activityIcon}>
                {activity.status === 'taken' ? <CheckCircle size={20} color={COLORS.text} /> : <XCircle size={20} color={COLORS.tertiary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityName}>{activity.medicine_name}</Text>
                <Text style={[styles.activityStatus, { color: activity.status === 'taken' ? COLORS.secondary : COLORS.tertiary }]}>
                  {activity.status.toUpperCase()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.activityTime}>{new Date(activity.taken_at || activity.skipped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={styles.activityDate}>{new Date(activity.taken_at || activity.skipped_at).toLocaleDateString()}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 180 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 24 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  backBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 16, paddingTop: 20 },
  backBtnHeader: { width: 40, height: 40, backgroundColor: COLORS.primary, borderRadius: 10, marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headline: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  liveIndicatorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary, marginRight: 4 },
  liveText: { fontSize: 10, color: COLORS.secondary, fontWeight: '800', textTransform: 'uppercase' },
  statsWrapper: { marginBottom: 24 },
  statsContainer: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  statBox: { flex: 1, paddingVertical: 10, paddingHorizontal: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statValue: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  statLabel: { fontSize: 8, color: '#64748b', marginTop: 2, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  card: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginLeft: 8 },
  medBox: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 10, marginBottom: 8, },
  medHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  medName: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  medRate: { fontWeight: '800', color: COLORS.text, fontSize: 14 },
  progressBarBg: { width: '100%', height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: COLORS.secondary, borderRadius: 3 },
  medSub: { fontSize: 11, color: '#64748b', marginTop: 10, fontWeight: '600' },
  filterScrollView: { marginBottom: 12 },
  filterRow: { gap: 8, paddingRight: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.primary, borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  filterChipTextActive: { color: COLORS.primary },
  premiumDoseCard: { backgroundColor: COLORS.primary, borderRadius: 16, marginBottom: 16, padding: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  premiumDoseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  premiumIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  premiumDoseTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  premiumDoseInstructions: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  premiumBadge: { backgroundColor: COLORS.tertiary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  premiumBadgeText: { color: '#1E293B', fontSize: 11, fontWeight: '800' },
  premiumDoseNotes: { fontSize: 12, fontStyle: 'italic', color: '#64748b', marginBottom: 16, backgroundColor: COLORS.primary, padding: 8, borderRadius: 8 },
  premiumDoseList: { marginTop: 4 },
  premiumDateHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8, gap: 8 },
  premiumDateHeader: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  premiumDateLine: { flex: 1, height: 1, backgroundColor: COLORS.primary },
  premiumDoseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.primary },
  premiumDoseTimeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  premiumDoseTime: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  premiumDoseStatusWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumDoseMeta: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  premiumStatusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 75, alignItems: 'center' },
  premiumStatusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  premiumShowAllBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  premiumShowAllText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  activityBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, padding: 8, borderRadius: 12, marginBottom: 8 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityName: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  activityStatus: { fontSize: 10, fontWeight: '800', marginTop: 4, textTransform: 'uppercase' },
  activityTime: { fontWeight: '700', color: '#0f172a', fontSize: 13 },
  activityDate: { fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: '600' },
});
