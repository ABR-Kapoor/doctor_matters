const fs = require('fs');
const file = 'd:/aurasutra-mobile/aurasutra-doctor/src/app/(dashboard)/index.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /quickActionsGrid:\s*\{\s*flexDirection:\s*'row',\s*gap:\s*8,\s*\}/g,
  "quickActionsGrid: { flexDirection: 'row', gap: 4, }"
);

content = content.replace(
  /quickActionBox:\s*\{\s*flex:\s*1,\s*backgroundColor:\s*'#F8FAFC',\s*borderRadius:\s*16,\s*padding:\s*8,\s*\}/g,
  "quickActionBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 6, }"
);

content = content.replace(
  /quickActionIconBg:\s*\{\s*width:\s*36,\s*height:\s*36,\s*borderRadius:\s*18,\s*justifyContent:\s*'center',\s*alignItems:\s*'center',\s*marginBottom:\s*4\s*\}/g,
  "quickActionIconBg: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }"
);

content = content.replace(
  /quickActionTitle:\s*\{\s*fontSize:\s*11,\s*fontFamily:\s*FONTS\.serif,\s*color:\s*COLORS\.text,\s*marginBottom:\s*2,\s*textAlign:\s*'center'\s*\}/g,
  "quickActionTitle: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 2, textAlign: 'center' }"
);

content = content.replace(
  /quickActionDesc:\s*\{\s*fontSize:\s*9,\s*color:\s*COLORS\.gray,\s*fontFamily:\s*FONTS\.regular,\s*lineHeight:\s*12,\s*textAlign:\s*'center'\s*\}/g,
  "quickActionDesc: { fontSize: 8, color: COLORS.gray, fontFamily: FONTS.regular, lineHeight: 10, textAlign: 'center' }"
);

// We must also adjust the icon sizes in the JSX.
content = content.replace(/<RefreshCw size=\{18\}/g, '<RefreshCw size={14}');
content = content.replace(/<FileText size=\{18\}/g, '<FileText size={14}');
content = content.replace(/<MapPin size=\{18\}/g, '<MapPin size={14}');
content = content.replace(/<X size=\{18\}/g, '<X size={14}');

fs.writeFileSync(file, content, 'utf8');
console.log('Made grid ultra compact');
