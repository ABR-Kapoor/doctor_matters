import Link from 'next/link';
import Footer from '@/app/components/Footer';
import Navbar from '@/app/components/Navbar';

export const metadata = {
  title: 'Contact Us — AuraSutra Doctor Portal',
  description: 'Get in touch with the AuraSutra team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-blue-50">
      <Navbar />
      {/* Hero */}
      <div className="bg-blue-950 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white">Contact Us</h1>
          <p className="mt-3 text-sm sm:text-base text-blue-300 max-w-2xl">
            We are here to help. Reach out to our team anytime.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm border border-blue-100">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="rounded-xl p-4 sm:p-5 bg-blue-50 border border-blue-100">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">Email</p>
              <a href="mailto:support@aurasutra.org" className="text-sm sm:text-base font-medium text-blue-900 hover:underline">
                support@aurasutra.org
              </a>
            </div>
            <div className="rounded-xl p-4 sm:p-5 bg-blue-50 border border-blue-100">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">Address</p>
              <p className="text-sm sm:text-base font-medium text-blue-900">Bhilai, Chhattisgarh, India</p>
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3">Phone</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-xl p-4 sm:p-5 bg-blue-50 border border-blue-100">
                <p className="text-xs sm:text-sm text-blue-600 mb-1">Abeer Kapoor — Founder</p>
                <a href="tel:+919770075755" className="text-sm sm:text-base font-medium text-blue-900 hover:underline">
                  +91 97700 75755
                </a>
              </div>
              <div className="rounded-xl p-4 sm:p-5 bg-blue-50 border border-blue-100">
                <p className="text-xs sm:text-sm text-blue-600 mb-1">Gaurav Kumar — Co-Founder</p>
                <a href="tel:+917582985761" className="text-sm sm:text-base font-medium text-blue-900 hover:underline">
                  +91 75829 85761
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4 sm:p-5 bg-blue-50 border border-blue-100">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">Support Hours</p>
            <p className="text-sm sm:text-base font-medium text-blue-900">Monday – Saturday, 9:00 AM – 6:00 PM IST</p>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
