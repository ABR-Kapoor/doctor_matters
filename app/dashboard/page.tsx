'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Calendar, Users, Pill, User, CheckCircle, DollarSign, Activity, Sparkles, ArrowUpRight, Award, Star, MapPin, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TranslatedText } from '@/app/components/TranslatedText';
import { NameText } from '@/app/components/NameText';
import { formatDate } from '@/lib/shared/utils';
import { useAuthToken } from '@/lib/auth-token-context';
import PageLoader from '@/app/components/PageLoader';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useDoctorIdentity } from '@/app/hooks/queries/useDoctorIdentity';
import { useDoctorDashboard } from '@/app/hooks/queries/useDoctorDashboard';
import VerificationGuard from '@/app/components/VerificationGuard';

const chartConfig = {
  count: { label: 'Appointments', color: '#3B82F6' },
  patients: { label: 'Patients', color: '#2563EB' },
};

function DashboardContent() {
  const token = useAuthToken();
  const { translate } = useLanguage();
  const [greeting, setGreeting] = useState('Welcome');
  const [currentDate, setCurrentDate] = useState('');

  // ── TanStack Query ──
  const { data: identity, isLoading: identityLoading } = useDoctorIdentity(token);
  const uid = identity?.uid || null;
  const { data: dashData, isLoading: dashLoading } = useDoctorDashboard(uid, token);

  useEffect(() => {
    setCurrentDate(formatDate(new Date()));
    const hour = new Date().getHours();
    const updateGreeting = async () => {
      if (hour < 12) setGreeting(await translate('Good Morning'));
      else if (hour < 18) setGreeting(await translate('Good Afternoon'));
      else setGreeting(await translate('Good Evening'));
    };
    updateGreeting();
  }, [translate]);

  const isLoading = identityLoading || (dashLoading && !dashData);
  if (isLoading) return <PageLoader />;

  const stats = {
    todayAppointments: dashData?.todayAppointments || 0,
    totalPatients: dashData?.totalPatients || 0,
    pendingRequests: dashData?.pendingRequests || 0,
    activePrescriptions: dashData?.activePrescriptions || 0,
    pendingApprovals: dashData?.pendingApprovals || 0,
    monthlyRevenue: dashData?.monthlyRevenue || 0,
  };
  const appointmentsData: any[] = dashData?.appointmentsData || [];
  const patientsData: any[] = dashData?.patientsData || [];

  const userName = identity?.name || 'Doctor';
  const profileImage = identity?.imageUrl || '';

  const statCards = [
    { icon: <Calendar className="w-4 h-4 text-blue-600" />, value: stats.todayAppointments, label: <TranslatedText>Upcoming Appointments</TranslatedText>, sub: <TranslatedText>View Schedule</TranslatedText>, href: '/dashboard/appointments' },
    { icon: <Pill className="w-4 h-4 text-blue-600" />, value: stats.activePrescriptions, label: <TranslatedText>Active Prescriptions</TranslatedText>, sub: <TranslatedText>Manage Refills</TranslatedText>, href: '/dashboard/prescriptions' },
    { icon: <Activity className="w-4 h-4 text-blue-600" />, value: stats.totalPatients, label: <TranslatedText>Total Patients</TranslatedText>, sub: <TranslatedText>View All</TranslatedText>, href: '/dashboard/patients' },
    {
      icon: stats.pendingApprovals > 0 ? <CheckCircle className="w-4 h-4 text-blue-600" /> : <DollarSign className="w-4 h-4 text-blue-600" />,
      value: stats.pendingApprovals > 0 ? stats.pendingApprovals : `₹${stats.monthlyRevenue.toLocaleString('en-IN')}`,
      label: stats.pendingApprovals > 0 ? <TranslatedText>Pending Approvals</TranslatedText> : <TranslatedText>Revenue (INR)</TranslatedText>,
      sub: stats.pendingApprovals > 0 ? <TranslatedText>Action Required</TranslatedText> : <TranslatedText>This month</TranslatedText>,
      href: '/dashboard/appointments',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 xl:p-10">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
        <div>
          <span className="pill-badge mb-4 inline-block">
            <Sparkles className="w-3 h-3" /> <TranslatedText>Daily Insight</TranslatedText>
          </span>
          <h1 className="headline-lg mb-1">
            {greeting},{' '}
            <span className="text-blue-600 italic">
              <NameText name={userName} fallback="Doctor" />
            </span>
          </h1>
          <p className="body-md text-blue-600 max-w-xl">{currentDate}</p>
        </div>
        <div className="hidden lg:block text-right max-w-xs">
          <p className="body-md italic text-blue-600 leading-relaxed">
            <TranslatedText>Here's what's happening with your practice today</TranslatedText>
          </p>
        </div>
      </div>

      {/* Stats Grid: Unified Practice Console Card ("Big Tub") */}
      <div className="bg-white border border-blue-100 rounded-[2rem] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 overflow-hidden flex flex-col lg:flex-row min-h-[340px] group">
        
        {/* 1. Doctor Portrait (Left column) */}
        <div className="w-full lg:w-[25%] relative min-h-[250px] lg:min-h-full bg-blue-50/30 shrink-0 border-b lg:border-b-0 lg:border-r border-blue-100">
          {profileImage ? (
            <img 
              src={profileImage} 
              alt="Profile" 
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
            />
          ) : (
            <div className="w-full h-full bg-blue-100/50 flex items-center justify-center">
              <User className="w-16 h-16 text-blue-300" />
            </div>
          )}
          {identity?.doctor?.is_verified && (
            <div className="absolute top-5 left-5 bg-blue-600 text-white rounded-full p-1 border-2 border-white shadow-md flex items-center justify-center" title="Verified Professional">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            </div>
          )}
        </div>

        {/* 2. Doctor Info & Quick Stats (Right columns) */}
        <div className="flex-1 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 justify-between">
          
          {/* Left Inner: Doctor Identity Details & Pending Requests */}
          <div className="flex-1 flex flex-col justify-between space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider mb-2">
                <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                <TranslatedText>PRACTICE OVERVIEW</TranslatedText>
              </span>
              
              <h2 className="text-2xl font-display font-extrabold text-blue-900 tracking-tight leading-tight mt-1">
                <NameText name={userName} fallback="Doctor" />
              </h2>
              
              <div className="mt-2 flex flex-col gap-1 text-xs text-blue-600 font-medium">
                {identity?.doctor?.qualification && (
                  <p className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{identity.doctor.qualification}</span>
                  </p>
                )}
                {identity?.doctor?.clinic_name && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate max-w-[220px]">{identity.doctor.clinic_name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Experience & Specialty sub-tags */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50/70 text-blue-700 border border-blue-100">
                <TranslatedText>Experience</TranslatedText>: {identity?.doctor?.years_of_experience ? `${identity.doctor.years_of_experience} Yrs` : '0 Yrs'}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50/70 text-blue-700 border border-blue-100">
                <TranslatedText>Specialty</TranslatedText>: {identity?.doctor?.specialization && identity.doctor.specialization.length > 0 ? identity.doctor.specialization[0] : 'General Medicine'}
              </span>
            </div>

            {/* Pending Requests Alert */}
            <div className="bg-blue-50/30 border border-blue-100/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${stats.pendingRequests > 0 ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                  <span className="text-blue-500 text-[10px] font-bold uppercase tracking-wider"><TranslatedText>Pending Requests</TranslatedText></span>
                </div>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${stats.pendingRequests > 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                  {stats.pendingRequests}
                </span>
              </div>
              <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden shadow-inner relative">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${stats.pendingRequests > 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} 
                  style={{ width: `${Math.min((stats.pendingRequests / 10) * 100, 100)}%` }} 
                />
              </div>
              <p className="text-[10px] text-blue-400 mt-1 italic">
                {stats.pendingRequests > 0 
                  ? `${stats.pendingRequests} requests need immediate review` 
                  : 'All caught up! Excellent work.'}
              </p>
            </div>
          </div>

          {/* Right Inner: The 4 Grid Stats integrated into this console */}
          <div className="w-full md:w-[48%] lg:w-[45%] flex flex-col justify-between border-t md:border-t-0 md:border-l border-blue-100/70 md:pl-6 lg:pl-8 pt-6 md:pt-0">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4"><TranslatedText>Practice Metrics</TranslatedText></h3>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1">
              {statCards.map((card, i) => (
                <Link key={i} href={card.href} className="bg-blue-50/20 border border-blue-50/60 rounded-2xl p-4 flex flex-col justify-between hover:bg-blue-50/50 hover:border-blue-200/60 transition-all duration-200 group/item relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">{card.icon}</div>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-100 transition-opacity text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-black font-display text-blue-900 leading-tight truncate">{card.value}</h4>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider leading-none mt-1">{card.label}</p>
                    <p className="text-[9px] text-blue-400/80 leading-none mt-1">{card.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Appointments Bar Chart */}
        <div className="md:col-span-1 lg:col-span-1 card-base p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="pill-badge"><Calendar className="w-3 h-3" /> <TranslatedText>Appointments</TranslatedText></span>
          </div>
          <h3 className="title-lg text-blue-900 mb-4"><TranslatedText>Monthly Overview</TranslatedText></h3>
          {appointmentsData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={appointmentsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DBEAFE" />
                <XAxis dataKey="month" hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 6, 6]} barSize={12} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-blue-300 text-sm">
              <TranslatedText>No data available</TranslatedText>
            </div>
          )}
        </div>

        {/* Patient Growth Line Chart */}
        <div className="md:col-span-1 lg:col-span-2 card-base p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="pill-badge"><Users className="w-3 h-3" /> <TranslatedText>Patient Growth</TranslatedText></span>
            <Link href="/dashboard/patients" className="text-sm text-blue-600 font-semibold hover:text-blue-800 transition-colors">
              <TranslatedText>View All</TranslatedText> →
            </Link>
          </div>
          <h3 className="title-lg text-blue-900 mb-4"><TranslatedText>Growth Trend</TranslatedText></h3>
          {patientsData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={patientsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DBEAFE" />
                <XAxis dataKey="date" stroke="#93C5FD" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#93C5FD" fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="patients" stroke="#2563EB" strokeWidth={3}
                  dot={{ fill: '#2563EB', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#1D4ED8' }} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-blue-300 text-sm">
              <TranslatedText>No data available</TranslatedText>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  return (
    <VerificationGuard>
      <DashboardContent />
    </VerificationGuard>
  );
}
