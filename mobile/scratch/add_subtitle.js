const fs = require('fs');

let c = fs.readFileSync('src/app/(dashboard)/prescriptions/index.tsx', 'utf8');

if (!c.includes('HeaderTitle')) {
  c = c.replace(/import \{ useRouter, Stack \} from 'expo-router';/, "import { useRouter, Stack } from 'expo-router';\nimport { HeaderTitle } from '@/components/HeaderOptions';");
}

c = c.replace(/<Stack\.Screen options=\{\{ headerLeft:[\s\S]*? \}\} \/>/, `<Stack.Screen options={{ headerTitle: () => <HeaderTitle title="Prescriptions" subtitle="Create and Manage Prescriptions" />, headerLeft: () => (<TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginLeft: 16 }} onPress={() => router.push('/')}><ChevronLeft size={20} color="#374151" /></TouchableOpacity>), headerRight: () => (<TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginRight: 16 }} onPress={() => router.push('/prescriptions/new')}><Plus size={20} color="#374151" /></TouchableOpacity>) }} />`);

fs.writeFileSync('src/app/(dashboard)/prescriptions/index.tsx', c);
console.log('Updated prescriptions index headerTitle');
