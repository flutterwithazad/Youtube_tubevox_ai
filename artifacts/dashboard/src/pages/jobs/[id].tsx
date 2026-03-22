import { useRoute, Link } from "wouter";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CommentExplorer } from "@/components/dashboard/CommentExplorer";
import { ArrowLeft, ExternalLink, Clock, Database, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
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
  completed_at?: string;
  error_message?: string;
  thumbnail?: string;
}

export default function JobDetail() {
  const [, params] = useRoute("/jobs/:id");
  const jobId = params?.id || "";

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    setLoading(true);
    const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    setJob(data);
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20 uppercase tracking-wider"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case "running": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">Running</span>;
      case "failed": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20 uppercase tracking-wider"><AlertCircle className="w-3 h-3" /> Failed</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-muted-foreground border border-border uppercase tracking-wider">{status}</span>;
    }
  };

  const duration = job?.completed_at && job?.created_at
    ? Math.round((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000)
    : null;

  return (
    <DashboardShell title={loading ? "Job Details" : `Job: ${job?.video_title?.slice(0, 30) || jobId}`}>
      <div className="mb-6">
        <Link href="/jobs">
          <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </button>
        </Link>

        {loading ? (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex gap-4">
              <Skeleton className="w-16 h-12 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        ) : !job ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground shadow-sm">
            Job not found.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-12 bg-muted rounded-lg shrink-0 border border-border mt-1 overflow-hidden">
                {job.thumbnail ? (
                  <img src={job.thumbnail} alt={job.video_title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">YT</div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {statusBadge(job.status)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </span>
                </div>
                <h2 className="text-lg font-display font-bold text-foreground">{job.video_title || "Untitled Video"}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  <span className="text-muted-foreground">{job.channel_name}</span>
                  {job.video_url && (
                    <a href={job.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs font-medium">
                      View on YouTube <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {job.error_message && (
                  <p className="text-xs text-destructive mt-1">{job.error_message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3 p-4 md:p-0 bg-secondary/50 md:bg-transparent rounded-lg border border-border md:border-none">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-1">
                  <Database className="w-3 h-3" /> Extracted
                </span>
                <span className="font-mono font-bold text-foreground">
                  {(job.downloaded_comments ?? 0).toLocaleString()}
                  {job.requested_comments && (
                    <span className="text-xs text-muted-foreground font-sans font-normal"> / {job.requested_comments.toLocaleString()}</span>
                  )}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-1">
                  <Zap className="w-3 h-3" /> Credits Used
                </span>
                <span className="font-mono font-bold text-primary">
                  {(job.credits_used ?? 0).toLocaleString()}
                </span>
              </div>
              {duration !== null && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-1">
                    <Clock className="w-3 h-3" /> Duration
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {duration >= 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!loading && job && (job.downloaded_comments ?? 0) >= 100 && (
        <CommentExplorer
          jobId={jobId}
          videoTitle={job.video_title || "Video"}
          totalCount={job.downloaded_comments ?? 0}
          isPartial={job.status !== "completed"}
          jobStatus={job.status}
        />
      )}

      {!loading && job && (job.downloaded_comments ?? 0) < 100 && job.status !== "completed" && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground shadow-sm mt-2">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <p className="font-medium mb-1">Not enough data to display</p>
          <p className="text-sm">
            {job.status === "failed"
              ? (job.error_message ?? "The scrape failed before collecting enough comments.")
              : "The scrape stopped before collecting enough data (minimum 100 comments)."}
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
