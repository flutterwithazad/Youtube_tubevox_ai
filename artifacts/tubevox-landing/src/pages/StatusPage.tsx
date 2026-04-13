import { PageLayout } from '@/components/landing/PageLayout';

const services = [
  { name: 'Web application',      status: 'operational' },
  { name: 'Comment scraping API', status: 'operational' },
  { name: 'Export service',       status: 'operational' },
  { name: 'Authentication',       status: 'operational' },
  { name: 'Payment processing',   status: 'operational' },
];

export default function StatusPage() {
  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            All systems operational
          </div>
          <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>
            System Status
          </h1>
          <p className="text-gray-500 mt-3 text-sm">
            Real-time status of all TubeVox services.
          </p>
        </div>

        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-10">
          {services.map((s, i) => (
            <div
              key={s.name}
              className={`flex items-center justify-between px-6 py-4 bg-white ${i < services.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <span className="text-sm font-medium text-gray-900">{s.name}</span>
              <span className="flex items-center gap-2 text-xs text-green-600 font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Operational
              </span>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">
            Experiencing an issue? <a href="/contact" className="text-red-600 hover:underline font-medium">Contact our support team →</a>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
