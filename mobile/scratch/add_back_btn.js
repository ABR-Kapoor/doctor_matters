const fs = require('fs');

let c = fs.readFileSync('src/app/(dashboard)/prescriptions/index.tsx', 'utf8');

if (!c.includes('ChevronLeft')) {
  c = c.replace(/import \{ Plus, Edit, Trash, Send, Pill, Clock, FileText, User \} from 'lucide-react-native';/, "import { Plus, Edit, Trash, Send, Pill, Clock, FileText, User, ChevronLeft } from 'lucide-react-native';");
}

c = c.replace(/<Stack\.Screen options=\{\{ headerRight: \(\) => \(\<TouchableOpacity/, `<Stack.Screen options={{ headerLeft: () => (<TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginLeft: 16 }} onPress={() => router.push('/')}><ChevronLeft size={20} color="#374151" /></TouchableOpacity>), headerRight: () => (<TouchableOpacity`);

fs.writeFileSync('src/app/(dashboard)/prescriptions/index.tsx', c);
console.log('Added back button to prescriptions index');
