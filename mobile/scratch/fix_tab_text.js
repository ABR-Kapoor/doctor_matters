const fs = require('fs');

const p = 'src/app/(dashboard)/index.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Reduce tab font size and adjust spacing
  c = c.replace(/tabText: \{\s*fontSize: 13,\s*fontWeight: 'bold',\s*textTransform: 'uppercase',\s*color: COLORS\.gray,\s*\}/g,
    "tabText: {\n    fontSize: 11,\n    fontWeight: 'bold',\n    textTransform: 'uppercase',\n    color: COLORS.gray,\n    letterSpacing: 0.5,\n  }");

  c = c.replace(/marginRight: 24,/g, "marginRight: 16,");

  fs.writeFileSync(p, c);
  console.log('Fixed cut-off tab text');
}
