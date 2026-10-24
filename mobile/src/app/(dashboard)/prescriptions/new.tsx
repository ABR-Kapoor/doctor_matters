import { HeaderTitle } from '@/components/HeaderOptions';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill, Plus, X, ArrowLeft, ChevronLeft, User, Search, Save, FileText, Sparkles, TriangleAlert } from 'lucide-react-native';
import { MarkdownText } from '@/components/MarkdownText';
import { TranslatedText } from '@/components/TranslatedText';
import { NameText } from '@/components/NameText';
import { useDoctorPatients, useDoctorIdentity } from '@/hooks/queries/doctorQueries';
import { useCreatePrescription, useGeneratePrescription, useSendPrescription } from '@/hooks/mutations/doctorMutations';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useNotification } from '@/lib/NotificationContext';
import { COLORS, FONTS } from '@/constants/theme';

const MEDICINE_SYSTEMS = [
  { key: 'homeopathy', label: 'Homeopathy' },
  { key: 'allopathy', label: 'Allopathy' },
  { key: 'ayurvedic', label: 'Ayurvedic' },
] as const;

type MedicineSystem = (typeof MEDICINE_SYSTEMS)[number]['key'];

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export default function NewPrescriptionScreen() {
  const router = useRouter();
  const { pid, aid, ai } = useLocalSearchParams<{ pid: string; aid: string; ai?: string }>();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(pid || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [instructions, setInstructions] = useState('');
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [isEditingDiet, setIsEditingDiet] = useState(false);
  const [dietAdvice, setDietAdvice] = useState('');
  const [medicineSystem, setMedicineSystem] = useState<MedicineSystem>('allopathy');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPopulated, setAiPopulated] = useState(false);
  const [safetyNotes, setSafetyNotes] = useState('');
  const autoTriggeredRef = useRef(false);
  const insets = useSafeAreaInsets();

  const { data: patients = [] } = useDoctorPatients(null, getToken);
  const { data: identity } = useDoctorIdentity(getToken);
  const createMutation = useCreatePrescription();
  const generateMutation = useGeneratePrescription();
  const sendMutation = useSendPrescription();

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

  const runGenerate = async () => {
    if (!selectedPatientId) {
      Toast.show({ type: 'error', text1: 'Select a patient first' });
      return;
    }
    if (aiGenerating) return;

    setAiGenerating(true);
    try {
      const token = await getToken();
      const body = await generateMutation.mutateAsync({
        pid: selectedPatientId,
        aid: aid || null,
        system: medicineSystem,
        diagnosis: diagnosis.trim(),
        symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean),
        token
      });

      if (!Array.isArray(body?.medicines) || body.medicines.length === 0) {
        throw new Error('AI returned an empty medicine list');
      }

      if (body.diagnosis) setDiagnosis(body.diagnosis);
      if (Array.isArray(body.symptoms) && body.symptoms.length) setSymptoms(body.symptoms.join(', '));

      const cleaned: Medicine[] = body.medicines
        .map((m: any) => ({
          name: String(m?.name || '').trim(),
          dosage: String(m?.dosage || '').trim(),
          frequency: String(m?.frequency || '').trim(),
          duration: String(m?.duration || '').trim(),
          ...(m?.notes ? { notes: String(m.notes) } : {})
        }))
        .filter((m: Medicine) => m.name);
      if (cleaned.length) setMedicines(cleaned);

      if (body.instructions) setInstructions(body.instructions);
      if (body.dietAdvice) setDietAdvice(body.dietAdvice);
      setSafetyNotes(String(body.safetyNotes || ''));
      setAiPopulated(true);

      Toast.show({ type: 'success', text1: 'AI prescription ready', text2: `Generated via ${body.provider || 'AI'}` });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'AI generation failed', text2: err.message });
    } finally {
      setAiGenerating(false);
    }
  };

  // Arriving from a finished video call with ?ai=1: draft the prescription
  // immediately, but only when the form is still empty — never clobber input.
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (ai !== '1') return;
    if (!selectedPatientId) return;
    if (diagnosis.trim() || symptoms.trim() || medicines.some(m => m.name)) return;
    autoTriggeredRef.current = true;
    runGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai, selectedPatientId]);

  const { showToast, showAlert, showConfirm } = useNotification();

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      showToast('Patient Required', 'Please select a patient', 'error');
      return;
    }
    if (!diagnosis || medicines.some(m => !m.name || !m.dosage)) {
      showToast('Missing Fields', 'Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = {
        // The route reads `pid`/`aid`, not `patient_id`/`appointment_id`. Sending the
        // wrong names made `pid` undefined and the server rejected it with a 400.
        pid: selectedPatientId,
        aid: aid || null,
        diagnosis,
        symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean),
        medicines,
        instructions,
        diet_advice: dietAdvice,
        medicine_system: medicineSystem,
        ai_generated: aiPopulated
      };
      const token = await getToken();
      const body: any = await createMutation.mutateAsync({ data, token });

      // Draft first, then an explicit send step: the row lands as
      // sent_to_patient = false and the patient backend hides it until this
      // prompt (or the list's Send button) delivers it.
      const createdId = body?.prescription?.prescription_id;
      if (createdId) {
        showConfirm(
          'Draft Created',
          'This prescription is saved as a draft. Send it to the patient now?',
          async () => {
            try {
              await sendMutation.mutateAsync({ id: createdId, token });
              showToast('Prescription Sent', 'Sent to patient successfully', 'success');
            } catch {
              // Error toast already shown by useSendPrescription.
            } finally {
              router.back();
            }
          },
          'Send',
          'Not now',
          false
        );
      } else {
        router.back();
      }
    } catch (err: any) {
      // Toast shown by the mutation, with the server's reason.
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ 
        title: 'New Prescription',
        headerTitle: () => <HeaderTitle title="New Prescription" subtitle="Create Rx & Treatment Plan" />,
        headerLeft: () => (
          <TouchableOpacity 
            style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginVertical: 6 }} 
            onPress={() => router.back()}
          >
            <ChevronLeft size={20} color="#374151" />
          </TouchableOpacity>
        ) 
      }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!pid && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}><User size={20} color={COLORS.primary} /></View>
              <View>
                <Text style={styles.cardTitle}><TranslatedText>Patient Selection</TranslatedText></Text>
                <Text style={styles.cardSubtitle}>Choose who this prescription is for</Text>
              </View>
            </View>
            <View style={styles.searchBox}>
              <Search size={18} color={COLORS.gray} />
              <TextInput style={styles.searchInput} placeholder="Search patients by name..." placeholderTextColor={COLORS.gray} value={searchTerm} onChangeText={setSearchTerm} />
            </View>
            <View style={styles.patientList}>
              {patients.filter((p: any) => p.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((patient: any) => {
                const isSelected = selectedPatientId === patient.pid;
                return (
                  <TouchableOpacity 
                    key={patient.pid} 
                    style={[styles.patientRow, isSelected && styles.patientRowSelected]}
                    onPress={() => setSelectedPatientId(patient.pid)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatarSmall, isSelected && { backgroundColor: COLORS.primary }]}>
                      <Text style={[styles.avatarText, isSelected && { color: COLORS.white }]}>{patient.user?.name?.[0] || 'P'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.patientName, isSelected && { color: COLORS.primary }]}>{patient.user?.name}</Text>
                      <Text style={styles.patientEmail}>{patient.user?.email || patient.user?.phone || 'Patient'}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>Selected</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Diagnosis & Symptoms Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}><Save size={20} color={COLORS.primary} /></View>
            <View>
              <Text style={styles.cardTitle}><TranslatedText>Clinical Assessment</TranslatedText></Text>
              <Text style={styles.cardSubtitle}>Diagnosis, symptoms and therapeutic system</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Diagnosis <Text style={{ color: COLORS.error }}>*</Text></Text>
            <TextInput 
              style={styles.input} 
              value={diagnosis} 
              multiline 
              scrollEnabled={false} 
              onChangeText={setDiagnosis} 
              placeholder="e.g. Acute Viral Bronchitis, Migraine" 
              placeholderTextColor="#94A3B8" 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Symptoms</Text>
            <TextInput 
              style={styles.input} 
              value={symptoms} 
              multiline 
              scrollEnabled={false} 
              onChangeText={setSymptoms} 
              placeholder="e.g. Mild fever, dry cough, headache (comma separated)" 
              placeholderTextColor="#94A3B8" 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}><TranslatedText>Medical System</TranslatedText></Text>
            <View style={styles.systemToggle}>
              {MEDICINE_SYSTEMS.map((system) => {
                const isActive = medicineSystem === system.key;
                return (
                  <TouchableOpacity
                    key={system.key}
                    style={[styles.systemChip, isActive && styles.systemChipActive]}
                    onPress={() => setMedicineSystem(system.key)}
                    disabled={aiGenerating}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.systemChipText, isActive && styles.systemChipTextActive]}>
                      {system.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* AI Generation Banner Button */}
          <TouchableOpacity 
            style={[styles.aiBtn, aiGenerating && { opacity: 0.7 }]} 
            onPress={runGenerate} 
            disabled={aiGenerating}
            activeOpacity={0.85}
          >
            {aiGenerating ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            ) : (
              <Sparkles size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.aiBtnText}>
              {aiGenerating ? 'Generating Rx with AI…' : aiPopulated ? 'Regenerate with AI' : 'Auto-Generate with AI'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Medicines Section Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.iconBox}><Pill size={20} color={COLORS.primary} /></View>
              <View>
                <Text style={styles.cardTitle}><TranslatedText>Medicines & Dosage</TranslatedText></Text>
                <Text style={styles.cardSubtitle}>{medicines.length} medicine{medicines.length > 1 ? 's' : ''} prescribed</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={addMedicine} activeOpacity={0.8}>
              <Plus size={16} color={COLORS.white} />
              <Text style={styles.addBtnText}>Add Rx</Text>
            </TouchableOpacity>
          </View>

          {!!safetyNotes && (
            <View style={styles.cautionBanner}>
              <TriangleAlert size={18} color={COLORS.error} style={{ marginRight: 10, marginTop: 2 }} />
              <Text style={styles.cautionText}>{safetyNotes}</Text>
            </View>
          )}

          {medicines.map((medicine, index) => (
            <View key={index} style={styles.medicineBox}>
              <View style={styles.medicineHeader}>
                <View style={styles.medicineNumBadge}>
                  <Text style={styles.medicineNumText}>#{index + 1}</Text>
                </View>
                {medicines.length > 1 && (
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedicine(index)} activeOpacity={0.7}>
                    <X size={16} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Medicine Name <Text style={{ color: COLORS.error }}>*</Text></Text>
                <TextInput 
                  style={styles.input} 
                  value={medicine.name} 
                  onChangeText={(t) => updateMedicine(index, 'name', t)} 
                  placeholder="e.g. Paracetamol 500mg / Ashwagandha" 
                  placeholderTextColor="#94A3B8" 
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dosage <Text style={{ color: COLORS.error }}>*</Text></Text>
                <TextInput 
                  style={styles.input} 
                  value={medicine.dosage} 
                  onChangeText={(t) => updateMedicine(index, 'dosage', t)} 
                  placeholder="e.g. 1 Tablet / 5ml" 
                  placeholderTextColor="#94A3B8" 
                />
              </View>

              <View style={styles.rowGrid}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Frequency <Text style={{ color: COLORS.error }}>*</Text></Text>
                  <TextInput 
                    style={styles.input} 
                    value={medicine.frequency} 
                    onChangeText={(t) => updateMedicine(index, 'frequency', t)} 
                    placeholder="e.g. 1-0-1 (Twice daily)" 
                    placeholderTextColor="#94A3B8" 
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Duration <Text style={{ color: COLORS.error }}>*</Text></Text>
                  <TextInput 
                    style={styles.input} 
                    value={medicine.duration} 
                    onChangeText={(t) => updateMedicine(index, 'duration', t)} 
                    placeholder="e.g. 5 Days / 2 Weeks" 
                    placeholderTextColor="#94A3B8" 
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { marginBottom: 4 }]}>
                <Text style={styles.label}>Specific Instructions / Notes</Text>
                <TextInput 
                  style={styles.input} 
                  value={medicine.notes || ''} 
                  onChangeText={(t) => updateMedicine(index, 'notes', t)} 
                  placeholder="e.g. After meal with warm water" 
                  placeholderTextColor="#94A3B8" 
                />
              </View>
            </View>
          ))}

          {aiGenerating && (
            <View style={styles.aiOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.aiOverlayTitle}>Dr. Manas AI is drafting the prescription…</Text>
              <Text style={styles.aiOverlayHint}>
                Tailoring {MEDICINE_SYSTEMS.find(s => s.key === medicineSystem)?.label} recommendations
              </Text>
            </View>
          )}
        </View>

        {/* Additional Instructions & Diet Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}><FileText size={20} color={COLORS.primary} /></View>
            <View>
              <Text style={styles.cardTitle}><TranslatedText>Advice & Care Plan</TranslatedText></Text>
              <Text style={styles.cardSubtitle}>Special precautions and dietary guidance</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>General Instructions</Text>
            {(!instructions || isEditingInstructions) ? (
              <TextInput 
                style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]} 
                multiline 
                scrollEnabled={false} 
                value={instructions} 
                onChangeText={setInstructions} 
                onBlur={() => setIsEditingInstructions(false)} 
                placeholder="Hydration, rest, precautions, follow-up..." 
                placeholderTextColor="#94A3B8" 
              />
            ) : (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setIsEditingInstructions(true)} style={styles.previewBox}>
                <MarkdownText>{instructions}</MarkdownText>
              </TouchableOpacity>
            )}
            <View style={{ marginTop: 10 }}>
              {!isEditingInstructions && instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(true)} style={styles.outlineActionBtn}>
                  <Text style={styles.outlineActionBtnText}>Edit Instructions</Text>
                </TouchableOpacity>
              ) : isEditingInstructions || !instructions ? (
                <TouchableOpacity onPress={() => setIsEditingInstructions(false)} style={styles.softActionBtn}>
                  <Text style={styles.softActionBtnText}>Save Instructions</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={[styles.inputGroup, { marginBottom: 4 }]}>
            <Text style={styles.label}>Diet & Lifestyle Advice (Pathya/Apathya)</Text>
            {(!dietAdvice || isEditingDiet) ? (
              <TextInput 
                style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]} 
                multiline 
                scrollEnabled={false} 
                value={dietAdvice} 
                onChangeText={setDietAdvice} 
                onBlur={() => setIsEditingDiet(false)} 
                placeholder="Recommended foods to eat and foods to avoid..." 
                placeholderTextColor="#94A3B8" 
              />
            ) : (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setIsEditingDiet(true)} style={styles.previewBox}>
                <MarkdownText>{dietAdvice}</MarkdownText>
              </TouchableOpacity>
            )}
            <View style={{ marginTop: 10 }}>
              {!isEditingDiet && dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(true)} style={styles.outlineActionBtn}>
                  <Text style={styles.outlineActionBtnText}>Edit Diet Advice</Text>
                </TouchableOpacity>
              ) : isEditingDiet || !dietAdvice ? (
                <TouchableOpacity onPress={() => setIsEditingDiet(false)} style={styles.softActionBtn}>
                  <Text style={styles.softActionBtnText}>Save Diet Advice</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Primary Submit Button */}
        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleSubmit} 
          disabled={loading || aiGenerating}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Save size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>
                <TranslatedText>Save & Finalize Prescription</TranslatedText>
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: { 
    paddingHorizontal: 16, 
    paddingTop: 16, 
    paddingBottom: 140 
  },
  card: { 
    backgroundColor: COLORS.white, 
    borderRadius: 20, 
    padding: 18, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2, 
    marginBottom: 20 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 18 
  },
  cardHeaderBetween: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 18 
  },
  iconBox: { 
    width: 42, 
    height: 42, 
    borderRadius: 14, 
    backgroundColor: '#EEF3FB', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14 
  },
  cardTitle: { 
    fontSize: 17, 
    fontFamily: FONTS.bold, 
    fontWeight: '700', 
    color: '#0F172A',
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 12.5,
    fontFamily: FONTS.medium,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 14, 
    paddingHorizontal: 14, 
    height: 50, 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: '#E2E8F0' 
  },
  searchInput: { 
    flex: 1, 
    height: '100%', 
    fontFamily: FONTS.medium, 
    fontWeight: '500', 
    color: '#0F172A', 
    fontSize: 14, 
    marginLeft: 10, 
    paddingVertical: 0, 
    paddingHorizontal: 0, 
    textAlignVertical: 'center' 
  },
  
  patientList: { maxHeight: 220 },
  patientRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 10, 
    borderRadius: 14, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFC',
  },
  patientRowSelected: { 
    borderColor: COLORS.primary, 
    backgroundColor: '#EEF3FB' 
  },
  avatarSmall: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    backgroundColor: '#E2E8F0', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  avatarText: { 
    fontSize: 15, 
    fontFamily: FONTS.bold, 
    fontWeight: '700', 
    color: '#334155' 
  },
  patientName: { 
    fontSize: 14.5,
    fontFamily: FONTS.bold, 
    fontWeight: '700', 
    color: '#0F172A' 
  },
  patientEmail: { 
    fontSize: 12, 
    fontFamily: FONTS.medium, 
    fontWeight: '500', 
    color: '#64748B', 
    marginTop: 2 
  },
  selectedBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    backgroundColor: COLORS.primary 
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  
  inputGroup: { marginBottom: 16 },
  label: { 
    fontSize: 13, 
    fontFamily: FONTS.bold, 
    fontWeight: '700', 
    color: '#334155', 
    marginBottom: 8 
  },
  input: { 
    borderRadius: 14, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    backgroundColor: '#F8FAFC', 
    color: '#0F172A', 
    fontFamily: FONTS.medium, 
    fontWeight: '500', 
    fontSize: 14.5, 
    borderWidth: 1, 
    borderColor: '#E2E8F0' 
  },
  
  addBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12, 
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: { 
    color: '#FFFFFF', 
    fontFamily: FONTS.bold, 
    fontWeight: '700', 
    fontSize: 12.5, 
    marginLeft: 4 
  },
  
  medicineBox: { 
    backgroundColor: '#F8FAFC', 
    padding: 14, 
    borderRadius: 16, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicineNumBadge: {
    backgroundColor: '#EEF3FB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  medicineNumText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.primary,
  },
  removeBtn: { 
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  rowGrid: { flexDirection: 'row' },

  systemToggle: { 
    flexDirection: 'row', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 14, 
    padding: 4, 
    gap: 6,
  },
  systemChip: { 
    flex: 1, 
    paddingVertical: 10, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'transparent' 
  },
  systemChipActive: { 
    backgroundColor: '#FFFFFF', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  systemChipText: { 
    fontSize: 12.5, 
    fontFamily: FONTS.medium, 
    fontWeight: '600', 
    color: '#64748B' 
  },
  systemChipTextActive: { 
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },

  aiBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#1E293B', 
    borderRadius: 14, 
    paddingVertical: 14, 
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  aiBtnText: { 
    fontSize: 14.5, 
    fontFamily: FONTS.bold, 
    fontWeight: '700', 
    color: '#FFFFFF', 
  },

  cautionBanner: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: '#FEF2F2', 
    borderRadius: 14, 
    padding: 14, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cautionText: { 
    flex: 1, 
    fontSize: 13, 
    fontFamily: FONTS.medium, 
    fontWeight: '500', 
    color: '#991B1B', 
    lineHeight: 18 
  },

  aiOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20, 
    zIndex: 10 
  },
  aiOverlayTitle: { 
    fontSize: 16, 
    fontFamily: FONTS.bold, 
    fontWeight: '700',
    color: '#0F172A', 
    marginTop: 16, 
    textAlign: 'center' 
  },
  aiOverlayHint: { 
    fontSize: 13, 
    fontFamily: FONTS.medium, 
    fontWeight: '500', 
    color: '#64748B', 
    marginTop: 6, 
    textAlign: 'center' 
  },
  
  previewBox: { 
    padding: 14, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
  },
  outlineActionBtn: {
    width: '100%', 
    paddingVertical: 12, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#CBD5E1',
  },
  outlineActionBtnText: {
    color: '#334155', 
    fontSize: 14, 
    fontFamily: FONTS.bold,
    fontWeight: '700'
  },
  softActionBtn: {
    width: '100%', 
    paddingVertical: 12, 
    backgroundColor: '#EEF3FB', 
    borderRadius: 12, 
    alignItems: 'center',
  },
  softActionBtnText: {
    color: COLORS.primary, 
    fontSize: 14, 
    fontFamily: FONTS.bold,
    fontWeight: '700'
  },

  submitBtn: { 
    backgroundColor: COLORS.primary, 
    paddingVertical: 15, 
    paddingHorizontal: 20, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 10, 
    marginBottom: 20,
    shadowColor: COLORS.primary, 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: { 
    color: '#FFFFFF', 
    fontFamily: FONTS.bold, 
    fontWeight: '700', 
    fontSize: 16 
  },
});
