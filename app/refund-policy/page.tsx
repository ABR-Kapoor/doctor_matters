import Link from 'next/link';
import Footer from '@/app/components/Footer';
import Navbar from '@/app/components/Navbar';

export const metadata = {
  title: 'Refund & Cancellation Policy — AuraSutra Doctor Portal',
};

const policies = [
  'Consultation Not Started: If the patient cancels the appointment before the consultation begins, they are eligible for a full refund. The refund request must be made within 7 days of cancellation.',
  'Call Dropped or Technical Failure: If the consultation could not be completed due to technical issues or a dropped call on the platform, the patient is eligible for a full refund or a free reschedule.',
  'Consultation Completed: Once the teleconsultation is completed and the service is delivered, no refunds will be provided to the patient.',
  'Doctor No-Show: If you do not join the call within 10 minutes of the scheduled time, an automatic full refund will be triggered for the patient.',
  'Patient Cancellation > 2 Hours Before: If the patient cancels the appointment more than 2 hours before the scheduled time, a full refund will be provided to them.',
  'Patient Cancellation < 2 Hours Before: If the patient cancels the appointment less than 2 hours before the scheduled time, a 50% refund will be provided, as your time was blocked.',
  'Refund Processing Timeline: Approved refunds will take 5-7 business days to be processed and credited back to the original payment method.',
];

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-blue-50">
      <Navbar />
      <div className="bg-blue-950 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white">Refund &amp; Cancellation Policy</h1>
          <p className="mt-3 text-sm text-blue-400">Last updated on 10-04-2026</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm border border-blue-100">
          <p className="text-gray-700 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">
            AuraSutra believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:
          </p>
          <ul className="space-y-4 sm:space-y-5">
            {policies.map((policy, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{policy}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-blue-100">
            <p className="text-sm text-gray-600">
              For any refund or cancellation queries, please{' '}
              <Link href="/contact" className="text-blue-600 hover:underline">contact us</Link>.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
