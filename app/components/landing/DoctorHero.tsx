'use client';

import { useState, useEffect } from 'react';
import { SignUpButton } from '@clerk/nextjs';
import {
  Sparkles, ArrowRight, BrainCircuit, Video, BarChart3,
  ShieldCheck, Calendar, Clock, CheckCircle2, Star,
  Activity, Users, TrendingUp, FileText, Zap, ChevronRight
} from 'lucide-react';
import { TranslatedText } from '@/app/components/TranslatedText';

const TRUST_STATS = [
  { val: '1,200+', label: 'Active Doctors' },
  { val: '98.4%', label: 'Adherence Rate' },
  { val: '10k+', label: 'Consultations Done' },
  { val: '12 min', label: 'Saved Per Patient' },
];

const FEATURE_PILLS = [
  { icon: BrainCircuit, text: 'Gemini AI Rx Drafting' },
  { icon: Video, text: 'HD Teleconsultation' },
  { icon: BarChart3, text: 'Adherence Analytics' },
  { icon: ShieldCheck, text: '100% Secure & Encrypted' },
];

// Simulated today's appointments
const MOCK_APPOINTMENTS = [
  { name: 'Priya Sharma', time: '10:00 AM', type: 'Video', status: 'confirmed', avatar: 'PS' },
  { name: 'Rahul Verma', time: '11:30 AM', type: 'OPD', status: 'pending', avatar: 'RV' },
  { name: 'Anjali Nair', time: '02:00 PM', type: 'Video', status: 'confirmed', avatar: 'AN' },
];

export default function DoctorHero() {
  const [activeTick, setActiveTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveTick(p => (p + 1) % 3), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-[#EFF6FF]" style={{ minHeight: '92vh' }}>
      {/* Background Orbs */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-indigo-300/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[400px] h-[300px] bg-blue-200/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 pt-16 pb-8 flex flex-col lg:flex-row gap-12 lg:gap-8 items-center">

        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 min-w-0 lg:max-w-[54%] space-y-7 select-none">

          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/80 border border-blue-200/70 text-blue-800 text-[11px] font-black tracking-widest uppercase shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
            <TranslatedText>The Next-Generation Ayurvedic EMR Suite</TranslatedText>
          </span>

          {/* Headline */}
          <h1 className="display-lg text-blue-950 font-black tracking-[-0.04em] leading-[1.05]">
            <span className="block"><TranslatedText>Run Your Entire</TranslatedText></span>
            <span className="block"><TranslatedText>OPD, Smarter &</TranslatedText></span>
            <span className="block text-blue-600 italic font-display">
              <TranslatedText>Faster — with AI.</TranslatedText>
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-base md:text-lg font-semibold text-blue-900/50 leading-relaxed max-w-[500px]">
            <TranslatedText>
              AuraSutra gives Ayurvedic clinicians a fully AI-powered EMR — generate prescriptions with Dr. Manas AI, host secure video OPDs, track patient adherence live, and scale your practice effortlessly.
            </TranslatedText>
          </p>

          {/* Feature Pills Grid */}
          <div className="grid grid-cols-2 gap-3 max-w-[480px]">
            {FEATURE_PILLS.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/80 backdrop-blur-sm border border-blue-100/90 shadow-[0_2px_12px_rgba(37,99,235,0.03)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.07)] hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 cursor-default group"
              >
                <div className="p-1.5 rounded-xl bg-blue-50 border border-blue-100 shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-black text-blue-900">
                  <TranslatedText>{text}</TranslatedText>
                </span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4 pt-2">
            <SignUpButton mode="redirect">
              <button className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-[0_8px_24px_rgba(37,99,235,0.22)] hover:-translate-y-0.5 transition-all duration-200">
                <TranslatedText>Start Free Practice</TranslatedText>
                <ArrowRight className="w-4 h-4" />
              </button>
            </SignUpButton>
            <a
              href="#suite"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white/70 backdrop-blur-md border border-blue-200 text-blue-700 font-black text-sm hover:bg-white hover:-translate-y-0.5 transition-all duration-200"
            >
              <TranslatedText>See Features</TranslatedText>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Social Proof Row */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex -space-x-2.5">
              {['Dr. A', 'Dr. M', 'Dr. P', 'Dr. S'].map((d, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-black shadow-sm"
                >
                  {d.split('.')[1]}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[10px] font-bold text-blue-900/50 mt-0.5">
                <TranslatedText>Trusted by 1,200+ Ayurvedic practitioners</TranslatedText>
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN — DASHBOARD MOCKUP ── */}
        <div className="flex-1 min-w-0 lg:max-w-[46%] relative">
          {/* Glow behind card */}
          <div className="absolute inset-4 bg-gradient-to-tr from-blue-400/15 to-indigo-400/10 rounded-[44px] blur-3xl pointer-events-none" />

          <div className="relative bg-white rounded-[36px] border border-blue-100/90 shadow-[0_32px_80px_rgba(37,99,235,0.08)] overflow-hidden transition-all duration-500 hover:shadow-[0_40px_100px_rgba(37,99,235,0.12)]">
            
            {/* Dashboard Header Bar */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">AuraSutra</p>
                  <p className="text-sm font-black text-white leading-tight">Doctor Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-black flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Top Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Today's OPD", val: '8', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Active Rx', val: '24', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Revenue', val: '₹4.2k', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map(({ label, val, icon: Icon, color, bg }) => (
                  <div key={label} className={`${bg} rounded-2xl p-3.5 border border-blue-50`}>
                    <Icon className={`w-4 h-4 ${color} mb-2`} />
                    <p className="text-xl font-black text-blue-950 leading-none">{val}</p>
                    <p className="text-[9px] font-bold text-blue-400 mt-1 uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>

              {/* Dr. Manas AI Widget */}
              <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 rounded-[20px] p-4 border border-blue-100/80 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-transparent blur-xl" />
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2 text-[10px] font-black text-blue-900 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                    Dr. Manas AI
                  </span>
                  <span className="text-[9px] font-extrabold text-blue-400 px-2 py-0.5 bg-white rounded-lg border border-blue-100 shadow-sm">Ready</span>
                </div>
                <div className="space-y-2">
                  <div className="h-7 bg-white rounded-xl border border-blue-100/70 flex items-center px-3 shadow-sm">
                    <span className="text-[9px] font-bold text-blue-950">Diagnosis: Grahani Roga (IBD) → Ayurvedic</span>
                  </div>
                  <div className="h-7 w-[88%] bg-white rounded-xl border border-blue-100/70 flex items-center px-3 shadow-sm">
                    <span className="text-[9px] font-bold text-blue-950">Rx: Shirodhara + Brahmi Taila · 7 days</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1 h-7 bg-blue-600 rounded-xl flex items-center justify-center">
                      <span className="text-[9px] font-black text-white">✓ Approve & Send</span>
                    </div>
                    <div className="h-7 px-3 bg-white border border-blue-100 rounded-xl flex items-center">
                      <span className="text-[9px] font-black text-blue-600">Edit</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Appointments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-blue-900 uppercase tracking-wider">Today's Queue</p>
                  <span className="text-[9px] text-blue-400 font-bold">3 patients</span>
                </div>
                <div className="space-y-2">
                  {MOCK_APPOINTMENTS.map((appt, idx) => (
                    <div
                      key={appt.name}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                        idx === activeTick
                          ? 'bg-blue-50 border-blue-200 shadow-[0_2px_12px_rgba(37,99,235,0.06)]'
                          : 'bg-white border-blue-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-black shrink-0">
                        {appt.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-blue-950 truncate">{appt.name}</p>
                        <p className="text-[9px] font-bold text-blue-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 shrink-0" /> {appt.time}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {appt.type === 'Video' ? (
                          <Video className="w-3 h-3 text-blue-500" />
                        ) : (
                          <Users className="w-3 h-3 text-indigo-500" />
                        )}
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                          appt.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {appt.status === 'confirmed' ? '✓ Confirmed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adherence mini bar */}
              <div className="flex items-center gap-4 p-3.5 bg-gradient-to-r from-emerald-50 to-blue-50/50 rounded-2xl border border-emerald-100/60">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Activity className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-blue-950">Avg. Treatment Adherence</span>
                    <span className="text-[10px] font-black text-emerald-600">98.4%</span>
                  </div>
                  <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full w-[98%] bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Stats Strip */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 pb-10 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST_STATS.map(({ val, label }) => (
            <div
              key={label}
              className="bg-white/70 backdrop-blur-md border border-blue-100/80 rounded-2xl px-5 py-4 flex items-center gap-4 hover:shadow-[0_4px_20px_rgba(37,99,235,0.05)] transition-shadow"
            >
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 shrink-0" />
              <div>
                <p className="text-xl font-black text-blue-950 tracking-tight">{val}</p>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
