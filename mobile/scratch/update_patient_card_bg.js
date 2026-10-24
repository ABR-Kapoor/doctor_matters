const fs = require('fs');

const p = 'src/app/(dashboard)/patients/index.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');
  
  // Set card background to light sky blue and adjust border
  c = c.replace(/card: \{[\s\S]*?backgroundColor: COLORS\.white,/g, match => match.replace('backgroundColor: COLORS.white,', "backgroundColor: '#f0f9ff',"));
  c = c.replace(/borderColor: '#f1f5f9',/g, "borderColor: '#e0f2fe',");
  
  // Set avatar background to white so it pops on the blue card
  c = c.replace(/avatar: \{[\s\S]*?backgroundColor: '#f0f9ff',/g, match => match.replace("backgroundColor: '#f0f9ff',", 'backgroundColor: COLORS.white,'));

  fs.writeFileSync(p, c);
  console.log('Updated patient card colors in All Patients page');
}
