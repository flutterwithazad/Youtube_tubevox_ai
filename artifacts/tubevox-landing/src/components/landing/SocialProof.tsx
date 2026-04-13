import { Reveal } from './Reveal';

export function SocialProof() {
  return (
    <section className="py-12 bg-card border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">
            Trusted by teams at forward-thinking companies
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Fake company logos using text for simplicity and compliance */}
            <span className="font-display font-bold text-2xl tracking-tighter">Shopify</span>
            <span className="font-sans font-black text-2xl tracking-tight">HubSpot</span>
            <span className="font-mono font-bold text-xl">Notion</span>
            <span className="font-display font-black text-2xl italic tracking-tighter">Buffer</span>
            <span className="font-sans font-bold text-2xl tracking-tight text-orange-500/80">Semrush</span>
            <span className="font-display font-bold text-xl tracking-tight text-blue-600/80">ahrefs</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
