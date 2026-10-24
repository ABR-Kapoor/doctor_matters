const fs = require('fs');

const p = 'src/app/(dashboard)/prescriptions/new.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Add Stack import if not present
  if (!c.includes("import { useLocalSearchParams, useRouter, Stack }")) {
    c = c.replace(/import \{ useLocalSearchParams, useRouter \} from 'expo-router';/, "import { useLocalSearchParams, useRouter, Stack } from 'expo-router';");
  }

  // Add Stack.Screen with back button
  if (!c.includes("<Stack.Screen")) {
    c = c.replace(/<ScrollView contentContainerStyle=\{styles\.content\}>/,
      `<Stack.Screen options={{ 
        title: 'New Prescription',
        headerLeft: () => (
          <TouchableOpacity 
            style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginLeft: 16 }} 
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
        ) 
      }} />\n      <ScrollView contentContainerStyle={styles.content}>`
    );
  }

  fs.writeFileSync(p, c);
  console.log('Added back button to new prescription page');
}
