import { DashboardShell } from "@/components/layout/DashboardShell";
import { Zap, ArrowUpRight, ArrowDownRight, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCredits } from "@/hooks/use-credits";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface CreditPackage {
  id: string;
  name: string;
  description?: string;
  credits_amount: number;
  price: number;
  currency?: string;
  sort_order?: number;
  is_popular?: boolean;
  stripe_price_id?: string;
}

interface LedgerRow {
  id: string;
  amount: number;
  source_type: string;
  description?: string;
  created_at: string;
  balance_after?: number;
}

export default function Credits() {
  const { user } = useAuth();
  const { balance, loading: balanceLoading, refetch } = useCredits(user?.id);

  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [history, setHistory] = useState<LedgerRow[]>([]);
  const [freeCredits, setFreeCredits] = useState<string>("...");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
    fetchHistory();
    fetchFreeCredits();
  }, []);

  const fetchFreeCredits = async () => {
    try {
      const res = await fetch("/api/public/settings");
      const json = await res.json();
      setFreeCredits(json.free_plan_credits ?? "...");
    } catch {
      setFreeCredits("...");
    }
  };

  const fetchPackages = async () => {
    setPackagesLoading(true);
    try {
      const res = await fetch("/api/public/packages");
      const json = await res.json();
      setPackages(json.data ?? []);
    } catch {
      setPackages([]);
    }
    setPackagesLoading(false);
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("credit_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory(data ?? []);
    setHistoryLoading(false);
  };

  const handleBuy = (pkg: CreditPackage) => {
    toast.success(`Redirecting to checkout for ${pkg.name}… (Coming soon)`);
  };

  const sourceLabel = (type: string, desc?: string) => {
    if (desc) return desc;
    switch (type) {
      case "purchase": return "Credit Purchase";
      case "admin_grant": return "Admin Grant";
      case "refund": return "Refund";
      case "job_reserve": return "Scrape Job";
      default: return type;
    }
  };

  return (
    <DashboardShell title="Credits & Billing">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground">Credit Balance</h2>
        <p className="text-muted-foreground mt-1">Manage your credits and view transaction history.</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-card to-secondary border border-border rounded-2xl p-6 sm:p-8 shadow-sm mb-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold tracking-wider uppercase text-sm mb-2">
              <Zap className="w-4 h-4" /> Current Balance
            </div>
            <div className="flex items-baseline gap-3">
              {balanceLoading ? (
                <Skeleton className="h-14 w-40" />
              ) : (
                <span className="text-5xl sm:text-6xl font-mono font-bold text-foreground">{balance.toLocaleString()}</span>
              )}
              <span className="text-lg text-muted-foreground font-medium">credits</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <p className="text-sm text-muted-foreground bg-background/50 border border-border px-3 py-1.5 rounded-md inline-flex items-center gap-2">
                <span className="font-mono text-xs">1 credit = 1 comment</span>
              </p>
              <button onClick={refetch} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Refresh balance">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">New users get <strong>{freeCredits}</strong> free credits on sign-up</p>
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

        {packagesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : packages.length === 0 ? (
          <p className="text-muted-foreground">No packages available at this time.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg, idx) => {
              const isPopular = pkg.is_popular || idx === 1;
              return (
                <div
                  key={pkg.id}
                  className={`bg-card rounded-2xl p-6 shadow-sm flex flex-col transition-shadow ${
                    isPopular
                      ? "border-2 border-primary shadow-lg shadow-primary/5 transform md:-translate-y-2 relative"
                      : "border border-border hover:shadow-md"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <span className="text-yellow-300">★</span> Most Popular
                    </div>
                  )}
                  <h4 className="font-bold text-lg text-foreground mb-1">{pkg.name}</h4>
                  {pkg.description && <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>}
                  <div className="mb-4 flex items-baseline gap-1">
                    <span className={`font-mono font-bold ${isPopular ? "text-4xl text-primary" : "text-3xl text-foreground"}`}>
                      {(pkg.credits_amount ?? 0).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">credits</span>
                  </div>
                  <div className="mb-6">
                    <span className="text-2xl font-bold text-foreground">${pkg.price}</span>
                  </div>
                  <button
                    onClick={() => handleBuy(pkg)}
                    className={`mt-auto w-full py-2.5 rounded-xl font-bold transition-all ${
                      isPopular
                        ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 hover:-translate-y-0.5"
                        : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                    }`}
                  >
                    Buy Now
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-xl font-display font-bold text-foreground mb-4">Transaction History</h3>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {historyLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">No transactions yet.</td>
                </tr>
              ) : (
                history.map((tx) => {
                  const isCredit = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${isCredit ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                            {isCredit ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          </div>
                          <span className="font-medium text-foreground">{sourceLabel(tx.source_type, tx.description)}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold ${isCredit ? "text-success" : "text-foreground"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
