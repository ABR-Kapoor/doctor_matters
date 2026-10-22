import Link from 'next/link';
import Footer from '@/app/components/Footer';
import Navbar from '@/app/components/Navbar';

export const metadata = {
  title: 'Medical Liability Disclaimer — AuraSutra',
  description: 'Medical liability disclaimer for practitioners listed on AuraSutra.',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen flex flex-col bg-blue-50">
      <Navbar />
      <div className="bg-blue-950 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white">
            Medical Liability Disclaimer
          </h1>
          <p className="mt-3 text-sm text-blue-400">Last updated on 10-04-2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm border border-blue-100 space-y-6">

          {/* Directory Notice */}
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl">
            <p className="text-sm font-semibold text-amber-800">
              AuraSutra is a <strong>practitioner directory and technology facilitator</strong>.
              We are NOT a healthcare provider, hospital, or clinic.
            </p>
          </div>

          <section>
            <h2 className="text-base sm:text-lg font-bold text-blue-800 mb-3">1. Independent Practitioner Status</h2>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              As a practitioner listed on AuraSutra, you are an <strong>independent professional</strong>.
              You are not an employee, agent, or partner of AuraSutra. You are solely responsible for:
            </p>
            <ul className="mt-2 space-y-2 text-gray-700 text-sm sm:text-base">
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                All medical advice, diagnosis, prescriptions, and treatment plans you provide
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Maintaining your own <strong>professional indemnity insurance</strong>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Complying with NMC guidelines and the Telemedicine Practice Guidelines 2020
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Ensuring your registration with the NMC or State Medical Council is valid and current
              </li>
            </ul>
          </section>

          <div className="w-full h-px bg-blue-100" />

          <section>
            <h2 className="text-base sm:text-lg font-bold text-blue-800 mb-3">2. Platform Limitations</h2>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              The AuraSutra platform provides technology for scheduling, video consultation, and record keeping.
              However:
            </p>
            <ul className="mt-2 space-y-2 text-gray-700 text-sm sm:text-base">
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Teleconsultation has inherent limitations and is not a complete replacement for in-person examination
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                You must exercise your professional judgment to determine if teleconsultation is appropriate
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                AuraSutra does not review, endorse, or guarantee the accuracy of your medical advice
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                The platform may experience technical interruptions beyond our control
              </li>
            </ul>
          </section>

          <div className="w-full h-px bg-blue-100" />

          <section>
            <h2 className="text-base sm:text-lg font-bold text-blue-800 mb-3">3. Prohibited Practices</h2>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              As a practitioner on this directory, you agree NOT to:
            </p>
            <ul className="mt-2 space-y-2 text-gray-700 text-sm sm:text-base">
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Prescribe Schedule X drugs or controlled substances through the platform
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Provide emergency care — patients experiencing emergencies must be directed to call 112 or visit a hospital
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Use the platform for any unlawful purpose or in violation of NMC guidelines
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Share patient data outside the platform without explicit patient consent
              </li>
            </ul>
          </section>

          <div className="w-full h-px bg-blue-100" />

          <section>
            <h2 className="text-base sm:text-lg font-bold text-blue-800 mb-3">4. Data & Record Keeping</h2>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              Per the Telemedicine Practice Guidelines 2020, consultation records including prescriptions
              and chat histories are retained for a minimum of 3 years. You are responsible for maintaining
              your own copies of patient records as required by law.
            </p>
          </section>

          <div className="w-full h-px bg-blue-100" />

          <section>
            <h2 className="text-base sm:text-lg font-bold text-blue-800 mb-3">5. Liability Cap</h2>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              To the maximum extent permitted by law, AuraSutra&apos;s total liability to you arising from
              your use of the platform is limited to the total fees paid by you to AuraSutra in the
              12 months preceding the claim. AuraSutra is not liable for any indirect, incidental,
              or consequential damages arising from your practice on the platform.
            </p>
          </section>

          <div className="w-full h-px bg-blue-100" />

          <section>
            <h2 className="text-base sm:text-lg font-bold text-blue-800 mb-3">6. Acknowledgment</h2>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              By maintaining your profile on AuraSutra, you acknowledge that you have read and understood
              this disclaimer. You agree that AuraSutra is a <strong>practitioner directory</strong> and
              you are solely responsible for your practice and patient outcomes.
            </p>
          </section>

          <div className="pt-4 border-t border-blue-100">
            <p className="text-sm text-gray-500">
              For questions regarding this disclaimer, please{' '}
              <Link href="/contact" className="text-blue-600 hover:underline">contact us</Link>.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
