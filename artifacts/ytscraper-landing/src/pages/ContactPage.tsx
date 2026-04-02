import { useState } from 'react';
import { PageLayout } from '@/components/landing/PageLayout';
import { SocialIcon } from '@/components/landing/SocialIcon';
import { useSiteData } from '@/hooks/useSiteData';

function ContactForm({ contactEmail }: { contactEmail: string }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, to: contactEmail }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Message sent!</h3>
        <p className="text-sm text-gray-500">We'll get back to you within 24 hours.</p>
        <button onClick={() => setStatus('idle')} className="mt-4 text-sm text-red-600 hover:underline">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Name *</label>
          <input
            type="text" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Email *</label>
          <input
            type="email" required value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Subject</label>
        <input
          type="text" value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
          placeholder="What's this about?"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Message *</label>
        <textarea
          required rows={5} value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white resize-none"
          placeholder="Tell us how we can help..."
        />
      </div>
      {status === 'error' && (
        <p className="text-sm text-red-600">Something went wrong. Please try emailing us directly.</p>
      )}
      <button
        type="submit" disabled={status === 'sending'}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
      >
        {status === 'sending' ? 'Sending...' : 'Send message →'}
      </button>
    </form>
  );
}

export default function ContactPage() {
  const { settings, socialLinks } = useSiteData();

  return (
    <PageLayout>
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-full mb-6">
            Contact us
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
            We'd love to hear from you
          </h1>
          <p className="text-lg text-gray-500">Questions, feedback, partnership ideas — we read every message.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact info */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>
              Contact information
            </h2>

            {settings.contact_email && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Email</p>
                  <a href={`mailto:${settings.contact_email}`} className="text-sm text-red-600 hover:underline">
                    {settings.contact_email}
                  </a>
                </div>
              </div>
            )}

            {settings.contact_phone && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Phone</p>
                  <a href={`tel:${settings.contact_phone}`} className="text-sm text-gray-600 hover:text-red-600">
                    {settings.contact_phone}
                  </a>
                </div>
              </div>
            )}

            {settings.contact_address && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Address</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{settings.contact_address}</p>
                </div>
              </div>
            )}

            {settings.contact_hours && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Business hours</p>
                  <p className="text-sm text-gray-600">{settings.contact_hours}</p>
                </div>
              </div>
            )}

            {socialLinks.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900 mb-3">Follow us</p>
                <div className="flex items-center gap-3">
                  {socialLinks.map(link => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.platform}
                      className="w-9 h-9 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-xl flex items-center justify-center transition-colors text-gray-500"
                    >
                      <SocialIcon iconKey={link.icon_key} className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contact form */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>
              Send us a message
            </h2>
            <ContactForm contactEmail={settings.contact_email} />
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
