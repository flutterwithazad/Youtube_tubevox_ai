import { DashboardShell } from "@/components/layout/DashboardShell";
import { Zap, ArrowUpRight, ArrowDownRight, CreditCard, Gift, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Credits() {
  const [loading, setLoading] = useState(false);

  const handleBuy = (pack: string) => {
    toast.success(`Redirecting to checkout for ${pack}... (Mocked)`);
  };

  const history = [
    { id: 1, date: 'Today, 10:42 AM', desc: 'Job: Why I left...', type: 'debit', amount: -3, balance: 1240 },
    { id: 2, date: 'Yesterday, 2:15 PM', desc: 'Job: MKBHD Review', type: 'debit', amount: -5, balance: 1243 },
    { id: 3, date: 'Oct 12, 9:00 AM', desc: 'Job Cancel Refund', type: 'credit', amount: 2, balance: 1248 },
    { id: 4, date: 'Oct 10, 1:00 PM', desc: 'Purchased Starter Pack', type: 'credit', amount: 1000, balance: 1246 },
    { id: 5, date: 'Oct 1, 8:00 AM', desc: 'Welcome Bonus', type: 'credit', amount: 500, balance: 500 },
  ];

  return (
    <DashboardShell title="Credits & Billing">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground">Credit Balance</h2>
        <p className="text-muted-foreground mt-1">Manage your credits and view transaction history.</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-card to-secondary border border-border rounded-2xl p-6 sm:p-8 shadow-sm mb-10 relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold tracking-wider uppercase text-sm mb-2">
              <Zap className="w-4 h-4" /> Current Balance
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-mono font-bold text-foreground">1,240</span>
              <span className="text-lg text-muted-foreground font-medium">credits</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground bg-background/50 border border-border px-3 py-1.5 rounded-md inline-flex items-center gap-2">
              <span className="font-mono text-xs">1 credit = 1,000 comments</span>
            </p>
          </div>
          
          <div className="bg-background border border-border rounded-xl p-4 md:w-64 shrink-0">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Auto-refill
            </h4>
            <p className="text-xs text-muted-foreground mb-4">Never run out of credits mid-scrape.</p>
            <button className="w-full py-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium rounded-lg transition-colors border border-border">
              Enable (Coming soon)
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Packages */}
      <div className="mb-12">
        <h3 className="text-xl font-display font-bold text-foreground mb-6">Get More Credits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pack 1 */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <h4 className="font-bold text-lg text-foreground mb-1">Starter</h4>
            <p className="text-sm text-muted-foreground mb-6">Perfect for occasional research.</p>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-3xl font-mono font-bold text-foreground">1,000</span>
              <span className="text-muted-foreground">credits</span>
            </div>
            <div className="mb-6">
              <span className="text-2xl font-bold text-foreground">$19</span>
            </div>
            <button onClick={() => handleBuy('Starter')} className="mt-auto w-full py-2.5 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-xl border border-border transition-colors">
              Buy Now
            </button>
          </div>

          {/* Pack 2 */}
          <div className="bg-card border-2 border-primary rounded-2xl p-6 shadow-lg shadow-primary/5 flex flex-col relative transform md:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <span className="text-yellow-300">★</span> Most Popular
            </div>
            <h4 className="font-bold text-lg text-foreground mb-1">Professional</h4>
            <p className="text-sm text-muted-foreground mb-6">For serious data operations.</p>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-mono font-bold text-primary">5,000</span>
              <span className="text-muted-foreground font-medium">credits</span>
            </div>
            <div className="mb-6 flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">$79</span>
              <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded font-medium">Save 15%</span>
            </div>
            <button onClick={() => handleBuy('Professional')} className="mt-auto w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md shadow-primary/25 hover:-translate-y-0.5 transition-all">
              Buy Now
            </button>
          </div>

          {/* Pack 3 */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <h4 className="font-bold text-lg text-foreground mb-1">Agency</h4>
            <p className="text-sm text-muted-foreground mb-6">Massive volume at best value.</p>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-3xl font-mono font-bold text-foreground">25,000</span>
              <span className="text-muted-foreground">credits</span>
            </div>
            <div className="mb-6 flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">$299</span>
              <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded font-medium">Save 25%</span>
            </div>
            <button onClick={() => handleBuy('Agency')} className="mt-auto w-full py-2.5 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-xl border border-border transition-colors">
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <h3 className="text-xl font-display font-bold text-foreground mb-4">Transaction History</h3>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {history.map((tx) => (
                <tr key={tx.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground">{tx.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${tx.type === 'credit' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                        {tx.type === 'credit' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      </div>
                      <span className="font-medium text-foreground">{tx.desc}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-bold ${tx.type === 'credit' ? 'text-success' : 'text-foreground'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                    {tx.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
