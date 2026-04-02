import { PageLayout } from '@/components/landing/PageLayout';

export default function BlogPage() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-6 py-32 text-center">
        <span className="text-5xl mb-6 block">✍️</span>
        <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Blog coming soon
        </h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          We'll be sharing guides, tutorials, and research insights about YouTube data analysis.
        </p>
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700">
          ← Back to home
        </a>
      </div>
    </PageLayout>
  );
}
