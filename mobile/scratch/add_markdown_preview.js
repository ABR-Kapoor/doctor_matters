const fs = require('fs');

function addMarkdownPreview(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Import MarkdownText if not already imported
    if (!c.includes('MarkdownText')) {
      c = c.replace(/(import .* from 'lucide-react-native';)/, "$1\nimport { MarkdownText } from '@/components/MarkdownText';");
    }

    // Replace Instructions input group
    c = c.replace(/<View style=\{styles\.inputGroup\}>\s*<Text style=\{styles\.label\}>Instructions<\/Text>\s*<TextInput style=\{\[styles\.input, \{ minHeight: 160 \}\]\} multiline scrollEnabled=\{false\} value=\{instructions\} onChangeText=\{setInstructions\} placeholderTextColor=\{COLORS\.gray\} \/>\s*<\/View>/, 
      `<View style={styles.inputGroup}>
            <Text style={styles.label}>Instructions</Text>
            <TextInput style={[styles.input, { minHeight: 160 }]} multiline scrollEnabled={false} value={instructions} onChangeText={setInstructions} placeholderTextColor={COLORS.gray} />
            {instructions ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Preview</Text>
                <MarkdownText>{instructions}</MarkdownText>
              </View>
            ) : null}
          </View>`);

    // Replace Diet Advice input group
    c = c.replace(/<View style=\{styles\.inputGroup\}>\s*<Text style=\{styles\.label\}>Diet Advice<\/Text>\s*<TextInput style=\{\[styles\.input, \{ minHeight: 160 \}\]\} multiline scrollEnabled=\{false\} value=\{dietAdvice\} onChangeText=\{setDietAdvice\} placeholderTextColor=\{COLORS\.gray\} \/>\s*<\/View>/, 
      `<View style={styles.inputGroup}>
            <Text style={styles.label}>Diet Advice</Text>
            <TextInput style={[styles.input, { minHeight: 160 }]} multiline scrollEnabled={false} value={dietAdvice} onChangeText={setDietAdvice} placeholderTextColor={COLORS.gray} />
            {dietAdvice ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Preview</Text>
                <MarkdownText>{dietAdvice}</MarkdownText>
              </View>
            ) : null}
          </View>`);

    // Add styles if not present
    if (!c.includes('previewBox:')) {
      c = c.replace(/submitBtn:/, 
        `previewBox: { marginTop: 12, padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(30, 41, 59, 0.1)' },
  previewLabel: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', marginBottom: 8 },
  submitBtn:`);
    }

    fs.writeFileSync(p, c);
    console.log('Added markdown preview to ' + p);
  }
}

addMarkdownPreview('src/app/(dashboard)/prescriptions/new.tsx');
addMarkdownPreview('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
