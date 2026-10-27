const fs = require('fs');
const path = require('path');

const doctorAppPath = 'd:\\aurasutra-mobile\\aurasutra-doctor';
const patientAppPath = 'd:\\aurasutra-mobile\\aurasutra-patient';

function addForgotPasswordBtn(appPath) {
  const signInPath = path.join(appPath, 'src/app/sign-in.tsx');
  if (fs.existsSync(signInPath)) {
    let c = fs.readFileSync(signInPath, 'utf8');

    // Make sure we haven't already added it
    if (!c.includes('Forgot Password?')) {
      // Find the end of the password input container
      const passEndStr = `secureTextEntry={true}\n            onChangeText={(password) => setPassword(password)}\n            style={styles.input}\n            placeholderTextColor="#9ca3af"\n          />\n        </View>`;
      
      const btnCode = `\n\n        <TouchableOpacity \n          style={{ alignSelf: 'flex-end', marginBottom: 16 }}\n          onPress={() => router.push('/forgot-password')}\n        >\n          <Text style={{ color: COLORS.primary || '#2563eb', fontFamily: FONTS.medium, fontSize: 14 }}>Forgot Password?</Text>\n        </TouchableOpacity>`;

      // If exact string not found, try a generic regex
      const passRegex = /<View style=\{styles\.inputContainer\}>\s*<TextInput[^>]*secureTextEntry[^>]*\/>\s*<\/View>/m;
      
      if (c.includes(passEndStr)) {
        c = c.replace(passEndStr, passEndStr + btnCode);
      } else {
        // Fallback regex approach
        c = c.replace(passRegex, match => match + btnCode);
      }
      
      fs.writeFileSync(signInPath, c);
      console.log(`Added forgot password button in ${appPath}`);
    } else {
      console.log(`Already exists in ${appPath}`);
    }
  } else {
    console.log(`sign-in.tsx not found in ${appPath}`);
  }
}

addForgotPasswordBtn(doctorAppPath);
addForgotPasswordBtn(patientAppPath);

// Also create a dummy forgot-password screen so it doesn't crash when clicked
const forgotPasswordCode = `import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Please contact support to reset your password.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  button: { padding: 12, backgroundColor: '#000', borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});
`;

fs.writeFileSync(path.join(doctorAppPath, 'src/app/forgot-password.tsx'), forgotPasswordCode);
fs.writeFileSync(path.join(patientAppPath, 'src/app/forgot-password.tsx'), forgotPasswordCode);
