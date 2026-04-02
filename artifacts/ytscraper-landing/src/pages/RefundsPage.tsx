import { PageLayout } from '@/components/landing/PageLayout';
import { useSiteData } from '@/hooks/useSiteData';

export default function RefundsPage() {
  const { settings } = useSiteData();

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Refund Policy
        </h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: January 1, 2025</p>

        <div className="space-y-10 text-gray-600 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Credit refunds</h2>
            <p>Unused credits may be refunded within 14 days of purchase if you have not used more than 10% of the purchased credits. To request a refund, contact us at <a href={`mailto:${settings.contact_email}`} className="text-red-600 hover:underline">{settings.contact_email}</a> with your order details.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Non-refundable situations</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Credits that have already been used to fetch comments</li>
              <li>Credits purchased more than 14 days ago</li>
              <li>Accounts suspended for Terms of Service violations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Processing time</h2>
            <p>Approved refunds are processed within 5–10 business days and returned to your original payment method.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact us</h2>
            <p>Email: <a href={`mailto:${settings.contact_email}`} className="text-red-600 hover:underline">{settings.contact_email}</a></p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
