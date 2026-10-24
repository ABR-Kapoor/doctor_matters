const fs = require('fs');

function fixSyntaxError(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Fix Instructions parenthesis
    c = c.replace(/<\/TouchableOpacity>\s*\)\s*<View style=\{\{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 \}\}>([\s\S]*?)<\/View>\}/,
      `</TouchableOpacity>\n            )}\n            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>$1</View>`);
    
    // Fix Diet Advice parenthesis
    c = c.replace(/<\/TouchableOpacity>\s*\)\s*<View style=\{\{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 \}\}>([\s\S]*?)<\/View>\}/,
      `</TouchableOpacity>\n            )}\n            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>$1</View>`);

    fs.writeFileSync(p, c);
    console.log('Fixed syntax error in ' + p);
  }
}

fixSyntaxError('src/app/(dashboard)/prescriptions/new.tsx');
fixSyntaxError('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
