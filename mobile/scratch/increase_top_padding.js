const fs = require('fs');

const p = 'src/app/(dashboard)/prescriptions/new.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Increase paddingTop drastically to ensure it's visible below the header
  c = c.replace(/content: \{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 100 \}/g,
    "content: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 100 }");

  fs.writeFileSync(p, c);
  console.log('Increased top padding significantly to 64');
}
