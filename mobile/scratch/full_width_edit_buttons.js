const fs = require('fs');

function makeFullWidthButtons(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // For Instructions
    const instrMatch = c.match(/<View style=\{\{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 \}\}>\s*\{!isEditingInstructions && instructions \? \([\s\S]*?\) : isEditingInstructions \|\| !instructions \? \([\s\S]*?\) : null\}\s*<\/View>/);
    if (instrMatch) {
      const newButtons = `<View style={{ marginTop: 12 }}>
              {!isEditingInstructions && instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(true)} style={{ width: '100%', paddingVertical: 12, backgroundColor: '#eff6ff', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' }}>
                  <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>Edit Instructions</Text>
                </TouchableOpacity>
              ) : isEditingInstructions || !instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(false)} style={{ width: '100%', paddingVertical: 12, backgroundColor: '#dcfce7', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#86efac' }}>
                  <Text style={{ color: '#15803d', fontSize: 14, fontWeight: '700' }}>Save Instructions</Text>
                </TouchableOpacity>
              ) : null}
            </View>`;
      c = c.replace(instrMatch[0], newButtons);
    }

    // For Diet Advice
    const dietMatch = c.match(/<View style=\{\{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 \}\}>\s*\{!isEditingDiet && dietAdvice \? \([\s\S]*?\) : isEditingDiet \|\| !dietAdvice \? \([\s\S]*?\) : null\}\s*<\/View>/);
    if (dietMatch) {
      const newButtons = `<View style={{ marginTop: 12 }}>
              {!isEditingDiet && dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(true)} style={{ width: '100%', paddingVertical: 12, backgroundColor: '#eff6ff', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' }}>
                  <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>Edit Diet Advice</Text>
                </TouchableOpacity>
              ) : isEditingDiet || !dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(false)} style={{ width: '100%', paddingVertical: 12, backgroundColor: '#dcfce7', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#86efac' }}>
                  <Text style={{ color: '#15803d', fontSize: 14, fontWeight: '700' }}>Save Diet Advice</Text>
                </TouchableOpacity>
              ) : null}
            </View>`;
      c = c.replace(dietMatch[0], newButtons);
    }

    fs.writeFileSync(p, c);
    console.log('Made buttons full width in ' + p);
  }
}

makeFullWidthButtons('src/app/(dashboard)/prescriptions/new.tsx');
makeFullWidthButtons('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
