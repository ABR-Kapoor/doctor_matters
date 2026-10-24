const fs = require('fs');

const files = [
  'src/app/(dashboard)/patients/[patientId].tsx',
  'src/app/(dashboard)/prescriptions/new.tsx',
  'src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx',
  'src/app/(dashboard)/prescriptions/[prescriptionId]/progress.tsx',
  'src/app/(dashboard)/profile.tsx',
  'src/app/(dashboard)/index.tsx' // Actually, let's keep index.tsx as is since we hid the top nav for it.
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Look for <View style={styles.header}>
    const startStr = '<View style={styles.header}>';
    const startIndex = content.indexOf(startStr);
    
    if (startIndex !== -1) {
      let openCount = 0;
      let endIndex = -1;
      
      // Simple tag counting starting from the found index
      // We look for '<View' and '</View>'
      let i = startIndex;
      while (i < content.length) {
        if (content.substring(i, i + 5) === '<View') {
          openCount++;
          i += 5;
        } else if (content.substring(i, i + 7) === '</View>') {
          openCount--;
          if (openCount === 0) {
            endIndex = i + 7;
            break;
          }
          i += 7;
        } else {
          i++;
        }
      }
      
      if (endIndex !== -1) {
        content = content.substring(0, startIndex) + content.substring(endIndex);
        fs.writeFileSync(file, content);
        console.log('Removed header from ' + file);
      }
    }
  }
});
