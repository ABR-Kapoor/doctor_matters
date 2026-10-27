const fs = require('fs');
const path = require('path');

const doctorAppPath = 'd:\\aurasutra-mobile\\aurasutra-doctor';

function updateDoctorDoseCard(appPath) {
  const progressPath = path.join(appPath, 'src/app/(dashboard)/prescriptions/[prescriptionId]/progress.tsx');
  if (fs.existsSync(progressPath)) {
    let content = fs.readFileSync(progressPath, 'utf8');

    // Find the render block for visibleGroups.map
    const oldRenderBlock = `          {visibleGroups.map((group) => {
            const dosesDesc = [...group.doses].sort((a: any, b: any) =>
              \`\${b.date} \${b.time}\`.localeCompare(\`\${a.date} \${a.time}\`)
            );
            const visible = showAllDoses ? dosesDesc : dosesDesc.slice(0, DOSES_PER_GROUP);
            let lastDate = '';

            return (
              <View key={group.medicine_name} style={styles.doseGroup}>
                <Text style={styles.doseGroupTitle}>{group.medicine_name}</Text>

                {visible.map((dose: any) => {
                  const showDateHeader = dose.date !== lastDate;
                  lastDate = dose.date;
                  const statusStyle = STATUS_STYLES[dose.status] || STATUS_STYLES.pending;

                  return (
                    <View key={dose.adherence_id}>
                      {showDateHeader && (
                        <Text style={styles.doseDateHeader}>{formatDoseDate(dose.date)}</Text>
                      )}
                      <View style={styles.doseRow}>
                        <Text style={styles.doseTime}>{dose.time}</Text>
                        <Text style={styles.doseMeta}>
                          {dose.status === 'taken' && dose.taken_at
                            ? \`Logged \${formatLoggedAt(dose.taken_at)}\`
                            : dose.status === 'skipped' && dose.skipped_at
                              ? \`Skipped \${formatLoggedAt(dose.skipped_at)}\`
                              : dose.status === 'missed'
                                ? 'Not logged by patient'
                                : 'Scheduled'}
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusPillText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {!showAllDoses && dosesDesc.length > DOSES_PER_GROUP && (
                  <TouchableOpacity style={styles.showAllBtn} onPress={() => setShowAllDoses(true)}>
                    <Text style={styles.showAllText}>
                      <TranslatedText>Show all doses</TranslatedText>
                      {' ('}{dosesDesc.length}{')'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}`;

    const newRenderBlock = `          {visibleGroups.map((group) => {
            const dosesDesc = [...group.doses].sort((a: any, b: any) =>
              \`\${b.date} \${b.time}\`.localeCompare(\`\${a.date} \${a.time}\`)
            );
            const visible = showAllDoses ? dosesDesc : dosesDesc.slice(0, DOSES_PER_GROUP);
            let lastDate = '';

            // Find medicine info
            const medInfo = stats?.prescription?.medicines?.find((m: any) => m.name === group.medicine_name) || {};
            // Find overall stats for this med
            const medStats = Array.isArray(stats?.medicines) ? stats.medicines.find((m: any) => m.name === group.medicine_name) : null;
            const takenCount = medStats?.taken || 0;
            const totalCount = medStats?.elapsedTotal || 0;
            const adherenceRate = medStats?.adherence_rate || 0;

            return (
              <View key={group.medicine_name} style={styles.doseGroupOuterCard}>
                <View style={styles.doseGroupHeaderRow}>
                  <Pill size={18} color="#10b981" />
                  <Text style={styles.doseGroupTitle}>{group.medicine_name}</Text>
                </View>
                
                <Text style={styles.doseGroupInstructions}>
                  {[medInfo.strength, medInfo.frequency, medInfo.duration].filter(Boolean).join(' • ')}
                </Text>
                
                {medInfo.notes ? (
                  <Text style={styles.doseGroupNotes}>Note: {medInfo.notes}</Text>
                ) : null}

                <View style={styles.doseGroupInnerCard}>
                  <View style={styles.innerCardStatsRow}>
                    <Text style={styles.innerCardStatsText}>Taken {takenCount} of {totalCount} doses</Text>
                    <View style={styles.innerCardBadge}>
                      <Text style={styles.innerCardBadgeText}>{adherenceRate}%</Text>
                    </View>
                  </View>

                  {visible.map((dose: any) => {
                    const showDateHeader = dose.date !== lastDate;
                    lastDate = dose.date;
                    const statusStyle = STATUS_STYLES[dose.status] || STATUS_STYLES.pending;

                    return (
                      <View key={dose.adherence_id}>
                        {showDateHeader && (
                          <Text style={styles.doseDateHeader}>{formatDoseDate(dose.date).toUpperCase()}</Text>
                        )}
                        <View style={styles.doseRow}>
                          <Text style={styles.doseTime}>{dose.time}</Text>
                          
                          <View style={styles.doseStatusWrapper}>
                            <Text style={styles.doseMeta} numberOfLines={1}>
                              {dose.status === 'taken' && dose.taken_at
                                ? \`\${formatLoggedAt(dose.taken_at)}\`
                                : dose.status === 'skipped' && dose.skipped_at
                                  ? \`\${formatLoggedAt(dose.skipped_at)}\`
                                  : dose.status === 'missed'
                                    ? 'Missed'
                                    : 'Scheduled'}
                            </Text>
                            <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                              <Text style={[styles.statusPillText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {!showAllDoses && dosesDesc.length > DOSES_PER_GROUP && (
                    <TouchableOpacity style={styles.showAllBtn} onPress={() => setShowAllDoses(true)}>
                      <Text style={styles.showAllText}>
                        <TranslatedText>Show all doses</TranslatedText>
                        {' ('}{dosesDesc.length}{')'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}`;

    content = content.replace(oldRenderBlock, newRenderBlock);

    // Now update styles
    const stylesRegex = /doseGroup: \{ marginBottom: 14 \},[\s\S]*?(?=activityBox: \{)/;
    
    const newStyles = `doseGroupOuterCard: { backgroundColor: '#f3f4f1', borderRadius: 16, padding: 16, marginBottom: 16 },
  doseGroupHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  doseGroupTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  doseGroupInstructions: { fontSize: 13, fontWeight: '700', color: '#059669', marginBottom: 6, lineHeight: 18 },
  doseGroupNotes: { fontSize: 12, fontStyle: 'italic', color: '#9ca3af', marginBottom: 16 },
  
  doseGroupInnerCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16 },
  innerCardStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  innerCardStatsText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  innerCardBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  innerCardBadgeText: { color: '#059669', fontSize: 12, fontWeight: '800' },

  doseDateHeader: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginTop: 12, marginBottom: 8, letterSpacing: 1 },
  doseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 8 },
  doseTime: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  doseStatusWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  doseMeta: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  showAllBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', marginTop: 8 },
  showAllText: { fontSize: 12, fontWeight: '800', color: '#1d4ed8' },
  `;

    content = content.replace(stylesRegex, newStyles);
    
    fs.writeFileSync(progressPath, content);
    console.log(`Updated dose log UI in doctor app.`);
  }
}

updateDoctorDoseCard(doctorAppPath);
