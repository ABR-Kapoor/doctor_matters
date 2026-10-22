import Link from 'next/link';
import Footer from '@/app/components/Footer';
import Navbar from '@/app/components/Navbar';

export const metadata = {
  title: 'Privacy Policy — AuraSutra Doctor Portal',
};

const sections = [
  { heading: 'Information We Collect', content: 'We collect information you provide during registration and use of our Services, including your name, email address, phone number, medical registration details, and professional credentials. We also collect technical data such as device type, IP address, and usage patterns to improve our platform.' },
  { heading: 'How We Use Your Information', content: 'Your information is used to provide and improve our Services — including managing your practitioner profile, facilitating patient consultations, processing earnings, and sending appointment notifications. We may use anonymized data for platform analytics and improvements.' },
  { heading: 'Sharing of Information', content: 'We share your professional profile with patients who book consultations with you. We use trusted third-party payment processors for secure earnings processing. We do not sell your personal data to any third party. We may disclose information if required by law.' },
  { heading: 'Patient Data Access', content: 'As a practitioner, you are granted access to the health information of your patients solely for the purpose of providing consultations and treatment. You agree to handle patient data with strict confidentiality and in compliance with applicable healthcare privacy regulations.' },
  { heading: 'Data Security', content: 'We implement industry-standard security measures including encryption in transit and at rest, secure authentication, and regular security audits to protect your data and patient data on our platform.' },
  { heading: 'Cookies', content: 'Our platform uses cookies to maintain your session, remember preferences, and improve your experience. You may disable cookies through your browser settings, though this may affect platform functionality.' },
  { heading: 'Your Rights', content: 'You have the right to access, correct, or delete your personal information at any time by contacting us at support@aurasutra.org.' },
  { heading: 'Changes to This Policy', content: 'We may update this Privacy Policy from time to time. Significant changes will be communicated via email or platform notification.' },
  { heading: 'Contact Us', content: 'For privacy-related concerns, please contact us at support@aurasutra.org or through the Contact Us page.' },
  { heading: 'Grievance Officer', content: 'In compliance with the Telemedicine Practice Guidelines 2020 and the Information Technology Act, 2000, any grievances or complaints regarding the platform may be addressed to the Grievance Officer: Abeer Kapoor, Email: grievance@aurasutra.org. We will acknowledge receipt of your complaint within 48 hours and resolve it within 30 days.' },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-blue-50">
      <Navbar />
      <div className="bg-blue-950 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white">Privacy Policy</h1>
          <p className="mt-3 text-sm text-blue-400">Last updated on 10-04-2026</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm border border-blue-100">
          <p className="text-gray-700 leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base">
            At AuraSutra, we are committed to protecting your privacy. This Privacy Policy explains how we collect,
            use, and safeguard your personal information when you use the AuraSutra Doctor Portal.
          </p>
          <div className="space-y-6 sm:space-y-8">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-base sm:text-lg font-bold text-blue-800 mb-2 sm:mb-3">{section.heading}</h2>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{section.content}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
