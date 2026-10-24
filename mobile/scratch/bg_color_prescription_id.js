const fs = require('fs');

const p = 'src/app/(dashboard)/prescriptions/index.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Change backgroundColor of complaintBox to a visible distinct color
  c = c.replace(/complaintBox: \{ backgroundColor: COLORS\.surface, padding: 16, borderRadius: 16, marginBottom: 16 \}/g,
    "complaintBox: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12, marginBottom: 16 }");

  fs.writeFileSync(p, c);
  console.log('Added background color to prescription ID box');
}
