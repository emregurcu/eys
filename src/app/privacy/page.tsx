import Link from 'next/link';
import { Store, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - DMT Supply',
  description: 'DMT Supply Privacy Policy - How we collect, use, and protect your data.',
};

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-12">Last updated: March 2, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              DMT Supply (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the dmtedarik.com website and the DMT Supply
              order management platform. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our service. Please read this privacy policy
              carefully. If you do not agree with the terms of this privacy policy, please do not
              access the application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-gray-800 mb-2">2.1 Account Information</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you create an account, we collect your name, email address, and password (stored
              in hashed form). We may also collect your profile preferences and settings.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mb-2">2.2 Etsy Store Data</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you connect your Etsy store(s) to DMT Supply, we access and store the following
              information through the Etsy API:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Shop name and shop identifier</li>
              <li>Order details (order number, date, items, prices, and quantities)</li>
              <li>Customer information (name, email, shipping address) as provided by Etsy</li>
              <li>Transaction and receipt information</li>
              <li>Shipping and tracking information</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mb-2">2.3 Usage Data</h3>
            <p className="text-gray-600 leading-relaxed">
              We may collect information about how you access and use the application, including your
              device information, browser type, IP address, pages visited, and actions performed
              within the application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide, operate, and maintain our order management platform</li>
              <li>Display and manage your Etsy orders in a centralized dashboard</li>
              <li>Calculate product costs, shipping fees, marketplace fees, and profit margins</li>
              <li>Generate financial reports and analytics for your stores</li>
              <li>Send notifications about order updates, issues, and important changes</li>
              <li>Improve, personalize, and expand our services</li>
              <li>Communicate with you for customer support and updates</li>
              <li>Detect and prevent fraud and technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Etsy API Data Usage</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              DMT Supply uses the Etsy API in compliance with Etsy&apos;s API Terms of Use. Specifically:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>
                <strong>Purpose:</strong> We access your Etsy data solely to provide order management,
                cost calculation, and financial analytics services within the DMT Supply platform.
              </li>
              <li>
                <strong>Scope:</strong> We only request access to the data necessary for the features
                you use. We do not access data beyond what is required.
              </li>
              <li>
                <strong>Storage:</strong> Etsy data is stored securely in our database and is only
                accessible to you and authorized team members you have invited.
              </li>
              <li>
                <strong>No Selling:</strong> We never sell, rent, or share your Etsy data with third
                parties for marketing or advertising purposes.
              </li>
              <li>
                <strong>Revocation:</strong> You can revoke our access to your Etsy data at any time
                through your Etsy account settings or by contacting us.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not share your personal information with third parties except in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>
                <strong>With your consent:</strong> We may share information when you give us explicit
                permission to do so.
              </li>
              <li>
                <strong>Service providers:</strong> We may share data with trusted service providers
                who assist us in operating the platform (e.g., hosting, database services). These
                providers are bound by confidentiality agreements.
              </li>
              <li>
                <strong>Legal requirements:</strong> We may disclose information when required by law,
                subpoena, or other legal process.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your
              data, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
              <li>TLS/SSL encryption for all data in transit</li>
              <li>Encrypted database storage for sensitive information</li>
              <li>Hashed password storage using industry-standard algorithms</li>
              <li>Role-based access control for team member accounts</li>
              <li>Regular security audits and vulnerability assessments</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention and Deletion</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide you
              services. You can request deletion of your account and all associated data at any time
              by contacting us at{' '}
              <a href="mailto:support@dmtedarik.com" className="text-[#F1641E] hover:underline">
                support@dmtedarik.com
              </a>
              . Upon receiving a deletion request, we will delete your data within 30 days, except
              where we are required to retain it by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Revoke Etsy API access at any time</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Cookies and Tracking</h2>
            <p className="text-gray-600 leading-relaxed">
              We use essential cookies to maintain your session and authentication state. We do not
              use third-party tracking cookies or advertising cookies. Session cookies are
              automatically deleted when you close your browser.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              Your continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please
              contact us at:
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
            <Link href="/privacy" className="hover:text-gray-900 transition-colors font-medium text-gray-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
