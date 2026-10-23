'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 p-4 text-slate-800">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-100 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Something went wrong!</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {error?.message || 'A critical error occurred while loading the application.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => reset()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <Link
                href="/dashboard"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                <Home className="h-4 w-4 text-slate-500" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
