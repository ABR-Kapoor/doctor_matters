const fs = require('fs');
let c = fs.readFileSync('src/app/(dashboard)/prescriptions/index.tsx', 'utf8');
if (!c.includes('MarkdownText')) {
  c = c.replace("import { TranslatedText } from '@/components/TranslatedText';", "import { TranslatedText } from '@/components/TranslatedText';\nimport { MarkdownText } from '@/components/MarkdownText';");
}
c = c.replace(
  /<Text style=\{styles\.timeText\}>\{prescription\.diagnosis \|\| 'No diagnosis recorded'\}<\/Text>/g,
  "<MarkdownText style={styles.timeText}>{prescription.diagnosis || 'No diagnosis recorded'}</MarkdownText>"
);
fs.writeFileSync('src/app/(dashboard)/prescriptions/index.tsx', c);
