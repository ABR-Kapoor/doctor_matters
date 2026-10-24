const fs = require('fs');
const path = require('path');

const doctorAppPath = 'd:\\aurasutra-mobile\\aurasutra-doctor';
const patientAppPath = 'd:\\aurasutra-mobile\\aurasutra-patient';

function addLogoToForgotPass(appPath) {
  const p = path.join(appPath, 'src/app/forgot-password.tsx');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Import Image and useColorScheme
    if (!c.includes('Image,')) {
      c = c.replace(/import \{ View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView \} from 'react-native';/, "import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, Image, useColorScheme } from 'react-native';");
    }

    // Add useColorScheme inside the component
    if (!c.includes('const colorScheme = useColorScheme();')) {
      c = c.replace(/const router = useRouter\(\);/, "const router = useRouter();\n  const colorScheme = useColorScheme();");
    }

    // Add the logo Image inside the content view
    const oldTitle = `<Text style={styles.title}>Reset Password</Text>`;
    const newTitle = `<View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Image 
            source={colorScheme === 'dark' ? require('../../assets/images/AuraSutra-Full-WhiteText-Transparent.png') : require('../../assets/images/AuraSutra-Full_BlackText-Transparent.png')}
            style={{ width: 200, height: 54 }}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Reset Password</Text>`;
    
    if (!c.includes("require('../../assets/images/AuraSutra-Full")) {
      c = c.replace(oldTitle, newTitle);
      fs.writeFileSync(p, c);
      console.log(`Added logo to ${appPath}`);
    }
  }
}

addLogoToForgotPass(doctorAppPath);
addLogoToForgotPass(patientAppPath);
