const fs = require('fs');

const p = 'src/app/(dashboard)/profile.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  if (!c.includes('<View style={styles.profileHeaderBg} />')) {
    // Modify avatarSection JSX
    c = c.replace(
      /<View style=\{styles\.avatarSection\}>/,
      `<View style={styles.avatarSection}>
            <View style={styles.profileHeaderBg} />`
    );

    // Modify avatarSection styles to be a card with a banner
    c = c.replace(/avatarSection: \{ alignItems: 'center', marginBottom: 32 \}/g, 
      "avatarSection: { alignItems: 'center', marginBottom: 32, backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', paddingBottom: 24, marginHorizontal: 16, marginTop: 16, shadowColor: '#e2e8f0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#f8fafc' }");

    c = c.replace(/avatarContainer: \{ width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS\.white, shadowColor: COLORS\.black, shadowOffset: \{ width: 0, height: 4 \}, shadowOpacity: 0\.1, shadowRadius: 12, elevation: 5, marginBottom: 16 \}/g,
      "avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.white, padding: 4, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, marginBottom: 12, marginTop: -45 }");
    
    c = c.replace(/avatarImage: \{ width: '100%', height: '100%', borderRadius: 50 \}/g,
      "avatarImage: { width: '100%', height: '100%', borderRadius: 41 }");
      
    c = c.replace(/avatarPlaceholder: \{ width: '100%', height: '100%', borderRadius: 50, backgroundColor: COLORS\.lightGray, justifyContent: 'center', alignItems: 'center' \}/g,
      "avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 41, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' }");

    // Add profileHeaderBg style
    c = c.replace(/avatarSection:/, "profileHeaderBg: { width: '100%', height: 70, backgroundColor: '#f0f9ff' },\n  avatarSection:");
    
    fs.writeFileSync(p, c);
    console.log('Added banner to doctor profile page');
  }
}
