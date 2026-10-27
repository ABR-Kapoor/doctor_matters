const fs = require('fs');

function updateLogoutCorner(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    c = c.replace(/cardGroup: \{ backgroundColor: COLORS\.white, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', marginBottom: 16 \}/, 
      "cardGroup: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }");

    fs.writeFileSync(p, c);
    console.log('Updated logout button corners in ' + p);
  }
}

updateLogoutCorner('src/app/(dashboard)/profile.tsx');
