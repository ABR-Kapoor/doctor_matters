'use client';

import { TranslatedText } from '@/app/components/TranslatedText';

export default function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1 py-12">
      {/* Heartbeat ECG Animation (Perfectly Centered) */}
      <div className="relative w-48 h-20 flex items-center justify-center">
        <svg
          viewBox="0 0 200 100"
          className="w-full h-full stroke-blue-200/40"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Background Path (Light) */}
          <path
            d="M 0 50 L 40 50 L 50 50 L 55 40 L 60 50 L 65 50 L 70 20 L 75 80 L 80 50 L 90 50 L 100 30 L 110 50 L 200 50"
            strokeWidth="3"
          />
          
          {/* Animated Path Segment (Brighter Blue) */}
          <path
            d="M 0 50 L 40 50 L 50 50 L 55 40 L 60 50 L 65 50 L 70 20 L 75 80 L 80 50 L 90 50 L 100 30 L 110 50 L 200 50"
            stroke="#3b82f6"
            strokeWidth="3.5"
            className="ecg-path"
          />
        </svg>
      </div>

      <style jsx>{`
        .ecg-path {
          stroke-dasharray: 40 320;
          animation: travel 2s linear infinite;
        }

        @keyframes travel {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -360; }
        }
      `}</style>

      {/* Label (Centered & Subtle) */}
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[10px] text-blue-600 font-display font-bold italic tracking-[0.2em] uppercase opacity-60">
          <TranslatedText>Loading</TranslatedText>
        </p>
      </div>
    </div>
  );
}
