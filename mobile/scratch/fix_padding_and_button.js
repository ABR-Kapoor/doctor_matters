const fs = require('fs');

// Fix patients page padding
const patientsPath = 'src/app/(dashboard)/patients/index.tsx';
if (fs.existsSync(patientsPath)) {
  let c = fs.readFileSync(patientsPath, 'utf8');
  c = c.replace(/content: \{\s*padding: 24,\s*paddingBottom: 40,\s*\}/g,
    "content: {\n    paddingHorizontal: 24,\n    paddingTop: 32,\n    paddingBottom: 40,\n  }");
  fs.writeFileSync(patientsPath, c);
}

// Fix edit button border
const rxPath = 'src/app/(dashboard)/prescriptions/index.tsx';
if (fs.existsSync(rxPath)) {
  let c = fs.readFileSync(rxPath, 'utf8');
  c = c.replace(/btnOutline: \{ backgroundColor: COLORS\.surface \}/g,
    "btnOutline: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: 'rgba(30, 41, 59, 0.15)' }");
  fs.writeFileSync(rxPath, c);
}

console.log('Fixed padding and button borders');
