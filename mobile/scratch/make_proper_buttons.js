const fs = require('fs');

function makeProperButtons(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Instructions
    const instrMatch = c.match(/<View style=\{\{ marginTop: 12 \}\}>\s*\{!isEditingInstructions && instructions \? \([\s\S]*?\) : isEditingInstructions \|\| !instructions \? \([\s\S]*?\) : null\}\s*<\/View>/);
    if (instrMatch) {
      const newButtons = `<View style={{ marginTop: 16 }}>
              {!isEditingInstructions && instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(true)} style={{ width: '100%', paddingVertical: 14, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', elevation: 1 }}>
                  <Text style={{ color: '#334155', fontSize: 15, fontWeight: '700' }}>Edit Instructions</Text>
                </TouchableOpacity>
              ) : isEditingInstructions || !instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(false)} style={{ width: '100%', paddingVertical: 14, backgroundColor: '#2563eb', borderRadius: 12, alignItems: 'center', elevation: 3, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 6 }}>
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>Save Instructions</Text>
                </TouchableOpacity>
              ) : null}
            </View>`;
      c = c.replace(instrMatch[0], newButtons);
    }

    // Diet Advice
    const dietMatch = c.match(/<View style=\{\{ marginTop: 12 \}\}>\s*\{!isEditingDiet && dietAdvice \? \([\s\S]*?\) : isEditingDiet \|\| !dietAdvice \? \([\s\S]*?\) : null\}\s*<\/View>/);
    if (dietMatch) {
      const newButtons = `<View style={{ marginTop: 16 }}>
              {!isEditingDiet && dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(true)} style={{ width: '100%', paddingVertical: 14, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', elevation: 1 }}>
                  <Text style={{ color: '#334155', fontSize: 15, fontWeight: '700' }}>Edit Diet Advice</Text>
                </TouchableOpacity>
              ) : isEditingDiet || !dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(false)} style={{ width: '100%', paddingVertical: 14, backgroundColor: '#2563eb', borderRadius: 12, alignItems: 'center', elevation: 3, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 6 }}>
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>Save Diet Advice</Text>
                </TouchableOpacity>
              ) : null}
            </View>`;
      c = c.replace(dietMatch[0], newButtons);
    }

    fs.writeFileSync(p, c);
    console.log('Made proper buttons in ' + p);
  }
}

makeProperButtons('src/app/(dashboard)/prescriptions/new.tsx');
makeProperButtons('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
