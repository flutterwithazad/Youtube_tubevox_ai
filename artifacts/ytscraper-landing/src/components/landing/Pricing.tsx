import { Check, Zap } from 'lucide-react';
import { Reveal } from './Reveal';
import type { CreditPackage } from '@/hooks/usePlatformData';

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toString();
}

function pricePerCredit(pkg: CreditPackage): string {
  if (!pkg.credits_amount || !pkg.price) return '';
  const ppc = (pkg.price / pkg.credits_amount) * 100;
  if (ppc < 1) return `${(ppc * 10).toFixed(2)}¢ per 10 comments`;
  return `${ppc.toFixed(2)}¢ per comment`;
}

interface Props {
  freeCredits: string;
  packages: CreditPackage[];
  loading: boolean;
}

const defaultPackages: CreditPackage[] = [
  { id: 'p1', name: 'Starter Pack', description: 'Great for getting started', credits_amount: 5000, price: 9, currency: 'USD', sort_order: 1 },
  { id: 'p2', name: 'Growth Pack', description: 'For regular researchers', credits_amount: 25000, price: 29, currency: 'USD', sort_order: 2 },
  { id: 'p3', name: 'Pro Pack', description: 'For heavy users & agencies', credits_amount: 100000, price: 79, currency: 'USD', sort_order: 3 },
];

const highlightIndex = 1;

export function Pricing({ freeCredits, packages, loading }: Props) {
  const displayPackages = packages.length > 0 ? packages : defaultPackages;
  const freeNum = parseInt(freeCredits) || 500;

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-6">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, credit-based pricing</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No subscriptions. No recurring charges. Buy credits once, use them whenever you need. <strong>1 credit = 1 comment.</strong>
          </p>
        </Reveal>

        <Reveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-sm font-medium">
            <Zap className="w-4 h-4" />
            Credits never expire — use them at your own pace
          </div>
        </Reveal>

        {/* Free plan highlight */}
        <Reveal className="mb-10">
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Free Plan — No Credit Card</div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                Get{' '}
                {loading ? (
                  <span className="inline-block w-12 h-5 bg-primary/20 rounded animate-pulse align-middle" />
                ) : (
                  <span className="text-primary">{parseInt(freeCredits).toLocaleString()}</span>
                )}{' '}
                free comments when you sign up
              </h3>
              <p className="text-sm text-muted-foreground">Start scraping immediately. No payment required.</p>
            </div>
            <a
              href="/signup"
              className="shrink-0 px-6 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              Start Free →
            </a>
          </div>
        </Reveal>

        {/* Credit packages */}
        <Reveal className="text-center mb-8">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Top up anytime with a credit pack</p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-3xl p-8 border border-border animate-pulse h-72" />
            ))
          ) : (
            displayPackages.map((pkg, i) => {
              const isHighlight = i === highlightIndex || (displayPackages.length <= 2 && i === 0);
              return (
                <Reveal key={pkg.id} delay={(i * 100) as any} type="scale">
                  <div className={`rounded-3xl p-8 border flex flex-col h-full relative ${isHighlight
                    ? 'bg-white border-2 border-primary shadow-2xl md:-my-3'
                    : 'bg-card border-border shadow-sm'
                  }`}>
                    {isHighlight && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                        Best Value
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-xl font-bold mb-1">{pkg.name}</h3>
                      <p className="text-sm text-muted-foreground">{pkg.description || 'One-time purchase'}</p>
                    </div>

                    {/* Credits */}
                    <div className="mb-3">
                      <span className="text-4xl font-extrabold">{formatNumber(pkg.credits_amount)}</span>
                      <span className="text-muted-foreground ml-2">comments</span>
                    </div>

                    {/* Price */}
                    <div className="mb-1">
                      <span className="text-2xl font-bold text-foreground">${pkg.price}</span>
                      <span className="text-muted-foreground text-sm ml-1">{pkg.currency}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-6">{pricePerCredit(pkg)}</p>

                    <a
                      href="/signup"
                      className={`mt-auto block w-full py-3 px-6 text-center rounded-xl font-bold transition-all ${isHighlight
                        ? 'bg-primary text-primary-foreground hover:shadow-lg hover:-translate-y-0.5'
                        : 'bg-foreground text-background hover:bg-foreground/90'
                      }`}
                    >
                      Buy {formatNumber(pkg.credits_amount)} Credits
                    </a>

                    <ul className="mt-6 space-y-2.5">
                      <li className="flex gap-2.5 items-center text-sm">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground">Credits never expire</span>
                      </li>
                      <li className="flex gap-2.5 items-center text-sm">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground">CSV, JSON & Excel export</span>
                      </li>
                      <li className="flex gap-2.5 items-center text-sm">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground">Use on any video or channel</span>
                      </li>
                    </ul>
                  </div>
                </Reveal>
              );
            })
          )}
        </div>

        {/* Bottom note */}
        <Reveal className="text-center mt-10">
          <p className="text-sm text-muted-foreground">
            Need a bulk deal or enterprise volume?{' '}
            <a href="mailto:hello@ytscraper.com" className="text-primary hover:underline font-medium">Contact us →</a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
