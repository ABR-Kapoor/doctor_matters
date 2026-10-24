import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { TranslatedText } from './TranslatedText';
import { COLORS, FONTS } from '@/constants/theme';

export function MiniCalendar({ appointments }: { appointments: any[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Set of days in currently viewed month that have a confirmed/in_progress appointment
  const confirmedDays = React.useMemo(() => {
    const daysSet = new Set<number>();
    if (!Array.isArray(appointments)) return daysSet;

    appointments.forEach((apt) => {
      const status = String(apt?.status || '').toLowerCase();
      // Only confirmed or in_progress consultations
      if (status !== 'confirmed' && status !== 'in_progress') return;

      const dateStr = String(apt?.scheduled_date ?? apt?.scheduledDate ?? apt?.date ?? '').slice(0, 10);
      if (!dateStr || !dateStr.includes('-')) return;

      const [y, m, d] = dateStr.split('-').map(Number);
      // Note: JavaScript month is 0-indexed (m - 1)
      if (y === year && m - 1 === month && d >= 1 && d <= daysInMonth) {
        daysSet.add(d);
      }
    });

    return daysSet;
  }, [appointments, year, month, daysInMonth]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{monthName} {year}</Text>
        <View style={styles.nav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <ChevronLeft size={16} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <ChevronRight size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.subtitle}><TranslatedText>Calendar Overview</TranslatedText></Text>

      <View style={styles.daysRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={styles.cell} />;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const hasConfirmedApt = confirmedDays.has(day);

          return (
            <View key={i} style={styles.cell}>
              <View style={[styles.innerCell, isToday && styles.todayCell]}>
                <Text style={[styles.dayText, isToday && styles.todayText]}>{day}</Text>
                {hasConfirmedApt && (
                  <View style={[styles.appointmentDot, isToday && styles.todayAppointmentDot]} />
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.serif, 
    color: COLORS.text,
  },
  nav: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary || '#EEF3FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: COLORS.gray,
    fontFamily: FONTS.serif, 
    marginBottom: 16,
    fontSize: 14,
  },
  daysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FONTS.bold, fontWeight: '700',
    color: COLORS.gray,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayCell: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: 13,
    fontFamily: FONTS.medium, fontWeight: '500',
    color: COLORS.text,
  },
  todayText: {
    color: COLORS.white,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  appointmentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary || '#5c85d9',
    position: 'absolute',
    bottom: 3,
  },
  todayAppointmentDot: {
    backgroundColor: COLORS.white,
  },
});
