const fs = require('fs');

function fixBackBtn(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Replace the TouchableOpacity style in _layout.tsx
    const oldBtnLayout = /headerLeft: \(\) => \([\s\S]*?<\/TouchableOpacity>\s*\),/;
    const newBtnLayout = `headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginLeft: 16 }}>
              <ChevronLeft size={20} color="#334155" />
            </TouchableOpacity>
          ),`;
    if (oldBtnLayout.test(c)) {
      c = c.replace(oldBtnLayout, newBtnLayout);
      fs.writeFileSync(p, c);
    }
  }
}

function fixHeaderOptions(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Replace the TouchableOpacity in HeaderOptions.tsx
    const oldBtnHeader = /<TouchableOpacity[\s\S]*?<\/TouchableOpacity>/;
    const newBtnHeader = `<TouchableOpacity
        onPress={() => router.back()}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 16,
        }}
      >
        <ChevronLeft size={20} color="#334155" />
      </TouchableOpacity>`;
    if (oldBtnHeader.test(c)) {
      c = c.replace(oldBtnHeader, newBtnHeader);
      fs.writeFileSync(p, c);
    }
  }
}

fixBackBtn('src/app/(dashboard)/_layout.tsx');
fixHeaderOptions('src/components/HeaderOptions.tsx');
