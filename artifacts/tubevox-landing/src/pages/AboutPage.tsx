import { PageLayout } from '@/components/landing/PageLayout';

export default function AboutPage() {
  return (
    <PageLayout>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <span className="inline-block text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-full mb-6">
          About us
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>
          Built for people who take<br />YouTube data seriously
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          TubeVox was built by researchers and marketers frustrated with manual comment copying.
          We made the extraction fast, reliable, and export-ready — so you can focus on insights, not infrastructure.
        </p>
      </section>

      {/* Mission */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
                Our mission
              </h2>
              <p className="text-gray-500 leading-relaxed mb-4">
                YouTube has over 2 billion users generating billions of comments every day.
                That's an unprecedented dataset of human opinions, sentiment, and behavior.
              </p>
              <p className="text-gray-500 leading-relaxed">
                Our mission is to make that data accessible — structured, clean, and ready for analysis —
                without requiring engineering expertise.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { number: '2M+',  label: 'Comments exported' },
                { number: '10K+', label: 'Researchers served' },
                { number: '50+',  label: 'Countries' },
                { number: '99.9%', label: 'Uptime' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                  <div className="text-3xl font-bold text-red-600 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center" style={{ fontFamily: 'Syne, sans-serif' }}>
          What we stand for
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { emoji: '⚡', title: 'Speed first', desc: 'No waiting. Comments are fetched and delivered in seconds, not hours.' },
            { emoji: '🔒', title: 'Privacy respecting', desc: 'We only process public YouTube data. No login required from YouTube.' },
            { emoji: '📊', title: 'Data quality', desc: 'Every export is clean, structured, and ready for Excel, Python, or any analytics tool.' },
          ].map(v => (
            <div key={v.title} className="text-center">
              <div className="text-4xl mb-4">{v.emoji}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{v.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A0A0F] py-16 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
            Ready to get started?
          </h2>
          <p className="text-white/60 mb-8 text-sm">Sign up free and start exporting YouTube comments in minutes.</p>
          <a
            href="/signup"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors"
          >
            Get started free →
          </a>
        </div>
      </section>
    </PageLayout>
  );
}
