'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Pill, Plus, X, ArrowLeft, Sparkles, Loader2, User, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { TranslatedText } from '@/app/components/TranslatedText';
import { NameText } from '@/app/components/NameText';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTranslation } from '@/app/hooks/useTranslation';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { DatePicker } from '@/app/components/DatePicker';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export default function NewPrescriptionPage() {
  const token = useAuthToken();
  const { translate } = useLanguage();
  const { text: phSearchPatients } = useTranslation('Search patients by name...');
  const { text: phDiagnosis } = useTranslation('Enter diagnosis');
  const { text: phSymptoms } = useTranslation('Fever, Cough, Headache');
  const { text: phMedicineName } = useTranslation('e.g., Paracetamol');
  const { text: phDosage } = useTranslation('e.g., 500mg');
  const { text: phFrequency } = useTranslation('e.g., Twice daily');
  const { text: phDuration } = useTranslation('e.g., 7 days');
  const { text: phInstructions } = useTranslation('Any special instructions for the patient...');
  const { text: phDietAdvice } = useTranslation('Dietary recommendations...');
  const { text: phFollowUpDate } = useTranslation('Select follow-up date');
  const searchParams = useSearchParams();
  const router = useRouter();

  const pid = searchParams?.get('pid');
  const aid = searchParams?.get('aid');

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(pid || '');
  const [patientName, setPatientName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: '', dosage: '', frequency: '', duration: '' }
  ]);
  const [instructions, setInstructions] = useState('');
  const [dietAdvice, setDietAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientName();
    }
  }, [selectedPatientId]);

  async function fetchPatients() {
    try {
      const syncResponse = await fetchWithAuth('/api/sync-user', token);
      const { user } = await syncResponse.json();

      if (!user) return;

      const profileResponse = await fetchWithAuth(`/api/doctor/profile`, token);
      const profileData = await profileResponse.json();

      if (!profileData.success) return;

      const response = await fetchWithAuth(`/api/doctor/patients?did=${profileData.doctor.did}`, token);
      const data = await response.json();

      if (data.success) {
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  }

  async function fetchPatientName() {
    try {
      const response = await fetchWithAuth(`/api/doctor/patients/${selectedPatientId}`, token);
      const data = await response.json();
      if (data.success && data.patient) {
        setPatientName(data.patient.user.name);
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
    }
  }

  function addMedicine() {
    setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }]);
  }

  function removeMedicine(index: number) {
    setMedicines(medicines.filter((_, i) => i !== index));
  }

  function updateMedicine(index: number, field: keyof Medicine, value: string) {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedPatientId) {
      toast.error(await translate('Please select a patient'));
      return;
    }

    if (!diagnosis || medicines.some(m => !m.name || !m.dosage)) {
      toast.error(await translate('Please fill in diagnosis and all medicine fields'));
      return;
    }

    setLoading(true);
    try {
      // Sync user first
      const syncResponse = await fetchWithAuth('/api/sync-user', token);
      const { user } = await syncResponse.json();

      const profileResponse = await fetchWithAuth(`/api/doctor/profile`, token);
      const profileData = await profileResponse.json();

      if (!profileData.success) {
        toast.error(await translate('Failed to get doctor profile'));
        return;
      }

      const response = await fetchWithAuth('/api/doctor/prescriptions', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pid: selectedPatientId,
          did: profileData.doctor.did,
          aid: aid || null,
          diagnosis,
          symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean),
          medicines,
          instructions,
          diet_advice: dietAdvice,
          follow_up_date: followUpDate || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(await translate('Prescription created successfully!'));
        router.push('/dashboard/prescriptions');
      } else {
        toast.error(await translate(data.error || 'Failed to create prescription'));
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error(await translate('Failed to create prescription'));
    } finally {
      setLoading(false);
    }
  }

  async function generateWithAI() {
    if (!selectedPatientId) {
      toast.error(await translate('Please select a patient for AI generation'));
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetchWithAuth('/api/ai/generate-prescription', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: selectedPatientId, aid: aid || null }),
      });

      const data = await response.json();

      if (data.success) {
        // Populate form with AI-generated data
        setDiagnosis(data.diagnosis || '');
        setSymptoms(data.symptoms?.join(', ') || '');
        setMedicines(data.medicines || [{ name: '', dosage: '', frequency: '', duration: '' }]);
        setInstructions(data.instructions || '');
        setDietAdvice(data.dietAdvice || '');
        setFollowUpDate(data.followUpDate || '');

        toast.success(await translate('Prescription generated by Dr. Manas AI!'));
      } else {
        toast.error(await translate(data.error || 'Failed to generate prescription'));
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      toast.error(await translate('Failed to generate prescription with AI'));
    } finally {
      setAiGenerating(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 xl:p-10 pb-12">
      <div className="flex items-start gap-3 sm:gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-600 smooth-transition text-sm font-semibold mt-1 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /><TranslatedText>Back</TranslatedText>
        </button>
        <div>
          <span className="pill-badge mb-4 inline-block">
            <Pill className="w-3 h-3" /><TranslatedText>New Prescription</TranslatedText>
          </span>
          <h1 className="headline-lg mb-1">
            <TranslatedText>Create</TranslatedText>{' '}
            <span className="text-blue-600 italic"><TranslatedText>Prescription</TranslatedText></span>
          </h1>
          <p className="body-md text-blue-600">
            {patientName ? (
              <><TranslatedText>For</TranslatedText> <strong className="text-blue-700"><NameText name={patientName} /></strong></>
            ) : (
              <TranslatedText>Create prescription for patient</TranslatedText>
            )}
          </p>
        </div>
      </div>

      {/* AI Loading Overlay */}
      {aiGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900/95 to-blue-800/95 backdrop-blur-sm !mt-0">
          <div className="text-center">
            {/* Pulsing Rings Animation */}
            <div className="relative w-32 h-32 mx-auto mb-10">
              <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-3 rounded-full border-2 border-blue-300/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
              <div className="absolute inset-6 rounded-full border-2 border-blue-200/50 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.8s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Pill className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
            </div>

            {/* Loading Text */}
            <div className="text-white space-y-3">
              <h3 className="text-2xl font-bold flex items-center justify-center space-x-2">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span><TranslatedText>Dr. Manas AI is analyzing...</TranslatedText></span>
              </h3>
              <p className="text-blue-200 animate-pulse">
                <TranslatedText>Reviewing patient history, symptoms, and creating personalized prescription</TranslatedText>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Patient Selector */}
      {!pid && (
        <div className="card-base p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <span><TranslatedText>Select Patient</TranslatedText></span>
          </h2>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={phSearchPatients}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Patient List */}
            <div className="max-h-[40vh] sm:max-h-64 overflow-y-auto space-y-2">
              {patients
                .filter(p => p.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((patient) => (
                  <button
                    key={patient.pid}
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(patient.pid);
                      setSearchTerm('');
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedPatientId === patient.pid
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        {patient.user?.profile_image_url ? (
                          <img
                            src={patient.user.profile_image_url}
                            alt={patient.user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900"><NameText name={patient.user?.name} fallback="Patient" /></p>
                        <p className="text-sm text-gray-500">{patient.user?.email}</p>
                      </div>
                      {selectedPatientId === patient.pid && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              {patients.filter(p => p.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <p className="text-center text-gray-500 py-8"><TranslatedText>No patients found</TranslatedText></p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Button */}
      {/* AI Generation Button */}
      <button
        type="button"
        onClick={generateWithAI}
        disabled={aiGenerating || !selectedPatientId}
        className="w-full p-4 sm:p-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base smooth-transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 rounded-[1.75rem] shadow-[var(--shadow-md)] transition-all"
      >
        <Sparkles className="w-6 h-6" />
        <span><TranslatedText>Generate with Dr. Manas AI</TranslatedText></span>
        {!selectedPatientId && <span className="text-sm font-normal opacity-70"><TranslatedText>(Select a patient first)</TranslatedText></span>}
      </button>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Diagnosis */}
        <div className="card-base p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4"><TranslatedText>Diagnosis & Symptoms</TranslatedText></h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText>Diagnosis</TranslatedText> *
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                placeholder={phDiagnosis}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText>Symptoms (comma separated)</TranslatedText>
              </label>
              <input
                type="text"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                placeholder={phSymptoms}
              />
            </div>
          </div>
        </div>

        {/* Medicines */}
        <div className="card-base p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <Pill className="w-5 h-5 text-blue-600" />
              <span><TranslatedText>Medicines</TranslatedText></span>
            </h2>
            <button
              type="button"
              onClick={addMedicine}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span><TranslatedText>Add Medicine</TranslatedText></span>
            </button>
          </div>

          <div className="space-y-4">
            {medicines.map((medicine, index) => (
              <div key={index} className="relative p-4 bg-gray-50 rounded-xl">
                {medicines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedicine(index)}
                    className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <TranslatedText>Medicine Name</TranslatedText> *
                    </label>
                    <input
                      type="text"
                      value={medicine.name}
                      onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50"
                      placeholder={phMedicineName}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <TranslatedText>Dosage</TranslatedText> *
                    </label>
                    <input
                      type="text"
                      value={medicine.dosage}
                      onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50"
                      placeholder={phDosage}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <TranslatedText>Frequency</TranslatedText> *
                    </label>
                    <input
                      type="text"
                      value={medicine.frequency}
                      onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50"
                      placeholder={phFrequency}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <TranslatedText>Duration</TranslatedText> *
                    </label>
                    <input
                      type="text"
                      value={medicine.duration}
                      onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50"
                      placeholder={phDuration}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions & Diet */}
        <div className="card-base p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4"><TranslatedText>Additional Instructions</TranslatedText></h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText>Instructions</TranslatedText>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                placeholder={phInstructions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText>Diet Advice</TranslatedText>
              </label>
              <textarea
                value={dietAdvice}
                onChange={(e) => setDietAdvice(e.target.value)}
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                placeholder={phDietAdvice}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText>Follow-up Date</TranslatedText>
              </label>
              <DatePicker
                value={followUpDate}
                onChange={setFollowUpDate}
                placeholder={phFollowUpDate}
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 justify-center py-3 disabled:opacity-50"
          >
            <TranslatedText>{loading ? 'Creating...' : 'Create Prescription'}</TranslatedText>
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 smooth-transition text-center"
          >
            <TranslatedText>Cancel</TranslatedText>
          </button>
        </div>
      </form>
    </div>
  );
}
