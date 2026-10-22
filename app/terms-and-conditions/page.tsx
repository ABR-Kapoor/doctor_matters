import Link from 'next/link';
import Footer from '@/app/components/Footer';
import Navbar from '@/app/components/Navbar';

export const metadata = {
  title: 'Terms & Conditions — AuraSutra Doctor Portal',
};

const terms = [
  'To access and use the Services, you agree to provide true, accurate and complete information to us during and after registration.',
  'AuraSutra acts solely as a technology facilitator and directory. We are NOT a healthcare provider, hospital, or clinic.',
  'As a practitioner on our platform, you are an independent professional. AuraSutra is not liable for any medical advice, diagnosis, prescription, or treatment provided by you.',
  'This platform is NOT intended for medical emergencies. You must advise patients to visit the nearest hospital in case of an emergency.',
  'You acknowledge that teleconsultation has inherent limitations and is not a complete replacement for an in-person physical examination. You must exercise your professional judgment.',
  'The responsibility for prescriptions, medical advice, and treatment plans lies entirely with you, the registered medical practitioner.',
  'As per the Telemedicine Practice Guidelines (2020), consultation records, including prescriptions and chat histories, may be retained for a minimum of 3 years.',
  'Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials offered on this website.',
  'Your use of our Services and the website is solely at your own risk and discretion.',
  'You agree to pay us the charges associated with availing the Services.',
  'You understand that upon initiating a transaction for availing the Services you are entering into a legally binding and enforceable contract.',
  'These Terms and any dispute or claim relating to it shall be governed by and construed in accordance with the laws of India.',
  'All disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in Bhilai, Chhattisgarh.',
];

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-blue-50">
      <Navbar />
      <div className="bg-blue-950 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white">Terms &amp; Conditions</h1>
          <p className="mt-3 text-sm text-blue-400">Last updated on 10-04-2026</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm border border-blue-100">
          <p className="text-gray-700 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">
            These Terms and Conditions, along with privacy policy or other terms (&quot;Terms&quot;) constitute a binding
            agreement by and between <strong>ABEER KAPOOR</strong> (&quot;Website Owner&quot; or &quot;we&quot; or &quot;us&quot; or &quot;our&quot;) and you
            (&quot;you&quot; or &quot;your&quot;) and relate to your use of our website, goods (as applicable) or services (as applicable) (collectively, &quot;Services&quot;).
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            By using our website and availing the Services, you agree that you have read and accepted these Terms
            (including the Privacy Policy). We reserve the right to modify these Terms at any time and without
            assigning any reason. It is your responsibility to periodically review these Terms to stay informed of updates.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            The use of this website or availing of our Services is subject to the following terms of use:
          </p>
          <ul className="space-y-3 sm:space-y-4">
            {terms.map((term, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{term}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8 p-4 border rounded-xl border-blue-100 bg-blue-50">
            <h2 className="text-base sm:text-lg font-bold text-blue-800 mb-2">Grievance Officer</h2>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              In compliance with the Telemedicine Practice Guidelines 2020 and the Information Technology Act, 2000, any grievances or complaints regarding the platform may be addressed to the Grievance Officer: <strong>Abeer Kapoor</strong>, Email: <a href="mailto:grievance@aurasutra.org" className="font-semibold underline text-blue-600">grievance@aurasutra.org</a>. We will acknowledge receipt of your complaint within 48 hours and resolve it within 30 days.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
