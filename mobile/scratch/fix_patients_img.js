const fs = require('fs');

let c = fs.readFileSync('src/app/(dashboard)/patients/index.tsx', 'utf8');

// Ensure Image is imported
if (!c.includes('Image } from \'react-native\'') && !c.includes('Image,')) {
  c = c.replace(/import \{ View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator \} from 'react-native';/, "import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';");
}

// Search Card Border Radius
c = c.replace(/borderRadius: 30/, 'borderRadius: 12');

// Add Image URL resolution and display
const returnStatementRegex = /return \(\s*<TouchableOpacity\s*key=\{patient\.pid\}/g;
let match;
while ((match = returnStatementRegex.exec(c)) !== null) {
  const index = match.index;
  // Insert imageUrl extraction just before the return
  const prefix = c.substring(0, index);
  const suffix = c.substring(index);
  if (!prefix.endsWith('const imageUrl = patient.user?.profileImageUrl || patient.user?.profile_image_url;\n                ')) {
    c = prefix + 'const imageUrl = patient.user?.profileImageUrl || patient.user?.profile_image_url;\n                ' + suffix;
  }
  break; // Only need to do this once per map loop (assuming one loop for patients)
}

// Replace User icon with Image if imageUrl is present
c = c.replace(/<User size=\{22\} color=\{COLORS\.primary\} \/>/g, `{imageUrl ? <Image source={{ uri: imageUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <User size={22} color={COLORS.primary} />}`);

fs.writeFileSync('src/app/(dashboard)/patients/index.tsx', c);
console.log('Fixed patients index image and search box');
