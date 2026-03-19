import { Check } from 'lucide-react';
import { Reveal } from './Reveal';
import { Link } from 'wouter';

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-muted-foreground">All paid plans include a 7-day free trial. No credit card required.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          
          {/* Free Tier */}
          <Reveal delay={100} type="scale">
            <div className="bg-card rounded-3xl p-8 border border-border shadow-sm h-full">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="text-muted-foreground mb-6">Perfect for testing</div>
              <div className="mb-6">
                <span className="text-5xl font-extrabold">$0</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <a href="/dashboard/signup" className="block w-full py-3 px-6 text-center rounded-xl font-bold bg-white border-2 border-border text-foreground hover:bg-background transition-colors mb-8">
                Start Free
              </a>
              <ul className="space-y-4">
                <li className="flex gap-3"><Check className="w-5 h-5 text-[#10B981] shrink-0" /> <span className="text-muted-foreground">500 comments/mo</span></li>
                <li className="flex gap-3"><Check className="w-5 h-5 text-[#10B981] shrink-0" /> <span className="text-muted-foreground">CSV & JSON export</span></li>
                <li className="flex gap-3"><Check className="w-5 h-5 text-border shrink-0" /> <span className="text-muted-foreground opacity-50 line-through">Google Sheets sync</span></li>
                <li className="flex gap-3"><Check className="w-5 h-5 text-border shrink-0" /> <span className="text-muted-foreground opacity-50 line-through">Priority support</span></li>
              </ul>
            </div>
          </Reveal>

          {/* Starter Tier */}
          <Reveal delay={200} type="scale" className="z-10">
            <div className="bg-white rounded-3xl p-8 border-2 border-primary shadow-2xl relative md:-my-4">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="text-muted-foreground mb-6">For creators & researchers</div>
              <div className="mb-6">
                <span className="text-5xl font-extrabold">$19</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <a href="/dashboard/signup" className="block w-full py-3 px-6 text-center rounded-xl font-bold bg-primary text-primary-foreground hover:shadow-lg hover:-translate-y-0.5 transition-all mb-8">
                Start 7-Day Trial
              </a>
              <ul className="space-y-4 text-foreground">
                <li className="flex gap-3 font-medium"><Check className="w-5 h-5 text-primary shrink-0" /> <span>25,000 comments/mo</span></li>
                <li className="flex gap-3"><Check className="w-5 h-5 text-primary shrink-0" /> <span>All export formats</span></li>
                <li className="flex gap-3"><Check className="w-5 h-5 text-primary shrink-0" /> <span>Google Sheets sync</span></li>
                <li className="flex gap-3"><Check className="w-5 h-5 text-primary shrink-0" /> <span>Basic filtering</span></li>
              </ul>
            </div>
          </Reveal>

          {/* Pro Tier */}
          <Reveal delay={300} type="scale">
            <div className="bg-card rounded-3xl p-8 border border-border shadow-sm h-full">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-muted-foreground mb-6">For agencies & large teams</div>
              <div className="mb-6">
                <span className="text-5xl font-extrabold">$49</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <a href="/dashboard/signup" className="block w-full py-3 px-6 text-center rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 transition-colors mb-8">
                Start 7-Day Trial
              </a>
              <ul className="space-y-4">
                <li className="flex gap-3"><Check className="w-5 h-5 text-[#10B981] shrink-0" /> <span className="text-muted-foreground">100,000 comments/mo</span></li>
                <li className="flex gap-3"><Check className="w-5 h-5 text-[#10B981] shrink-0" /> <span className="text-muted-foreground">Channel bulk exports</span></li>
                <li className="flex gap-3"><Check className="w-5 h-5 text-[#10B981] shrink-0" /> <span className="text-muted-foreground">Advanced filtering</span></li>
                <li className="flex gap-3"><Check className="w-5 h-5 text-[#10B981] shrink-0" /> <span className="text-muted-foreground">Priority email support</span></li>
              </ul>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
