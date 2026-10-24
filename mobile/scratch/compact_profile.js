const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Shrink profile banner
  c = c.replace(/profileHeaderBg: \{ height: 80,/g, "profileHeaderBg: { height: 56,");

  // Adjust profile content padding and overlap
  c = c.replace(/profileContent: \{ padding: 24, alignItems: 'center', marginTop: -50 \}/g, "profileContent: { padding: 16, paddingBottom: 20, alignItems: 'center', marginTop: -40 }");

  // Shrink avatar
  c = c.replace(/avatarWrapper: \{ width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS\.white, padding: 4, shadowColor: COLORS\.black, shadowOffset: \{ width: 0, height: 4 \}, shadowOpacity: 0\.1, shadowRadius: 10, elevation: 4, marginBottom: 16 \}/g,
    "avatarWrapper: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.white, padding: 4, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4, marginBottom: 12 }");
  c = c.replace(/avatarImage: \{ width: '100%', height: '100%', borderRadius: 44, backgroundColor: COLORS\.surface \}/g,
    "avatarImage: { width: '100%', height: '100%', borderRadius: 32, backgroundColor: COLORS.surface }");

  // Scale down name/subtitle slightly to fit compact design
  c = c.replace(/profileName: \{ fontSize: 24, fontFamily: FONTS\.bold/g, "profileName: { fontSize: 20, fontFamily: FONTS.bold");
  c = c.replace(/profileSubtitle: \{ fontSize: 15, fontFamily: FONTS\.medium, fontWeight: '500', color: COLORS\.gray, marginBottom: 24 \}/g, "profileSubtitle: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, marginBottom: 16 }");

  // Compact contact row
  c = c.replace(/contactRow: \{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: COLORS\.surface, paddingTop: 20 \}/g,
    "contactRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: COLORS.surface, paddingTop: 16 }");
  
  c = c.replace(/contactIconBg: \{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS\.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 8 \}/g,
    "contactIconBg: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }");

  fs.writeFileSync(p, c);
  console.log('Updated profile card to be compact');
}
