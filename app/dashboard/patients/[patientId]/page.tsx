'use client';

export const dynamic = 'force-dynamic';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, Calendar, Phone, Mail, Activity, Pill, FileText, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import PageLoader from '@/app/components/PageLoader';
import { TranslatedText } from '@/app/components/TranslatedText';
import { formatDate } from '@/lib/shared/utils';
import { NameText } from '@/app/components/NameText';
import { useLanguage } from '@/app/contexts/LanguageContext';

interface PatientData {
  pid: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  allergies: string[];
  chronic_conditions: string[];
  current_medications: string[];
  user: {
    name: string;
    email: string;
    phone: string;
    profile_image_url: string;
  };
}

interface Appointment {
  aid: string;
  scheduled_date: string;
  scheduled_time: string;
  mode: string;
  status: string;
  chief_complaint: string;
  duration_minutes: number | null;
}

export default function PatientDetailPage() {
  const token = useAuthToken();
  const { translate } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const pid = params?.patientId as string;

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (pid) {
      fetchPatientDetails();
    }
  }, [pid]);

  async function fetchPatientDetails() {
    try {
      const response = await fetchWithAuth(`/api/doctor/patients/${pid}`, token);
      const data = await response.json();

      if (data.success) {
        setPatient(data.patient);
        setAppointments(data.appointments || []);
      } else {
        toast.error(await translate('Failed to load patient details'));
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast.error(await translate('Failed to load patient'));
    } finally {
      setLoading(false);
    }
  }

  function calculateAge(dob: string) {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  }

  if (loading) return <PageLoader />;

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <User className="w-12 h-12 text-blue-200 mb-4" />
        <p className="body-md text-blue-600 mb-4"><TranslatedText>Patient not found</TranslatedText></p>
        <button onClick={() => router.push('/dashboard/patients')} className="btn-primary">
          <TranslatedText>Back to Patients</TranslatedText>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 pb-12">

      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <button onClick={() => router.push('/dashboard/patients')}
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-600 smooth-transition mb-4 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> <TranslatedText>Back to Patients</TranslatedText>
          </button>
          <span className="pill-badge mb-4 inline-block"><TranslatedText>Patient Record</TranslatedText></span>
          <h1 className="headline-lg mb-1">
            <span className="text-blue-600 italic"><NameText name={patient.user.name} /></span>
          </h1>
          <p className="body-md text-blue-600"><TranslatedText>Complete medical profile</TranslatedText></p>
        </div>
        <button onClick={() => router.push(`/dashboard/prescriptions/new?pid=${pid}`)} className="btn-primary shrink-0 text-[11px] sm:text-xs px-3 py-1.5 sm:px-4 sm:py-2">
          <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <TranslatedText>New Prescription</TranslatedText>
        </button>
      </div>

      {/* Patient Profile Card */}
      <div className="card-base p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-100 shrink-0">
            {patient.user.profile_image_url ? (
              <img src={patient.user.profile_image_url} alt={patient.user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                <User className="w-8 h-8 text-blue-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {patient.user.email && (
              <div className="flex items-center gap-2 text-sm text-blue-600 min-w-0">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{patient.user.email}</span>
              </div>
            )}
            {patient.user.phone && (
              <div className="flex items-center gap-2 text-sm text-blue-600 min-w-0">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{patient.user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <span><TranslatedText>Age</TranslatedText>: {calculateAge(patient.date_of_birth)} <TranslatedText>years</TranslatedText></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Activity className="w-4 h-4 text-blue-400 shrink-0" />
              <span><TranslatedText>Blood Group</TranslatedText>: <TranslatedText>{patient.blood_group || 'Not specified'}</TranslatedText></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <User className="w-4 h-4 text-blue-400 shrink-0" />
              <span><TranslatedText>Gender</TranslatedText>: <TranslatedText>{patient.gender || 'Not specified'}</TranslatedText></span>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Information Grid */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card-base p-4 sm:p-6">
          <h3 className="title-lg text-blue-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-500" /> <TranslatedText>Allergies</TranslatedText>
          </h3>
          {patient.allergies?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.allergies.map((a, i) => (
                <span key={i} className="pill-badge bg-red-50 text-red-600 border-red-100"><TranslatedText>{a}</TranslatedText></span>
              ))}
            </div>
          ) : <p className="body-md text-blue-600"><TranslatedText>No known allergies</TranslatedText></p>}
        </div>

        <div className="card-base p-4 sm:p-6">
          <h3 className="title-lg text-blue-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" /> <TranslatedText>Chronic Conditions</TranslatedText>
          </h3>
          {patient.chronic_conditions?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.chronic_conditions.map((c, i) => (
                <span key={i} className="pill-badge bg-amber-50 text-amber-700 border-amber-100"><TranslatedText>{c}</TranslatedText></span>
              ))}
            </div>
          ) : <p className="body-md text-blue-600"><TranslatedText>No chronic conditions</TranslatedText></p>}
        </div>

        <div className="card-base p-4 sm:p-6 md:col-span-2">
          <h3 className="title-lg text-blue-900 mb-4 flex items-center gap-2">
            <Pill className="w-4 h-4 text-blue-500" /> <TranslatedText>Current Medications</TranslatedText>
          </h3>
          {patient.current_medications?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.current_medications.map((m, i) => (
                <span key={i} className="pill-badge bg-blue-100 text-blue-700 border-blue-200"><TranslatedText>{m}</TranslatedText></span>
              ))}
            </div>
          ) : <p className="body-md text-blue-600"><TranslatedText>No current medications</TranslatedText></p>}
        </div>
      </div>

      {/* Appointment History */}
      <div className="card-base p-4 sm:p-6">
        <h3 className="headline-md text-blue-900 mb-5"><TranslatedText>Appointment History</TranslatedText></h3>
        {appointments.length === 0 ? (
          <p className="body-md text-blue-600 text-center py-8"><TranslatedText>No appointments yet</TranslatedText></p>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div key={apt.aid} className="flex flex-wrap items-start justify-between gap-2 p-4 bg-blue-50 rounded-2xl hover:bg-blue-100/60 smooth-transition">
                <div className="min-w-0">
                  <p className="font-semibold text-blue-900 text-sm truncate"><TranslatedText>{apt.chief_complaint}</TranslatedText></p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {formatDate(apt.scheduled_date)} <TranslatedText>at</TranslatedText> {apt.scheduled_time}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {apt.duration_minutes && (
                    <span className="pill-badge">{apt.duration_minutes} <TranslatedText>min</TranslatedText></span>
                  )}
                  <span className="pill-badge"><TranslatedText>{apt.status}</TranslatedText></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
