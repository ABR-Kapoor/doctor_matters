const fs = require('fs');
const layouts = [
  'src/app/(dashboard)/prescriptions/_layout.tsx',
  'src/app/(dashboard)/patients/_layout.tsx'
];

layouts.forEach(file => {
  if (fs.existsSync(file)) {
    let c = fs.readFileSync(file, 'utf8');
    if (!c.includes('getHeaderOptions')) {
      c = c.replace(/import \{ Stack \} from 'expo-router';/, "import { Stack, useRouter } from 'expo-router';\nimport { getHeaderOptions } from '@/components/HeaderOptions';");
      c = c.replace(/export default function \w+\(\) \{/, (match) => match + "\n  const router = useRouter();");
      c = c.replace(/<Stack>/, "<Stack screenOptions={getHeaderOptions(router)}>");
      c = c.replace(/headerShown:\s*false/g, "headerShown: true");
      fs.writeFileSync(file, c);
      console.log('Updated ' + file);
    }
  }
});
