const fs = require('fs');

function fixHeaderButtons(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Replace borderColor and icon color
    c = c.replace(/borderColor:\s*'#e5e7eb'/g, "borderColor: '#ffffff'");
    c = c.replace(/color="#374151"/g, 'color="#334155"');

    fs.writeFileSync(p, c);
    console.log('Fixed header buttons in ' + p);
  }
}

fixHeaderButtons('src/app/(dashboard)/prescriptions/index.tsx');
fixHeaderButtons('src/app/(dashboard)/patients/[patientId].tsx');
