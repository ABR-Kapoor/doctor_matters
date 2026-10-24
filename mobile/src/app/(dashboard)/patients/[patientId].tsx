import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Phone, Mail, Calendar, Activity, FileText, ArrowLeft, Pill, MapPin, ChevronLeft } from 'lucide-react-native';
import { TranslatedText } from '@/components/TranslatedText';
import { NameText } from '@/components/NameText';
import { useDoctorPatientDetails } from '@/hooks/queries/doctorQueries';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { COLORS, FONTS } from '@/constants/theme';

export default function PatientDetailScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { getToken } = useAuth();

  const { data, isLoading, isError, error } = useDoctorPatientDetails(patientId, getToken as any);

  if (isLoading) return <SafeAreaView style={styles.container} edges={['left', 'right']}><View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;

  // Without this the old `isLoading || !data` guard span forever on error.
  if (isError || !data) return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Could not load patient</Text>
        <Text style={styles.errorText}>{isError && error ? (error as Error).message : 'Please try again.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const { patient, appointments } = data;

  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    return age;
  };

  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <User size={48} color={COLORS.gray} />
          <Text style={styles.emptyText}><TranslatedText>Patient not found</TranslatedText></Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}><TranslatedText>Back to Patients</TranslatedText></Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = patient.user?.profileImageUrl || patient.user?.profile_image_url;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Navigation Header */}
        <Stack.Screen options={{ 
          title: 'Patient Profile', 
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.push('/patients');
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: 6,
              }}
            >
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginRight: 4, marginVertical: 6 }} onPress={() => router.push(`/prescriptions/new?pid=${patient.pid}`)}>
              <FileText size={18} color="#374151" />
            </TouchableOpacity>
          ) 
        }} />

        {/* Premium Profile Card */}
        <View style={styles.profileCard}>
          
          <View style={styles.profileHeaderBg} />
          <View style={styles.profileContent}>
            <View style={styles.avatarWrapper}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
              ) : (
                <User size={40} color={COLORS.text} />
              )}
            </View>
            <Text style={styles.profileName}><NameText name={patient.user.name} /></Text>
            <Text style={styles.profileSubtitle}>
              {calculateAge(patient.date_of_birth)} yrs • {patient.blood_group || 'Unknown Blood Group'}
            </Text>

            <View style={styles.contactContainer}>
              {patient.user.phone && (
                <View style={styles.contactItemRow}>
                  <Phone size={14} color={COLORS.gray} />
                  <Text style={styles.contactText}>{patient.user.phone}</Text>
                </View>
              )}
              {patient.user.email && (
                <View style={styles.contactItemRow}>
                  <Mail size={14} color={COLORS.gray} />
                  <Text style={styles.contactText} numberOfLines={1}>{patient.user.email}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Health Summary */}
        <Text style={styles.sectionTitle}><TranslatedText>Health Summary</TranslatedText></Text>
        <View style={styles.healthGrid}>
          <View style={styles.healthCard}>
            <View style={styles.healthHeaderRow}>
              <View style={[styles.healthIconBox, { backgroundColor: COLORS.tertiary }]}>
                <Activity size={14} color={COLORS.error} />
              </View>
              <Text style={styles.healthTitle}>Allergies</Text>
            </View>
            <View style={styles.tagsContainer}>
              {patient.allergies?.length > 0 ? (
                patient.allergies.map((a: string, i: number) => <Text key={i} style={[styles.tag, styles.tagRed]}>{a}</Text>)
              ) : (
                <Text style={styles.noDataText}>None recorded</Text>
              )}
            </View>
          </View>
          
          <View style={styles.healthCard}>
            <View style={styles.healthHeaderRow}>
              <View style={[styles.healthIconBox, { backgroundColor: COLORS.tertiary }]}>
                <FileText size={14} color={COLORS.text} />
              </View>
              <Text style={styles.healthTitle}>Conditions</Text>
            </View>
            <View style={styles.tagsContainer}>
              {patient.chronic_conditions?.length > 0 ? (
                patient.chronic_conditions.map((c: string, i: number) => <Text key={i} style={[styles.tag, styles.tagAmber]}>{c}</Text>)
              ) : (
                <Text style={styles.noDataText}>None recorded</Text>
              )}
            </View>
          </View>

          <View style={styles.healthCardFull}>
            <View style={styles.healthHeaderRow}>
              <View style={[styles.healthIconBox, { backgroundColor: COLORS.primaryLight || '#E5EDFF' }]}>
                <Pill size={14} color={COLORS.text} />
              </View>
              <Text style={styles.healthTitle}>Current Medications</Text>
            </View>
            <View style={styles.tagsContainer}>
              {patient.current_medications?.length > 0 ? (
                patient.current_medications.map((m: string, i: number) => <Text key={i} style={[styles.tag, styles.tagBlue]}>{m}</Text>)
              ) : (
                <Text style={styles.noDataText}>No active medications</Text>
              )}
            </View>
          </View>
        </View>

        {/* Appointment History */}
        <Text style={styles.sectionTitle}><TranslatedText>Appointment History</TranslatedText></Text>
        <View style={styles.historyCard}>
          {appointments.length === 0 ? (
            <Text style={styles.emptyText}><TranslatedText>No appointments yet</TranslatedText></Text>
          ) : (
            appointments.map((apt: any, index: number) => (
              <View key={apt.aid} style={[styles.aptRow, index !== appointments.length - 1 && styles.aptBorder]}>
                <View style={styles.aptIcon}>
                  <Calendar size={18} color={COLORS.gray} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.aptComplaint}>{apt.chief_complaint || 'Consultation'}</Text>
                  <Text style={styles.aptDate}>{new Date(apt.scheduled_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })} at {apt.scheduled_time ? apt.scheduled_time.substring(0, 5) : ''}</Text>
                </View>
                <View style={styles.aptStatus}>
                  <Text style={styles.aptStatusText}>{apt.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8 },
  errorTitle: { fontSize: 17, fontFamily: FONTS.serif,  color: COLORS.text, textAlign: 'center' },
  errorText: { fontSize: 13, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.gray, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  retryText: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 13 },
  
  navHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.black, },
  prescriptionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight || '#E5EDFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 8, justifyContent: 'center', minHeight: 48 },
  prescriptionBtnText: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 15 },
  
  profileCard: { backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', },
  profileHeaderBg: { height: 56, backgroundColor: COLORS.primaryLight || '#E5EDFF' },
  profileContent: { alignItems: 'center', width: '100%', marginTop: -40, paddingHorizontal: 16, paddingBottom: 24 },
  avatarWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.white, padding: 4, marginBottom: 16 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 36, backgroundColor: COLORS.surface },
  profileName: { fontSize: 20, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  profileSubtitle: { fontSize: 13, fontFamily: FONTS.serif,  color: COLORS.gray, marginBottom: 16 },
  
  contactItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  contactContainer: { width: '100%', marginTop: 8, gap: 6 },
  
  contactIconBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#5c85d9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  contactText: { fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, textAlign: 'center' },
  
  
  

  sectionTitle: { fontSize: 20, fontFamily: FONTS.serif,  color: COLORS.text, marginBottom: 16, marginLeft: 4 },
  
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 32 },
  healthCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, },
  healthCardFull: { width: '100%', backgroundColor: COLORS.white, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, },
  healthHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  healthIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8, marginRight: 8 },
  healthTitle: { fontSize: 14, fontFamily: FONTS.serif,  color: COLORS.text },
  
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', overflow: 'hidden' },
  tagRed: { backgroundColor: '#fef2f2', color: COLORS.error },
  tagAmber: { backgroundColor: '#fffbeb', color: '#d97706' },
  tagBlue: { backgroundColor: COLORS.primaryLight || '#E5EDFF', color: COLORS.text },
  noDataText: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, fontStyle: 'italic' },
  
  historyCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', },
  aptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  aptBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.surface },
  aptIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  aptComplaint: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },
  aptDate: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, marginTop: 4 },
  aptStatus: { backgroundColor: COLORS.primaryLight || '#E5EDFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  aptStatusText: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase' },
  
  emptyText: { color: COLORS.gray, fontFamily: FONTS.medium, fontWeight: '500', textAlign: 'center' },
  primaryBtn: { marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  primaryBtnText: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 16 },
});


