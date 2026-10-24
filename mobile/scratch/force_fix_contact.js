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
  c = c.replace(/contactContainer: \{[\s\S]*?\},/g,
    "contactContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: COLORS.surface, paddingTop: 20 },");
    
  if (c.includes('contactItemRow:')) {
    c = c.replace(/contactItemRow: \{[\s\S]*?\},/g,
      "contactItemRow: { flex: 1, alignItems: 'center' },");
  } else {
    c = c.replace(/contactContainer:/, "contactItemRow: { flex: 1, alignItems: 'center' },\n  contactContainer:");
  }
    
  if (c.includes('contactIconBg:')) {
    c = c.replace(/contactIconBg: \{[\s\S]*?\},/g,
      "contactIconBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },");
  } else {
    c = c.replace(/contactItemRow:/, "contactIconBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },\n  contactItemRow:");
  }
    
  c = c.replace(/contactText: \{[\s\S]*?\},/g,
    "contactText: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text, textAlign: 'center' },");
    
  c = c.replace(/contactPhone: \{[\s\S]*?\},/g, "");
  c = c.replace(/contactEmail: \{[\s\S]*?\},/g, "");
  c = c.replace(/contactDetails: \{[\s\S]*?\},/g, "");

  fs.writeFileSync(p, c);
  console.log('Fixed contact layout rendering');
}
