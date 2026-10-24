const fs = require('fs');
let c = fs.readFileSync('src/app/(dashboard)/index.tsx', 'utf8');
if (!c.includes('MarkdownText')) {
  c = c.replace("import { TranslatedText } from '@/components/TranslatedText';", "import { TranslatedText } from '@/components/TranslatedText';\nimport { MarkdownText } from '@/components/MarkdownText';");
}
c = c.replace(
  /<Text style=\{styles\.complaintText\}>\{String\(Array\.isArray\(aptComplaint\(apt\)\) \? aptComplaint\(apt\)\.join\(', '\) : aptComplaint\(apt\)\)\}<\/Text>/g,
  "<MarkdownText style={styles.complaintText}>{String(Array.isArray(aptComplaint(apt)) ? aptComplaint(apt).join(', ') : aptComplaint(apt))}</MarkdownText>"
);
fs.writeFileSync('src/app/(dashboard)/index.tsx', c);
