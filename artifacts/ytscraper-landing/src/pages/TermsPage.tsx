import { PageLayout } from '@/components/landing/PageLayout';
import { useSiteData } from '@/hooks/useSiteData';

export default function TermsPage() {
  const { settings } = useSiteData();

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Terms of Service
        </h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: January 1, 2025</p>

        <div className="space-y-10 text-gray-600 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of terms</h2>
            <p>By accessing or using YTScraper, you agree to be bound by these Terms of Service. If you do not agree, do not use our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of service</h2>
            <p>YTScraper provides tools to extract and export publicly available YouTube comment data. Our service accesses only publicly accessible data through YouTube's official API.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Use the service for any illegal purpose</li>
              <li>Harass, stalk, or harm any individuals identified in scraped data</li>
              <li>Resell or redistribute raw comment data commercially without permission</li>
              <li>Attempt to circumvent rate limits or access controls</li>
              <li>Use the data to train AI models without permission from YouTube</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Credits and billing</h2>
            <p>Credits are purchased in advance and consumed as comments are scraped (1 credit = 1 comment). Credits are non-transferable. See our <a href="/refunds" className="text-red-600 hover:underline">Refund Policy</a> for details on refunds.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Limitation of liability</h2>
            <p>{settings.company_name} shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Contact</h2>
            <p>Questions about these terms? Contact us at <a href={`mailto:${settings.company_email}`} className="text-red-600 hover:underline">{settings.company_email}</a></p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
