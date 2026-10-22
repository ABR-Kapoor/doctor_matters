'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Pill, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import PageLoader from '@/app/components/PageLoader';
import { TranslatedText } from '@/app/components/TranslatedText';
import { formatDate } from '@/lib/shared/utils';

export default function PrescriptionProgressPage() {
  const token = useAuthToken();
  const params = useParams();
  const prescriptionId = params?.prescription_id as string;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchProgressData();

    // Poll for real-time updates every 5 seconds
    const interval = setInterval(() => {
        fetchProgressData();
    }, 5000);

    return () => clearInterval(interval);
  }, [prescriptionId]);

  async function fetchProgressData() {
    try {
      const response = await fetchWithAuth(`/api/doctor/adherence/${prescriptionId}`, token);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <PageLoader />;

  if (!stats || stats.total_doses === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/prescriptions"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900"><TranslatedText>Adherence Progress</TranslatedText></h1>
            <p className="text-gray-600"><TranslatedText>Track patient medication adherence</TranslatedText></p>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="text-center py-12">
            <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              <TranslatedText>No Adherence Data Yet</TranslatedText>
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              <TranslatedText>Adherence tracking will appear once records are created for this prescription.
              Make sure the adherence function is enabled in the database.</TranslatedText>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href="/dashboard/prescriptions"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
           {stats.patient?.profile_image_url && (
              <img src={stats.patient.profile_image_url} alt="Patient" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
           )}
           <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                {stats.patient?.name ? (
                  <>{stats.patient.name}<TranslatedText>'s Progress</TranslatedText></>
                ) : (
                  <TranslatedText>Adherence Progress</TranslatedText>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-gray-600 text-sm"><TranslatedText>Patient medication tracking</TranslatedText></p>
                <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span><TranslatedText>Live</TranslatedText> • <TranslatedText>Updated</TranslatedText> {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-base p-6 text-center">
          <Pill className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-gray-900">{stats.total_doses}</p>
          <p className="text-sm text-gray-600 mt-1"><TranslatedText>Total Doses</TranslatedText></p>
        </div>
        <div className="card-base p-6 text-center bg-blue-50">
          <CheckCircle2 className="w-12 h-12 text-blue-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-blue-700">{stats.taken}</p>
          <p className="text-sm text-gray-600 mt-1"><TranslatedText>Taken</TranslatedText></p>
        </div>
        <div className="card-base p-6 text-center bg-red-50">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-red-700">{stats.skipped}</p>
          <p className="text-sm text-gray-600 mt-1"><TranslatedText>Skipped</TranslatedText></p>
        </div>
        <div className="card-base p-6 text-center bg-indigo-50 border border-indigo-100">
          <TrendingUp className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-indigo-700">{stats.daily_adherence_rate}%</p>
          <p className="text-sm text-indigo-600 mt-1 font-semibold"><TranslatedText>Daily Adherence</TranslatedText></p>
        </div>
        <div className="card-base p-6 text-center bg-emerald-50 border border-emerald-100">
          <TrendingUp className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-emerald-700">{stats.adherence_rate}%</p>
          <p className="text-sm text-emerald-600 mt-1 font-semibold"><TranslatedText>Overall Adherence</TranslatedText></p>
        </div>
      </div>

      {/* Medicine-wise Breakdown */}
      {stats.medicine_breakdown && stats.medicine_breakdown.length > 0 && (
        <div className="card-base p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <Pill className="w-5 h-5 text-blue-600" />
            <span><TranslatedText>Medicine-wise Adherence</TranslatedText></span>
          </h2>
          <div className="space-y-3">
            {stats.medicine_breakdown.map((med: any, idx: number) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{med.medicine_name}</h3>
                  <span className="text-blue-700 font-bold">{med.adherence_rate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${med.adherence_rate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {med.taken} <TranslatedText>of</TranslatedText> {med.elapsedTotal} <TranslatedText>doses taken</TranslatedText>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Doses */}
      {stats.upcoming_activity && stats.upcoming_activity.length > 0 && (
        <div className="card-base p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span><TranslatedText>Upcoming Doses (Next 5)</TranslatedText></span>
          </h2>
          <div className="space-y-3">
            {stats.upcoming_activity.map((activity: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="font-semibold text-gray-900 block">{activity.medicine_name}</span>
                    <span className="text-xs text-gray-500">Scheduled</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-blue-600 block">
                    {activity.scheduled_time}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(activity.scheduled_date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {stats.recent_activity && stats.recent_activity.length > 0 && (
        <div className="card-base p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span><TranslatedText>Recent Activity (Last 3)</TranslatedText></span>
          </h2>
          <div className="space-y-2">
            {stats.recent_activity.map((activity: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {activity.status === 'taken' ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-gray-900 block">{activity.medicine_name}</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                      {activity.status === 'taken' ? 'Taken' : 'Skipped'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-700 block">
                    {new Date(activity.taken_at || activity.skipped_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(new Date(activity.taken_at || activity.skipped_at).toISOString().split('T')[0])}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
