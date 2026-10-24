const fs = require('fs');
const path = require('path');

const doctorAppPath = 'd:\\aurasutra-mobile\\aurasutra-doctor';
const patientAppPath = 'd:\\aurasutra-mobile\\aurasutra-patient';

const clerkForgotPasswordCode = `import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSignIn } from '@clerk/expo';
import { ChevronLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Request a password reset code by email
  const onRequestReset = async () => {
    if (!isLoaded) return;
    if (!emailAddress) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: emailAddress,
      });
      setSuccessfulCreation(true);
    } catch (err: any) {
      console.error(err);
      setError(err.errors?.[0]?.longMessage || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset the password with the code and the new password
  const onReset = async () => {
    if (!isLoaded) return;
    if (!code || !password) {
      setError('Please enter both the reset code and a new password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        // Set the active session
        await setActive({ session: result.createdSessionId });
        router.replace('/(dashboard)');
      } else {
        console.log(result);
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.errors?.[0]?.longMessage || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {!successfulCreation 
            ? "Enter your email address and we'll send you a verification code to reset your password."
            : "Enter the verification code sent to your email along with your new password."}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!successfulCreation ? (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Email Address"
                placeholderTextColor="#9ca3af"
                onChangeText={setEmailAddress}
                style={styles.input}
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && { opacity: 0.7 }]} 
              onPress={onRequestReset}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                value={code}
                placeholder="Verification Code"
                placeholderTextColor="#9ca3af"
                onChangeText={setCode}
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                value={password}
                placeholder="New Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                onChangeText={setPassword}
                style={styles.input}
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && { opacity: 0.7 }]} 
              onPress={onReset}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingTop: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  content: { flex: 1, padding: 32, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  inputContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111827' },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
`;

fs.writeFileSync(path.join(doctorAppPath, 'src/app/forgot-password.tsx'), clerkForgotPasswordCode);
fs.writeFileSync(path.join(patientAppPath, 'src/app/forgot-password.tsx'), clerkForgotPasswordCode);
console.log('Successfully updated forgot-password.tsx for both apps');
