const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Replace Styles
  c = c.replace(/contactContainer: \{ width: '100%', borderTopWidth: 1, borderTopColor: COLORS\.surface, paddingTop: 16, gap: 12 \}/g,
    "contactContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: COLORS.surface, paddingTop: 20 }");
    
  c = c.replace(/contactItemRow: \{ flexDirection: 'row', alignItems: 'center' \}/g,
    "contactItemRow: { flex: 1, alignItems: 'center' }");
    
  c = c.replace(/contactIconBg: \{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 \}/g,
    "contactIconBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }");
    
  c = c.replace(/contactText: \{ fontSize: 14, fontFamily: FONTS\.medium, fontWeight: '500', color: COLORS\.text \}/g,
    "contactText: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text, textAlign: 'center' }");

  fs.writeFileSync(p, c);
  console.log('Made phone and email left and right');
}
