const fs = require('fs');

const patientsFile = 'src/app/(dashboard)/patients/index.tsx';
let p = fs.readFileSync(patientsFile, 'utf8');
if (!p.includes('HeaderTitle')) {
  p = p.replace(/import \{ useRouter \} from 'expo-router';/, "import { useRouter, Stack } from 'expo-router';\nimport { HeaderTitle } from '@/components/HeaderOptions';");
  p = p.replace(/<ScrollView contentContainerStyle=\{styles\.content\}>/, `<ScrollView contentContainerStyle={styles.content}>\n        <Stack.Screen options={{ headerTitle: () => <HeaderTitle title="All Patients" subtitle="View and manage patient records" /> }} />`);
  fs.writeFileSync(patientsFile, p);
  console.log('Updated patients index');
}

const financeFile = 'src/app/(dashboard)/finance.tsx';
let f = fs.readFileSync(financeFile, 'utf8');
if (!f.includes('HeaderTitle')) {
  f = f.replace(/import \{ useRouter \} from 'expo-router';/, "import { useRouter, Stack } from 'expo-router';\nimport { HeaderTitle } from '@/components/HeaderOptions';");
  f = f.replace(/<ScrollView contentContainerStyle=\{styles\.content\}>/, `<ScrollView contentContainerStyle={styles.content}>\n        <Stack.Screen options={{ headerTitle: () => <HeaderTitle title="Finance" subtitle="Your Earnings & Payouts" /> }} />`);
  fs.writeFileSync(financeFile, f);
  console.log('Updated finance');
}
