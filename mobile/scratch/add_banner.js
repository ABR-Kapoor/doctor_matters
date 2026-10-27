const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // We previously removed profileHeaderBg from JSX. Let's add it back right inside profileCard.
  c = c.replace(/<View style=\{styles\.profileContent\}>/, `<View style={styles.profileHeaderBg} />\n          <View style={styles.profileContent}>`);

  // We need to re-add the profileHeaderBg style and fix profileCard overflow.
  c = c.replace(/profileCard: \{ backgroundColor: COLORS\.white, borderRadius: 12, marginBottom: 24, padding: 24, alignItems: 'center', shadowColor: '#e2e8f0', shadowOffset: \{ width: 0, height: 4 \}, shadowOpacity: 0\.5, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#f8fafc' \}/g,
    "profileCard: { backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 24, overflow: 'hidden', shadowColor: '#e2e8f0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#f8fafc' }");

  // Re-add profileHeaderBg style
  if (!c.includes('profileHeaderBg:')) {
    c = c.replace(/profileContent:/, "profileHeaderBg: { height: 64, backgroundColor: '#f0f9ff' },\n  profileContent:");
  }
  
  // Re-add negative margin to pull the avatar over the banner, and re-add the padding we removed from the card itself
  c = c.replace(/profileContent: \{ alignItems: 'center', width: '100%' \}/g, 
    "profileContent: { alignItems: 'center', width: '100%', marginTop: -40, paddingHorizontal: 24, paddingBottom: 24 }");
  
  // Give the avatar a subtle white border again to separate it from the banner
  c = c.replace(/avatarWrapper: \{ width: 80, height: 80, borderRadius: 40, marginBottom: 16 \}/g,
    "avatarWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.white, padding: 4, marginBottom: 16 }");
  c = c.replace(/avatarImage: \{ width: '100%', height: '100%', borderRadius: 40, backgroundColor: COLORS\.surface \}/g,
    "avatarImage: { width: '100%', height: '100%', borderRadius: 36, backgroundColor: COLORS.surface }");

  fs.writeFileSync(p, c);
  console.log('Added banner back to profile card');
}
