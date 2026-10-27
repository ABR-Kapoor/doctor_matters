const fs = require('fs');

function revertButton(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Extract button from bottomFooter
    const footerMatch = c.match(/<\/ScrollView>\s*<View style=\{styles\.bottomFooter\}>\s*(<TouchableOpacity style=\{styles\.submitBtn\}[\s\S]*?<\/TouchableOpacity>)\s*<\/View>/);
    if (footerMatch) {
      const buttonHtml = footerMatch[1];
      
      // Put it back inside ScrollView
      c = c.replace(footerMatch[0], `  ${buttonHtml}\n      </ScrollView>`);
      
      // Fix submitBtn padding/margins that we changed
      c = c.replace(/submitBtn: \{ backgroundColor: COLORS\.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 0 \}/,
        "submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 }");
    }

    fs.writeFileSync(p, c);
    console.log('Reverted submit button in ' + p);
  }
}

revertButton('src/app/(dashboard)/prescriptions/new.tsx');
revertButton('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
