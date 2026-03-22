import { DashboardShell } from "@/components/layout/DashboardShell";
import { Link } from "wouter";
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
  const [jobs, setJobs] = useState<Job[]>([]);
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
    setJobs(data ?? []);
  };

  const fetchStats = async () => {
    const [{ count: totalJobs }, { data: commentData }, { data: creditData }] = await Promise.all([
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("downloaded_comments").eq("status", "completed"),
      supabase.from("credit_ledger").select("amount").lt("amount", 0),
    ]);

    const totalComments = commentData?.reduce((sum, j) => sum + (j.downloaded_comments ?? 0), 0) ?? 0;
    const creditsSpent = Math.abs(creditData?.reduce((sum, r) => sum + r.amount, 0) ?? 0);
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
                  <tr key={job.id} className="hover:bg-secondary/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-muted rounded shrink-0 flex items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent z-10" />
                          <Play className="w-3 h-3 text-white/80 z-20 absolute" />
                        </div>
                        <div className="min-w-0 max-w-[250px]">
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
                    <td className="px-6 py-4 font-mono text-muted-foreground">{job.credits_used ?? "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(job.downloaded_comments ?? 0) >= 100 && (
                          <Link href={`/jobs/${job.id}`}>
                            <button className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
                              View {(job.downloaded_comments ?? 0).toLocaleString()} Comments
                              {job.status !== "completed" && (
                                <span className="ml-1 text-amber-600">(partial)</span>
                              )}
                            </button>
                          </Link>
                        )}
                        {job.status === "running" && (
                          <button onClick={() => handleCancel(job.id)} className="text-xs font-medium text-destructive hover:underline">Cancel</button>
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
