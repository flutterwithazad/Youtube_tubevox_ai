import { useState, useEffect, useRef } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { extractVideoId } from "@/lib/utils/youtube";
import { toast } from "sonner";
import { Settings, ArrowRight, Loader2, StopCircle, CheckCircle2 } from "lucide-react";
import { CommentExplorer } from "@/components/dashboard/CommentExplorer";
import { useAuth } from "@/hooks/use-auth";
import { useCredits } from "@/hooks/use-credits";
import { supabase } from "@/lib/supabase";

type ScrapeState = "input" | "running" | "completed" | "failed";

interface ActiveJob {
  id: string;
  video_title?: string;
  channel_name?: string;
  video_url?: string;
  requested_comments?: number;
  downloaded_comments?: number;
  thumbnail?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function Scrape() {
  const { user } = useAuth();
  const { balance, refetch: refetchBalance } = useCredits(user?.id);

  const [state, setState] = useState<ScrapeState>("input");
  const [url, setUrl] = useState("");
  const [amount, setAmount] = useState(1000);
  const [showOptions, setShowOptions] = useState(false);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [liveCommentCount, setLiveCommentCount] = useState(0);
  const [liveCreditsUsed, setLiveCreditsUsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);

  // Show options when URL is valid
  useEffect(() => {
    setShowOptions(!!extractVideoId(url));
  }, [url]);

  // On load: check for an existing active job
  useEffect(() => {
    if (!user) return;
    const checkActive = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["queued", "running"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setActiveJobId(data.id);
        setActiveJob(data);
        setLiveCommentCount(data.downloaded_comments ?? 0);
        setState("running");
      }
    };
    checkActive();
  }, [user]);

  const fetchJobDetails = async (jobId: string) => {
    const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (data) setActiveJob(data);
  };

  const runScrapeJob = async () => {
    if (!user) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Not authenticated"); return; }

    let jobId: string | null = null;
    let pageToken: string | null = null;
    let totalComments = 0;
    let totalCreditsUsed = 0;
    let invocationCount = 0;
    const MAX_INVOCATIONS = 100;

    while (invocationCount < MAX_INVOCATIONS) {
      if (abortRef.current) return;
      invocationCount++;

      const body: Record<string, unknown> = {
        videoUrl: url,
        maxComments: amount,
        filters: {},
      };
      if (jobId) body.jobId = jobId;
      if (pageToken) body.pageToken = pageToken;

      let result: any;
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(body),
        });
        result = await response.json();

        if (!response.ok || result.error) {
          if (result.error === "insufficient_credits") {
            toast.error("Not enough credits. Please top up your balance.");
          } else {
            toast.error(result.message ?? result.error ?? "Scraping failed");
          }
          setState("failed");
          setIsRunning(false);
          return;
        }
      } catch (err: any) {
        toast.error("Network error. Please try again.");
        setState("failed");
        setIsRunning(false);
        return;
      }

      jobId = result.job_id;
      pageToken = result.nextPageToken;
      totalComments = result.comment_count;
      totalCreditsUsed += result.credits_used ?? 0;

      setActiveJobId(jobId);
      setLiveCommentCount(totalComments);
      setLiveCreditsUsed(totalCreditsUsed);
      fetchJobDetails(jobId!);
      refetchBalance();

      if (result.cancelled) {
        toast.info("Job was cancelled.");
        setState("input");
        setIsRunning(false);
        return;
      }

      if (result.done) {
        toast.success(`✓ ${totalComments.toLocaleString()} comments scraped!`);
        setState("completed");
        setIsRunning(false);
        refetchBalance();
        return;
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    toast.error("Job is very large. Check your Jobs page to monitor progress.");
    setState("failed");
    setIsRunning(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractVideoId(url)) { toast.error("Please enter a valid YouTube URL"); return; }
    if (balance < amount) { toast.error("Insufficient credits for this job."); return; }
    if (isRunning) return;

    abortRef.current = false;
    setIsRunning(true);
    setLiveCommentCount(0);
    setLiveCreditsUsed(0);
    setActiveJob(null);
    setState("running");
    toast.success("Scrape job started!");
    runScrapeJob();
  };

  const handleCancel = async () => {
    abortRef.current = true;
    if (activeJobId) {
      await supabase
        .from("jobs")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("id", activeJobId);
    }
    setIsRunning(false);
    setState("input");
    setActiveJobId(null);
    setActiveJob(null);
    toast.info("Job cancelled.");
  };

  const progressPercent = activeJob?.requested_comments
    ? Math.min(100, Math.round((liveCommentCount / activeJob.requested_comments) * 100))
    : null;

  return (
    <DashboardShell title="New Scrape">
      <div className="max-w-3xl mx-auto mt-4 sm:mt-10">

        {state === "input" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground tracking-tight mb-3">
                Scrape YouTube Comments
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Paste any YouTube video URL and export comments as a structured dataset instantly.
              </p>
            </div>

            <div className="bg-card rounded-2xl shadow-xl shadow-black/5 border border-border overflow-hidden">
              <form onSubmit={handleSubmit} className="p-2">
                <div className="flex flex-col sm:flex-row gap-2 relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none hidden sm:block">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21.582 6.186a2.605 2.605 0 0 0-1.838-1.838C18.122 4 12 4 12 4s-6.122 0-7.744.348a2.605 2.605 0 0 0-1.838 1.838C2 7.808 2 12 2 12s0 4.192.348 5.814a2.605 2.605 0 0 0 1.838 1.838C5.878 20 12 20 12 20s6.122 0 7.744-.348a2.605 2.605 0 0 0 1.838-1.838C22 16.192 22 12 22 12s0-4.192-.348-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 bg-background border-none text-foreground px-4 sm:pl-12 py-4 rounded-xl focus:ring-4 focus:ring-primary/10 transition-all font-medium placeholder:font-normal placeholder:text-muted-foreground outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isRunning}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 shrink-0 hover:translate-y-[-1px] active:translate-y-0 group disabled:opacity-50"
                  >
                    Scrape Now
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>

              {showOptions && (
                <div className="border-t border-border bg-secondary/30 p-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <label className="block font-bold text-foreground mb-1">Target amount</label>
                        <p className="text-sm text-muted-foreground">How many comments do you need?</p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xl font-bold text-foreground">{amount.toLocaleString()}</div>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="100" max="50000" step="100"
                      value={amount}
                      onChange={(e) => setAmount(parseInt(e.target.value))}
                      className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />

                    <div className="flex justify-between mt-3 text-sm">
                      <div className="text-muted-foreground">
                        Cost: <span className="font-mono font-medium text-foreground">{amount.toLocaleString()} credits</span>
                        <span className="text-xs text-muted-foreground ml-1">(1 credit = 1 comment)</span>
                      </div>
                      <div className={balance - amount >= 0 ? "text-success font-medium" : "text-destructive font-bold"}>
                        Balance after: <span className="font-mono">{(balance - amount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <button type="button" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <Settings className="w-4 h-4" />
                      Advanced options (Coming soon)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-primary"></span>
              </span>
              You have <span className="font-mono font-medium text-foreground">{balance.toLocaleString()}</span> credits available
            </div>
          </div>
        )}

        {state === "running" && (
          <div className="animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-secondary">
                {progressPercent !== null ? (
                  <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
                ) : (
                  <div className="h-full bg-primary animate-pulse w-full opacity-60" />
                )}
              </div>

              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full bg-destructive animate-pulse"></span>
                Scraping in progress…
              </h2>

              {activeJob?.video_title && (
                <p className="text-muted-foreground mb-2 font-medium">{activeJob.video_title}</p>
              )}
              {activeJob?.channel_name && (
                <p className="text-sm text-muted-foreground mb-6">{activeJob.channel_name}</p>
              )}
              {!activeJob?.video_title && (
                <p className="text-muted-foreground mb-6 text-sm truncate px-4">
                  Fetching video info…
                </p>
              )}

              <div className="bg-secondary/50 rounded-xl p-6 mb-8 text-left">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-medium text-foreground">Comments scraped</span>
                  <span className="font-mono font-bold text-primary text-xl">{liveCommentCount.toLocaleString()}</span>
                </div>
                {activeJob?.requested_comments && (
                  <>
                    <div className="w-full h-3 bg-border rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${progressPercent ?? 0}%` }} />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>of {activeJob.requested_comments.toLocaleString()} requested</span>
                      <span>{liveCreditsUsed.toLocaleString()} credits used</span>
                    </div>
                  </>
                )}
                {!activeJob?.requested_comments && (
                  <p className="text-sm text-muted-foreground mt-1">{liveCreditsUsed.toLocaleString()} credits used so far</p>
                )}
              </div>

              <button
                onClick={handleCancel}
                className="text-muted-foreground hover:text-destructive text-sm font-medium flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                Cancel Job
              </button>
            </div>
          </div>
        )}

        {state === "completed" && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground text-sm truncate">Scrape Completed</h4>
                  <p className="text-xs text-muted-foreground">
                    {liveCommentCount.toLocaleString()} comments · {liveCreditsUsed.toLocaleString()} credits used
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setState("input"); setUrl(""); setAmount(1000); setActiveJobId(null); setActiveJob(null); }}
                className="bg-background border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors shrink-0"
              >
                Start New Scrape
              </button>
            </div>

            <CommentExplorer
              jobId={activeJobId || ""}
              videoTitle={activeJob?.video_title || "Scraped Video"}
              totalCount={liveCommentCount}
            />
          </div>
        )}

        {state === "failed" && (
          <div className="text-center py-16">
            <div className="text-destructive text-5xl mb-4">✕</div>
            <h2 className="text-xl font-bold text-foreground mb-2">Scrape Failed</h2>
            <p className="text-muted-foreground mb-6">Something went wrong. Please try again.</p>
            <button
              onClick={() => { setState("input"); setActiveJobId(null); setActiveJob(null); }}
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
