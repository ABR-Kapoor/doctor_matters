import { COLORS, FONTS } from '../constants/theme';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, ImageBackground, useColorScheme, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClerk } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { fetchWithAuth } from '../lib/fetchWithAuth';

type SignInResource = NonNullable<ReturnType<typeof useClerk>['client']['signIn']>;

const describeError = (err: unknown): string => {
  if (!err) return 'Something went wrong. Please try again.';
  const e = err as { errors?: { message?: string }[]; longMessage?: string; message?: string };
  return e.errors?.[0]?.message || e.longMessage || e.message || String(err);
};

export default function SignInScreen() {
  const clerk = useClerk();
  const router = useRouter();
  const colorScheme = useColorScheme();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [needsTrustCode, setNeedsTrustCode] = useState(false);
  const [trustCode, setTrustCode] = useState('');
  const [isSecondFactor, setIsSecondFactor] = useState(false);

  const activateSession = async (signIn: SignInResource) => {
    if (signIn.status !== 'complete' || !signIn.createdSessionId) {
      throw new Error(`Verification did not complete. Status: ${signIn.status}`);
    }
    await clerk.setActive({ session: signIn.createdSessionId });

    // Wait for the session to be active and retrieve a fresh JWT token
    let token = await clerk.session?.getToken();
    if (!token) {
      // Small pause if session token takes a moment to be available after setActive
      await new Promise((resolve) => setTimeout(resolve, 300));
      token = await clerk.session?.getToken();
    }

    try {
      const res = await fetchWithAuth('/api/sync-user', token);
      if (res.status === 403) {
        await clerk.signOut();
        throw new Error('This account is registered as a patient. Please use the patient app to sign in.');
      }
    } catch (syncErr: any) {
      if (syncErr?.message?.includes('patient')) {
        throw syncErr;
      }
      console.warn('[sign-in] sync-user non-fatal warning:', syncErr?.message || syncErr);
    }

    router.replace('/(dashboard)');
  };

  const onVerifyTrustPress = async () => {
    const signIn = clerk.client.signIn;
    if (!signIn) return;

    const code = trustCode.trim();
    if (!code) {
      setErrorMessage('Enter the verification code sent to your email.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const verified = isSecondFactor
        ? await signIn.attemptSecondFactor({ strategy: 'email_code', code })
        : await signIn.attemptFirstFactor({ strategy: 'email_code', code });
      await activateSession(verified ?? signIn);
    } catch (err: unknown) {
      const msg = describeError(err);
      console.error('[sign-in] verification failed:', msg, err);
      setErrorMessage(msg);
      Alert.alert('Verification Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const onBackToSignIn = async () => {
    setNeedsTrustCode(false);
    setIsSecondFactor(false);
    setTrustCode('');
    setErrorMessage('');
  };

  const onSignInPress = async () => {
    const signIn = clerk.client.signIn;
    if (!signIn) {
      Alert.alert('Loading Error', 'Clerk client not fully loaded. Try restarting the app.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setNeedsTrustCode(false);
    setIsSecondFactor(false);
    setTrustCode('');

    try {
      const attempt = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      if (attempt.status === 'complete') {
        await activateSession(attempt);
        return;
      }

      // Device trust is always satisfied by a SECOND factor email code. `supportedSecondFactors`
      // can be empty here, so `signIn.status` is the only reliable signal.
      if (attempt.status === 'needs_client_trust' || attempt.status === 'needs_second_factor') {
        const factor = attempt.supportedSecondFactors?.find((f) => f.strategy === 'email_code');
        await attempt.prepareSecondFactor({
          strategy: 'email_code',
          emailAddressId: factor && 'emailAddressId' in factor ? factor.emailAddressId : undefined,
        });
        setIsSecondFactor(true);
        setNeedsTrustCode(true);
        return;
      }

      if (attempt.status === 'needs_first_factor') {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === 'email_code');
        if (!factor || !('emailAddressId' in factor)) {
          throw new Error('Email code sign-in is not enabled for this account.');
        }
        await attempt.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
        setIsSecondFactor(false);
        setNeedsTrustCode(true);
        return;
      }

      throw new Error(`Sign in could not be completed. Status: ${attempt.status}`);
    } catch (err: unknown) {
      const msg = describeError(err);
      console.error('[sign-in] sign in failed:', msg, err);
      setErrorMessage(msg);
      Alert.alert('Sign In Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (needsTrustCode) {
    return (
      <ImageBackground source={require('../../assets/images/auth_bg.jpg')} style={styles.container} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>

        <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={{ position: 'relative' }}>
            <Image 
              source={colorScheme === 'dark' ? require('../../assets/images/AuraSutra-Full-WhiteText-Transparent.png') : require('../../assets/images/AuraSutra-Full_BlackText-Transparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={{ position: 'absolute', bottom: -10, right: 10, fontSize: 32, color: COLORS.text, fontStyle: 'italic', fontFamily: 'DMSans_700Bold' }}>
              Sarthi
            </Text>
          </View>
        </View>
          <Text style={styles.title}>Device Verification</Text>
          <Text style={styles.subtitle}>A verification code has been sent to your email address. Please enter it below to continue.</Text>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.inputContainer}>
            <TextInput
              value={trustCode}
              placeholder="Enter verification code..."
              onChangeText={setTrustCode}
              style={styles.input}
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
            />
          </View>

          <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={onVerifyTrustPress} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Code</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.linkButton} onPress={onBackToSignIn}>
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      
      </SafeAreaView>
    </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/auth_bg.jpg')} style={styles.container} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={{ position: 'relative' }}>
            <Image 
              source={colorScheme === 'dark' ? require('../../assets/images/AuraSutra-Full-WhiteText-Transparent.png') : require('../../assets/images/AuraSutra-Full_BlackText-Transparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={{ position: 'absolute', bottom: -10, right: 10, fontSize: 32, color: COLORS.text, fontStyle: 'italic', fontFamily: 'DMSans_700Bold' }}>
              Sarthi
            </Text>
          </View>
        </View>
        <Text style={styles.title}>Join as Sarthi</Text>
        <Text style={styles.subtitle}>Log in to manage your practice and connect with patients.</Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.inputContainer}>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Email..."
            onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
            style={styles.input}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            value={password}
            placeholder="Password..."
            secureTextEntry={true}
            onChangeText={(password) => setPassword(password)}
            style={styles.input}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <TouchableOpacity 
          style={{ alignSelf: 'flex-end', marginBottom: 16 }}
          onPress={() => router.push('/forgot-password')}
        >
          <Text style={{ color: '#64748b', fontFamily: FONTS.medium, fontSize: 14 }}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.7 }]} 
          onPress={onSignInPress} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton} 
          onPress={() => router.push('/sign-up')} 
        >
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text></Text>
        </TouchableOpacity>
        
        {/* Required for sign-in flows on Expo web. Clerk skips the browser CAPTCHA on iOS and Android */}
        <View nativeID="clerk-captcha" />
      </View>
    
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  logoContainer: { alignItems: 'center', marginBottom: 24, marginTop: -20 },
  logo: { width: 290, height: 78 },
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center' },
  title: { fontSize: 28, fontFamily: FONTS.serif,  color: COLORS.text, marginBottom: 0, textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.gray, marginBottom: 40, textAlign: 'center', lineHeight: 22 },
  errorText: { color: COLORS.tertiary, marginBottom: 16, textAlign: 'center', fontFamily: FONTS.medium, fontWeight: '500' },
  verifyText: { color: COLORS.text, marginBottom: 24, textAlign: 'center', lineHeight: 22, fontFamily: FONTS.regular, fontWeight: '400' },
  inputContainer: { 
    backgroundColor: COLORS.white, 
    borderRadius: 12, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.text },
  button: {
    backgroundColor: COLORS.text,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 16, paddingHorizontal: 16, minHeight: 48 },
  buttonText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700' , },
  linkButton: { marginTop: 32, alignItems: 'center' , },
  linkText: { color: COLORS.gray, fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500' },
  linkTextBold: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700' },
});



