const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // 1. Update icon sizes
  c = c.replace(/<Activity size=\{20\}/g, "<Activity size={14}");
  c = c.replace(/<FileText size=\{20\}/g, "<FileText size={14}");
  c = c.replace(/<Pill size=\{20\}/g, "<Pill size={14}");

  // 2. Update healthIconBox
  c = c.replace(/healthIconBox: \{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12, marginRight: 12 \}/g,
    "healthIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8, marginRight: 8 }");

  // 3. Update healthHeaderRow
  c = c.replace(/healthHeaderRow: \{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 \}/g,
    "healthHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }");

  // 4. Update healthTitle
  c = c.replace(/healthTitle: \{ fontSize: 16, fontFamily: FONTS\.bold/g,
    "healthTitle: { fontSize: 14, fontFamily: FONTS.bold");

  // 5. Update healthCard and healthCardFull padding (to make it compact)
  c = c.replace(/healthCard: \{ width: '48%', backgroundColor: COLORS\.white, borderRadius: 12, padding: 16, marginBottom: 16/g,
    "healthCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 12, padding: 12, marginBottom: 12");
    
  c = c.replace(/healthCardFull: \{ width: '100%', backgroundColor: COLORS\.white, borderRadius: 12, padding: 16/g,
    "healthCardFull: { width: '100%', backgroundColor: COLORS.white, borderRadius: 12, padding: 12, marginBottom: 12");

  // Make tags smaller and compact
  c = c.replace(/tagsContainer: \{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 \}/g,
    "tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }");
  c = c.replace(/tag: \{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontSize: 12/g,
    "tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 11");

  fs.writeFileSync(p, c);
  console.log('Updated patient profile health summary layout');
}
