const fs = require('fs');
const filePath = 'd:/doctor_view/mobile/src/app/(dashboard)/prescriptions/new.tsx';
let content = fs.readFileSync(filePath, 'utf8');
if (!content.includes('HeaderTitle')) {
  content = content.replace("from '@/constants/theme';", "from '@/constants/theme';\nimport { HeaderTitle } from '@/components/HeaderOptions';");
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Added HeaderTitle');
} else if (!content.includes("import { HeaderTitle }")) {
  content = "import { HeaderTitle } from '@/components/HeaderOptions';\n" + content;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Added HeaderTitle at top');
} else {
  console.log('Already present');
}
