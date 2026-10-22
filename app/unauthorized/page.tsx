'use client';

import { useEffect } from 'react';
import { AlertCircle, ArrowLeft, LogOut } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';
import { TranslatedText } from '@/app/components/TranslatedText';

export default function UnauthorizedAccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EFF6FF] p-4">
      <div className="max-w-md w-full">
        <div className="card-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <span className="pill-badge mb-4 inline-block bg-red-50 text-red-600 border-red-200"><TranslatedText>Access Denied</TranslatedText></span>
          <h1 className="headline-md text-blue-950 mb-4"><TranslatedText>Doctor Portal Only</TranslatedText></h1>

          <div className="card-flat p-5 mb-4 text-left">
            <p className="body-md text-blue-700 mb-2">
              <TranslatedText>This is the</TranslatedText> <strong><TranslatedText>Doctor Portal</TranslatedText></strong>
            </p>
            <p className="body-md text-blue-500">
              <TranslatedText>Your account is registered as a</TranslatedText> <strong><TranslatedText>Patient</TranslatedText></strong>. <TranslatedText>You cannot access the doctor portal with a patient account.</TranslatedText>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
            <p className="body-md text-blue-600">
              <TranslatedText>Please use the</TranslatedText> <strong><TranslatedText>Patient Portal</TranslatedText></strong> <TranslatedText>to access your account.</TranslatedText>
            </p>
          </div>

          <div className="space-y-3">
            <SignOutButton>
              <button className="btn-primary w-full justify-center py-3 bg-red-600 hover:bg-red-700">
                <LogOut className="w-4 h-4" />
                <span><TranslatedText>Logout & Switch Account</TranslatedText></span>
              </button>
            </SignOutButton>

            <Link href="/" className="btn-secondary w-full justify-center py-3">
              <ArrowLeft className="w-4 h-4" />
              <span><TranslatedText>Back to Home</TranslatedText></span>
            </Link>
          </div>

          <p className="label-md text-blue-600 mt-6">
            <TranslatedText>If you believe this is an error, please contact support.</TranslatedText>
          </p>
        </div>
      </div>
    </div>
  );
}
