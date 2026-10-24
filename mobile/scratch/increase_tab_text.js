const fs = require('fs');

const p = 'src/app/(dashboard)/index.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Increase font size back to 13
  c = c.replace(/fontSize: 11,/g, "fontSize: 13,");
  
  // Remove letterSpacing to avoid horizontal wrapping if that was the issue
  c = c.replace(/letterSpacing: 0\.5,/g, "");

  // Change alignItems to 'center' on the tab so it doesn't clip top/bottom
  c = c.replace(/alignItems: 'flex-start',/g, "alignItems: 'center',");

  fs.writeFileSync(p, c);
  console.log('Increased tab text size and centered');
}
