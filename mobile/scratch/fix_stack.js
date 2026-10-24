const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('Stack } from \'expo-router\'')) {
  c = c.replace(/import \{ useLocalSearchParams, useRouter \} from 'expo-router';/, "import { useLocalSearchParams, useRouter, Stack } from 'expo-router';");
  fs.writeFileSync(p, c);
  console.log('Fixed Stack import in [patientId].tsx');
}
