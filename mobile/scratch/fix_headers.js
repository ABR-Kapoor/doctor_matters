const fs = require('fs');

// Fix finance.tsx
let f = fs.readFileSync('src/app/(dashboard)/finance.tsx', 'utf8');
f = f.replace(/import \{ useRouter, Stack \} from 'expo-router';/, "import { useRouter, Tabs } from 'expo-router';");
f = f.replace(/<Stack\.Screen/g, "<Tabs.Screen");
fs.writeFileSync('src/app/(dashboard)/finance.tsx', f);

// Fix index.tsx (Dashboard)
let i = fs.readFileSync('src/app/(dashboard)/index.tsx', 'utf8');
if (!i.includes("import { Tabs } from 'expo-router'")) {
  i = i.replace(/import \{ useRouter, useFocusEffect, useLocalSearchParams \} from 'expo-router';/, "import { useRouter, useFocusEffect, useLocalSearchParams, Tabs } from 'expo-router';\nimport { HeaderTitle } from '@/components/HeaderOptions';");
}
// Remove custom header inside ScrollView
i = i.replace(/\{\/\* Custom Header \*\/\}\s*<View style=\{styles\.header\}>[\s\S]*?<\/View>/, "");

// Add Tabs.Screen
i = i.replace(/<ScrollView contentContainerStyle=\{styles\.content\}>/, `<ScrollView contentContainerStyle={styles.content}>\n        <Tabs.Screen options={{ headerShown: true, headerTitle: () => <HeaderTitle title="Schedule" subtitle="Your appointments today" /> }} />`);
fs.writeFileSync('src/app/(dashboard)/index.tsx', i);

// Fix profile.tsx
let p = fs.readFileSync('src/app/(dashboard)/profile.tsx', 'utf8');
if (!p.includes("import { Tabs }")) {
  p = p.replace(/import \{ useRouter \} from 'expo-router';/, "import { useRouter, Tabs } from 'expo-router';\nimport { HeaderTitle } from '@/components/HeaderOptions';");
  p = p.replace(/<ScrollView contentContainerStyle=\{styles\.container\}>/, `<ScrollView contentContainerStyle={styles.container}>\n        <Tabs.Screen options={{ headerTitle: () => <HeaderTitle title="Profile" subtitle="Manage your account" /> }} />`);
  fs.writeFileSync('src/app/(dashboard)/profile.tsx', p);
}

// Fix _layout.tsx for Tabs, just in case (remove headerShown: false from index tab)
let l = fs.readFileSync('src/app/(dashboard)/_layout.tsx', 'utf8');
l = l.replace(/title: 'Schedule',\s*headerShown: false,/, "title: 'Schedule',\n            headerShown: true,");
fs.writeFileSync('src/app/(dashboard)/_layout.tsx', l);

console.log('Fixed headers');
