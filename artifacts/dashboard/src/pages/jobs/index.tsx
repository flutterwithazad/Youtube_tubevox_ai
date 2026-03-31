import { DashboardShell } from "@/components/layout/DashboardShell";
import { Link, useLocation } from "wouter";
import { Plus, FileText, Activity, Zap, AlertCircle, Clock, Play, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

interface Job {
  id: string;
  video_title?: string;
  channel_name?: string;
  video_url?: string;
  thumbnail?: string;
  status: string;
  downloaded_comments?: number;
  requested_comments?: number;
  credits_used?: number;
  created_at: string;
  error_message?: string;
  progress?: number;
}

interface Stats {
  totalJobs: number;
  totalComments: number;
  creditsSpent: number;
}

export default function JobsList() {
  const [, setLocation] = useLocation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [creditsByJob, setCreditsByJob] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Stats>({ totalJobs: 0, totalComments: 0, creditsSpent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchJobs(), fetchStats()]);
    setLoading(false);
  };

  const fetchJobs = async () => {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    const jobs = data ?? [];
    setJobs(jobs);

    if (jobs.length === 0) return;

    // Fetch credits only for the job IDs we actually loaded — never the whole table.
    // Fetching the full table risks hitting the 1000-row default page cap which
    // silently truncates results and shows wrong (partial) per-job credit sums.
    const jobIds = jobs.map((j) => j.id);
    const { data: ledger } = await supabase
      .from("credit_ledger")
      .select("source_id, amount")
      .lt("amount", 0)
      .in("source_id", jobIds);

    const map: Record<string, number> = {};
    for (const row of ledger ?? []) {
      if (!row.source_id) continue;
      map[row.source_id] = (map[row.source_id] ?? 0) + Math.abs(row.amount);
    }
    setCreditsByJob(map);
  };

  const fetchStats = async () => {
    // Aggregation functions are disabled at the DB level, so we can't SUM in a
    // single query. Workaround: credits_spent = total_purchased - current_balance.
    // Purchase entries are few (typically <50) so they safely fit in one page.
    // The balance view always reflects the true running total.
    const [
      { count: totalJobs },
      { data: jobs },
      { data: purchases },
      { data: balanceRow },
    ] = await Promise.all([
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("downloaded_comments").eq("status", "completed"),
      supabase.from("credit_ledger").select("amount").gt("amount", 0),
      supabase.from("user_credit_balance").select("balance").maybeSingle(),
    ]);

    const totalComments = (jobs ?? []).reduce((s, j) => s + (j.downloaded_comments ?? 0), 0);
    const totalPurchased = (purchases ?? []).reduce((s, r) => s + r.amount, 0);
    const currentBalance = balanceRow?.balance ?? 0;
    const creditsSpent = Math.max(0, totalPurchased - currentBalance);

    setStats({ totalJobs: totalJobs ?? 0, totalComments, creditsSpent });
  };

  const handleCancel = async (jobId: string) => {
    await supabase.from("jobs").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", jobId);
    fetchJobs();
  };

  const getStatusBadge = (job: Job) => {
    switch (job.status) {
      case "completed":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Completed</span>;
      case "running":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Running</span>;
      case "failed":
        return (
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-3 h-3" /> Failed
            </span>
            {job.error_message && <p className="text-[10px] text-destructive/70 mt-0.5 max-w-[120px] truncate">{job.error_message}</p>}
          </div>
        );
      case "cancelled":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-muted-foreground border border-border">Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-muted-foreground border border-border"><Clock className="w-3 h-3" /> Queued</span>;
    }
  };

  return (
    <DashboardShell title="My Jobs">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Scrape History</h2>
          <p className="text-muted-foreground mt-1">View and manage your past comment exports.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/scrape">
            <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-primary/20 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Scrape</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Activity, label: "Total Jobs", value: loading ? null : stats.totalJobs.toLocaleString() },
          { icon: FileText, label: "Comments Scraped", value: loading ? null : stats.totalComments.toLocaleString(), className: "text-success" },
          { icon: Zap, label: "Credits Spent", value: loading ? null : stats.creditsSpent.toLocaleString(), className: "text-primary font-mono" },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <card.icon className="w-4 h-4" />
              <span className="font-medium text-sm">{card.label}</span>
            </div>
            {card.value === null ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <div className={`text-3xl font-display font-bold ${card.className || "text-foreground"}`}>{card.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* Jobs Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Target Video</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Comments</th>
                <th className="px-6 py-4">Credits</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="flex gap-3 items-center"><Skeleton className="w-12 h-8 rounded shrink-0" /><div><Skeleton className="h-4 w-40 mb-1" /><Skeleton className="h-3 w-24" /></div></div></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-md" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <Play className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    No scrape jobs yet. Start your first scrape!
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/jobs/${job.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-10 bg-muted rounded shrink-0 relative overflow-hidden border border-border">
                          {job.thumbnail ? (
                            <img src={job.thumbnail} alt={job.video_title} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent z-10" />
                              <Play className="w-3 h-3 text-white/80 z-20 absolute inset-0 m-auto" />
                            </>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[220px]">
                          <p className="font-medium text-foreground truncate">{job.video_title || "Untitled Video"}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.channel_name || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(job)}
                      {job.status === "running" && job.progress != null && (
                        <div className="mt-1.5 w-24 h-1 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${job.progress}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-foreground">{(job.downloaded_comments ?? 0).toLocaleString()}</span>
                      {job.requested_comments && (
                        <span className="text-xs text-muted-foreground ml-1">/ {job.requested_comments.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">
                      {creditsByJob[job.id] != null ? creditsByJob[job.id].toLocaleString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {(job.downloaded_comments ?? 0) > 0 && (
                          <Link href={`/jobs/${job.id}`}>
                            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors whitespace-nowrap flex items-center gap-1">
                              View &amp; Download
                              {job.status !== "completed" && (
                                <span className="ml-1 text-amber-600 font-normal">(partial)</span>
                              )}
                            </button>
                          </Link>
                        )}
                        {job.status === "running" && (
                          <button onClick={(e) => { e.stopPropagation(); handleCancel(job.id); }} className="text-xs font-medium text-destructive hover:underline">Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
