import { PageLayout } from '@/components/landing/PageLayout';
import { useSiteData } from '@/hooks/useSiteData';

export default function PrivacyPage() {
  const { settings } = useSiteData();
  const updated = 'January 1, 2025';

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: {updated}</p>

        <div className="space-y-10 text-gray-600 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information we collect</h2>
            <p>When you create an account, we collect your name and email address. When you use TubeVox, we collect information about the YouTube videos you scrape (video URLs, comment data) and your usage patterns.</p>
            <p className="mt-3">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. How we use your information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and improve our service</li>
              <li>To send important account notifications</li>
              <li>To process payments and manage your credits</li>
              <li>To detect and prevent fraud and abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Data storage and security</h2>
            <p>Your data is stored securely using Supabase (PostgreSQL) hosted on AWS infrastructure. We use industry-standard encryption for data in transit (TLS) and at rest.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use tracking or advertising cookies. See our <a href="/cookies" className="text-red-600 hover:underline">Cookie Policy</a> for details.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Your rights</h2>
            <p>You have the right to access, correct, or delete your personal data at any time. Contact us at <a href={`mailto:${settings.company_email}`} className="text-red-600 hover:underline">{settings.company_email}</a> to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Contact</h2>
            <p>{settings.company_name}<br />Email: <a href={`mailto:${settings.company_email}`} className="text-red-600 hover:underline">{settings.company_email}</a></p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
