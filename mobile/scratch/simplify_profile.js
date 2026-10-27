const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Remove the blue profile header background from JSX
  c = c.replace(/<View style=\{styles\.profileHeaderBg\} \/>/g, "");

  // Make the profile card a simple clean white box
  c = c.replace(/profileCard: \{ backgroundColor: COLORS\.white, borderRadius: 12, overflow: 'hidden', marginBottom: 32, shadowColor: '#64748b', shadowOffset: \{ width: 0, height: 8 \}, shadowOpacity: 0\.1, shadowRadius: 24, elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' \}/g, 
    "profileCard: { backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 24, padding: 24, alignItems: 'center', shadowColor: '#e2e8f0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#f8fafc' }");

  // Fix the profileContent now that the banner is gone
  c = c.replace(/profileContent: \{ padding: 16, paddingBottom: 20, alignItems: 'center', marginTop: -40 \}/g, 
    "profileContent: { alignItems: 'center', width: '100%' }");

  // Simplify avatar wrapper (no extra padding or background, just a shadow)
  c = c.replace(/avatarWrapper: \{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS\.white, padding: 4, shadowColor: COLORS\.black, shadowOffset: \{ width: 0, height: 4 \}, shadowOpacity: 0\.1, shadowRadius: 10, elevation: 4, marginBottom: 12 \}/g,
    "avatarWrapper: { width: 80, height: 80, borderRadius: 40, marginBottom: 16 }");
  
  c = c.replace(/avatarImage: \{ width: '100%', height: '100%', borderRadius: 32, backgroundColor: COLORS\.surface \}/g,
    "avatarImage: { width: '100%', height: '100%', borderRadius: 40, backgroundColor: COLORS.surface }");

  // Simplify the contact rows JSX to remove the icon background boxes
  c = c.replace(/<View style=\{styles\.contactIconBg\}><Phone size=\{14\} color=\{COLORS\.primary\} \/><\/View>/g, 
    "<Phone size={14} color={COLORS.gray} style={styles.contactIcon} />");
  c = c.replace(/<View style=\{styles\.contactIconBg\}><Mail size=\{14\} color=\{COLORS\.primary\} \/><\/View>/g, 
    "<Mail size={14} color={COLORS.gray} style={styles.contactIcon} />");

  // Simplify contact styles
  c = c.replace(/contactContainer: \{ width: '100%', borderTopWidth: 1, borderTopColor: COLORS\.surface, paddingTop: 12, gap: 6 \}/g,
    "contactContainer: { flexDirection: 'row', justifyContent: 'center', width: '100%', borderTopWidth: 1, borderTopColor: COLORS.surface, paddingTop: 16, gap: 24 }");
  
  c = c.replace(/contactItemRow: \{ flexDirection: 'row', alignItems: 'center' \}/g,
    "contactItemRow: { flexDirection: 'row', alignItems: 'center' }");
  
  c = c.replace(/contactText: \{ fontSize: 14, fontFamily: FONTS\.medium, fontWeight: '500', color: COLORS\.text \}/g,
    "contactText: { fontSize: 13, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.gray }");
    
  // Add contactIcon style
  if (!c.includes('contactIcon:')) {
    c = c.replace(/contactItemRow:/, "contactIcon: { marginRight: 8 },\n  contactItemRow:");
  }
  
  // Clean up unused contactIconBg
  c = c.replace(/contactIconBg: \{ width: 24, height: 24, borderRadius: 6, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginRight: 8 \},/g, "");

  fs.writeFileSync(p, c);
  console.log('Made profile card incredibly simple');
}
