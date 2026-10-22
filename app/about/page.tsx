import Link from 'next/link';
import Footer from '@/app/components/Footer';
import Navbar from '@/app/components/Navbar';

export const metadata = {
  title: 'About Us — AuraSutra Doctor Portal',
  description: 'Learn about AuraSutra and our mission to empower Ayurvedic healthcare practitioners.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-blue-50">
      <Navbar />
      {/* Hero */}
      <div className="bg-blue-950 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white">About AuraSutra</h1>
          <p className="mt-3 text-sm sm:text-base text-blue-300 max-w-2xl">
            Empowering Ayurvedic healthcare practitioners with modern technology.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm border border-blue-100">

          <section className="mb-10">
            <h2 className="text-lg sm:text-xl font-bold text-blue-800 mb-3">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              AuraSutra is an AI-powered telemedicine platform dedicated to making Ayurvedic healthcare accessible to everyone.
              For practitioners, we provide a seamless digital workspace to manage appointments, consult patients via video,
              issue digital prescriptions, and grow their practice — all in one place.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg sm:text-xl font-bold text-blue-800 mb-3">What We Offer Practitioners</h2>
            <ul className="space-y-3">
              {[
                { title: 'Patient Management', desc: 'Comprehensive patient profiles, medical history, and appointment tracking.' },
                { title: 'Video Consultations', desc: 'Conduct secure HD video consultations from anywhere.' },
                { title: 'Digital Prescriptions', desc: 'Create, manage and send digital prescriptions and treatment plans.' },
                { title: 'Appointment Scheduling', desc: 'Smart calendar management with real-time booking and notifications.' },
                { title: 'Practice Analytics', desc: 'Track earnings, appointments, and patient adherence metrics.' },
              ].map(item => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-blue-900">{item.title}:</span>{' '}
                    <span className="text-gray-600">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-lg sm:text-xl font-bold text-blue-800 mb-3">Why AuraSutra</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {[
                { stat: 'AYUSH Certified', desc: 'Trusted by Ministry of AYUSH verified practitioners.' },
                { stat: '4.9★ Rating', desc: 'Consistently rated by thousands of satisfied patients.' },
                { stat: '24/7 Platform', desc: 'Your practice available to patients around the clock.' },
              ].map(item => (
                <div key={item.stat} className="rounded-xl p-4 bg-blue-50 border border-blue-100">
                  <p className="font-bold text-lg text-blue-700">{item.stat}</p>
                  <p className="text-sm mt-1 text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-blue-800 mb-3">Our Values</h2>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              We believe in practitioner-first design, clinical transparency, and the timeless efficacy of Ayurvedic medicine.
              Every feature we build is guided by our commitment to helping practitioners deliver authentic, affordable,
              and accessible Ayurvedic care to millions of patients across India and beyond.
            </p>
          </section>

          <div className="pt-4 border-t border-blue-100">
            <Link href="/contact" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              Get in touch with us →
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
