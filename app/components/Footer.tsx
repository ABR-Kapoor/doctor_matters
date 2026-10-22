'use client';

import Link from 'next/link';
import { ShieldCheck, Heart, Mail, Phone, MapPin, Youtube, Linkedin, Instagram, Award, Sparkles } from 'lucide-react';
import { TranslatedText } from '@/app/components/TranslatedText';

export default function Footer() {
  return (
    <footer className="bg-blue-950 text-blue-100 border-t border-blue-900/80 pt-16 pb-8 px-6 md:px-12 w-full font-sans select-none">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-12 border-b border-blue-900/60 text-left">
        
        {/* Column 1: Brand and Certifications */}
        <div className="space-y-5">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
            <img 
              src="/AuraSutra-Full_BlackText-Transparent.png" 
              alt="AuraSutra Logo" 
              className="h-10 w-auto object-contain brightness-0 invert" 
            />
          </Link>
          <p className="text-xs md:text-sm font-semibold text-blue-300/80 leading-relaxed">
            <TranslatedText>Connecting patients with verified practitioners. Streamlining consultations, digital records, and practice management for modern clinicians.</TranslatedText>
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-900/40 border border-blue-800/80 rounded-xl text-blue-200">
              <Award className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px] md:text-xs font-black tracking-wider uppercase"><TranslatedText>Udhyam Registered Enterprise</TranslatedText></span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-900/40 border border-blue-800/80 rounded-xl text-blue-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11px] md:text-xs font-black tracking-wider uppercase"><TranslatedText>Young India Initiative</TranslatedText></span>
            </div>
          </div>
        </div>

        {/* Column 2: Platform Resources */}
        <div className="space-y-4">
          <h4 className="text-xs md:text-sm font-black tracking-widest text-white uppercase"><TranslatedText>Platform</TranslatedText></h4>
          <ul className="space-y-2.5 text-xs md:text-sm font-semibold">
            {[
              { label: 'Platform Features', href: '#features' },
              { label: 'Interactive Suite', href: '#suite' },
              { label: 'Dr. Manas AI Guide', href: '#faq' },
              { label: 'Security Standards', href: '#competitors' },
            ].map((item) => (
              <li key={item.label}>
                <a href={item.href} className="text-blue-300 hover:text-white transition-colors">
                  <TranslatedText>{item.label}</TranslatedText>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Trust & Legal */}
        <div className="space-y-4">
          <h4 className="text-xs md:text-sm font-black tracking-widest text-white uppercase"><TranslatedText>Trust & Policies</TranslatedText></h4>
          <ul className="space-y-2.5 text-xs md:text-sm font-semibold">
            {[
              { label: 'Privacy Policy', href: '/privacy-policy' },
              { label: 'Terms & Conditions', href: '/terms-and-conditions' },
              { label: 'Refund Policy', href: '/refund-policy' },
              { label: 'Disclaimer', href: '/disclaimer' },
              { label: 'Our Vision', href: '/vision' },
              { label: 'About Us', href: '/about' },
              { label: 'Contact Support', href: '/contact' },
            ].map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-blue-300 hover:text-white transition-colors">
                  <TranslatedText>{item.label}</TranslatedText>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4: Contact & Social Ecosystem */}
        <div className="space-y-4">
          <h4 className="text-xs md:text-sm font-black tracking-widest text-white uppercase"><TranslatedText>Clinic Support</TranslatedText></h4>
          <ul className="space-y-3 text-xs md:text-sm font-semibold text-blue-300">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span><TranslatedText>Bhilai, Chhattisgarh, India</TranslatedText></span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-blue-400 shrink-0" />
              <a href="tel:+919770075755" className="hover:text-white transition-colors">+91 9770075755</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-blue-400 shrink-0" />
              <a href="tel:+917582985761" className="hover:text-white transition-colors">+91 7582985761</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <a href="mailto:support@aurasutra.org" className="hover:text-white transition-colors">support@aurasutra.org</a>
            </li>
          </ul>

          <div className="pt-2 space-y-3">
            <h5 className="text-[10px] md:text-xs font-black uppercase text-blue-400 tracking-wider"><TranslatedText>Our Ecosystem</TranslatedText></h5>
            <div className="flex items-center gap-3">
              {[
                { icon: <Linkedin className="w-4 h-4" />, href: 'https://www.linkedin.com/company/frequnsync/about', label: 'LinkedIn' },
                { icon: <Instagram className="w-4 h-4" />, href: 'https://www.instagram.com/frequnsync/', label: 'Instagram' },
                { icon: <Youtube className="w-4 h-4" />, href: 'https://www.youtube.com/@FrequnSync-Genz', label: 'YouTube' },
              ].map((social) => (
                <a 
                  key={social.label}
                  href={social.href}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-blue-900/60 hover:bg-blue-800 border border-blue-800/40 flex items-center justify-center text-blue-300 hover:text-white transition-all hover:scale-105"
                  title={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div className="max-w-[1440px] mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs md:text-sm font-semibold text-blue-400/80">
        <p className="text-center sm:text-left">
          &copy; 2026 AuraSutra An{' '}
          <a
            href="https://www.frequnsync.online/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-white/85 transition-colors"
          >
            FrequnSync
          </a>
          {' '}Product. <TranslatedText>All rights reserved.</TranslatedText>
        </p>
        <div className="flex items-center gap-4 justify-center flex-wrap">
          <Link href="/privacy-policy" className="hover:text-white transition-colors">
            <TranslatedText>Privacy</TranslatedText>
          </Link>
          <Link href="/terms-and-conditions" className="hover:text-white transition-colors">
            <TranslatedText>Terms</TranslatedText>
          </Link>
          <Link href="/refund-policy" className="hover:text-white transition-colors">
            <TranslatedText>Refunds</TranslatedText>
          </Link>
          <Link href="/disclaimer" className="hover:text-white transition-colors">
            <TranslatedText>Disclaimer</TranslatedText>
          </Link>
          <Link href="/contact" className="hover:text-white transition-colors">
            <TranslatedText>Contact</TranslatedText>
          </Link>
          <span className="text-blue-400/60 text-[11px]">Grievance: <a href="mailto:grievance@aurasutra.org" className="hover:text-white transition-colors">grievance@aurasutra.org</a></span>
        </div>
      </div>
    </footer>
  );
}

