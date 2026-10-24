const fs = require('fs');

function addSaveButton(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Instructions
    c = c.replace(/\{instructions && !isEditingInstructions \? \([\s\S]*?\) : null\}/, 
      `{!isEditingInstructions && instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Edit</Text>
                </TouchableOpacity>
              ) : isEditingInstructions || !instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: '#15803d', fontSize: 12, fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
              ) : null}`);

    // Diet Advice
    c = c.replace(/\{dietAdvice && !isEditingDiet \? \([\s\S]*?\) : null\}/, 
      `{!isEditingDiet && dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Edit</Text>
                </TouchableOpacity>
              ) : isEditingDiet || !dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: '#15803d', fontSize: 12, fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
              ) : null}`);

    fs.writeFileSync(p, c);
    console.log('Added Save button to ' + p);
  }
}

addSaveButton('src/app/(dashboard)/prescriptions/new.tsx');
addSaveButton('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
