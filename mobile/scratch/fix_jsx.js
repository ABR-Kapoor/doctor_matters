const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Fix the 4 consecutive closing views before Health Summary
  c = c.replace(/<\/View>\s*<\/View>\s*<\/View>\s*<\/View>\s*\{\/\* Health Summary \*\/\}/g,
    `</View>
          </View>
        </View>

        {/* Health Summary */}`);

  fs.writeFileSync(p, c);
  console.log('Fixed JSX syntax error');
}
