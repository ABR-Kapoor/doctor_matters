import React from 'react';
import { TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { View, Text } from 'react-native';
import { COLORS, FONTS } from '@/constants/theme';

export const HeaderTitle = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginVertical: 6 }}>
    <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: '#111827' }}>{title}</Text>
    {subtitle ? (
      <Text style={{ fontSize: 12, fontFamily: FONTS.medium, color: '#6B7280', marginTop: 1 }}>{subtitle}</Text>
    ) : null}
  </View>
);

export const getHeaderOptions = (router: any) => ({
  headerShadowVisible: false,
  headerTitleAlign: 'center' as const,
  headerTitleStyle: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
  },
  headerStyle: {
    backgroundColor: '#fff',
    height: 80,
  },
  headerLeft: (props: any) => (
    <TouchableOpacity
      onPress={() => {
        if (props?.canGoBack) {
          router.back();
        } else {
          router.push('/');
        }
      }}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 18,
        marginVertical: 6,
      }}
    >
      <ChevronLeft size={20} color="#374151" />
    </TouchableOpacity>
  ),
});
