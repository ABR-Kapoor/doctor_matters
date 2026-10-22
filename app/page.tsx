'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, User, Award, Menu, X, Stethoscope, Users, 
  BarChart3, FileText, Shield, ArrowRight, 
  Video, Zap, Clock, Lock, ArrowUpRight, Heart, BrainCircuit,
  TrendingUp, Pill, Activity, ShieldCheck, Check, Star, Mail,
  UserPlus, LogIn, Plus, Minus, Home, MousePointerClick
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/app/components/Footer';
import CustomCursor from '@/app/components/CustomCursor';
import { TranslatedText } from '@/app/components/TranslatedText';
import CardSwipe from '@/components/ui/card-swipe';
import { Link000, Link004, Link005 } from '@/components/ui/skiper-ui/skiper40';

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'emr' | 'video' | 'patients'>('ai');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { isSignedIn: isAuthenticated, isLoaded } = useAuth();
  const isLoading = !isLoaded;
  const [showPage, setShowPage] = useState(false);
  const router = useRouter();

  const toggleFAQ = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  // Auto-redirect authenticated doctors to their dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show page after 3s even if Clerk hasn't loaded
  useEffect(() => {
    if (isLoaded) {
      setShowPage(true);
    } else {
      const timer = setTimeout(() => setShowPage(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  if (isLoading && !showPage) {
    return (
      <div className="min-h-screen bg-[#EFF6FF] flex items-center justify-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200/80 animate-ping" />
          <div className="absolute inset-2 rounded-full border-4 border-blue-500/80 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFF6FF] text-blue-950 antialiased overflow-x-hidden selection:bg-blue-200 selection:text-blue-900">
      <CustomCursor />

      {/* 1. Glassmorphic Navigation (Patient Style) */}
      <div className="sticky top-0 z-50 w-full px-4 md:px-8 pt-2.5 pb-1.5 pointer-events-none">
        <nav className="max-w-[1440px] mx-auto rounded-3xl border border-blue-200/60 bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(37,99,235,0.06)] pointer-events-auto transition-all duration-300 hover:shadow-[0_12px_40px_rgba(37,99,235,0.1)]">
          <div className="px-6 md:px-10 py-2.5 flex items-center justify-between gap-4">
            
            {/* Brand Logo */}
            <div className="flex items-center shrink-0">
              <Link href="/" className="flex items-center hover:opacity-90 smooth-transition">
                <img 
                  src="/AuraSutra-Full_BlackText-Transparent.png" 
                  alt="AuraSutra Logo" 
                  className="h-11 md:h-12 w-auto object-contain" 
                />
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-10 whitespace-nowrap">
              {['#features', '#suite', '#competitors', '#faq'].map((href, i) => (
                <Link000
                  key={href}
                  href={href}
                  className="text-sm font-extrabold tracking-tight text-blue-700 hover:text-blue-900 transition-colors"
                >
                  {['Features', 'Interactive Tour', 'Why AuraSutra', 'FAQ'][i]}
                </Link000>
              ))}
            </div>

            {/* Language Switcher + Authentication */}
            <div className="hidden md:flex items-center gap-5 shrink-0 whitespace-nowrap">
              <LanguageSwitcher />

              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 font-extrabold hover:bg-blue-100 smooth-transition text-xs shadow-sm animate-fade-in"
                >
                  <User className="w-4 h-4 shrink-0" />
                  <TranslatedText>Dashboard</TranslatedText>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <SignInButton mode="redirect">
                    <button className="px-4 py-2 rounded-2xl text-xs font-extrabold text-blue-700 hover:bg-yellow-50 smooth-transition border border-transparent hover:border-orange-200 cursor-pointer">
                      <TranslatedText>Sign In</TranslatedText>
                    </button>
                  </SignInButton>
                  <SignUpButton mode="redirect">
                    <button className="px-5 py-2 text-xs font-black flex items-center gap-1.5 shadow-sm rounded-2xl bg-blue-600 hover:bg-yellow-400 hover:to-orange-400 hover:text-white text-white smooth-transition cursor-pointer">
                      <TranslatedText>Join as Doctor</TranslatedText>
                      <span className="font-sans text-[10px]">→</span>
                    </button>
                  </SignUpButton>
                </div>
              )}
            </div>

            {/* Mobile direct actions (No sandwich/hamburger menu, matching patient style) */}
            <div className="flex md:hidden items-center gap-2.5 shrink-0 whitespace-nowrap pointer-events-auto">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="w-9 h-9 rounded-xl border border-blue-200/80 bg-blue-50/50 flex items-center justify-center text-blue-700 font-extrabold hover:bg-blue-100 smooth-transition shadow-sm shrink-0"
                  title="Dashboard"
                >
                  <User className="w-[18px] h-[18px] text-blue-600" />
                </Link>
              ) : (
                <SignInButton mode="redirect">
                  <button 
                    className="w-9 h-9 rounded-xl border border-blue-200/80 bg-blue-50/50 flex items-center justify-center text-blue-700 font-extrabold hover:bg-blue-100 smooth-transition shadow-sm shrink-0 cursor-pointer"
                    title="Sign In"
                  >
                    <User className="w-[18px] h-[18px] text-blue-600" />
                  </button>
                </SignInButton>
              )}
            </div>

          </div>
        </nav>
      </div>

      {/* 2. Premium Hero Section (Desktop Optimized) */}
      <section className="relative pt-6 pb-16 md:pt-14 md:pb-28 px-4 md:px-12 w-full overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-white to-white">
        {/* Stunning Ambient Glowing Backdrops */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[70vw] h-[70vw] bg-radial-gradient from-blue-300/30 via-indigo-200/5 to-transparent blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute -top-32 -left-32 -z-10 w-[450px] h-[450px] bg-blue-400/15 blur-[140px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/2 -right-32 -z-10 w-[400px] h-[400px] bg-indigo-300/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto max-w-[1360px]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-16 items-center">
            
            {/* Left Content Column */}
            <div className="text-left space-y-6 sm:space-y-8 select-none">
              <h2 className="pill-badge mb-2 hidden sm:inline-flex items-center gap-2 bg-white border border-blue-200 text-blue-700 shadow-sm py-1.5 px-4 rounded-full text-xs font-black tracking-wide">
                <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                <TranslatedText as="fragment">The Next-Generation Digital EMR Suite</TranslatedText>
              </h2>

              <h1 className="text-blue-950 font-black tracking-[-0.04em] leading-[1.02] text-[28px] xs:text-3xl sm:text-5xl md:text-6xl xl:text-7.5xl">
                <TranslatedText as="fragment">Empower Your OPD,</TranslatedText>
                <br />
                <em className="block text-blue-600 italic font-display not-italic">
                  <TranslatedText as="fragment">Automate Clinical Care.</TranslatedText>
                </em>
              </h1>

              <p className="text-sm sm:text-base md:text-lg font-bold text-blue-900/50 leading-relaxed max-w-xl">
                <TranslatedText>The ultimate practice assistant for modern clinicians. Generate intelligent digital prescriptions in one tap via Dr. Manas AI, host secure video sessions, and capture deep patient adherence profiles.</TranslatedText>
              </p>

               {/* High-conversion SaaS Action Panel */}
              <div className="space-y-4 pt-1 max-w-xl w-full">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <SignUpButton mode="redirect">
                    <button className="px-7 py-3.5 sm:px-9 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-yellow-400 hover:to-orange-400 text-white rounded-full font-black text-sm shadow-[0_12px_28px_rgba(37,99,235,0.25)] hover:shadow-[0_16px_36px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:scale-[0.98] smooth-transition flex items-center justify-center gap-2.5 cursor-pointer text-center">
                      <TranslatedText>Start Practice For Free</TranslatedText>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </SignUpButton>

                  <a
                    href="#suite"
                    className="px-7 py-3.5 sm:px-9 sm:py-4 border-2 border-blue-600/10 hover:border-blue-600/30 text-blue-700 rounded-full font-black text-sm bg-white/70 backdrop-blur-md hover:bg-white hover:-translate-y-0.5 active:scale-[0.98] smooth-transition shadow-[0_2px_12px_rgba(37,99,235,0.01)] flex items-center justify-center text-center"
                  >
                    <TranslatedText>See Tour</TranslatedText>
                  </a>
                </div>

                {/* Trust Proof & Certifications Badges */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pl-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center text-amber-400 gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs font-black text-blue-950">
                      4.9/5 <span className="text-blue-900/50 font-bold">Rating</span>
                    </span>
                  </div>

                  <div className="h-4 w-px bg-blue-100 hidden sm:block" />

                  <span className="text-[11px] font-black text-blue-500 tracking-wider uppercase hidden sm:flex items-center gap-1.5 bg-blue-50/50 border border-blue-100/50 px-2.5 py-1 rounded-md">
                    <ShieldCheck className="w-4 h-4 text-blue-500 animate-pulse" />
                    100% Secure & Encrypted
                  </span>
                </div>
              </div>
            </div>

            {/* Right Graphic Column: Ultra-Premium Doctor Showcase */}
            <div className="relative w-full mx-auto select-none flex items-center justify-center min-h-[220px] lg:min-h-[460px] group">
              {/* Outer soft glowing backdrop */}
              <div className="absolute w-[240px] sm:w-[450px] h-[240px] sm:h-[450px] bg-gradient-to-tr from-blue-400/20 to-indigo-400/20 rounded-full opacity-35 blur-[50px] sm:blur-[75px] group-hover:scale-105 transition-transform duration-700 animate-pulse" />
              
              {/* Sleek Bezel Frame Container */}
              <div className="relative overflow-hidden bg-white/40 backdrop-blur-md rounded-[28px] sm:rounded-[48px] border border-blue-200/60 p-1.5 sm:p-4 shadow-[0_32px_96px_rgba(37,99,235,0.08)] transition-all duration-500 hover:shadow-[0_48px_110px_rgba(37,99,235,0.12)] hover:-translate-y-1">
                {/* Premium Doctor Hero Image */}
                <img 
                  src="/minimal_doctor_hero.png" 
                  alt="AuraSutra Premium Clinical Doctor Showcase" 
                  className="w-full max-w-[200px] xs:max-w-[240px] sm:max-w-[420px] h-auto rounded-[20px] sm:rounded-[36px] object-cover pointer-events-auto transition-transform duration-500 hover:scale-[1.015]"
                />
              </div>

              {/* Floating Glassmorphic Pill 1 (Top Left) */}
              <div className="absolute -top-4 -left-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-100/80 shadow-[0_16px_36px_rgba(37,99,235,0.08)] px-5 py-3.5 hidden sm:flex items-center gap-3 animate-bounce hover:scale-105 smooth-transition" style={{ animationDuration: '6s' }}>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                </div>
                <div>
                  <span className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest">Dr. Manas AI</span>
                  <span className="block text-xs font-black text-blue-950">Rx Drafting Preset</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[8px] font-extrabold text-emerald-600">Active</span>
              </div>

              {/* Floating Glassmorphic Pill 2 (Bottom Right) */}
              <div className="absolute -bottom-4 -right-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-100/80 shadow-[0_16px_36px_rgba(37,99,235,0.08)] px-5 py-3.5 hidden sm:flex items-center gap-3 animate-bounce hover:scale-105 smooth-transition" style={{ animationDuration: '8s' }}>
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="block text-[8px] font-black text-blue-400 uppercase tracking-widest">OPD Capacity</span>
                  <span className="block text-xs font-black text-blue-950">1,482 Patients</span>
                </div>
                <span className="text-[9px] font-black text-emerald-600">↑ 18.4%</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. The AuraSutra Clinical Experience: Journey of a Consultation */}
      <div id="features"><section id="suite" className="py-16 md:py-20 px-4 md:px-8 w-full bg-white relative overflow-hidden">
        {/* Soft Decorative Orbs */}
        <div className="absolute top-1/4 right-0 -z-10 w-[40vw] h-[40vw] bg-radial-gradient from-blue-100/30 to-transparent blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 -z-10 w-[40vw] h-[40vw] bg-radial-gradient from-indigo-100/30 to-transparent blur-[100px] rounded-full pointer-events-none" />

        <div className="container mx-auto max-w-[1300px]">
          {/* Header Block */}
          <div className="text-center mb-14 md:mb-16">
            <h3 className="pill-badge mb-4 inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 py-1.5 px-4 rounded-full text-xs font-black tracking-wide">
              <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
              <TranslatedText as="fragment">Interactive Showcase</TranslatedText>
            </h3>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-blue-950 mb-4 tracking-tight">
              <TranslatedText as="fragment">The Modern Doctor</TranslatedText>{' '}
              <em className="text-blue-600 italic font-display not-italic"><TranslatedText as="fragment">Workflow</TranslatedText></em>
            </h2>
            <p className="text-sm md:text-base font-bold text-blue-900/50 max-w-xl mx-auto">
              <TranslatedText>A visual timeline of exactly how AuraSutra digitizes and automates your entire patient health consultation cycle.</TranslatedText>
            </p>
          </div>

          {/* Interactive CardSwipe Component (Mobile only) */}
          <div className="md:hidden py-2 mb-10">
            <CardSwipe />
          </div>

          {/* Majestic Storytelling Timeline Rows (Desktop only) */}
          <div className="hidden md:flex flex-col gap-16 lg:gap-20">
            
            {/* Step 1: AI Prescription Drafting */}
            <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 lg:gap-12 items-center">
              {/* Story Details */}
              <div className="space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100/60">
                  <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                  <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest">Step 01 — Pre-Consultation</h4>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-black text-blue-950 leading-tight">
                  <TranslatedText as="fragment">Draft Intelligent EMRs In One Tap</TranslatedText>
                </h3>
                
                <p className="text-sm font-medium text-blue-900/60 leading-relaxed">
                  <TranslatedText>AuraSutra's proprietary Google Gemini assistant reads initial patient symptom logs, medical history, and clinical signs to draft a comprehensive diagnostic profile and prescription guideline instantly.</TranslatedText>
                </p>

                <ul className="space-y-4 pt-2">
                  {[
                    "Save up to 12 minutes per patient slot",
                    "Dual prescribing: Ayurvedic herbal presets + Modern pharmaceuticals",
                    "Integrated clinical alerts for active dosage interactions"
                  ].map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className="text-sm font-bold text-blue-900"><TranslatedText>{benefit}</TranslatedText></span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Breathtaking Screenshot Mockup */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 to-indigo-400/20 rounded-[44px] opacity-25 blur-3xl -z-10 group-hover:scale-105 smooth-transition" />
                
                <div className="overflow-hidden bg-white rounded-[36px] border border-blue-100/80 shadow-[0_32px_80px_rgba(37,99,235,0.06)] p-3 relative hover:shadow-[0_40px_96px_rgba(37,99,235,0.09)] hover:-translate-y-1.5 smooth-transition">
                  <span className="absolute top-6 right-6 z-20 px-3.5 py-1.5 rounded-full bg-blue-950/85 backdrop-blur-md text-white border border-white/20 text-[9px] font-black uppercase tracking-widest shadow-md">
                    <TranslatedText>Dr. Manas Live</TranslatedText>
                  </span>
                  <img 
                    src="/doctor_dashboard_mockup.png" 
                    alt="Dr. Manas AI Drafting Prescriptions Screen" 
                    className="w-full h-auto rounded-[28px] object-cover hover:scale-[1.01] smooth-transition"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: HD Teleconsultation Room */}
            <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 lg:gap-12 items-center">
              {/* Breathtaking Screenshot Mockup */}
              <div className="relative group order-2 md:order-1">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-400/20 to-blue-400/20 rounded-[44px] opacity-25 blur-3xl -z-10 group-hover:scale-105 smooth-transition" />
                
                <div className="overflow-hidden bg-white rounded-[36px] border border-blue-100/80 shadow-[0_32px_80px_rgba(37,99,235,0.06)] p-3 relative hover:shadow-[0_40px_96px_rgba(37,99,235,0.09)] hover:-translate-y-1.5 smooth-transition">
                  <span className="absolute top-6 left-6 z-20 px-3.5 py-1.5 rounded-full bg-blue-950/85 backdrop-blur-md text-white border border-white/20 text-[9px] font-black uppercase tracking-widest shadow-md">
                    <TranslatedText>HD Secure Consultation</TranslatedText>
                  </span>
                  <img 
                    src="/telehealth_video_consultation.png" 
                    alt="HD Telehealth Consultation EMR Integration Screen" 
                    className="w-full h-auto rounded-[28px] object-cover hover:scale-[1.01] smooth-transition"
                  />
                </div>
              </div>

              {/* Story Details */}
              <div className="space-y-6 text-left order-1 md:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100/60">
                  <Video className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest">Step 02 — Real-time Consult</h4>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-black text-blue-950 leading-tight">
                  <TranslatedText as="fragment">Integrated Secure HD Telehealth Room</TranslatedText>
                </h3>
                
                <p className="text-sm font-medium text-blue-900/60 leading-relaxed">
                  <TranslatedText>Say goodbye to sending manual Zoom, Google Meet, or WhatsApp video consultation links. Host fully encrypted high-definition consult sessions inside your unified dashboard, editing patient vitals live.</TranslatedText>
                </p>

                <ul className="space-y-4 pt-2">
                  {[
                    "Single unified consulting window — no tab-switching",
                    "Conformity to strict data governance standards",
                    "Record diagnosis details, dietary schedules, and checkouts simultaneously"
                  ].map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Check className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <span className="text-sm font-bold text-blue-900"><TranslatedText>{benefit}</TranslatedText></span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Step 3: Vitals & Adherence Dashboard */}
            <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 lg:gap-12 items-center">
              {/* Story Details */}
              <div className="space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100/60">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest">Step 03 — Post-Consultation</h4>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-black text-blue-950 leading-tight">
                  <TranslatedText as="fragment">Continuous Vitals Loops & Adherence</TranslatedText>
                </h3>
                
                <p className="text-sm font-medium text-blue-900/60 leading-relaxed">
                  <TranslatedText>Follow up dynamically without manual messaging. AuraSutra provides patients with an interactive tracker. Daily pill compliance and symptom levels flow straight back into your dashboard as healing curves.</TranslatedText>
                </p>

                <ul className="space-y-4 pt-2">
                  {[
                    "Continuous vitals monitoring for high-risk cohorts",
                    "Auto-reminders for medicine intake and clinic slots",
                    "Secure cloud-based patient digital health history tracking"
                  ].map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className="text-sm font-bold text-blue-900"><TranslatedText>{benefit}</TranslatedText></span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Breathtaking Screenshot Mockup */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/20 to-blue-400/20 rounded-[44px] opacity-25 blur-3xl -z-10 group-hover:scale-105 smooth-transition" />
                
                <div className="overflow-hidden bg-white rounded-[36px] border border-blue-100/80 shadow-[0_32px_80px_rgba(37,99,235,0.06)] p-3 relative hover:shadow-[0_40px_96px_rgba(37,99,235,0.09)] hover:-translate-y-1.5 smooth-transition">
                  <span className="absolute top-6 right-6 z-20 px-3.5 py-1.5 rounded-full bg-blue-950/85 backdrop-blur-md text-white border border-white/20 text-[9px] font-black uppercase tracking-widest shadow-md">
                    <TranslatedText>Healing & Adherence Curves</TranslatedText>
                  </span>
                  <img 
                    src="/patient_emr_timeline.png" 
                    alt="Patient Vitals Adherence Timeline Tracking Screen" 
                    className="w-full h-auto rounded-[28px] object-cover hover:scale-[1.01] smooth-transition"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>
      </div>

      {/* 5. Competitor Head-to-Head Comparison Table */}
      <section id="competitors" className="py-20 md:py-28 px-4 md:px-8 w-full bg-white relative overflow-hidden">
        {/* Soft glowing ambient vector blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-blue-400/5 to-indigo-400/5 rounded-full opacity-35 blur-[100px] pointer-events-none" />

        <div className="container mx-auto max-w-[1100px] relative z-10">
          <div className="text-center mb-16">
            <h3 className="pill-badge mb-4 inline-block bg-blue-50 text-blue-700 border border-blue-100"><TranslatedText as="fragment">Comparison</TranslatedText></h3>
            <h2 className="headline-lg text-blue-950 mb-3 tracking-tight font-black">
              <TranslatedText as="fragment">How AuraSutra Stand Out</TranslatedText>
            </h2>
            <p className="body-md text-blue-900/60 max-w-xl mx-auto">
              We benchmarked common clinic platforms (Practo, Zocdoc, NoQueue) against our clinical automation metrics:
            </p>
          </div>

          <div className="overflow-x-auto rounded-[36px] border border-blue-100 bg-[#F8FAFF] shadow-[0_18px_44px_rgba(37,99,235,0.06)]">
            <table className="w-full min-w-[780px] border-collapse">
              <thead>
                <tr className="bg-[#F1F5FF]">
                  <th className="w-[34%] text-left px-5 md:px-6 py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.13em] text-blue-900 border-b border-blue-100">
                    <TranslatedText>Features</TranslatedText>
                  </th>
                  <th className="text-center px-4 py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.13em] text-blue-900 border-b border-blue-100 border-l border-blue-100 bg-[#EAF1FF]">
                    Aurasutra
                  </th>
                  <th className="text-center px-4 py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.13em] text-blue-700 border-b border-blue-100 border-l border-blue-100">
                    Practo
                  </th>
                  <th className="text-center px-4 py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.13em] text-blue-700 border-b border-blue-100 border-l border-blue-100">
                    Zocdoc
                  </th>
                  <th className="text-center px-4 py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.13em] text-blue-700 border-b border-blue-100 border-l border-blue-100">
                    Noqueue
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AI EMR Prescription Drafting", aurasutra: "strong", practo: "no", zocdoc: "no", noqueue: "no" },
                  { feature: "Interactive Patient Adherence Tracks", aurasutra: "strong", practo: "no", zocdoc: "no", noqueue: "no" },
                  { feature: "Secure Integrated Telehealth Video", aurasutra: "strong", practo: "no", zocdoc: "no", noqueue: "no" },
                  { feature: "Integrated Doctor Branding Tools", aurasutra: "strong", practo: "no", zocdoc: "no", noqueue: "no" },
                  { feature: "Multi-lingual Instant Translation", aurasutra: "strong", practo: "no", zocdoc: "no", noqueue: "no" }
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-blue-100 last:border-b-0">
                    <td className="px-5 md:px-6 py-5.5 text-[12px] md:text-[16px] font-bold text-blue-950 leading-snug">
                      <TranslatedText>{row.feature}</TranslatedText>
                    </td>
                    {[row.aurasutra, row.practo, row.zocdoc, row.noqueue].map((status, idx) => (
                      <td key={`${row.feature}-${idx}`} className={`px-4 py-6 text-center border-l border-blue-100 ${idx === 0 ? 'bg-[#EEF4FF]' : ''}`}>
                        {status === "no" ? (
                          <X className="w-[19px] h-[19px] md:w-[21px] md:h-[21px] mx-auto text-blue-800/90" strokeWidth={2.3} />
                        ) : (
                          <Check className={`w-[19px] h-[19px] md:w-[21px] md:h-[21px] mx-auto ${status === "strong" ? 'text-blue-600' : 'text-blue-400'}`} strokeWidth={2.4} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. Why Doctors Trust AuraSutra (Metrics/Stats) */}
      <section className="py-16 md:py-24 px-4 md:px-8 w-full bg-[#EFF6FF] relative">
        <div className="container mx-auto max-w-[1200px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { val: "12m", label: "Consultation Time Saved", sub: "per patient via Dr. Manas AI" },
              { val: "98.4%", label: "Treatment Adherence", sub: "reported across patient cohort" },
              { val: "10k+", label: "Completed Consultations", sub: "secure telehealth OPD sessions" },
              { val: "0s", label: "Manual Data Entry Delay", sub: "instant cloud prescription push" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white border border-blue-100/60 rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-[0_8px_24px_rgba(37,99,235,0.02)] space-y-2">
                <h4 className="text-3xl sm:text-4xl font-black text-blue-600 tracking-tight font-display">{stat.val}</h4>
                <p className="text-xs font-black text-blue-950 uppercase tracking-wider leading-snug">{stat.label}</p>
                <p className="text-xs font-semibold text-blue-400/85 leading-normal">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Practice FAQ Section */}
      <section id="faq" className="py-20 md:py-28 px-4 md:px-8 w-full bg-[#EFF6FF]/40 relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-blue-100/40 rounded-full blur-[90px] pointer-events-none" />

        <div className="container mx-auto max-w-[800px] relative z-10">
          <div className="text-center mb-16">
            <h3 className="pill-badge mb-4 inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100">
              <TranslatedText as="fragment">Platform Guidance</TranslatedText>
            </h3>
            <h2 className="text-3xl md:text-4xl font-black text-blue-950 mb-3 tracking-tight">
              <TranslatedText as="fragment">Frequently Answered Questions</TranslatedText>
            </h2>
            <p className="text-sm md:text-base font-bold text-blue-900/50 max-w-xl mx-auto">
              Simple clinical and operational guidance answers for practitioners.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How does Dr. Manas AI assistant generate clinical prescriptions?",
                a: "Dr. Manas AI utilizes advanced Google Gemini architectures. By analyzing patient symptoms, clinical logs, and past medical history, it automatically drafts highly accurate prescription cards including medicine dosages, instructions, and dietary advice. You retain 100% control to review, edit, or approve before completion."
              },
              {
                q: "Is patient medical data fully secure and private?",
                a: "Absolutely. AuraSutra strictly enforces end-to-end database encryption. All EMR details, video consult notes, and vitals logs are secured on Neon Postgres database clusters, conforming to rigorous healthcare data privacy and secure cloud-backed medical records storage guidelines."
              },
              {
                q: "Can I host video consultations directly inside the app?",
                a: "Yes. Our dashboard features an integrated telehealth room powered by Zegocloud. You can start video consults directly from your schedule queue, drafting EMR details simultaneously in a unified window."
              },
              {
                q: "How do patients submit progress adherence trackers?",
                a: "AuraSutra provides a dedicated patient-side application. Patients receive push vitals alerts, check off daily pill adherence, and update symptoms. These reports compile instantly in your doctor dashboard analytics."
              }
            ].map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-white rounded-2xl border border-blue-100/70 shadow-sm overflow-hidden smooth-transition hover:border-blue-200/80"
                >
                  <button
                    onClick={() => toggleFAQ(idx)}
                    className="w-full flex items-center justify-between px-4 md:px-5 py-3 md:py-4 text-left hover:bg-blue-50/20 smooth-transition focus:outline-none cursor-pointer"
                  >
                    <p className="text-sm md:text-base font-black text-blue-950 leading-snug">
                      <TranslatedText>{faq.q}</TranslatedText>
                    </p>
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        <div className="px-4 md:px-5 pb-3 md:pb-4 pt-0 border-t border-blue-50 text-xs md:text-sm text-blue-900/60 leading-relaxed font-semibold">
                          <TranslatedText>{faq.a}</TranslatedText>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Call to Action Banner */}
      <section className="py-16 md:py-24 px-6 md:px-8 w-full bg-white relative">
        <div className="container mx-auto max-w-[1100px] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[36px] p-8 sm:p-12 md:p-16 text-center text-white relative overflow-hidden shadow-[0_24px_60px_rgba(37,99,235,0.2)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <h3 className="px-4 py-1.5 rounded-full bg-white/20 text-white text-xs font-black tracking-widest uppercase inline-block"><TranslatedText as="fragment">Zero setup fee</TranslatedText></h3>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight leading-tight">
              <TranslatedText as="fragment">Transform Your Clinical OPD Today</TranslatedText>
            </h2>
            <p className="text-sm sm:text-base font-semibold text-blue-100 max-w-xl mx-auto">
              <TranslatedText>Join over 1,200+ healthcare practitioners automating EMR flows, scheduling, and teleconsultation on AuraSutra.</TranslatedText>
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <SignUpButton mode="redirect">
                <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-700 rounded-full font-extrabold text-base hover:bg-yellow-300 hover:text-black hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                  <TranslatedText>Register As Doctor</TranslatedText>
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                </button>
              </SignUpButton>
              
              <SignInButton mode="redirect">
                <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-700/30 border border-white/20 text-white rounded-full font-extrabold text-base hover:bg-blue-700/50 smooth-transition cursor-pointer">
                  <TranslatedText>Doctor Login</TranslatedText>
                </button>
              </SignInButton>
              

            </div>
          </div>
        </div>
      </section>

      {/* 9. Polished Footer */}
      <Footer />

      {/* Premium Glassmorphic Mobile Bottom Sticky Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden w-[92%] max-w-[340px] rounded-[24px] bg-white/90 border border-blue-200/60 backdrop-blur-xl shadow-[0_16px_36px_rgba(37,99,235,0.08)] px-2 py-1.5 flex items-center justify-around gap-1 transition-all duration-300">
        
        {/* Home */}
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center justify-center gap-1 text-blue-700/70 hover:text-blue-900 active:scale-95 smooth-transition px-2.5 py-1 shrink-0 cursor-pointer"
        >
          <Home className="w-4.5 h-4.5" />
          <span className="text-[7px] font-black tracking-wider uppercase">Home</span>
        </button>

        {/* Showcase */}
        <button 
          onClick={() => document.getElementById('suite')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex flex-col items-center justify-center gap-0.5 text-blue-700/70 hover:text-blue-900 active:scale-95 smooth-transition px-2.5 py-1 shrink-0 cursor-pointer"
        >
          <MousePointerClick className="w-4.5 h-4.5 text-blue-600" />
          <span className="text-[7px] font-black tracking-wider uppercase">Showcase</span>
        </button>

        {/* Symmetrical Center Auth/Join Button */}
        {isAuthenticated ? (
          <Link
            href="/dashboard"
            className="flex items-center justify-center rounded-full w-[44px] h-[44px] min-w-[44px] min-h-[44px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-500 hover:scale-105 active:scale-95 shadow-[0_6px_16px_rgba(37,99,235,0.25)] transition-all duration-300 shrink-0 relative"
            title="Dashboard"
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white animate-ping" />
          </Link>
        ) : (
          <SignUpButton mode="redirect">
            <button
              className="flex items-center justify-center rounded-full w-[44px] h-[44px] min-w-[44px] min-h-[44px] bg-gradient-to-r from-blue-600 to-blue-600 text-white border border-blue-500 hover:scale-105 active:scale-95 shadow-[0_6px_16px_rgba(37,99,235,0.25)] transition-all duration-300 shrink-0 relative cursor-pointer"
              title="Register As Doctor"
            >
              <UserPlus className="w-5 h-5 shrink-0" />
            </button>
          </SignUpButton>
        )}

        {/* Stand Out */}
        <button 
          onClick={() => document.getElementById('competitors')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex flex-col items-center justify-center gap-0.5 text-blue-700/70 hover:text-blue-900 active:scale-95 smooth-transition px-2.5 py-1 shrink-0 cursor-pointer"
        >
          <BrainCircuit className="w-4.5 h-4.5 text-blue-600" />
          <span className="text-[7px] font-black tracking-wider uppercase">Stand Out</span>
        </button>

        {/* Dashboard / Profile */}
        <Link 
          href="/dashboard"
          className="flex flex-col items-center justify-center gap-0.5 text-blue-700/70 hover:text-blue-900 active:scale-95 smooth-transition px-2.5 py-1 shrink-0"
        >
          <User className="w-4.5 h-4.5" />
          <span className="text-[7px] font-black tracking-wider uppercase">Dashboard</span>
        </Link>

      </div>
    </div>
  );
}
