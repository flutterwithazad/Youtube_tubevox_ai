import { PageLayout } from '@/components/landing/PageLayout';
import { useSiteData } from '@/hooks/useSiteData';

export default function CookiesPage() {
  const { settings } = useSiteData();

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Cookie Policy
        </h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: January 1, 2025</p>

        <div className="space-y-10 text-gray-600 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">What are cookies?</h2>
            <p>Cookies are small text files stored on your device when you visit a website. They help the website remember your preferences and provide a better experience.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Cookies we use</h2>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Essential cookies</h3>
                <p>Required for authentication and session management. These cannot be disabled as they are necessary for the service to function. Includes Supabase auth tokens.</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Preference cookies</h3>
                <p>Remember your UI preferences such as sidebar state. These are stored in your browser's local storage.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">What we do NOT use</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Advertising or tracking cookies</li>
              <li>Third-party analytics cookies (e.g. Google Analytics)</li>
              <li>Social media tracking pixels</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Managing cookies</h2>
            <p>You can control cookies through your browser settings. Disabling essential cookies will prevent you from logging in to YTScraper.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact</h2>
            <p>Questions? Email <a href={`mailto:${settings.company_email}`} className="text-red-600 hover:underline">{settings.company_email}</a></p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
