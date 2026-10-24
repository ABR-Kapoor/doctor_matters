const fs = require('fs');
let c = fs.readFileSync('src/app/(dashboard)/patients/[patientId].tsx', 'utf8');
c = c.replace(/import \{ useRouter \} from 'expo-router';/, "import { useRouter, Stack } from 'expo-router';");
c = c.replace(/<View style=\{styles\.navHeader\}>[\s\S]*?<\/View>/, `<Stack.Screen options={{ title: 'Patient Profile', headerRight: () => (<TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: COLORS.lightGray }} onPress={() => router.push(\`/prescriptions/new?pid=\${patient.pid}\`)}><FileText size={16} color={COLORS.text} style={{ marginRight: 4 }} /><Text style={{ fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.text }}>New Rx</Text></TouchableOpacity>) }} />`);
fs.writeFileSync('src/app/(dashboard)/patients/[patientId].tsx', c);
console.log('Updated patient profile');
