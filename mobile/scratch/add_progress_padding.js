const fs = require('fs');

const p = 'src/app/(dashboard)/prescriptions/[prescriptionId]/progress.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Add specific paddingTop to the content style
  c = c.replace(/content: \{ padding: 16, paddingBottom: 40 \}/g,
    "content: { padding: 16, paddingTop: 48, paddingBottom: 40 }");

  fs.writeFileSync(p, c);
  console.log('Added top padding to progress.tsx');
}
