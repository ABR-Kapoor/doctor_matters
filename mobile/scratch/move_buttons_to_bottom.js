const fs = require('fs');

function moveEditButtonToBottom(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // For Instructions
    const instrMatch = c.match(/<View style=\{\{\s*flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8\s*\}\}>\s*<Text style=\{\[styles\.label, \{ marginBottom: 0 \}\]\}>Instructions<\/Text>\s*\{!isEditingInstructions && instructions \? \([\s\S]*?\) : isEditingInstructions \|\| !instructions \? \([\s\S]*?\) : null\}\s*<\/View>/);
    if (instrMatch) {
      // Remove the top button container and restore standard label
      c = c.replace(instrMatch[0], `<Text style={styles.label}>Instructions</Text>`);
      
      // Extract the exact toggle logic for button
      const buttonsLogic = `{!isEditingInstructions && instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>Edit</Text>
                </TouchableOpacity>
              ) : isEditingInstructions || !instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: '#15803d', fontSize: 13, fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
              ) : null}`;

      // Insert it below the input block
      c = c.replace(/(<TouchableOpacity activeOpacity=\{0\.8\} onPress=\{\(\) => setIsEditingInstructions\(true\)\} style=\{\[styles\.previewBox, \{ marginTop: 0 \}\]\}>\s*<MarkdownText>\{instructions\}<\/MarkdownText>\s*<\/TouchableOpacity>\s*\))/, 
        `$1\n            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>\n              ${buttonsLogic}\n            </View>`);
    }

    // For Diet Advice
    const dietMatch = c.match(/<View style=\{\{\s*flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8\s*\}\}>\s*<Text style=\{\[styles\.label, \{ marginBottom: 0 \}\]\}>Diet Advice<\/Text>\s*\{!isEditingDiet && dietAdvice \? \([\s\S]*?\) : isEditingDiet \|\| !dietAdvice \? \([\s\S]*?\) : null\}\s*<\/View>/);
    if (dietMatch) {
      c = c.replace(dietMatch[0], `<Text style={styles.label}>Diet Advice</Text>`);
      
      const buttonsLogic = `{!isEditingDiet && dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>Edit</Text>
                </TouchableOpacity>
              ) : isEditingDiet || !dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: '#15803d', fontSize: 13, fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
              ) : null}`;

      c = c.replace(/(<TouchableOpacity activeOpacity=\{0\.8\} onPress=\{\(\) => setIsEditingDiet\(true\)\} style=\{\[styles\.previewBox, \{ marginTop: 0 \}\]\}>\s*<MarkdownText>\{dietAdvice\}<\/MarkdownText>\s*<\/TouchableOpacity>\s*\))/, 
        `$1\n            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>\n              ${buttonsLogic}\n            </View>`);
    }

    fs.writeFileSync(p, c);
    console.log('Moved buttons to bottom in ' + p);
  }
}

moveEditButtonToBottom('src/app/(dashboard)/prescriptions/new.tsx');
moveEditButtonToBottom('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
