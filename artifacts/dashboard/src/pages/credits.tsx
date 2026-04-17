import { useLocation } from "wouter";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Zap, ArrowDownRight, ShieldCheck, RefreshCw, X, CheckCircle2, Loader2, PlayCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef, useMemo } from "react";
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
  dodo_product_id?: string;
}

interface LedgerRow {
  id: string;
  amount: number;
  source_type: string;
  source_id?: string;
  description?: string;
  created_at: string;
  balance_after?: number;
}

interface JobRow {
  id: string;
  video_title?: string;
  channel_name?: string;
  thumbnail?: string;
  downloaded_comments?: number;
  status?: string;
  created_at: string;
}

interface GroupedJobTx {
  jobId: string;
  totalSpent: number;
  latestDate: string;
  job?: JobRow;
}

const JOBS_PER_PAGE = 10;
const CREDITS_PER_PAGE = 10;

// Payment poll state
type PollState = 'idle' | 'polling' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export default function Credits() {
  const [location] = useLocation();

  // Read URL params once on mount — don't re-derive every render
  const urlParams         = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlPaymentState   = urlParams.get('payment');   // 'pending' | 'cancelled' | null
  const urlPurchaseId     = urlParams.get('purchase_id');

  const { user } = useAuth();
  const { balance, loading: balanceLoading, refetch } = useCredits(user?.id);

  const [packages,        setPackages]        = useState<CreditPackage[]>([]);
  const [purchaseHistory,  setPurchaseHistory]  = useState<any[]>([]);
  const [freeCredits,     setFreeCredits]     = useState<string>("...");
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [confirmPkg,      setConfirmPkg]      = useState<CreditPackage | null>(null);
  const [buying,          setBuying]          = useState(false);

  // Payment polling UI state
  const [pollState,   setPollState]   = useState<PollState>('idle');
  const pollTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef  = useRef(0);
  const MAX_POLLS     = 18;   // 18 × 2 s = 36 s max
  const POLL_INTERVAL = 2000; // ms

  // Transaction history state
  const [historyLoading,   setHistoryLoading]   = useState(true);
  const [jobTransactions,  setJobTransactions]  = useState<GroupedJobTx[]>([]);
  const [creditRows,       setCreditRows]       = useState<LedgerRow[]>([]);
  const [jobsPage,         setJobsPage]         = useState(0);
  const [creditsPage,      setCreditsPage]      = useState(0);

  const paginatedJobs = useMemo(
    () => jobTransactions.slice(jobsPage * JOBS_PER_PAGE, (jobsPage + 1) * JOBS_PER_PAGE),
    [jobTransactions, jobsPage],
  );
  const totalJobPages = Math.ceil(jobTransactions.length / JOBS_PER_PAGE);

  const paginatedCredits = useMemo(
    () => creditRows.slice(creditsPage * CREDITS_PER_PAGE, (creditsPage + 1) * CREDITS_PER_PAGE),
    [creditRows, creditsPage],
  );
  const totalCreditPages = Math.ceil(creditRows.length / CREDITS_PER_PAGE);

  useEffect(() => {
    fetchPackages();
    fetchHistory();
    fetchFreeCredits();
    fetchPurchaseHistory();
  }, []);

  // ── Payment return handler ────────────────────────────────────────────────
  //
  // Dodo redirects to the SAME return_url for both success AND failure, so we
  // NEVER trust a URL param to indicate success. Instead we poll the real
  // purchase row in the database until it reaches a terminal state.
  //
  useEffect(() => {
    // Always clear payment-related params from the URL immediately
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('payment');
    cleanUrl.searchParams.delete('purchase_id');
    cleanUrl.searchParams.delete('pkg');   // legacy
    window.history.replaceState({}, '', cleanUrl.pathname);

    if (urlPaymentState === 'cancelled') {
      toast.info('Payment cancelled. No charges were made.', { duration: 6000 });
      return;
    }

    if (urlPaymentState === 'pending' && urlPurchaseId) {
      setPollState('polling');
      pollCountRef.current = 0;
      startPolling(urlPurchaseId);
    }

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPolling(purchaseId: string) {
    async function poll() {
      try {
        const { data, error } = await supabase
          .from('package_purchases')
          .select('payment_status, credits_total')
          .eq('id', purchaseId)
          .single();

        if (error) throw error;

        const status = data?.payment_status as string;

        if (status === 'completed') {
          setPollState('completed');
          toast.success(
            `Payment successful! ${(data.credits_total ?? 0).toLocaleString()} credits have been added to your account.`,
            { duration: 8000 },
          );
          refetch();
          fetchHistory();
          fetchPurchaseHistory();
          return;
        }

        if (status === 'failed') {
          setPollState('failed');
          toast.error('Payment failed. Please try again or use a different payment method.', { duration: 8000 });
          fetchPurchaseHistory();
          return;
        }

        if (status === 'cancelled') {
          setPollState('cancelled');
          toast.info('Payment was cancelled. No charges were made.', { duration: 6000 });
          return;
        }

        // Still pending — keep polling
        pollCountRef.current += 1;
        if (pollCountRef.current >= MAX_POLLS) {
          setPollState('timeout');
          toast.info(
            'Your payment is still being confirmed. Credits will appear in your account shortly — no action needed.',
            { duration: 12000 },
          );
          refetch();
          fetchPurchaseHistory();
          return;
        }

        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
      } catch {
        // Network error — retry silently
        pollCountRef.current += 1;
        if (pollCountRef.current < MAX_POLLS) {
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
        } else {
          setPollState('timeout');
        }
      }
    }

    // Give Dodo's webhook a 2-second head-start before the first poll
    pollTimerRef.current = setTimeout(poll, 2000);
  }

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
    try {
      // Fetch ALL debit rows (job usage)
      const { data: debits } = await supabase
        .from("credit_ledger")
        .select("*")
        .lt("amount", 0)
        .order("created_at", { ascending: false });

      // Fetch all jobs for this user (to get titles + thumbnails)
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, video_title, channel_name, thumbnail, downloaded_comments, status, created_at")
        .order("created_at", { ascending: false });

      // Group debit rows by source_id (job ID)
      const grouped = new Map<string, GroupedJobTx>();
      for (const row of debits ?? []) {
        if (!row.source_id) continue;
        const existing = grouped.get(row.source_id);
        if (existing) {
          existing.totalSpent += Math.abs(row.amount);
          // keep the latest date
          if (new Date(row.created_at) > new Date(existing.latestDate)) {
            existing.latestDate = row.created_at;
          }
        } else {
          grouped.set(row.source_id, {
            jobId:      row.source_id,
            totalSpent: Math.abs(row.amount),
            latestDate: row.created_at,
            job:        jobs?.find(j => j.id === row.source_id),
          });
        }
      }

      const sorted = Array.from(grouped.values()).sort(
        (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime(),
      );
      setJobTransactions(sorted);
      setJobsPage(0);
      setCreditsPage(0);

      // Fetch positive rows (purchases, grants, bonuses)
      const { data: credits } = await supabase
        .from("credit_ledger")
        .select("*")
        .gt("amount", 0)
        .order("created_at", { ascending: false });
      setCreditRows(credits ?? []);
    } catch (e) {
      console.error("fetchHistory:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      const { data } = await supabase
        .from('package_purchases')
        .select('*, credit_packages (name, credits_amount)')
        .order('created_at', { ascending: false })
        .limit(10);
      setPurchaseHistory(data || []);
    } catch (e) {
      console.error("fetchPurchaseHistory:", e);
    }
  };

  const handleBuy = (pkg: CreditPackage) => {
    setConfirmPkg(pkg);
  };

  const handleConfirmBuy = async () => {
    if (!confirmPkg || !user) return;
    
    if (!confirmPkg.dodo_product_id) {
      toast.error('This package is not configured for payments yet.');
      return;
    }

    setBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }

      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ packageId: confirmPkg.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.details || data.error || 'Failed to start checkout');
        return;
      }

      if (data.mode === 'test') {
        toast.info('🧪 Test mode payment — no real money charged');
      }

      // Redirect to Dodo hosted checkout
      window.location.href = data.checkout_url;
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setBuying(false);
    }
  };

  const creditLabel = (type: string, desc?: string) => {
    if (desc) return desc;
    switch (type) {
      case "purchase":    return "Credit Purchase";
      case "admin_grant": return "Admin Grant";
      case "refund":      return "Refund";
      case "signup":      return "Welcome bonus";
      default:            return type;
    }
  };

  return (
    <DashboardShell title="Credits & Billing">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground">Credit Balance</h2>
        <p className="text-muted-foreground mt-1">Manage your credits and view transaction history.</p>
      </div>

      {/* Payment Status Banner */}
      {pollState === 'polling' && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 text-primary rounded-xl px-5 py-4 mb-6">
          <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Confirming your payment…</p>
            <p className="text-xs text-primary/70 mt-0.5">This usually takes a few seconds. Please don't close this page.</p>
          </div>
        </div>
      )}

      {pollState === 'completed' && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl px-5 py-4 mb-6">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="font-semibold text-sm">Payment confirmed! Your credits have been added.</p>
        </div>
      )}

      {pollState === 'failed' && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-5 py-4 mb-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Payment failed</p>
            <p className="text-xs opacity-80 mt-0.5">No charges were made. Please try again or use a different payment method.</p>
          </div>
        </div>
      )}

      {pollState === 'cancelled' && (
        <div className="flex items-center gap-3 bg-muted border border-border text-muted-foreground rounded-xl px-5 py-4 mb-6">
          <X className="w-5 h-5 flex-shrink-0" />
          <p className="font-semibold text-sm">Payment cancelled. No charges were made.</p>
        </div>
      )}

      {pollState === 'timeout' && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl px-5 py-4 mb-6">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Payment is still being processed</p>
            <p className="text-xs opacity-80 mt-0.5">Your credits will appear automatically once the payment clears. Check back in a moment.</p>
          </div>
        </div>
      )}

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
                    } ${!pkg.dodo_product_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {pkg.dodo_product_id ? 'Buy Now' : 'Coming Soon'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="space-y-8">
        {/* Section 1: Credits spent (grouped by job) */}
        <div>
          <h3 className="text-xl font-display font-bold text-foreground mb-4">Credits Spent</h3>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {historyLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-border/50">
                  <Skeleton className="w-14 h-10 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20 shrink-0" />
                  <Skeleton className="h-8 w-28 shrink-0 rounded-lg" />
                </div>
              ))
            ) : jobTransactions.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">
                No scrape jobs yet. Start scraping to see your usage here.
              </div>
            ) : (
              <>
                {paginatedJobs.map((tx) => (
                  <div
                    key={tx.jobId}
                    className="flex items-center justify-between py-4 px-4 border-b border-border/50 hover:bg-secondary/30 transition-colors last:border-b-0"
                  >
                    {/* Left: thumbnail + info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {tx.job?.thumbnail ? (
                        <img
                          src={tx.job.thumbnail}
                          alt=""
                          className="w-14 h-10 object-cover rounded-md shrink-0 bg-secondary"
                        />
                      ) : (
                        <div className="w-14 h-10 bg-secondary rounded-md shrink-0 flex items-center justify-center">
                          <PlayCircle className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {tx.job?.video_title ?? "Unknown video"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(tx.job?.downloaded_comments ?? 0).toLocaleString()} comments scraped
                          {" · "}
                          {formatDistanceToNow(new Date(tx.latestDate), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {/* Right: credits + button */}
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-sm font-mono font-bold text-red-600 whitespace-nowrap">
                        -{tx.totalSpent.toLocaleString()}
                      </span>
                      <a
                        href={`/dashboard/jobs/${tx.jobId}`}
                        className="text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors whitespace-nowrap"
                      >
                        View Comments →
                      </a>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalJobPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-secondary/20">
                    <span className="text-xs text-muted-foreground">
                      Showing {jobsPage * JOBS_PER_PAGE + 1}–
                      {Math.min((jobsPage + 1) * JOBS_PER_PAGE, jobTransactions.length)} of{" "}
                      {jobTransactions.length} jobs
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setJobsPage(p => Math.max(0, p - 1))}
                        disabled={jobsPage === 0}
                        className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg disabled:opacity-40 hover:bg-secondary transition-colors"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={() => setJobsPage(p => Math.min(totalJobPages - 1, p + 1))}
                        disabled={jobsPage === totalJobPages - 1}
                        className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg disabled:opacity-40 hover:bg-secondary transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Section 2: Credits received */}
        {/* Section 3: Purchase History */}
        <div>
          <h3 className="text-xl font-display font-bold text-foreground mb-4">Purchase History</h3>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {historyLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-border/50">
                   <div className="flex items-center gap-3">
                     <Skeleton className="w-8 h-8 rounded-xl" />
                     <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                     </div>
                   </div>
                   <div className="text-right space-y-1">
                     <Skeleton className="h-4 w-20 ml-auto" />
                     <Skeleton className="h-3 w-12 ml-auto" />
                   </div>
                </div>
              ))
            ) : purchaseHistory.length === 0 ? (
               <div className="px-6 py-10 text-center text-muted-foreground text-sm">
                 No purchases yet.
               </div>
            ) : (
              purchaseHistory.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      p.payment_status === 'completed' ? 'bg-green-100 text-green-600' :
                      p.payment_status === 'failed'    ? 'bg-red-100 text-red-600'   : 'bg-amber-100 text-amber-600'
                    }`}>
                      {p.payment_status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : p.payment_status === 'failed' ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.credit_packages?.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                        {p.dodo_payment_id && (
                          <span className="ml-2 font-mono">#{p.dodo_payment_id.slice(-8)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono text-foreground">
                      +{p.credits_total?.toLocaleString()} credits
                    </p>
                    <p className="text-[10px] text-muted-foreground">${p.price_paid} {p.currency}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* ── Confirmation Dialog ── */}
      {confirmPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !buying && setConfirmPkg(null)}
          />

          {/* Dialog */}
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => !buying && setConfirmPkg(null)}
              disabled={buying}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>

            <h3 className="text-xl font-bold text-foreground mb-1">Confirm Purchase</h3>
            <p className="text-sm text-muted-foreground mb-6">
              You're about to add credits to your account.
            </p>

            {/* Package summary */}
            <div className="bg-secondary/50 border border-border rounded-xl p-4 mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Package</span>
                <span className="text-sm font-bold text-foreground">{confirmPkg.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Credits</span>
                <span className="text-sm font-mono font-bold text-primary">
                  +{confirmPkg.credits_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-sm font-bold text-foreground">${confirmPkg.price}</span>
              </div>
              <div className="border-t border-border/60 pt-2 mt-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Balance after</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  {(balance + confirmPkg.credits_amount).toLocaleString()} credits
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPkg(null)}
                disabled={buying}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBuy}
                disabled={buying}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all shadow-md shadow-primary/25 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
              >
                {buying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Purchase
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
