const fs = require('fs');

let c = fs.readFileSync('src/app/(dashboard)/prescriptions/index.tsx', 'utf8');

if (!c.includes('Image } from \'react-native\'') && !c.includes('Image,')) {
  c = c.replace(/import \{ View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator \} from 'react-native';/, "import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';");
}

const returnStatementRegexDrafts = /return \(\s*<TouchableOpacity\s*key=\{prescription\.prescription_id\}\s*style=\{styles\.card\}/g;
let match;
while ((match = returnStatementRegexDrafts.exec(c)) !== null) {
  const index = match.index;
  const prefix = c.substring(0, index);
  const suffix = c.substring(index);
  if (!prefix.endsWith('const imageUrl = prescription.patients?.users?.profileImageUrl || prescription.patients?.users?.profile_image_url;\n                ')) {
    c = prefix + 'const imageUrl = prescription.patients?.users?.profileImageUrl || prescription.patients?.users?.profile_image_url;\n                ' + suffix;
  }
  break; 
}

const returnStatementRegexSent = /return \(\s*<View\s*key=\{prescription\.prescription_id\}\s*style=\{styles\.card\}/g;
let matchSent;
while ((matchSent = returnStatementRegexSent.exec(c)) !== null) {
  const index = matchSent.index;
  const prefix = c.substring(0, index);
  const suffix = c.substring(index);
  if (!prefix.endsWith('const imageUrl = prescription.patients?.users?.profileImageUrl || prescription.patients?.users?.profile_image_url;\n                  ')) {
    c = prefix + 'const imageUrl = prescription.patients?.users?.profileImageUrl || prescription.patients?.users?.profile_image_url;\n                  ' + suffix;
  }
  break;
}

// In drafts we use TouchableOpacity now? Actually wait, in prescriptions we still use <View key={prescription.prescription_id} style={styles.card}>
// Oh wait, I didn't change prescriptions to TouchableOpacity, only patients!
// Let me update the regex for prescriptions.
c = fs.readFileSync('src/app/(dashboard)/prescriptions/index.tsx', 'utf8');
if (!c.includes('Image } from \'react-native\'') && !c.includes('Image,')) {
  c = c.replace(/import \{ View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator \} from 'react-native';/, "import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';");
}

// Replace User with imageUrl check directly
c = c.replace(/<User size=\{22\} color=\{COLORS\.primary\} \/>/g, `{prescription.patients?.users?.profileImageUrl || prescription.patients?.users?.profile_image_url ? <Image source={{ uri: prescription.patients?.users?.profileImageUrl || prescription.patients?.users?.profile_image_url }} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <User size={22} color={COLORS.primary} />}`);

fs.writeFileSync('src/app/(dashboard)/prescriptions/index.tsx', c);
console.log('Fixed prescriptions index image');
