const fs = require('fs');

function finalFixes(pLayout, pProfile) {
  if (fs.existsSync(pLayout)) {
    let c = fs.readFileSync(pLayout, 'utf8');

    // Fix back button to EXACTLY match HeaderOptions
    const oldBtn = /headerLeft: \(\) => \([\s\S]*?<\/TouchableOpacity>\s*\),/;
    const newBtn = `headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginLeft: 4, backgroundColor: '#ffffff' }}>
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
          ),`;
    c = c.replace(oldBtn, newBtn);
    fs.writeFileSync(pLayout, c);
  }

  if (fs.existsSync(pProfile)) {
    let c = fs.readFileSync(pProfile, 'utf8');

    // Remove top padding from SafeAreaView by specifying edges
    c = c.replace(/<SafeAreaView style=\{styles\.container\}>/, "<SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>");

    fs.writeFileSync(pProfile, c);
  }
}

finalFixes('src/app/(dashboard)/_layout.tsx', 'src/app/(dashboard)/profile.tsx');
