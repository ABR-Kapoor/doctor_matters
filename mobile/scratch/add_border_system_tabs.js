const fs = require('fs');

function addBorderToSystemToggle(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    c = c.replace(/systemToggle: \{ flexDirection: 'row', backgroundColor: COLORS\.surface, borderRadius: 16, padding: 4, marginBottom: 16 \}/g,
      "systemToggle: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 16, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(30, 41, 59, 0.15)' }");

    fs.writeFileSync(p, c);
    console.log('Added border to system tabs in ' + p);
  }
}

addBorderToSystemToggle('src/app/(dashboard)/prescriptions/new.tsx');
addBorderToSystemToggle('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
