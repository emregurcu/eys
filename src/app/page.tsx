import Link from 'next/link';
import {
  ShoppingCart,
  BarChart3,
  Bell,
  Store,
  Globe,
  Shield,
  Truck,
  Calculator,
  FileText,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Lock,
} from 'lucide-react';

export const metadata = {
  title: 'DMT Supply - Etsy Multi-Store Order Management',
  description:
    'DMT Supply helps Etsy sellers manage orders, track shipments, calculate costs, and monitor profit across multiple stores from a single dashboard.',
};

const features = [
  {
    icon: Store,
    title: 'Multi-Store Management',
    description:
      'Connect and manage all your Etsy shops from one centralized dashboard. Switch between stores effortlessly.',
  },
  {
    icon: ShoppingCart,
    title: 'Order Management',
    description:
      'View, filter, and manage all orders across stores. Update statuses, add tracking numbers, and keep everything organized.',
  },
  {
    icon: Calculator,
    title: 'Automatic Cost Calculation',
    description:
      'Automatically calculate product costs, shipping fees, Etsy transaction fees, and net profit for every order.',
  },
  {
    icon: Truck,
    title: 'Shipment Tracking',
    description:
      'Add tracking numbers and shipping carriers. Automatically notify store managers when tracking is updated.',
  },
  {
    icon: BarChart3,
    title: 'Financial Analytics',
    description:
      'Track revenue, costs, and profit margins with detailed financial reports. View daily, monthly, and yearly summaries.',
  },
  {
    icon: Bell,
    title: 'Real-Time Notifications',
    description:
      'Get instant push notifications and email alerts for new orders, status changes, and issues. Never miss an update.',
  },
  {
    icon: Globe,
    title: 'International Shipping Rates',
    description:
      'Configure country-based shipping costs per product size. Automatic cost matching for international orders.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Invite team members with role-based access. Admins, managers, producers, and viewers — each with appropriate permissions.',
  },
  {
    icon: FileText,
    title: 'PDF Export',
    description:
      'Generate professional PDF documents for individual orders or bulk export filtered order lists for production.',
  },
];

const howItWorks = [
  {
    step: '1',
    title: 'Connect Your Store',
    description: 'Add your Etsy shop details and configure commission rates and shipping settings.',
  },
  {
    step: '2',
    title: 'Receive Orders Automatically',
    description:
      'Orders from Etsy are automatically imported via email webhook integration. No manual data entry needed.',
  },
  {
    step: '3',
    title: 'Manage & Fulfill',
    description:
      'Track production, update statuses, add tracking numbers, and monitor profit — all from one place.',
  },
];

const etsyDataUsage = [
  {
    icon: ShoppingCart,
    title: 'Order Information',
    description:
      'We read order details (order number, customer name, shipping address, item details, and pricing) to display and manage them within your dashboard.',
  },
  {
    icon: Store,
    title: 'Shop Information',
    description:
      'We access basic shop information to identify and link orders to the correct store in your account.',
  },
  {
    icon: Truck,
    title: 'Shipping Updates',
    description:
      'We use shipping information to track fulfillment status and provide delivery updates to your team.',
  },
  {
    icon: Lock,
    title: 'Data Security',
    description:
      'All data is encrypted in transit and at rest. We never share your data with third parties. You can delete your data at any time.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#F1641E] flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">DMT Supply</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
              <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
              <a href="#etsy-integration" className="hover:text-gray-900 transition-colors">Etsy Integration</a>
              <a href="#data-usage" className="hover:text-gray-900 transition-colors">Data &amp; Privacy</a>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#F1641E] text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-[#d9561a] transition-colors"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-[#F1641E] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Built for Etsy Sellers
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-tight">
              Manage All Your{' '}
              <span className="text-[#F1641E]">Etsy Stores</span>{' '}
              in One Place
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              DMT Supply is a powerful order management platform for Etsy sellers. 
              Track orders, calculate costs, monitor profits, and streamline 
              fulfillment across multiple stores.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-[#F1641E] text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-[#d9561a] transition-all shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-200"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 text-gray-600 px-8 py-3.5 rounded-xl font-medium text-lg hover:text-gray-900 transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {[
              { value: 'Multi', label: 'Store Support' },
              { value: 'Real-time', label: 'Notifications' },
              { value: 'Auto', label: 'Cost Calculation' },
              { value: 'PDF', label: 'Export Ready' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-[#F1641E]">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything You Need to Run Your Etsy Business
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From order management to financial analytics, DMT Supply provides all the tools
              you need to scale your Etsy shops efficiently.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4 group-hover:bg-[#F1641E] transition-colors">
                  <feature.icon className="w-6 h-6 text-[#F1641E] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">
              Get started in minutes. No complex setup required.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#F1641E] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-200">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Etsy Integration Section */}
      <section id="etsy-integration" className="py-24 bg-gradient-to-br from-[#232347] to-[#1a1a38]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 text-orange-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Official Etsy Integration
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Seamless Etsy API Integration
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              DMT Supply integrates with Etsy&apos;s official API to provide a seamless
              experience. Your data is always secure and up-to-date.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: 'Automatic Order Import',
                description: 'New orders from your Etsy shops are automatically imported into your dashboard via secure webhook integration.',
                icon: Zap,
              },
              {
                title: 'Product & Variant Matching',
                description: 'Intelligent matching system automatically identifies canvas sizes, frame options, and shipping rates for incoming orders.',
                icon: CheckCircle2,
              },
              {
                title: 'Multi-Currency Support',
                description: 'Handle orders in different currencies. All financial calculations support USD, EUR, GBP, and more.',
                icon: Globe,
              },
              {
                title: 'Secure Authentication',
                description: 'OAuth 2.0 based authentication ensures your Etsy account credentials are never stored on our servers.',
                icon: Lock,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-orange-400/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Usage & Privacy Section - Critical for Etsy API approval */}
      <section id="data-usage" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Transparency &amp; Privacy
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How We Use Your Etsy Data
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              We believe in full transparency. Here&apos;s exactly what data we access from your 
              Etsy account and how we use it.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {etsyDataUsage.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-green-200 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Our Data Promise
            </h3>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                We only access data necessary to provide the order management service.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                We never sell, share, or distribute your data to third parties.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                You can request deletion of all your data at any time.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                All communication is encrypted using TLS/SSL.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                API tokens are stored securely and can be revoked at any time from your Etsy account.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Ready to Streamline Your Etsy Business?
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Join Etsy sellers who use DMT Supply to save time, reduce errors,
            and maximize profits across multiple stores.
          </p>
          <div className="mt-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#F1641E] text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-[#d9561a] transition-all shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-200"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-[#F1641E] flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white">DMT Supply</span>
              </div>
              <p className="text-sm leading-relaxed max-w-md">
                DMT Supply is an order management and analytics platform designed specifically for 
                Etsy sellers managing multiple stores. We help you track orders, calculate costs, 
                and monitor profitability from a single dashboard.
              </p>
              <p className="text-xs text-gray-500 mt-4">
                DMT Supply is not affiliated with or endorsed by Etsy, Inc. &quot;Etsy&quot; is a trademark of Etsy, Inc.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#etsy-integration" className="hover:text-white transition-colors">Etsy Integration</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><a href="mailto:support@dmtedarik.com" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>&copy; {new Date().getFullYear()} DMT Supply. All rights reserved.</p>
            <p>
              <a href="mailto:support@dmtedarik.com" className="hover:text-white transition-colors">
                support@dmtedarik.com
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
