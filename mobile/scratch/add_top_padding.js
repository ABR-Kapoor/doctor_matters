const fs = require('fs');

const p = 'src/app/(dashboard)/prescriptions/new.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Increase paddingTop in the content style
  c = c.replace(/content: \{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 100 \}/g,
    "content: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 100 }");

  fs.writeFileSync(p, c);
  console.log('Added top padding to new prescription page');
}
