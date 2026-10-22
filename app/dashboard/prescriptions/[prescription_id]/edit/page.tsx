'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Pill, Plus, X, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { TranslatedText } from '@/app/components/TranslatedText';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTranslation } from '@/app/hooks/useTranslation';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import PageLoader from '@/app/components/PageLoader';
import { DatePicker } from '@/app/components/DatePicker';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export default function EditPrescriptionPage() {
  const token = useAuthToken();
  const { translate } = useLanguage();
  const { text: phDiagnosis } = useTranslation('Enter diagnosis');
  const { text: phSymptoms } = useTranslation('Fever, Cough, Headache');
  const { text: phMedicineName } = useTranslation('e.g., Paracetamol');
  const { text: phDosage } = useTranslation('e.g., 500mg');
  const { text: phFrequency } = useTranslation('e.g., Twice daily');
  const { text: phDuration } = useTranslation('e.g., 7 days');
  const { text: phInstructions } = useTranslation('Any special instructions for the patient...');
  const { text: phDietAdvice } = useTranslation('Dietary recommendations...');
  const { text: phFollowUpDate } = useTranslation('Select follow-up date');
  const params = useParams();
  const router = useRouter();
  const prescriptionId = params?.prescription_id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: '', dosage: '', frequency: '', duration: '' }
  ]);
  const [instructions, setInstructions] = useState('');
  const [dietAdvice, setDietAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    fetchPrescription();
  }, [prescriptionId]);

  async function fetchPrescription() {
    try {
      // Sync user
      const syncResponse = await fetchWithAuth('/api/sync-user', token);
      const { user } = await syncResponse.json();

      const profileResponse = await fetchWithAuth(`/api/doctor/profile?uid=${user.uid}`, token);
      const profileData = await profileResponse.json();

      if (!profileData.success) {
        toast.error(await translate('Failed to load doctor profile'));
        return;
      }

      const response = await fetchWithAuth(`/api/doctor/prescriptions?did=${profileData.doctor.did}`, token);
      const data = await response.json();

      if (data.success) {
        const prescription = data.prescriptions.find((p: any) => p.prescription_id === prescriptionId);

        if (prescription) {
          setPatientName(prescription.patients?.users?.name || '');
          setDiagnosis(prescription.diagnosis || '');
          setSymptoms(prescription.symptoms?.join(', ') || '');
          const parsedMeds = typeof prescription.medicines === 'string'
            ? JSON.parse(prescription.medicines)
            : prescription.medicines;
          setMedicines(Array.isArray(parsedMeds) && parsedMeds.length > 0
            ? parsedMeds
            : [{ name: '', dosage: '', frequency: '', duration: '' }]);
          setInstructions(prescription.instructions || '');
          setDietAdvice(prescription.diet_advice || '');
          setFollowUpDate(prescription.follow_up_date || '');
        } else {
          toast.error(await translate('Prescription not found'));
          router.push('/dashboard/prescriptions');
        }
      }
    } catch (error) {
      console.error('Error fetching prescription:', error);
      toast.error(await translate('Failed to load prescription'));
    } finally {
      setLoading(false);
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

    if (!diagnosis || medicines.some(m => !m.name || !m.dosage)) {
      toast.error(await translate('Please fill in diagnosis and all medicine fields'));
      return;
    }

    setSaving(true);
    try {
      const response = await fetchWithAuth(`/api/doctor/prescriptions/${prescriptionId}`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        toast.success(await translate('Prescription updated successfully!'));
        router.push('/dashboard/prescriptions');
      } else {
        toast.error(await translate(data.error || 'Failed to update prescription'));
      }
    } catch (error) {
      console.error('Error updating prescription:', error);
      toast.error(await translate('Failed to update prescription'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push('/dashboard/prescriptions')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900"><TranslatedText>Edit Prescription</TranslatedText></h1>
          <p className="text-gray-600">
            {patientName ? (
              <>
                <TranslatedText>For</TranslatedText> <TranslatedText>{patientName}</TranslatedText>
              </>
            ) : (
              <TranslatedText>Update prescription details</TranslatedText>
            )}
          </p>
        </div>
      </div>

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
            disabled={saving}
            className="btn-primary flex-1 justify-center py-3 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span><TranslatedText>{saving ? 'Saving...' : 'Save Changes'}</TranslatedText></span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/prescriptions')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 smooth-transition text-center"
          >
            <TranslatedText>Cancel</TranslatedText>
          </button>
        </div>
      </form>
    </div>
  );
}
