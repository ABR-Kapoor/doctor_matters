const fs = require('fs');

let c = fs.readFileSync('src/app/(dashboard)/prescriptions/index.tsx', 'utf8');
c = c.replace(/<Stack\.Screen options=\{\{ headerRight:[\s\S]*?<\/View>/, `<Stack.Screen options={{ headerRight: () => (<TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginRight: 16 }} onPress={() => router.push('/prescriptions/new')}><Plus size={20} color="#374151" /></TouchableOpacity>) }} />`);
fs.writeFileSync('src/app/(dashboard)/prescriptions/index.tsx', c);
console.log('Fixed prescriptions/index.tsx');

let p = fs.readFileSync('src/app/(dashboard)/patients/[patientId].tsx', 'utf8');
p = p.replace(/<Stack\.Screen options=\{\{ title: 'Patient Profile', headerRight:[\s\S]*?<\/View>/, `<Stack.Screen options={{ title: 'Patient Profile', headerRight: () => (<TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginRight: 16 }} onPress={() => router.push(\`/prescriptions/new?pid=\${patient.pid}\`)}><FileText size={18} color="#374151" /></TouchableOpacity>) }} />`);
fs.writeFileSync('src/app/(dashboard)/patients/[patientId].tsx', p);
console.log('Fixed patients/[patientId].tsx');
