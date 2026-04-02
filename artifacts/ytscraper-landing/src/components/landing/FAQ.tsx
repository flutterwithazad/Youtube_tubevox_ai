import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Reveal } from './Reveal';
import { cn } from '@/lib/utils';

interface Props {
  freeCredits?: string;
}

export function FAQ({ freeCredits = '500' }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const freeNum = parseInt(freeCredits) || 500;
  const displayCredits = freeNum >= 1000
    ? `${(freeNum / 1000).toFixed(freeNum % 1000 === 0 ? 0 : 1)}k`
    : freeNum.toLocaleString();

  const faqs = [
    { q: "Is it really free to start?", a: `Yes! You get ${displayCredits} free comments when you sign up — no credit card required. Use them to test any video or channel right away.` },
    { q: "How does pricing work?", a: "YTScraper is completely credit-based — no subscriptions. 1 credit = 1 comment. Buy a credit pack once and use it whenever you need. Credits never expire." },
    { q: "Can I scrape entire channels?", a: "Absolutely. You can paste a channel URL and we will extract comments from their most recent videos, or you can specify exact videos to include in a bulk run." },
    { q: "What formats can I export to?", a: "We currently support CSV (great for Excel/Numbers), JSON (great for developers), and direct sync to Google Sheets." },
    { q: "Will I get blocked by YouTube?", a: "No. YTScraper runs on our distributed cloud infrastructure, not your browser. You use our IPs and proxies, so your personal YouTube account is never at risk." },
    { q: "Does it scrape replies to comments?", a: "Yes, you can choose to include or exclude nested replies in your export settings before downloading." }
  ];

  return (
    <section id="faq" className="py-24 bg-card border-y border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Frequently asked questions</h2>
        </Reveal>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <Reveal key={i} delay={(i * 100 % 400) as any}>
              <div 
                className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <div className="px-6 py-5 flex items-center justify-between">
                  <h3 className="font-bold text-lg pr-8">{faq.q}</h3>
                  <ChevronDown 
                    className={cn(
                      "w-5 h-5 text-primary transition-transform duration-300 shrink-0",
                      openIndex === i && "transform rotate-180"
                    )} 
                  />
                </div>
                <div 
                  className={cn(
                    "px-6 overflow-hidden transition-all duration-300 ease-in-out",
                    openIndex === i ? "max-h-48 pb-5 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <p className="text-muted-foreground">{faq.a}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
