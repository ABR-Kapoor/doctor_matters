import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, Users, Calendar, Pill, Banknote } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const totalUnread = React.useMemo(() => {
    try {
      const matches = queryClient.getQueriesData<any>({ queryKey: ['doctorAppointments'] });
      let count = 0;
      const seen = new Set();
      for (const [, data] of matches) {
        if (!data) continue;
        const list = [...(data.confirmed || []), ...(data.today || []), ...(data.pending || [])];
        for (const apt of list) {
          const id = apt?.aid ?? apt?.id ?? apt?._id;
          if (id && !seen.has(id)) {
            seen.add(id);
            count += Number(apt.unread_messages_count || apt.unreadMessagesCount || 0);
          }
        }
      }
      return count;
    } catch {
      return 0;
    }
  }, [queryClient, pathname]);

  // Hide on certain screens
  if (pathname.includes('video-call') || pathname.includes('book-appointment')) {
    return null;
  }

  const isHomeActive = pathname === '/' || pathname === '/(dashboard)' || pathname === '';

  const navigateTo = (path: string) => {
    if (pathname !== path) {
      router.push(path as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.navBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {/* 1. Home */}
        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('/')}>
          <Home size={24} color={isHomeActive ? COLORS.primary : COLORS.gray} />
          <Text style={[styles.navText, isHomeActive && styles.activeText]}>Home</Text>
        </TouchableOpacity>

        {/* 2. Patients */}
        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('/patients')}>
          <Users size={24} color={pathname.startsWith('/patients') ? COLORS.primary : COLORS.gray} />
          <Text style={[styles.navText, pathname.startsWith('/patients') && styles.activeText]}>Patients</Text>
        </TouchableOpacity>

        {/* 3. Center Space for Appointment button */}
        <View style={styles.centerSpace} pointerEvents="none" />

        {/* 4. Rx (Prescriptions) */}
        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('/prescriptions')}>
          <Pill size={24} color={pathname.startsWith('/prescriptions') ? COLORS.primary : COLORS.gray} />
          <Text style={[styles.navText, pathname.startsWith('/prescriptions') && styles.activeText]}>Rx</Text>
        </TouchableOpacity>

        {/* 5. Finance */}
        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('/finance')}>
          <Banknote size={24} color={pathname.startsWith('/finance') ? COLORS.primary : COLORS.gray} />
          <Text style={[styles.navText, pathname.startsWith('/finance') && styles.activeText]}>Finance</Text>
        </TouchableOpacity>
      </View>
      
      {/* 3. Center Floating Appointment Button */}
      <View style={styles.centerButtonOuter}>
        <TouchableOpacity 
          style={styles.centerButton} 
          onPress={() => navigateTo('/')}
          accessibilityLabel="Appointments"
          activeOpacity={0.85}
        >
          <Calendar size={26} color={COLORS.white} />
          {totalUnread > 0 && (
            <View style={styles.centerBadge}>
              <Text style={styles.centerBadgeText}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  navBar: {
    flexDirection: 'row',
    minHeight: 74,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navText: {
    fontSize: 11.5,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    color: COLORS.gray,
    marginTop: 3,
  },
  activeText: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  centerSpace: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  centerButtonOuter: {
    position: 'absolute',
    top: -24, 
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.white, 
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  centerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
