const fs = require('fs');
const file = 'd:/aurasutra-mobile/aurasutra-patient/src/app/(dashboard)/prescriptions.tsx';
let c = fs.readFileSync(file, 'utf8');

let changed = false;

if (c.includes('<Text style={styles.diagnosisText}>{prescription.diagnosis || \'No diagnosis recorded\'}</Text>')) {
  c = c.replace(
    /<Text style=\{styles\.diagnosisText\}>\{prescription\.diagnosis \|\| 'No diagnosis recorded'\}<\/Text>/g,
    '<MarkdownText style={styles.diagnosisText}>{prescription.diagnosis || \'No diagnosis recorded\'}</MarkdownText>'
  );
  changed = true;
}

if (c.includes('<Text style={styles.instructionsText}>{prescription.instructions}</Text>')) {
  c = c.replace(
    /<Text style=\{styles\.instructionsText\}>\{prescription\.instructions\}<\/Text>/g,
    '<MarkdownText style={styles.instructionsText}>{prescription.instructions}</MarkdownText>'
  );
  changed = true;
}

if (changed) {
  if (!c.includes('MarkdownText')) {
    c = "import { MarkdownText } from '@/components/MarkdownText';\n" + c;
  }
  fs.writeFileSync(file, c);
  console.log('Updated prescriptions.tsx');
}
