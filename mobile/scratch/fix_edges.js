const fs = require('fs');

const files = [
  'src/app/(dashboard)/prescriptions/[prescriptionId]/progress.tsx',
  'src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx',
  'src/app/(dashboard)/prescriptions/new.tsx',
  'src/app/(dashboard)/prescriptions/index.tsx',
  'src/app/(dashboard)/patients/[patientId].tsx',
  'src/app/(dashboard)/patients/index.tsx',
  'src/app/(dashboard)/finance.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/edges=\{\['top', 'left', 'right'\]\}/g, "edges={['left', 'right']}");
    fs.writeFileSync(f, content);
    console.log('Fixed edges in ' + f);
  }
});
