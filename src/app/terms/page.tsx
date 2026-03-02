import Link from 'next/link';
import { Store, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - DMT Supply',
  description: 'DMT Supply Terms of Service - Rules and guidelines for using our platform.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F1641E] flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">DMT Supply</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-12">Last updated: March 2, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using the DMT Supply platform at dmtedarik.com (&quot;Service&quot;), you agree
              to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms,
              you must not access or use the Service. These Terms apply to all visitors, users, and
              others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              DMT Supply is an order management and analytics platform designed for Etsy sellers.
              The Service allows users to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
              <li>Connect and manage multiple Etsy stores from a single dashboard</li>
              <li>Import and manage orders from Etsy</li>
              <li>Calculate product costs, shipping fees, and marketplace commissions</li>
              <li>Track shipments and fulfillment status</li>
              <li>Generate financial reports and analytics</li>
              <li>Receive notifications about order updates and issues</li>
              <li>Collaborate with team members using role-based access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              To use the Service, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete account information</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              We reserve the right to suspend or terminate accounts that violate these Terms or
              that have been inactive for an extended period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Etsy Integration</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              By connecting your Etsy account to DMT Supply, you:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Authorize us to access your Etsy store data through the Etsy API</li>
              <li>Confirm that you are the authorized owner or operator of the connected Etsy shop(s)</li>
              <li>
                Agree to comply with Etsy&apos;s Terms of Use and API Terms of Use in connection with
                your use of the Service
              </li>
              <li>
                Understand that we are a third-party service and are not affiliated with, endorsed
                by, or sponsored by Etsy, Inc.
              </li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              You may disconnect your Etsy account at any time through your account settings or by
              revoking access through Etsy directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
            <p className="text-gray-600 leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use the Service to transmit malware, viruses, or harmful code</li>
              <li>Share your account credentials with unauthorized individuals</li>
              <li>Scrape, crawl, or use automated tools to extract data from the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data and Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="text-[#F1641E] hover:underline">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your data. By using the Service,
              you consent to the data practices described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service and its original content, features, and functionality are owned by DMT
              Supply and are protected by international copyright, trademark, and other intellectual
              property laws. You retain ownership of any data you input into the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
              whether express or implied. We do not warrant that the Service will be uninterrupted,
              error-free, or secure. Financial calculations, cost estimates, and profit projections
              provided by the Service are for informational purposes only and should not be relied
              upon as the sole basis for business decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              To the maximum extent permitted by law, DMT Supply and its operators shall not be
              liable for any indirect, incidental, special, consequential, or punitive damages,
              including loss of profits, data, or business opportunities, arising out of or related
              to your use of the Service. Our total liability for any claim related to the Service
              shall not exceed the amount paid by you, if any, for access to the Service during
              the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
            <p className="text-gray-600 leading-relaxed">
              You agree to indemnify, defend, and hold harmless DMT Supply, its operators,
              directors, employees, and agents from and against any claims, damages, losses, costs,
              or expenses (including legal fees) arising from your use of the Service, your
              violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Modifications to the Service</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue the Service (or any part
              thereof) at any time with or without notice. We shall not be liable to you or any
              third party for any modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes
              by posting the updated Terms on this page and updating the &quot;Last updated&quot; date. Your
              continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              We may terminate or suspend your access to the Service immediately, without prior
              notice, for any reason, including breach of these Terms. Upon termination, your
              right to use the Service will cease immediately. You may also terminate your account
              at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Governing Law</h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws,
              without regard to conflict of law principles. Any disputes arising under these Terms
              shall be subject to the exclusive jurisdiction of the competent courts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="mt-4 bg-gray-50 rounded-xl p-6">
              <p className="text-gray-700 font-medium">DMT Supply</p>
              <p className="text-gray-600">
                Email:{' '}
                <a href="mailto:support@dmtedarik.com" className="text-[#F1641E] hover:underline">
                  support@dmtedarik.com
                </a>
              </p>
              <p className="text-gray-600">Website: dmtedarik.com</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} DMT Supply. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors font-medium text-gray-900">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
