const fs = require('fs');

function upgradeToPremiumAdherence(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Remove old styles
    c = c.replace(/const styles = StyleSheet\.create\(\{[\s\S]*\}\);/, `const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingTop: 32, paddingBottom: 120 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#334155', marginTop: 24 },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 12, marginBottom: 32, lineHeight: 22 },
  backBtn: { backgroundColor: '#ffffff', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minHeight: 48, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  backText: { color: '#0f172a', fontWeight: '700', fontSize: 15 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backBtnHeader: { width: 44, height: 44, backgroundColor: '#ffffff', borderRadius: 14, marginRight: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  headerInfo: { flex: 1 },
  headline: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  liveIndicatorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0284c7', marginRight: 6 },
  liveText: { fontSize: 11, color: '#0284c7', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32, justifyContent: 'space-between' },
  statCard: { width: '31%', backgroundColor: '#ffffff', borderRadius: 20, padding: 16, alignItems: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
  statValue: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginTop: 12, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 4, marginBottom: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginLeft: 12, letterSpacing: -0.3 },
  medBox: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  medHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  medName: { fontWeight: '800', color: '#0f172a', fontSize: 15 },
  medRate: { fontWeight: '900', color: '#3b82f6', fontSize: 15 },
  progressBarBg: { width: '100%', height: 6, backgroundColor: '#e2e8f0', borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: '#3b82f6', borderRadius: 3 },
  medSub: { fontSize: 12, color: '#64748b', marginTop: 12, fontWeight: '600' },
  activityBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: '#f8fafc' },
  activityIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  activityName: { fontWeight: '800', color: '#0f172a', fontSize: 15 },
  activityStatus: { fontSize: 11, fontWeight: '800', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  activityTime: { fontWeight: '800', color: '#0f172a', fontSize: 14 },
  activityDate: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '600' },
});`);

    // Remove hardcoded colors from components in progress.tsx
    c = c.replace(/style=\{\[styles\.statCard, \{ backgroundColor: '#f0fdf4' \}\]\}/g, `style={[styles.statCard, { backgroundColor: '#ffffff' }]}`);
    c = c.replace(/style=\{\[styles\.statCard, \{ backgroundColor: '#fef2f2' \}\]\}/g, `style={[styles.statCard, { backgroundColor: '#ffffff' }]}`);
    c = c.replace(/style=\{\[styles\.statCard, \{ backgroundColor: '#eff6ff', width: '48%' \}\]\}/g, `style={[styles.statCard, { backgroundColor: '#ffffff', width: '48%' }]}`);
    c = c.replace(/style=\{\[styles\.statCard, \{ backgroundColor: '#ecfdf5', width: '48%' \}\]\}/g, `style={[styles.statCard, { backgroundColor: '#ffffff', width: '48%' }]}`);

    fs.writeFileSync(p, c);
    console.log('Upgraded adherence screen to premium in ' + p);
  }
}

upgradeToPremiumAdherence('src/app/(dashboard)/prescriptions/[prescriptionId]/progress.tsx');
