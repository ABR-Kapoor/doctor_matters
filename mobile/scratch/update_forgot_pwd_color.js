const fs = require('fs');
const path = require('path');

const doctorAppPath = 'd:\\aurasutra-mobile\\aurasutra-doctor';
const patientAppPath = 'd:\\aurasutra-mobile\\aurasutra-patient';

function updateForgotPwdColor(appPath) {
  const signInPath = path.join(appPath, 'src/app/sign-in.tsx');
  if (fs.existsSync(signInPath)) {
    let content = fs.readFileSync(signInPath, 'utf8');

    // Replace the color for Forgot Password
    content = content.replace(
      /color: COLORS\.primary \|\| '#2563eb'/, 
      "color: '#64748b'"
    );

    fs.writeFileSync(signInPath, content);
    console.log(`Updated color in ${appPath}`);
  }
}

updateForgotPwdColor(doctorAppPath);
updateForgotPwdColor(patientAppPath);
