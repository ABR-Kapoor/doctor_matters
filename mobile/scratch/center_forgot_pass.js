const fs = require('fs');
const path = require('path');

const doctorAppPath = 'd:\\aurasutra-mobile\\aurasutra-doctor';
const patientAppPath = 'd:\\aurasutra-mobile\\aurasutra-patient';

function fixCentering(appPath) {
  const p = path.join(appPath, 'src/app/forgot-password.tsx');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Make header absolute so content perfectly centers
    if (c.includes('header: { paddingHorizontal: 16, paddingTop: 16 }')) {
      c = c.replace(
        "header: { paddingHorizontal: 16, paddingTop: 16 }", 
        "header: { position: 'absolute', top: 16, left: 16, zIndex: 10 }"
      );
    }
    
    fs.writeFileSync(p, c);
    console.log(`Centered content in ${appPath}`);
  }
}

fixCentering(doctorAppPath);
fixCentering(patientAppPath);
