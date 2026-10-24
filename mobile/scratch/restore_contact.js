const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Replace JSX
  c = c.replace(
    /<View style=\{styles\.contactContainer\}>[\s\S]*?<\/View>\s*<\/View>\s*<\/View>/,
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
  c = c.replace(/contactContainer: \{ flexDirection: 'row', justifyContent: 'center', width: '100%', borderTopWidth: 1, borderTopColor: COLORS\.surface, paddingTop: 16, gap: 24 \}/g,
    "contactContainer: { width: '100%', borderTopWidth: 1, borderTopColor: COLORS.surface, paddingTop: 16, gap: 12 }");
    
  c = c.replace(/contactIcon: \{ marginRight: 8 \},/g, "");

  // Re-add contactIconBg
  if (!c.includes('contactIconBg:')) {
    c = c.replace(/contactItemRow:/, "contactIconBg: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },\n  contactItemRow:");
  }
  
  c = c.replace(/contactText: \{ fontSize: 13, fontFamily: FONTS\.regular, fontWeight: '400', color: COLORS\.gray \}/g,
    "contactText: { fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text }");

  fs.writeFileSync(p, c);
  console.log('Restored square icon backgrounds and stacked layout');
}
