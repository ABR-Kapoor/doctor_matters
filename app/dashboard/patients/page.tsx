'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Users, Search, User, Phone, Mail, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { TranslatedText } from '@/app/components/TranslatedText';
import { NameText } from '@/app/components/NameText';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTranslation } from '@/app/hooks/useTranslation';
import { useAuthToken } from '@/lib/auth-token-context';
import PageLoader from '@/app/components/PageLoader';
import { useDoctorIdentity } from '@/app/hooks/queries/useDoctorIdentity';
import { useDoctorPatients } from '@/app/hooks/queries/useDoctorPatients';
import VerificationGuard from '@/app/components/VerificationGuard';

interface Patient {
  pid: string;
  uid: string;
  adherenceRate: number;
  prescriptionCount: number;
  user: {
    name: string;
    email: string;
    phone: string;
    profile_image_url?: string;
  };
  recentAdherence: Array<{ is_taken: boolean }>;
}

function PatientsContent() {
  const token = useAuthToken();
  const { translate } = useLanguage();
  const { text: phSearchPatients } = useTranslation('Search patients by name...');
  const [searchTerm, setSearchTerm] = useState('');

  // ── TanStack Query ──
  const { data: identity } = useDoctorIdentity(token);
  const uid = identity?.uid || null;
  const { data: patients = [], isLoading } = useDoctorPatients(uid, token);

  const filteredPatients = patients.filter(p =>
    p.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && !patients.length) return <PageLoader />;

  return (
    <div className="pb-12 p-4 sm:p-6 lg:p-8 xl:p-10">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-10">
        <div>
          <span className="pill-badge mb-4 inline-block">
            <Users className="w-3 h-3" /><TranslatedText>Patients</TranslatedText>
          </span>
          <h1 className="headline-lg mb-1">
            <TranslatedText>My</TranslatedText>{' '}
            <span className="text-blue-600 italic"><TranslatedText>Patients</TranslatedText></span>
          </h1>
          <p className="body-md text-blue-600 max-w-xl">
            <TranslatedText>View and manage patient records with adherence tracking</TranslatedText>
          </p>
        </div>
        <div className="hidden lg:block text-right max-w-xs">
          <p className="text-2xl font-black font-display text-blue-900">{patients.length}</p>
          <p className="label-md text-blue-600"><TranslatedText>Total Patients</TranslatedText></p>
        </div>
      </div>

      {/* Search */}
      <div className="card-base p-4 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={phSearchPatients}
            className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-blue-900 placeholder-blue-300 text-sm outline-none bg-white transition-all"
          />
        </div>
      </div>

      {/* Patient Cards */}
      {filteredPatients.length === 0 ? (
        <div className="card-base p-12 text-center">
          <Users className="w-12 h-12 text-blue-200 mx-auto mb-4" />
          <p className="body-md text-blue-600">
            <TranslatedText>{searchTerm ? 'No patients found matching your search' : 'No patients yet'}</TranslatedText>
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => {
            const adherenceColor = patient.adherenceRate >= 80 ? 'text-blue-600' :
              patient.adherenceRate >= 60 ? 'text-amber-600' : 'text-red-500';
            const adherenceBg = patient.adherenceRate >= 80 ? 'bg-blue-100' :
              patient.adherenceRate >= 60 ? 'bg-amber-50' : 'bg-red-50';

            return (
              <Link
                key={patient.pid}
                href={`/dashboard/patients/${patient.pid}`}
                className="editorial-card p-6 flex flex-col gap-4 group smooth-transition"
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-blue-100 shrink-0">
                      {patient.user?.profile_image_url ? (
                        <img src={patient.user.profile_image_url} alt={patient.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900 text-sm leading-tight">
                        <NameText name={patient.user.name} />
                      </h3>
                      {patient.user?.phone && (
                        <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {patient.user.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-blue-300 opacity-0 group-hover:opacity-100 smooth-transition shrink-0" />
                </div>

                {/* Stats row */}
                <div className="flex gap-3">
                  <div className={`flex-1 ${adherenceBg} rounded-2xl p-3 text-center`}>
                    <p className={`text-xl font-black font-display ${adherenceColor}`}>{patient.adherenceRate}%</p>
                    <p className="label-md text-blue-600 mt-0.5"><TranslatedText>Adherence</TranslatedText></p>
                  </div>
                  <div className="flex-1 bg-blue-50 rounded-2xl p-3 text-center">
                    <p className="text-xl font-black font-display text-blue-700">{patient.prescriptionCount}</p>
                    <p className="label-md text-blue-600 mt-0.5"><TranslatedText>Prescriptions</TranslatedText></p>
                  </div>
                </div>

                {/* Email */}
                {patient.user?.email && (
                  <p className="text-xs text-blue-600 flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{patient.user.email}</span>
                  </p>
                )}

                {/* Adherence bar */}
                <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full smooth-transition ${patient.adherenceRate >= 80 ? 'bg-blue-500' : patient.adherenceRate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${patient.adherenceRate}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PatientsPage() {
  return (
    <VerificationGuard>
      <PatientsContent />
    </VerificationGuard>
  );
}
