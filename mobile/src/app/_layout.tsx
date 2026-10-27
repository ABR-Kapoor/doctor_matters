import { configureDoseNotifications } from '@/lib/doseNotifications';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/lib/LanguageContext';
import { NotificationProvider } from '@/lib/NotificationContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

function RootLayoutNav() {
  useEffect(() => {
    configureDoseNotifications().catch(() => {});
  }, []);

  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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

  if (!fontsLoaded) return null;

if (!publishableKey) {
    return (
      <SafeAreaProvider>
        <ErrorBoundary>
          <NotificationProvider>
            <LanguageProvider>
              <Slot />
            </LanguageProvider>
          </NotificationProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <ClerkLoaded>
              <NotificationProvider>
                <LanguageProvider>
                  <RootLayoutNav />
                </LanguageProvider>
              </NotificationProvider>
            </ClerkLoaded>
          </ClerkProvider>
        </QueryClientProvider>
        <Toast topOffset={220} />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
