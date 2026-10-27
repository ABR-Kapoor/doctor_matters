const fs = require('fs');

function updateDrProfile(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Fix profileHeaderBg and avatarSection styles
    c = c.replace(/profileHeaderBg: \{ width: '100%', height: 70, backgroundColor: '#f0f9ff' \}/, 
      "profileHeaderBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 110, backgroundColor: '#A0C4FF' }");
    c = c.replace(/avatarSection: \{ alignItems: 'center', marginVertical: 24 \}/, 
      "avatarSection: { alignItems: 'center', paddingTop: 60, paddingBottom: 24, position: 'relative' }");

    // Fix PREFERENCES card borderRadius
    c = c.replace(/borderRadius: 16,\s*paddingVertical: 12,\s*paddingHorizontal: 16,\s*marginBottom: 20/g, 
      "borderRadius: 12,\n              paddingVertical: 12,\n              paddingHorizontal: 16,\n              marginBottom: 20");

    fs.writeFileSync(p, c);
    console.log('Updated profile layout and cards in ' + p);
  }
}

updateDrProfile('src/app/(dashboard)/profile.tsx');
