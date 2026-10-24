const fs = require('fs');

function moveButtonToSafeArea(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Extract submit button
    const submitBtnMatch = c.match(/(<TouchableOpacity style=\{styles\.submitBtn\}[\s\S]*?<\/TouchableOpacity>)\s*<\/ScrollView>/);
    if (submitBtnMatch) {
      const buttonHtml = submitBtnMatch[1];
      
      // Remove from inside ScrollView
      c = c.replace(submitBtnMatch[0], `</ScrollView>\n        <View style={styles.bottomFooter}>\n          ${buttonHtml}\n        </View>`);
    }

    // Add bottomFooter to styles if it doesn't exist
    if (!c.includes('bottomFooter:')) {
      c = c.replace(/submitBtn:/, 
        `bottomFooter: { paddingHorizontal: 24, paddingVertical: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderColor: '#f1f5f9' },\n  submitBtn:`);
      
      // Remove marginTop from submitBtn since footer has padding
      c = c.replace(/submitBtn: \{\s*backgroundColor: COLORS\.primary,\s*paddingVertical: 12,\s*paddingHorizontal: 16,\s*borderRadius: 12,\s*alignItems: 'center',\s*justifyContent: 'center',\s*marginTop: 12/g,
        "submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 0");
    }

    fs.writeFileSync(p, c);
    console.log('Moved submit button outside scroll view in ' + p);
  }
}

moveButtonToSafeArea('src/app/(dashboard)/prescriptions/new.tsx');
moveButtonToSafeArea('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
