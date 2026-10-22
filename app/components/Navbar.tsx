'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SignUpButton, useAuth } from '@clerk/nextjs';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { TranslatedText } from '@/app/components/TranslatedText';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isSignedIn: isAuthenticated } = useAuth();

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        <Link href="/" className="flex items-center">
          <img src="/AuraSutra-Full_BlackText-Transparent.png" alt="AuraSutra" className="h-12 object-contain" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-40">
            <LanguageSwitcher />
          </div>
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-sm font-semibold smooth-transition hover:bg-blue-100"
            >
              <TranslatedText>Dashboard</TranslatedText>
            </Link>
          ) : (
            <SignUpButton mode="redirect">
              <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-sm font-semibold smooth-transition hover:bg-blue-100">
                <TranslatedText>Get Started</TranslatedText> →
              </button>
            </SignUpButton>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-blue-700 hover:bg-blue-100 rounded-lg smooth-transition"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden px-6 pt-3 pb-5 border-t border-blue-100 flex flex-col gap-3">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="w-full text-center px-4 py-3 bg-blue-50 border border-blue-200 rounded-full text-blue-800 text-sm font-semibold">
              <TranslatedText>Dashboard</TranslatedText>
            </Link>
          ) : (
            <SignUpButton mode="redirect">
              <button className="w-full text-center px-4 py-3 rounded-full bg-blue-600 text-white text-sm font-semibold">
                <TranslatedText>Register as Doctor</TranslatedText>
              </button>
            </SignUpButton>
          )}
        </div>
      )}
    </nav>
  );
}
