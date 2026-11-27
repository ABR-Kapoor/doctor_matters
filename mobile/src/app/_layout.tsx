import '@/lib/cryptoPolyfill';
import { configureDoseNotifications, subscribeToDoseNotificationTaps } from '@/lib/doseNotifications';
import { registerPushNotifications, subscribeToPushTokenChanges } from '@/lib/pushNotifications';
import { toMobileNotificationHref } from '@/lib/notificationRoute';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/lib/LanguageContext';
import { NotificationProvider } from '@/lib/NotificationContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CallProvider } from '@/components/CallProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Do not retry 401, 403, or ROLE_MISMATCH errors
        if (error?.status === 401 || error?.status === 403 || error?.code === 'ROLE_MISMATCH') {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

SplashScreen.setOptions({ duration: 0, fade: false });

function RootLayoutNav() {
  useEffect(() => {
    configureDoseNotifications().catch(() => {});
  }, []);

  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void registerPushNotifications(getToken);
    return subscribeToPushTokenChanges(getToken);
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    return subscribeToDoseNotificationTaps((url, data) => {
      const href = toMobileNotificationHref(url, data);
      if (href) router.push(href as any);
    });
  }, [router]);

  useEffect(() => {
    if (!isLoaded) return;
    const seg = segments[0];
    const inDashboard = seg === '(dashboard)';
    // Signed-in users may only be parked on the auth/landing screens — redirect
    // them into the app from there. Every other top-level route (video-call,
    // admin/verify, ...) is a legitimate destination and must NOT be bounced
    // back to the dashboard the moment it mounts: doing that is what made
    // "Join Video Call" instantly return to the schedule with a different tab.
    const onAuthScreen = !seg || seg === 'sign-in' || seg === 'sign-up' || seg === 'explore';
    if (isSignedIn && onAuthScreen) {
      router.replace('/(dashboard)');
    } else if (!isSignedIn && (inDashboard || (seg === 'video-call' || seg === 'chat'))) {
      router.replace('/sign-in');
    }
  }, [isSignedIn, isLoaded, segments]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f7f3' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#f6f7f3' }} />;

  if (!publishableKey) {
    // Clerk publishable key is missing — this happens when the app is built
    // without EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY baked in (e.g. a production
    // EAS build where the secret was not set). Show a clear error rather than
    // rendering <Slot /> which would call useAuth() outside <ClerkProvider>
    // and crash with an opaque "useAuth can only be used within ClerkProvider" error.
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f7f3', padding: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>
            Configuration Error
          </Text>
          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 }}>
            Missing Clerk publishable key (EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY).{'\n\n'}
            Add this key to your EAS build secrets and rebuild the app.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <ClerkLoaded>
              <NotificationProvider>
                <LanguageProvider>
                  <CallProvider>
                    <RootLayoutNav />
                  </CallProvider>
                </LanguageProvider>
              </NotificationProvider>
            </ClerkLoaded>
          </ClerkProvider>
        </QueryClientProvider>
        <Toast topOffset={50} />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
