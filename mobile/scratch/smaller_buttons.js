const fs = require('fs');

const p = 'src/app/(dashboard)/prescriptions/index.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // actionBtn
  c = c.replace(/paddingVertical: 12,\s*borderRadius: 12,\s*gap: 6/g, "paddingVertical: 8, borderRadius: 10, minHeight: 36, gap: 4");
  
  // btnOutlineText
  c = c.replace(/btnOutlineText: \{\s*color: COLORS\.text,\s*fontFamily: FONTS\.bold,\s*fontWeight: '700',\s*fontSize: 15\s*\}/g,
    "btnOutlineText: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 13 }");
    
  // btnPrimary
  c = c.replace(/btnPrimary: \{\s*backgroundColor: COLORS\.primary,\s*alignItems: 'center',\s*justifyContent: 'center',\s*borderRadius: 12,\s*paddingHorizontal: 16,\s*paddingVertical: 12,\s*minHeight: 48\s*\}/g,
    "btnPrimary: { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 36 }");
    
  // btnPrimaryText
  c = c.replace(/btnPrimaryText: \{\s*color: COLORS\.text,\s*fontFamily: FONTS\.bold,\s*fontWeight: '700',\s*fontSize: 15\s*\}/g,
    "btnPrimaryText: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 13 }");
    
  // actionBtnDanger
  c = c.replace(/actionBtnDanger: \{\s*width: 44,\s*height: 44,\s*borderRadius: 22/g,
    "actionBtnDanger: { width: 36, height: 36, borderRadius: 18");

  fs.writeFileSync(p, c);
  console.log('Made buttons smaller');
}
