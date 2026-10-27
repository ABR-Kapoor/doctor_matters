import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image , RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, FileText, Search, User, Users, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { TranslatedText } from '@/components/TranslatedText';
import { NameText } from '@/components/NameText';
import { useDoctorIdentity, useDoctorPatients } from '@/hooks/queries/doctorQueries';
import { useRouter, Stack } from 'expo-router';
import { HeaderTitle } from '@/components/HeaderOptions';
import { useAuth } from '@clerk/expo';
import { COLORS, FONTS } from '@/constants/theme';

export default function PatientsScreen() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const { getToken, userId } = useAuth();
  const { data: identity } = useDoctorIdentity(getToken);
  const uid = identity?.uid || userId;
  const { data: patients = [], isLoading, refetch: refetchPatients } = useDoctorPatients(uid, getToken);
  const [refreshing, setRefreshing] = useState(false);

  const filteredPatients = patients.filter((p: any) =>
    p.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && !patients.length) return <SafeAreaView style={styles.container} edges={['left', 'right']}><View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={async () => {
              setRefreshing(true);
              try {
                if (refetchPatients) await refetchPatients();
              } finally {
                setRefreshing(false);
              }
            }} 
            colors={['#048256']} 
            tintColor={'#048256'} 
          />
        }>
        <Stack.Screen options={{ 
          headerTitle: () => <HeaderTitle title="All Patients" subtitle="View and manage patient records" />,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.push('/');
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
                marginVertical: 6,
              }}
            >
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
          ),
        }} />
        <View style={styles.searchCard}>
          <Search size={18} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search patients by name..." 
            value={searchTerm} 
            onChangeText={setSearchTerm} 
            placeholderTextColor={COLORS.gray}
          />
        </View>

        {filteredPatients.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color={COLORS.gray} />
            <Text style={styles.emptyText}><TranslatedText>{searchTerm ? 'No patients found' : 'No patients yet'}</TranslatedText></Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredPatients.map((patient: any) => {
              const adherenceColor = patient.adherenceRate >= 80 ? COLORS.successText : patient.adherenceRate >= 60 ? COLORS.notesText : COLORS.error;
              const adherenceBg = patient.adherenceRate >= 80 ? COLORS.successBg : patient.adherenceRate >= 60 ? COLORS.notes : '#FEF2F2';

              const imageUrl = patient.user?.profileImageUrl || patient.user?.profile_image_url;
                return (
                <TouchableOpacity 
                  key={patient.pid} 
                  style={styles.card}
                  onPress={() => router.push(`/patients/${patient.pid}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      {imageUrl ? <Image source={{ uri: imageUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <User size={22} color={COLORS.primary} />}
                    </View>
                    <View style={styles.cardInfo}>
                      <NameText name={patient.user.name} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                        {patient.user.email ? <Text style={[styles.timeText, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{patient.user.email}</Text> : null}
                        {patient.user.email && patient.user.phone ? <Text style={{ color: '#cbd5e1', fontSize: 12, marginHorizontal: 4 }}>•</Text> : null}
                        {patient.user.phone ? <Text style={[styles.timeText, { flexShrink: 0 }]} numberOfLines={1}>{patient.user.phone}</Text> : null}
                      </View>
                    </View>
                    <ChevronRight size={20} color="#cbd5e1" />
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: adherenceBg, alignSelf: 'flex-start', marginTop: 2 }]}>
                    <Text style={[styles.statusText, { color: adherenceColor }]}><TranslatedText>{Math.round(patient.adherenceRate || 0)}% Adherence</TranslatedText></Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.serif, 
    color: COLORS.text,
  },
  titleHighlight: {
    color: COLORS.primary,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.serif, 
    color: COLORS.gray,
    marginTop: 4,
  },
  searchCard: { backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 16, height: 52, flexDirection: 'row', alignItems: 'center', marginBottom: 16, shadowColor: COLORS.black, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: '100%', color: COLORS.text, fontSize: 14.5, fontFamily: FONTS.regular, fontWeight: '400', paddingVertical: 0, paddingHorizontal: 0, textAlignVertical: 'center' },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.text,
    fontFamily: FONTS.medium, fontWeight: '500',
  },
  list: {
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.gray,
    fontFamily: FONTS.medium, fontWeight: '500',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bold, fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
  },
  complaintBox: {
    backgroundColor: COLORS.surface,
    padding: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  complaintLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold, fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  complaintText: {
    fontSize: 14,
    fontFamily: FONTS.regular, fontWeight: '400',
    color: COLORS.text,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    gap: 6, minHeight: 48 },
  primaryBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.bold, fontWeight: '700',
    fontSize: 14,
  },
});
