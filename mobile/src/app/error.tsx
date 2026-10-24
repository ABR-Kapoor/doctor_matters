import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, Home, RefreshCw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '@/constants/theme';
import { TranslatedText } from '@/components/TranslatedText';

export default function ErrorPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <AlertCircle size={44} color="#EF4444" />
        </View>

        <Text style={styles.title}>
          <TranslatedText>Something went wrong</TranslatedText>
        </Text>

        <Text style={styles.message}>
          <TranslatedText>
            An unexpected error occurred while loading this page. You can try reloading or return to your dashboard.
          </TranslatedText>
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace('/(dashboard)')}
            activeOpacity={0.8}
          >
            <RefreshCw size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>
              <TranslatedText>Reload Dashboard</TranslatedText>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Home size={18} color={COLORS.text} style={{ marginRight: 8 }} />
            <Text style={styles.homeButtonText}>
              <TranslatedText>Go to Home</TranslatedText>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14.5,
    fontFamily: FONTS.regular,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 28,
  },
  actions: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 15,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  homeButtonText: {
    color: '#0F172A',
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 15,
  },
});
