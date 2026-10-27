const fs = require('fs');

const p = 'src/app/(dashboard)/index.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Fix the unclosed View tag that caused the SyntaxError
  c = c.replace(/<\/ScrollView>\s*\{currentAppointments\.length === 0 \? \(/g, 
    "</ScrollView>\n      </View>\n\n      {currentAppointments.length === 0 ? (");

  fs.writeFileSync(p, c);
  console.log('Fixed unclosed View tag');
}
