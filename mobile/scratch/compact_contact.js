const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Make contact rows more compact
  c = c.replace(/contactContainer: \{ width: '100%', borderTopWidth: 1, borderTopColor: COLORS\.surface, paddingTop: 16, gap: 12 \}/g,
    "contactContainer: { width: '100%', borderTopWidth: 1, borderTopColor: COLORS.surface, paddingTop: 12, gap: 6 }");
  
  c = c.replace(/contactIconBg: \{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 \}/g,
    "contactIconBg: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginRight: 8 }");

  fs.writeFileSync(p, c);
  console.log('Made contact rows more compact');
}
