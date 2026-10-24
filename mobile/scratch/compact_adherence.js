const fs = require('fs');

function compactAdherence(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // 1. Replace statsGrid with a ScrollView
    const oldStats = c.substring(c.indexOf('<View style={styles.statsGrid}>'), c.indexOf('</View>\n\n      {stats.medicine_breakdown?.length > 0') + 7);
    
    const newStats = `<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent} style={styles.statsScrollView}>
        <View style={[styles.statBox, { backgroundColor: '#f1f5f9' }]}>
          <Pill size={18} color="#64748b" />
          <Text style={styles.statValue}>{stats.total_doses}</Text>
          <Text style={styles.statLabel}><TranslatedText>Total Doses</TranslatedText></Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#dcfce7' }]}>
          <CheckCircle size={18} color="#15803d" />
          <Text style={[styles.statValue, { color: '#15803d' }]}>{stats.taken}</Text>
          <Text style={[styles.statLabel, { color: '#15803d' }]}><TranslatedText>Taken</TranslatedText></Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#fee2e2' }]}>
          <XCircle size={18} color="#b91c1c" />
          <Text style={[styles.statValue, { color: '#b91c1c' }]}>{stats.skipped}</Text>
          <Text style={[styles.statLabel, { color: '#b91c1c' }]}><TranslatedText>Skipped</TranslatedText></Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#eff6ff' }]}>
          <Clock size={18} color="#1d4ed8" />
          <Text style={[styles.statValue, { color: '#1d4ed8' }]}>{stats.daily_adherence_rate}%</Text>
          <Text style={[styles.statLabel, { color: '#1d4ed8' }]}><TranslatedText>Daily Adherence</TranslatedText></Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#ecfdf5' }]}>
          <CheckCircle size={18} color="#047857" />
          <Text style={[styles.statValue, { color: '#047857' }]}>{stats.adherence_rate}%</Text>
          <Text style={[styles.statLabel, { color: '#047857' }]}><TranslatedText>Overall Adherence</TranslatedText></Text>
        </View>
      </ScrollView>`;

    c = c.replace(oldStats, newStats);

    // 2. Rewrite styles
    const stylesIndex = c.indexOf('const styles = StyleSheet.create({');
    c = c.substring(0, stylesIndex) + `const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 24 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  backBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 20, paddingTop: 20 },
  backBtnHeader: { width: 40, height: 40, backgroundColor: '#f1f5f9', borderRadius: 10, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headline: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  liveIndicatorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0284c7', marginRight: 4 },
  liveText: { fontSize: 10, color: '#0284c7', fontWeight: '800', textTransform: 'uppercase' },
  statsScrollView: { marginBottom: 24 },
  statsScrollContent: { paddingHorizontal: 20, gap: 12 },
  statBox: { width: 110, padding: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 20, marginHorizontal: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginLeft: 8 },
  medBox: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  medHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  medName: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  medRate: { fontWeight: '800', color: '#3b82f6', fontSize: 14 },
  progressBarBg: { width: '100%', height: 6, backgroundColor: '#f1f5f9', borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: '#3b82f6', borderRadius: 3 },
  medSub: { fontSize: 11, color: '#64748b', marginTop: 10, fontWeight: '600' },
  activityBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 8, marginHorizontal: 20 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityName: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  activityStatus: { fontSize: 10, fontWeight: '800', marginTop: 4, textTransform: 'uppercase' },
  activityTime: { fontWeight: '700', color: '#0f172a', fontSize: 13 },
  activityDate: { fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: '600' },
});`;

    fs.writeFileSync(p, c);
    console.log('Made adherence screen compact in ' + p);
  }
}

compactAdherence('src/app/(dashboard)/prescriptions/[prescriptionId]/progress.tsx');
