const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let c = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Replace generic aptComplaint rendering
      const regex = /<Text([^>]*)>\{String\(Array\.isArray\(aptComplaint\(apt\)\) \? aptComplaint\(apt\)\.join\(\', \'\\?\) : aptComplaint\(apt\)\)\}<\/Text>/g;
      if (regex.test(c)) {
        c = c.replace(regex, "<MarkdownText$1>{String(Array.isArray(aptComplaint(apt)) ? aptComplaint(apt).join(', ') : aptComplaint(apt))}</MarkdownText>");
        changed = true;
      }

      const regex2 = /<Text style=\{styles\.complaintText\}>\{String\(Array\.isArray\(aptComplaint\(apt\)\) \? aptComplaint\(apt\)\.join\(', '\) : aptComplaint\(apt\)\)\}<\/Text>/g;
      if (regex2.test(c)) {
         c = c.replace(regex2, "<MarkdownText style={styles.complaintText}>{String(Array.isArray(aptComplaint(apt)) ? aptComplaint(apt).join(', ') : aptComplaint(apt))}</MarkdownText>");
         changed = true;
      }
      
      const regex3 = /<Text style=\{styles\.complaintText\}>\{String\(Array\.isArray\(apt\.complaint_description\)\s*\?\s*apt\.complaint_description\.join\(', '\)\s*:\s*apt\.complaint_description\)\}<\/Text>/g;
      if (regex3.test(c)) {
         c = c.replace(regex3, "<MarkdownText style={styles.complaintText}>{String(Array.isArray(apt.complaint_description) ? apt.complaint_description.join(', ') : apt.complaint_description)}</MarkdownText>");
         changed = true;
      }

      if (changed) {
        if (!c.includes('MarkdownText')) {
          c = "import { MarkdownText } from '@/components/MarkdownText';\n" + c;
        } else if (!c.includes("import { MarkdownText }")) {
          // If the tag exists but not imported
          c = "import { MarkdownText } from '@/components/MarkdownText';\n" + c;
        }
        fs.writeFileSync(fullPath, c);
        console.log('Updated ' + fullPath);
      }
    }
  }
}

processDir('src/app');
