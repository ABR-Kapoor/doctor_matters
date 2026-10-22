import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from '@/app/contexts/LanguageContext';
import { cn } from "@/lib/utils";
import Preloader from '@/app/components/Preloader';
import { ClerkProvider } from '@clerk/nextjs';
import { ReactQueryProvider } from '@/app/components/ReactQueryProvider';
import CookieConsentBanner from '@/app/components/CookieConsentBanner';


// Using system fonts as fallback
// const inter = Inter({ subsets: ['latin'] });
// const alatsi = Alatsi({ weight: '400', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AuraSutra - Doctor Portal',
  description: "Practitioner directory platform — manage consultations, prescriptions, and patient records",
  keywords: ['practitioner directory', 'doctor portal', 'telemedicine', 'prescriptions'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans")}>
      <head>
        {/* Google Fonts temporarily disabled due to network issues */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AuraSutra" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <ClerkProvider appearance={{
          variables: { 
            colorPrimary: '#2563eb',
            colorBackground: '#ffffff',
            colorText: '#1e3a8a',
            colorInputBackground: '#ffffff',
            colorInputText: '#1e3a8a',
            colorTextOnPrimaryBackground: '#ffffff',
            borderRadius: '1rem',
            fontFamily: "'DM Sans', sans-serif"
          },
          elements: {
            card: {
              boxShadow: '0 20px 40px -10px rgba(37,99,235,0.15)',
              border: '1px solid #DBEAFE',
              borderRadius: '2rem',
              padding: '2rem'
            },
            headerTitle: {
              fontFamily: "'DM Serif Display', serif",
              fontSize: '1.75rem',
              color: '#172554'
            },
            headerSubtitle: {
              color: '#3b82f6'
            },
            formButtonPrimary: {
              backgroundColor: '#2563eb',
              boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)'
            },
            socialButtonsBlockButton: {
              border: '1px solid #BFDBFE',
              color: '#1d4ed8',
              backgroundColor: '#ffffff'
            },
            formFieldInput: {
              borderColor: '#BFDBFE',
              backgroundColor: '#ffffff'
            },
            formFieldLabel: {
              color: '#1e3a8a',
              fontWeight: '600'
            },
            footerActionLink: {
              color: '#2563eb',
              fontWeight: '600'
            },
            dividerLine: {
              backgroundColor: '#DBEAFE'
            },
            dividerText: {
              color: '#3b82f6'
            },
            modalBackdrop: {
              backgroundColor: 'rgba(239, 246, 255, 0.7)',
              backdropFilter: 'blur(8px)'
            }
          }
        }}>
          <LanguageProvider>
            <ReactQueryProvider>
              <Preloader />
              {children}
              <CookieConsentBanner />
            </ReactQueryProvider>
          </LanguageProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#1F2937',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              borderRadius: '12px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#3B82F6',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        </ClerkProvider>
      </body>
    </html>
  );
}
