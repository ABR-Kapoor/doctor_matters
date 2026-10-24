const fs = require('fs');

function convertToToggleablePreview(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // 1. Add state variables for editing
    if (!c.includes('isEditingInstructions')) {
      c = c.replace(/const \[saving, setSaving\] = useState\(false\);/, 
        "const [saving, setSaving] = useState(false);\n  const [isEditingInstructions, setIsEditingInstructions] = useState(false);\n  const [isEditingDiet, setIsEditingDiet] = useState(false);");
    }

    // 2. Replace Instructions block
    const oldInstructions = /<View style=\{styles\.inputGroup\}>\s*<Text style=\{styles\.label\}>Instructions<\/Text>\s*<TextInput style=\{\[styles\.input, \{ minHeight: 160 \}\]\} multiline scrollEnabled=\{false\} value=\{instructions\} onChangeText=\{setInstructions\} placeholderTextColor=\{COLORS\.gray\} \/>\s*(?:\{instructions \? \(\s*<View style=\{styles\.previewBox\}>\s*<Text style=\{styles\.previewLabel\}>Preview<\/Text>\s*<MarkdownText>\{instructions\}<\/MarkdownText>\s*<\/View>\s*\) : null\})\s*<\/View>/;
    
    const newInstructions = `<View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.label, { marginBottom: 0 }]}>Instructions</Text>
              {instructions && !isEditingInstructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {(!instructions || isEditingInstructions) ? (
              <TextInput style={[styles.input, { minHeight: 160 }]} multiline scrollEnabled={false} value={instructions} onChangeText={setInstructions} onBlur={() => setIsEditingInstructions(false)} placeholder="Enter instructions here..." placeholderTextColor={COLORS.gray} />
            ) : (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setIsEditingInstructions(true)} style={[styles.previewBox, { marginTop: 0 }]}>
                <MarkdownText>{instructions}</MarkdownText>
              </TouchableOpacity>
            )}
          </View>`;

    c = c.replace(oldInstructions, newInstructions);

    // 3. Replace Diet Advice block
    const oldDiet = /<View style=\{styles\.inputGroup\}>\s*<Text style=\{styles\.label\}>Diet Advice<\/Text>\s*<TextInput style=\{\[styles\.input, \{ minHeight: 160 \}\]\} multiline scrollEnabled=\{false\} value=\{dietAdvice\} onChangeText=\{setDietAdvice\} placeholderTextColor=\{COLORS\.gray\} \/>\s*(?:\{dietAdvice \? \(\s*<View style=\{styles\.previewBox\}>\s*<Text style=\{styles\.previewLabel\}>Preview<\/Text>\s*<MarkdownText>\{dietAdvice\}<\/MarkdownText>\s*<\/View>\s*\) : null\})\s*<\/View>/;
    
    const newDiet = `<View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.label, { marginBottom: 0 }]}>Diet Advice</Text>
              {dietAdvice && !isEditingDiet ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {(!dietAdvice || isEditingDiet) ? (
              <TextInput style={[styles.input, { minHeight: 160 }]} multiline scrollEnabled={false} value={dietAdvice} onChangeText={setDietAdvice} onBlur={() => setIsEditingDiet(false)} placeholder="Enter diet advice here..." placeholderTextColor={COLORS.gray} />
            ) : (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setIsEditingDiet(true)} style={[styles.previewBox, { marginTop: 0 }]}>
                <MarkdownText>{dietAdvice}</MarkdownText>
              </TouchableOpacity>
            )}
          </View>`;

    c = c.replace(oldDiet, newDiet);

    fs.writeFileSync(p, c);
    console.log('Updated ' + p);
  } else {
    console.log('File not found: ' + p);
  }
}

convertToToggleablePreview('src/app/(dashboard)/prescriptions/new.tsx');
convertToToggleablePreview('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
