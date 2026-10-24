const fs = require('fs');
const path = require('path');

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let c = fs.readFileSync(p, 'utf8');
      if (c.includes('borderColor: COLORS.primary')) {
        c = c.replace(/borderColor: COLORS\.primary/g, "borderColor: 'rgba(30, 41, 59, 0.15)'");
        fs.writeFileSync(p, c);
        console.log('Updated ' + p);
      }
    }
  });
}

walk('src');
