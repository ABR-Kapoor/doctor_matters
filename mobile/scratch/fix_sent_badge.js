const fs = require('fs');

const p = 'src/app/(dashboard)/prescriptions/index.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Replace COLORS.success with a hardcoded strong green color #15803d
  c = c.replace(/<Text style=\{\[styles\.statusText, \{ color: COLORS\.success \}\]\}>SENT<\/Text>/g,
    "<Text style={[styles.statusText, { color: '#15803d' }]}>SENT</Text>");

  fs.writeFileSync(p, c);
  console.log('Fixed SENT badge color');
}
