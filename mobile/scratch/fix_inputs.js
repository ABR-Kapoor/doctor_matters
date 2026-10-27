const fs = require('fs');

function updateInputs(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Replace { height: 80 } with { minHeight: 120 }
    // Also, adding scrollEnabled={false} to <TextInput multiline ... />
    
    // Fix styles.input to not have a fixed height if it does
    c = c.replace(/\{ height: 80 \}/g, "{ minHeight: 120 }");
    c = c.replace(/<TextInput(.*?)multiline(.*?)>/g, (match, p1, p2) => {
      if (!match.includes('scrollEnabled')) {
        return `<TextInput${p1}multiline scrollEnabled={false}${p2}>`;
      }
      return match;
    });

    // If there are other TextInputs without { height: 80 } but need to grow:
    // Make sure 'Instructions' and 'Diet Advice' have multiline scrollEnabled={false}
    
    fs.writeFileSync(p, c);
    console.log('Updated inputs in ' + p);
  } else {
    console.log('File not found: ' + p);
  }
}

updateInputs('src/app/(dashboard)/prescriptions/new.tsx');
updateInputs('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
