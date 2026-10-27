const fs = require('fs');

function fixBackButtonAgain(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    const oldBtn = /headerLeft: \(\) => \([\s\S]*?<\/TouchableOpacity>\s*\),/;
    const newBtn = `headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
          ),`;
    c = c.replace(oldBtn, newBtn);

    fs.writeFileSync(p, c);
    console.log('Fixed back button properly in ' + p);
  }
}

fixBackButtonAgain('src/app/(dashboard)/_layout.tsx');
