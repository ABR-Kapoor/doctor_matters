import BottomNav from '@/components/BottomNav';
import { Tabs, useRouter } from 'expo-router';
import { Home, Calendar, Users, Pill, Banknote, User, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, TouchableOpacity } from 'react-native';
import { COLORS, FONTS } from '@/constants/theme';
import { getHeaderOptions, HeaderTitle } from '@/components/HeaderOptions';


export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Calculate padding based on platform and safe area
  const paddingBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 12) : insets.bottom;
  const height = 65 + paddingBottom;

  return (
    <>
    <Tabs 
      screenOptions={{
        ...getHeaderOptions(router),
        headerShown: true,
        tabBarActiveTintColor: COLORS.primary, // Text color when active
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { 
          display: 'none',
          },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: 'bold',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Home color={focused ? COLORS.primary : color} size={size - 2} strokeWidth={focused ? 3 : 2} />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Users color={focused ? COLORS.primary : color} size={size - 2} strokeWidth={focused ? 3 : 2} />
          ),
          tabBarLabel: 'Patients',
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{
          title: 'Rx',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Pill color={focused ? COLORS.primary : color} size={size - 2} strokeWidth={focused ? 3 : 2} />
          ),
          tabBarLabel: 'Rx',
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Finance',
          headerTitle: () => <HeaderTitle title="Finance" subtitle="Your Earnings & Payouts" />,
          tabBarIcon: ({ color, size, focused }) => (
            <Banknote color={focused ? COLORS.primary : color} size={size - 2} strokeWidth={focused ? 3 : 2} />
          ),
          tabBarLabel: 'Finance',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: () => <HeaderTitle title="Profile" subtitle="Manage your account" />,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginLeft: 14, marginVertical: 6 }}>
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <User color={focused ? COLORS.primary : color} size={size - 2} strokeWidth={focused ? 3 : 2} />
          ),
          tabBarLabel: 'Profile',
        }}
      />
      {/* Hide internal routes from tabs */}
      <Tabs.Screen 
        name="notifications" 
        options={{ 
          href: null, 
          title: 'Notifications',
          headerTitleAlign: 'center',
          headerRight: () => null,
        }} 
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
      <BottomNav />
    </>
  );
}
