import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { SocialProof } from '@/components/landing/SocialProof';
import { Features } from '@/components/landing/Features';
import { UseCases } from '@/components/landing/UseCases';
import { DatasetPreview } from '@/components/landing/DatasetPreview';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Testimonials } from '@/components/landing/Testimonials';
import { FAQ } from '@/components/landing/FAQ';
import { Pricing } from '@/components/landing/Pricing';
import { Footer } from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { usePlatformData } from '@/hooks/usePlatformData';

function FinalCTA({ freeCredits, loading }: { freeCredits: string; loading: boolean }) {
  const freeNum = parseInt(freeCredits) || 500;
  const displayCredits = freeNum >= 1000
    ? `${(freeNum / 1000).toFixed(freeNum % 1000 === 0 ? 0 : 1)}k`
    : freeNum.toLocaleString();

  return (
    <section className="bg-[#0A0A0F] py-24 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl text-center md:text-left">
            <Reveal>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Ready to get to work?</h2>
              <p className="text-xl text-white/60">Get free credits when you sign up. No subscription required.</p>
            </Reveal>
          </div>
          <Reveal delay={200} className="shrink-0 flex flex-col items-center">
            <a
              href="/dashboard/signup"
              className="px-8 py-5 rounded-2xl font-bold text-lg bg-primary text-white shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:shadow-[0_0_60px_rgba(99,102,241,0.5)] hover:-translate-y-1 transition-all active:translate-y-0 w-full md:w-auto text-center"
            >
              START FOR FREE →
            </a>
            <p className="mt-4 text-sm text-white/40 text-center">
              {loading ? (
                <span className="inline-block w-48 h-4 bg-white/10 rounded animate-pulse" />
              ) : (
                <>Free plan · No credit card · <strong className="text-white/60">{displayCredits} comments</strong> included</>
              )}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { freeCredits, packages, loading } = usePlatformData();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main>
        <Hero freeCredits={freeCredits} loading={loading} />
        <SocialProof />
        <Features />
        <UseCases />
        <DatasetPreview />
        <HowItWorks />
        <Testimonials />
        <FAQ freeCredits={freeCredits} />
        <Pricing freeCredits={freeCredits} packages={packages} loading={loading} />
        <FinalCTA freeCredits={freeCredits} loading={loading} />
      </main>

      <Footer />
    </div>
  );
}
