'use client';

import React from 'react';
import { ShieldAlert, Check } from 'lucide-react';

interface DoctorConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
  isLoading?: boolean;
  patientName?: string;
}

export default function DoctorConsentModal({ onAccept, onDecline, isLoading, patientName }: DoctorConsentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-6 sm:p-8 relative">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-blue-100">
          <ShieldAlert className="w-8 h-8 text-blue-600" />
        </div>

        <h2 className="text-xl sm:text-2xl font-display text-blue-900 text-center mb-6">
          Teleconsultation Attestation
        </h2>

        <div className="space-y-4 mb-8 text-sm text-blue-800 leading-relaxed bg-blue-50 p-5 rounded-2xl border border-blue-100 max-h-[40vh] overflow-y-auto">
          <p className="font-semibold text-blue-900">
            {patientName
              ? `Before proceeding with ${patientName}, please confirm the following:`
              : 'Before proceeding, please confirm the following:'}
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <span>I have verified the patient&#x27;s identity before starting this teleconsultation.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <span>I have obtained verbal or written consent from the patient.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <span>I will follow the Telemedicine Practice Guidelines 2020 and maintain professional standards.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <span>I understand that AuraSutra is a practitioner directory and I am solely responsible for the medical advice provided.</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-3 px-4 text-sm font-bold bg-blue-100 text-blue-700 rounded-2xl hover:bg-blue-200 transition-all text-center"
            disabled={isLoading}
          >
            Decline & Cancel
          </button>
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                I Confirm & Join
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
