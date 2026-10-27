const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Replace JSX
  c = c.replace(
    /<View style=\{styles\.contactRow\}>[\s\S]*?<\/View>\s*<\/View>\s*<\/View>/,
    `<View style={styles.contactContainer}>
              {patient.user.phone && (
                <View style={styles.contactItemRow}>
                  <View style={styles.contactIconBg}><Phone size={14} color={COLORS.primary} /></View>
                  <Text style={styles.contactText}>{patient.user.phone}</Text>
                </View>
              )}
              {patient.user.email && (
                <View style={styles.contactItemRow}>
                  <View style={styles.contactIconBg}><Mail size={14} color={COLORS.primary} /></View>
                  <Text style={styles.contactText} numberOfLines={1}>{patient.user.email}</Text>
                </View>
              )}
            </View>
          </View>
        </View>`
  );

  // Replace Styles
  c = c.replace(/contactRow: \{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: COLORS\.surface, paddingTop: 16 \}/g,
    "contactContainer: { width: '100%', borderTopWidth: 1, borderTopColor: COLORS.surface, paddingTop: 16, gap: 12 }");
  c = c.replace(/contactItem: \{ alignItems: 'center', flex: 1 \}/g,
    "contactItemRow: { flexDirection: 'row', alignItems: 'center' }");
  c = c.replace(/contactIconBg: \{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS\.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 6 \}/g,
    "contactIconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 }");
  c = c.replace(/contactText: \{ fontSize: 13, fontFamily: FONTS\.medium, fontWeight: '500', color: COLORS\.text \}/g,
    "contactText: { fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text }");

  fs.writeFileSync(p, c);
  console.log('Updated profile contact design');
}
