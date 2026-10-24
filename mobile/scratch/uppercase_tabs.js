const fs = require('fs');

const p = 'src/app/(dashboard)/index.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Replace textTransform: 'none' with textTransform: 'uppercase'
  c = c.replace(/textTransform: 'none',/g, "textTransform: 'uppercase',");

  // Or if it didn't have textTransform but they want it uppercase:
  if (!c.includes("textTransform: 'uppercase'")) {
    c = c.replace(/tabText: \{[\s\S]*?\},/, function(match) {
      if (match.includes("textTransform")) {
        return match.replace(/textTransform: '.*?'/, "textTransform: 'uppercase'");
      } else {
        return match.replace(/fontSize: 13,/, "fontSize: 13,\n    textTransform: 'uppercase',");
      }
    });
  }

  fs.writeFileSync(p, c);
  console.log('Made tabs uppercase');
}
