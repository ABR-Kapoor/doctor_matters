const fs = require('fs');
const path = require('path');

const doctorAppPath = 'd:\\aurasutra-mobile\\aurasutra-doctor';
const patientAppPath = 'd:\\aurasutra-mobile\\aurasutra-patient';

function fixForgotPassword(appPath) {
  const p = path.join(appPath, 'src/app/forgot-password.tsx');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // 1. Add ImageBackground to imports
    if (!c.includes('ImageBackground')) {
      c = c.replace(/import \{ View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, Image, useColorScheme \} from 'react-native';/, "import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, Image, ImageBackground, useColorScheme } from 'react-native';");
    }

    // 2. Wrap SafeAreaView in ImageBackground
    if (!c.includes('require(\'../../assets/images/auth_bg.jpg\')')) {
      c = c.replace(/<SafeAreaView style=\{styles\.container\}>/, "<ImageBackground source={require('../../assets/images/auth_bg.jpg')} style={styles.container} resizeMode=\"cover\">\n      <SafeAreaView style={{ flex: 1 }}>");
      c = c.replace(/<\/SafeAreaView>\n  \);/, "</SafeAreaView>\n    </ImageBackground>\n  );");
    }

    // 3. Fix Logo Size
    if (c.includes('width: 200, height: 54')) {
      c = c.replace(/width: 200, height: 54/, 'width: 290, height: 78');
    }

    // 4. Remove background colors to let auth_bg show through
    if (c.includes("backgroundColor: '#f9fafb'")) {
      c = c.replace(/backgroundColor: '#f9fafb'/, "/* backgroundColor: '#f9fafb' */");
    }
    
    // In header backButton, make it slightly transparent or match design
    // It has backgroundColor: '#fff', maybe we can keep it as is, or remove background
    
    fs.writeFileSync(p, c);
    console.log(`Updated forgot-password.tsx in ${appPath}`);
  }
}

fixForgotPassword(doctorAppPath);
fixForgotPassword(patientAppPath);
