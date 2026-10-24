const fs = require('fs');
['src/app/(dashboard)/finance.tsx', 'src/app/(dashboard)/patients/index.tsx', 'src/app/(dashboard)/prescriptions/new.tsx', 'src/app/(dashboard)/patients/[patientId].tsx'].forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/content: \{ padding: 24, paddingBottom: 100 \}/, "content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 100 }");
    c = c.replace(/content: \{ padding: 24 \}/, "content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }");
    c = c.replace(/content: \{ flexGrow: 1, padding: 24 \}/, "content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }");
    fs.writeFileSync(f, c);
  }
});
