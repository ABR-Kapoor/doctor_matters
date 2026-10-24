import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill, Plus, X, ArrowLeft, Save, FileText, ChevronLeft } from 'lucide-react-native';
import { MarkdownText } from '@/components/MarkdownText';
import { TranslatedText } from '@/components/TranslatedText';
import { useDoctorPrescription } from '@/hooks/queries/doctorQueries';
import { useUpdatePrescription } from '@/hooks/mutations/doctorMutations';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { globalShowToast as showToast } from '@/lib/NotificationContext';
const Toast = { show: (opts: any) => { showToast && showToast(opts.text1, opts.text2, opts.type || 'info'); } };
import { COLORS, FONTS } from '@/constants/theme';

const MEDICINE_SYSTEMS = [
  { key: 'homeopathy', label: 'Homeopathy' },
  { key: 'allopathy', label: 'Allopathy' },
  { key: 'ayurvedic', label: 'Ayurvedic' },
] as const;

type MedicineSystem = (typeof MEDICINE_SYSTEMS)[number]['key'];

export default function EditPrescriptionScreen() {
  const router = useRouter();
  const { prescriptionId } = useLocalSearchParams<{ prescriptionId: string }>();
  const { getToken } = useAuth();

  const [saving, setSaving] = useState(false);
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [isEditingDiet, setIsEditingDiet] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [instructions, setInstructions] = useState('');
  const [dietAdvice, setDietAdvice] = useState('');
  const [medicineSystem, setMedicineSystem] = useState<MedicineSystem>('allopathy');

  const { data: prescription, isLoading, isError, error } = useDoctorPrescription(prescriptionId, getToken as any);
  const updateMutation = useUpdatePrescription();

  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  // Seed the form once per prescription during render rather than in an effect, so
  // the inputs are populated on first paint instead of flashing empty then filling.
  if (prescription && hydratedFor !== prescription.prescription_id) {
    setHydratedFor(prescription.prescription_id);
    setDiagnosis(prescription.diagnosis || '');
    setSymptoms(prescription.symptoms?.join(', ') || '');
    setMedicines(prescription.medicines?.length > 0 ? prescription.medicines : [{ name: '', dosage: '', frequency: '', duration: '' }]);
    setInstructions(prescription.instructions || '');
    setDietAdvice(prescription.diet_advice || '');
    setMedicineSystem((prescription.medicine_system as MedicineSystem) || 'allopathy');
  }

  const addMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: string, value: string) => {
    const updated = [...medicines];
    (updated[index] as any)[field] = value;
    setMedicines(updated);
  };

  const handleSubmit = async () => {
    if (!diagnosis || medicines.some(m => !m.name || !m.dosage)) {
      Toast.show({ type: 'error', text1: 'Please fill diagnosis and medicines' });
      return;
    }

    setSaving(true);
    try {
      await updateMutation.mutateAsync({ 
        id: prescriptionId,
        data: { diagnosis, symptoms, medicines, instructions, diet_advice: dietAdvice, medicine_system: medicineSystem }, 
        token: getToken as any 
      });
      Toast.show({ type: 'success', text1: 'Prescription updated' });
      router.back();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update prescription' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <SafeAreaView style={styles.container} edges={['left', 'right']}><View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;

  if (!prescription) return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.center}>
        <Text style={styles.subtitle}><TranslatedText>Prescription not found or unavailable</TranslatedText>{isError && error ? `: ${(error as Error).message}` : ''}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={COLORS.text} style={{ marginRight: 8 }} />
          <Text style={styles.backText}><TranslatedText>Back</TranslatedText></Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );


  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Stack.Screen options={{ 
        title: 'Edit Prescription', 
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.push('/prescriptions');
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 18,
            }}
          >
            <ChevronLeft size={20} color="#374151" />
          </TouchableOpacity>
        ),
      }} />
      <ScrollView contentContainerStyle={styles.content}>
        
        

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}><Save size={20} color={COLORS.text} /></View>
            <Text style={styles.cardTitle}><TranslatedText>Diagnosis & Symptoms</TranslatedText></Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Diagnosis *</Text>
            <TextInput style={styles.input} value={diagnosis} onChangeText={setDiagnosis} placeholderTextColor={COLORS.gray} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Symptoms</Text>
            <TextInput style={styles.input} value={symptoms} onChangeText={setSymptoms} placeholderTextColor={COLORS.gray} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}><TranslatedText>Medicine System</TranslatedText></Text>
            <View style={styles.systemToggle}>
              {MEDICINE_SYSTEMS.map((system) => (
                <TouchableOpacity
                  key={system.key}
                  style={[styles.systemChip, medicineSystem === system.key && styles.systemChipActive]}
                  onPress={() => setMedicineSystem(system.key)}
                >
                  <Text style={[styles.systemChipText, medicineSystem === system.key && styles.systemChipTextActive]}>
                    {system.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.iconBox}><Pill size={20} color={COLORS.text} /></View>
              <Text style={styles.cardTitle}><TranslatedText>Medicines</TranslatedText></Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={addMedicine}>
              <Plus size={14} color={COLORS.text} /><Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {medicines.map((medicine, index) => (
            <View key={index} style={styles.medicineBox}>
              {medicines.length > 1 && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedicine(index)}>
                  <X size={16} color={COLORS.error} />
                </TouchableOpacity>
              )}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Medicine Name *</Text>
                <TextInput style={styles.input} value={medicine.name} onChangeText={(t) => updateMedicine(index, 'name', t)} placeholderTextColor={COLORS.gray} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dosage *</Text>
                <TextInput style={styles.input} value={medicine.dosage} onChangeText={(t) => updateMedicine(index, 'dosage', t)} placeholderTextColor={COLORS.gray} />
              </View>
              <View style={styles.rowGrid}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Frequency *</Text>
                  <TextInput style={styles.input} value={medicine.frequency} onChangeText={(t) => updateMedicine(index, 'frequency', t)} placeholderTextColor={COLORS.gray} />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Duration *</Text>
                  <TextInput style={styles.input} value={medicine.duration} onChangeText={(t) => updateMedicine(index, 'duration', t)} placeholderTextColor={COLORS.gray} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
             <View style={styles.iconBox}><FileText size={20} color={COLORS.text} /></View>
             <Text style={styles.cardTitle}><TranslatedText>Additional Instructions</TranslatedText></Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Instructions</Text>
            {(!instructions || isEditingInstructions) ? (
              <TextInput style={[styles.input, { minHeight: 160 }]} multiline scrollEnabled={false} value={instructions} onChangeText={setInstructions} onBlur={() => setIsEditingInstructions(false)} placeholder="Enter instructions here..." placeholderTextColor={COLORS.gray} />
            ) : (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setIsEditingInstructions(true)} style={[styles.previewBox, { marginTop: 0 }]}>
                <MarkdownText>{instructions}</MarkdownText>
              </TouchableOpacity>
            )}
            <View style={{ marginTop: 16 }}>
              {!isEditingInstructions && instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(true)} style={{ width: '100%', paddingVertical: 14, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', }}>
                  <Text style={{ color: '#334155', fontSize: 15, fontWeight: '700' }}>Edit Instructions</Text>
                </TouchableOpacity>
              ) : isEditingInstructions || !instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(false)} style={{ width: '100%', paddingVertical: 14, backgroundColor: COLORS.secondary, borderRadius: 12, alignItems: 'center', shadowColor: COLORS.secondary, }}>
                  <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '700' }}>Save Instructions</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Diet Advice</Text>
            {(!dietAdvice || isEditingDiet) ? (
              <TextInput style={[styles.input, { minHeight: 160 }]} multiline scrollEnabled={false} value={dietAdvice} onChangeText={setDietAdvice} onBlur={() => setIsEditingDiet(false)} placeholder="Enter diet advice here..." placeholderTextColor={COLORS.gray} />
            ) : (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setIsEditingDiet(true)} style={[styles.previewBox, { marginTop: 0 }]}>
                <MarkdownText>{dietAdvice}</MarkdownText>
              </TouchableOpacity>
            )}
            <View style={{ marginTop: 16 }}>
              {!isEditingDiet && dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(true)} style={{ width: '100%', paddingVertical: 14, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', }}>
                  <Text style={{ color: '#334155', fontSize: 15, fontWeight: '700' }}>Edit Diet Advice</Text>
                </TouchableOpacity>
              ) : isEditingDiet || !dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(false)} style={{ width: '100%', paddingVertical: 14, backgroundColor: COLORS.secondary, borderRadius: 12, alignItems: 'center', shadowColor: COLORS.secondary, }}>
                  <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '700' }}>Save Diet Advice</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.submitBtnText}><TranslatedText>Save Changes</TranslatedText></Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 180 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 24, alignItems: 'flex-start' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backText: { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },
  headline: { fontSize: 24, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },
  headlineHighlight: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700' },
  subtitle: { fontSize: 14, fontFamily: FONTS.serif,  color: COLORS.gray, marginTop: 4 },
  
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: COLORS.black, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardHeaderBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 18, fontFamily: FONTS.serif,  color: COLORS.text },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray, marginBottom: 8 },
  input: { borderRadius: 12, padding: 16, backgroundColor: COLORS.white, color: COLORS.text, fontFamily: FONTS.medium, fontWeight: '500', fontSize: 14 },
  
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, justifyContent: 'center', minHeight: 48 },
  addBtnText: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 12, marginLeft: 4 },
  
  medicineBox: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, marginBottom: 16 },
  removeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 4 },
  rowGrid: { flexDirection: 'row' },

  systemToggle: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, },
  systemChip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#FAFAFC' },
  systemChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.text },
  systemChipText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray },
  systemChipTextActive: { color: COLORS.text },
  
  previewBox: { marginTop: 12, padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(30, 41, 59, 0.1)' },
  previewLabel: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', marginBottom: 8 },
  bottomFooter: { paddingHorizontal: 18, paddingVertical: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderColor: COLORS.primary },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 0, shadowColor: COLORS.black, borderWidth: 1, borderColor: '#cbd5e1' },
  submitBtnText: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 16 },
});

