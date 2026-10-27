const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Replace Allergies layout
  c = c.replace(
    /<View style=\{\[styles\.healthIconBox, \{ backgroundColor: '#fee2e2' \}\]\}>\s*<Activity size=\{14\} color=\{COLORS\.error\} \/>\s*<\/View>\s*<Text style=\{styles\.healthTitle\}>Allergies<\/Text>/,
    `<View style={styles.healthHeaderRow}>
              <View style={[styles.healthIconBox, { backgroundColor: '#fee2e2' }]}>
                <Activity size={14} color={COLORS.error} />
              </View>
              <Text style={styles.healthTitle}>Allergies</Text>
            </View>`
  );

  // Replace Conditions layout
  c = c.replace(
    /<View style=\{\[styles\.healthIconBox, \{ backgroundColor: '#fef3c7' \}\]\}>\s*<FileText size=\{14\} color="#f59e0b" \/>\s*<\/View>\s*<Text style=\{styles\.healthTitle\}>Conditions<\/Text>/,
    `<View style={styles.healthHeaderRow}>
              <View style={[styles.healthIconBox, { backgroundColor: '#fef3c7' }]}>
                <FileText size={14} color="#f59e0b" />
              </View>
              <Text style={styles.healthTitle}>Conditions</Text>
            </View>`
  );

  fs.writeFileSync(p, c);
  console.log('Updated health cards to single line heading');
}
