import { useState, useEffect, useRef } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { extractVideoId, getVideoType } from "@/lib/utils/youtube";
import { fetchVideoPreview, VideoPreview } from "@/lib/utils/youtubeOembed";
import { toast } from "sonner";
import { Settings, Loader2, StopCircle, CheckCircle2 } from "lucide-react";
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
  status?: string;
  started_at?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function Scrape() {
  const { user } = useAuth();
  const { balance, refetch: refetchBalance } = useCredits(user?.id);

  const [freeCredits, setFreeCredits] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/public/settings")
      .then(r => r.json())
      .then(d => setFreeCredits(d.free_plan_credits ?? null))
      .catch(() => {});
  }, []);

  const [state, setState] = useState<ScrapeState>("input");

  // URL state
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<VideoPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Chip state
  const [selectedChip, setSelectedChip] = useState<'all' | 5000 | 10000 | 'custom'>('all');
  const [customAmount, setCustomAmount] = useState<string>('');

  // Job state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [liveCommentCount, setLiveCommentCount] = useState(0);
  const [liveCreditsUsed, setLiveCreditsUsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPartialResult, setIsPartialResult] = useState(false);
  const abortRef = useRef(false);
  // Set to true when checkActive reconnects to an in-progress job rather than
  // starting a fresh scrape. Polling uses this to know it owns the job watch.
  const reconnectedRef = useRef(false);
  // Mirror of reconnectedRef as React state so the polling useEffect re-runs
  // when we switch to polling mode from inside runScrapeJob mid-loop.
  const [isReconnected, setIsReconnected] = useState(false);

  // Mutex: prevents two concurrent runScrapeJob loops (e.g. double-click,
  // multiple browser tabs, or checkActive firing while a loop is active).
  const loopRunningRef = useRef(false);

  // Populated before calling runScrapeJob() from checkActive so the loop can
  // resume from the exact page token saved by the edge function.
  const resumeOptsRef = useRef<{
    jobId: string;
    pageToken: string | null;
    maxComments: number | null;
    videoUrl: string;
    initialCommentCount: number;
    initialCreditsUsed: number;
  } | null>(null);

  // On load: check for an existing active/stuck job
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

      if (!data) {
        // No active job — check for a recently completed/cancelled job (last 2 hours)
        // so the user's results survive a page refresh.
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        const { data: recent } = await supabase
          .from("jobs")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["completed", "cancelled"])
          .gte("completed_at", twoHoursAgo)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Only restore a completed job if the user hasn't already dismissed it
        // in this browser session (clicked "Start New Scrape").
        const dismissedId = sessionStorage.getItem("dismissed_job_id");
        if (recent && (recent.downloaded_comments ?? 0) >= 100 && dismissedId !== recent.id) {
          // Load credits spent for this job
          const { data: ledgerRows } = await supabase
            .from("credit_ledger")
            .select("amount")
            .eq("source_id", recent.id)
            .eq("source_type", "job_reserve");
          const creditsSpent = ledgerRows
            ? Math.abs(ledgerRows.reduce((sum: number, r: any) => sum + r.amount, 0))
            : 0;

          setActiveJobId(recent.id);
          setActiveJob(recent);
          setLiveCommentCount(recent.downloaded_comments ?? 0);
          setLiveCreditsUsed(creditsSpent);
          if (recent.video_url) setVideoUrl(recent.video_url);
          if (recent.status === "cancelled") setIsPartialResult(true);
          setState("completed");
        }
        return;
      }

      const comments = data.downloaded_comments ?? 0;
      const startedAt = data.started_at ? new Date(data.started_at) : null;
      const ageMs = startedAt ? Date.now() - startedAt.getTime() : Infinity;

      // A job is only considered truly abandoned if it has been stuck in
      // "running" for more than 24 hours with no lock activity.
      // Previously this was 10 minutes, which auto-cancelled large scrapes
      // (50k+ comments can legitimately take 30-50 minutes) every time the
      // user switched tabs. The edge function handles its own cleanup on
      // timeout/completion — we should trust it and only cancel genuine orphans.
      const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

      // Also treat the job as fresh if the edge function held the lock recently
      // (i.e., it was actively processing within the last 5 minutes).
      const lockedAt = data.filters?._locked_at
        ? new Date(data.filters._locked_at)
        : null;
      const lockAgeMs = lockedAt ? Date.now() - lockedAt.getTime() : Infinity;
      const isActiveLocked = lockAgeMs < 5 * 60 * 1000; // locked within last 5 min
      const isFresh = ageMs < STALE_MS || isActiveLocked;

      // Always load credits spent from the ledger regardless of whether the job is
      // fresh or stale — used both for the running counter and the completed banner.
      const { data: ledgerRows } = await supabase
        .from("credit_ledger")
        .select("amount")
        .eq("source_id", data.id)
        .eq("source_type", "job_reserve");
      const creditsSpent = ledgerRows
        ? Math.abs(ledgerRows.reduce((sum: number, r: any) => sum + r.amount, 0))
        : 0;
      setLiveCreditsUsed(creditsSpent);

      if (isFresh) {
        // Hydrate UI with the job's current data regardless of resume path.
        setActiveJobId(data.id);
        setActiveJob(data);
        setLiveCommentCount(comments);
        if (data.video_url) setVideoUrl(data.video_url);

        // Check if the edge function saved a resume token. When it did we can
        // restart the frontend loop from exactly where it left off rather than
        // just polling and waiting for a timeout.
        const resumeToken: string | null = data.filters?._resume_token ?? null;

        if (resumeToken) {
          // Resume token present — restart the fetch loop from this token.
          abortRef.current = false;
          reconnectedRef.current = false;
          setIsRunning(true);
          setState("running");
          resumeOptsRef.current = {
            jobId:                data.id,
            pageToken:            resumeToken,
            maxComments:          data.requested_comments ?? null,
            videoUrl:             data.video_url ?? '',
            initialCommentCount:  comments,
            initialCreditsUsed:   creditsSpent,
          };
          toast.info("Resuming your interrupted scrape...", { duration: 4000 });
          // Defer one tick so React flushes the state updates before the async loop starts.
          setTimeout(() => runScrapeJob(), 0);
        } else {
          // No resume token yet — the edge function is still on its first
          // invocation (or hasn't returned a page boundary yet).
          // Fall back to polling: wait for the DB status to go terminal.
          reconnectedRef.current = true;
          setIsReconnected(true);
          setIsRunning(true);
          setState("running");
          toast.info("Reconnected to your running scrape.", { duration: 4000 });
        }
        return;
      }

      // Stale job (> 10 min old, probably abandoned) — cancel it so it doesn't block.
      await supabase
        .from("jobs")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
          error_message: "Session ended — job auto-cancelled on page load",
        })
        .eq("id", data.id);

      if (comments >= 100) {
        const updatedJob = { ...data, status: "cancelled" };
        setActiveJobId(data.id);
        setActiveJob(updatedJob);
        setLiveCommentCount(comments);
        setIsPartialResult(true);
        setState("completed");
        toast.info(`Found a previous scrape with ${comments.toLocaleString()} comments. Showing partial results.`);
      }
      // else: go to input (default state) — not enough data to show
    };
    checkActive();
  }, [user]);

  useEffect(() => {
    if (!activeJobId || !isRunning) return;

    const syncOnFocus = async () => {
      if (document.visibilityState === "visible") {
        const { data: job } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", activeJobId)
          .single();

        if (job && (job.status === "completed" || job.status === "cancelled" || job.status === "failed")) {
          // If the job finished while the user was away, the internal loop
          // might be stuck or discarded. This focus-sync force-transitions the UI.
          console.log(`[SYNC] Job ${activeJobId} reached terminal state ${job.status} while backgrounded.`);

          // Helper clean-up (shared with polling block above)
          const count = job.downloaded_comments ?? 0;
          setLiveCommentCount(count);
          setActiveJob(job);
          setIsRunning(false);
          loopRunningRef.current = false;
          reconnectedRef.current = false;
          setIsReconnected(false);
          refetchBalance();

          if (job.status === "completed") {
            setState("completed");
          } else if (job.status === "cancelled" && count >= 100) {
            setIsPartialResult(true);
            setState("completed");
          } else {
            setState("input");
          }
        }
      }
    };

    document.addEventListener("visibilitychange", syncOnFocus);
    return () => document.removeEventListener("visibilitychange", syncOnFocus);
  }, [activeJobId, isRunning, refetchBalance]);

  // ── Reconnect polling ────────────────────────────────────────────────────────
  // When the page loads while a job is already running (e.g. after navigation
  // within the SPA), we reconnect instead of cancelling. This effect polls the
  // specific job every 3 seconds until it reaches a terminal state.
  // It is intentionally separate from the runScrapeJob loop — both can coexist
  // because the loop drives its own UI updates while this watches the DB status.
  useEffect(() => {
    if (!isRunning || !activeJobId || !reconnectedRef.current) return;

    let pollCount = 0;
    const MAX_STALE_POLLS = 60; // 3 min of no terminal status = give up gracefully

    const interval = setInterval(async () => {
      pollCount++;

      const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", activeJobId)
        .single();

      if (!job) return;

      // Always advance the counter to the latest value
      const count = job.downloaded_comments ?? 0;
      setLiveCommentCount((prev) => Math.max(prev, count));
      setActiveJob(job);

      if (job.status === "completed" || job.status === "cancelled") {
        clearInterval(interval);
        reconnectedRef.current = false;
        setIsReconnected(false);
        setIsRunning(false);
        refetchBalance();

        // Refresh the credits counter from the DB ledger so it shows the real
        // total spent, not 0 (from a reconnect) or a partial count.
        const { data: ledgerRows } = await supabase
          .from("credit_ledger")
          .select("amount")
          .eq("source_id", activeJobId)
          .eq("source_type", "job_reserve");
        if (ledgerRows) {
          const creditsSpent = Math.abs(
            ledgerRows.reduce((sum: number, r: any) => sum + r.amount, 0)
          );
          setLiveCreditsUsed(creditsSpent);
        }

        if (job.status === "completed") {
          setState("completed");
          toast.success(`✓ ${count.toLocaleString()} comments scraped!`);
        } else if (count >= 100) {
          setIsPartialResult(true);
          setState("completed");
          toast.warning(`Scrape stopped at ${count.toLocaleString()} comments. Showing available data.`);
        } else {
          setState("input");
          setActiveJobId(null);
          setActiveJob(null);
          toast.info("Previous job ended.");
        }
      } else if (job.status === "failed") {
        clearInterval(interval);
        reconnectedRef.current = false;
        setIsReconnected(false);
        setIsRunning(false);
        setState("failed");
        refetchBalance();
        toast.error(job.error_message ?? "Scrape failed.");
      } else if (pollCount >= MAX_STALE_POLLS) {
        // Still 'running' after 3 minutes — likely an orphaned job with no more
        // frontend driving it (edge fn finished but nobody called the next page).
        // Show whatever data was collected rather than leaving the user stuck.
        clearInterval(interval);
        reconnectedRef.current = false;
        setIsReconnected(false);
        setIsRunning(false);
        refetchBalance();
        if (count >= 100) {
          setIsPartialResult(true);
          setState("completed");
          toast.warning(`Scrape stalled at ${count.toLocaleString()} comments. Showing collected data.`);
        } else {
          setState("input");
          setActiveJobId(null);
          setActiveJob(null);
          toast.info("Previous scrape had no recoverable data.");
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isRunning, activeJobId, isReconnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss: the moment the completed screen appears, record the job ID in
  // sessionStorage so that the *next* tab switch skips restoring it.
  // The user sees the results exactly once per scrape without having to click anything.
  useEffect(() => {
    if (state === "completed" && activeJobId) {
      sessionStorage.setItem("dismissed_job_id", activeJobId);
    }
  }, [state, activeJobId]);

  // Debounced URL handler
  const handleUrlChange = (value: string) => {
    setVideoUrl(value);
    setUrlError(null);
    setVideoPreview(null);
    setVideoId(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) return;

    debounceRef.current = setTimeout(async () => {
      const id = extractVideoId(value.trim());
      if (!id) {
        setUrlError('Please enter a valid YouTube video or Shorts URL');
        return;
      }
      setVideoId(id);
      setPreviewLoading(true);
      const preview = await fetchVideoPreview(id, value.trim());
      setPreviewLoading(false);
      if (!preview) {
        setUrlError('Could not load video info. The video may be private or unavailable.');
        return;
      }
      setVideoPreview({ ...preview, type: getVideoType(value) });
    }, 600);
  };

  // Derived chip values
  const maxComments: number | null = (() => {
    if (selectedChip === 'all') return null;
    if (selectedChip === 'custom') {
      const n = parseInt(customAmount);
      return isNaN(n) || n <= 0 ? null : n;
    }
    return selectedChip;
  })();

  // Shortfall: how many more credits does the user need? null = no shortfall
  const shortfall: number | null = (() => {
    if (selectedChip === 'all') return null;
    if (maxComments === null) return null;
    if (balance >= maxComments) return null;
    return maxComments - balance;
  })();

  // All chips are always clickable — never disabled
  const chips = [
    { id: 'all'    as const, label: 'All',    sub: 'Every comment' },
    { id: 5000     as const, label: '5,000',  sub: '5K comments'   },
    { id: 10000    as const, label: '10,000', sub: '10K comments'  },
    { id: 'custom' as const, label: 'Custom', sub: 'Enter amount'  },
  ];

  // Minimum 100 credits required to start any scrape
  const hasMinCredits = balance >= 100;

  const urlValid = videoPreview !== null && !urlError;

  const canSubmit = hasMinCredits && urlValid && !isRunning && (
    selectedChip === 'all'
    || selectedChip === 5000
    || selectedChip === 10000
    || (selectedChip === 'custom' && !!customAmount && parseInt(customAmount) >= 100)
  );

  const disabledReason = !hasMinCredits
    ? `You need minimum 100 credits to start a scrape (you have ${balance})`
    : !urlValid
    ? 'Enter a valid YouTube URL first'
    : selectedChip === 'custom' && (!customAmount || parseInt(customAmount) < 100)
    ? 'Enter an amount (minimum 100 comments)'
    : isRunning
    ? 'Scrape in progress...'
    : null;

  const fetchJobDetails = async (jobId: string) => {
    const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (data) setActiveJob(data);
  };

  const runScrapeJob = async () => {
    if (!user) return;

    // Mutex guard — prevent two concurrent loops (double-click, multiple tabs,
    // or checkActive firing while a loop is already active).
    if (loopRunningRef.current) {
      console.warn("runScrapeJob: a loop is already running — skipping duplicate call");
      return;
    }
    loopRunningRef.current = true;

    try {
      // Consume resume opts (set by checkActive when rehydrating after a page refresh).
      // When present, the loop continues an existing job from a saved page token.
      // When absent, this is a fresh scrape driven by the chip/URL state.
      const resumeOpts = resumeOptsRef.current;
      resumeOptsRef.current = null;

      // Get a fresh session — also used for the pre-flight balance check below.
      // NOTE: getSession() auto-refreshes the token if it is close to expiry.
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (!initialSession) { toast.error("Not authenticated"); return; }

      // Backend minimum-credit check — only blocks when the server explicitly
      // returns ok=false. Any network/auth error is ignored here; the edge
      // function has its own credit guard and will fail cleanly if needed.
      if (!resumeOpts) {
        try {
          const checkRes = await fetch('/api/credits/check', {
            headers: { Authorization: `Bearer ${initialSession.access_token}` },
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (!checkData.ok) {
              toast.error(
                `You need at least 100 credits to start a scrape. Current balance: ${(checkData.balance ?? 0).toLocaleString()}.`,
                {
                  duration: 6000,
                  action: { label: 'Buy credits →', onClick: () => { window.location.href = '/dashboard/credits'; } },
                }
              );
              setState("input");
              setIsRunning(false);
              refetchBalance();
              return;
            }
          }
          // Non-200 response (auth hiccup, server blip) → proceed; edge function handles it
        } catch {
          // Network error → proceed; edge function handles it
        }
      }

      // For a resume, use the job's stored maxComments; for a fresh scrape, derive from chips.
      const finalMaxComments: number | null = resumeOpts?.maxComments ?? (() => {
        if (selectedChip === 'all') return null;
        if (selectedChip === 'custom') return parseInt(customAmount);
        return selectedChip;
      })();

      // The video URL to pass to the edge function. For resumes, use the URL
      // stored in the job row (the state variable may not be hydrated yet because
      // React state updates are async).
      const effectiveVideoUrl = resumeOpts?.videoUrl ?? videoUrl;

      let jobId: string | null = resumeOpts?.jobId ?? null;
      let pageToken: string | null = resumeOpts?.pageToken ?? null;
      let totalComments = resumeOpts?.initialCommentCount ?? 0;
      let prevTotalComments = totalComments;
      let totalCreditsUsed = resumeOpts?.initialCreditsUsed ?? 0;
      let invocationCount = 0;
      const MAX_INVOCATIONS = 100;

      while (invocationCount < MAX_INVOCATIONS) {
        if (abortRef.current) return;
        invocationCount++;

        // ── Fresh session per invocation ───────────────────────────────────────
        // getSession() auto-refreshes the JWT when it is within 60s of expiry.
        // Capturing it once at the top would cause auth failures on long scrapes
        // (default JWT lifetime is 1 hour; 100 invocations × 30s = up to 50 min).
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Your session expired. Please sign in again and retry.");
          setState("failed");
          setIsRunning(false);
          return;
        }

        const body: Record<string, unknown> = {
          videoUrl: effectiveVideoUrl,
          maxComments: finalMaxComments,
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
            if (result.error === "concurrent_invocation") {
              // The edge function lock is held by another invocation.
              // In both cases we drop the fetch loop and fall into polling mode
              // so the "running" UI stays visible and we detect completion.
              loopRunningRef.current = false;
              reconnectedRef.current = true;
              setIsReconnected(true); // triggers the polling useEffect to (re-)run
              if (resumeOpts) {
                toast.info(
                  "Scrape is already in progress — monitoring for completion.",
                  { duration: 5000 }
                );
              } else {
                toast.warning(
                  "This job is being processed. Monitoring progress here...",
                  { duration: 5000 }
                );
              }
              return;
            }

            if (result.error === "insufficient_credits") {
              // Edge function ran out of credits mid-scrape.
              // The 402 response always includes job_id and comment_count so we can
              // show the partial data even if this was the very first invocation.
              if (result.job_id) jobId = result.job_id;
              if (typeof result.comment_count === 'number' && result.comment_count > 0) {
                totalComments = result.comment_count;
                setLiveCommentCount(totalComments);
                setActiveJobId(result.job_id);
              }
              refetchBalance();
              setIsRunning(false);
              if (totalComments >= 100 && jobId) {
                setIsPartialResult(true);
                setState("completed");
                toast.warning(
                  `Ran out of credits at ${totalComments.toLocaleString()} comments. Showing what was collected.`,
                  {
                    duration: 7000,
                    action: { label: 'Buy credits →', onClick: () => { window.location.href = '/dashboard/credits'; } },
                  }
                );
              } else {
                const have = typeof result.balance === 'number' ? result.balance : balance;
                const need = typeof result.credits_needed === 'number' ? result.credits_needed : (maxComments ?? 0);
                const shortage = Math.max(0, need - have);
                toast.error(
                  shortage > 0
                    ? `You need ${shortage.toLocaleString()} more credits to scrape ${need.toLocaleString()} comments. You currently have ${have.toLocaleString()}.`
                    : `Not enough credits. Please buy more to continue.`,
                  {
                    duration: 7000,
                    action: { label: 'Buy credits →', onClick: () => { window.location.href = '/dashboard/credits'; } },
                  }
                );
                setState("input");
              }
              return;
            }
            toast.error(result.message ?? result.error ?? "Scraping failed");
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
        prevTotalComments = totalComments;
        totalComments = result.comment_count ?? totalComments;

        // Update UI immediately
        setActiveJobId(jobId);
        setLiveCommentCount(totalComments);
        fetchJobDetails(jobId!);
        refetchBalance();

        // ── IMPORTANT: check done/cancelled BEFORE credit accounting ──
        // The edge function handles all credit deductions itself. Our job here is
        // only to track what was downloaded for the live UI counter.
        // Checking done/cancelled first ensures a completed scrape ALWAYS reaches
        // the success state — a credit edge-case can never mask a successful result.

        if (result.cancelled) {
          setIsRunning(false);
          if (totalComments >= 100 && jobId) {
            setIsPartialResult(true);
            setState("completed");
            toast.warning(
              `Job cancelled at ${totalComments.toLocaleString()} comments. Showing available data.`,
              { duration: 6000 }
            );
          } else {
            setState("input");
            setActiveJobId(null);
            setActiveJob(null);
            toast.info("Job cancelled.");
          }
          return;
        }

        if (result.done) {
          // Scrape fully completed — always show success, no partial banner
          toast.success(`✓ ${totalComments.toLocaleString()} comments scraped!`);
          setState("completed");
          setIsRunning(false);
          refetchBalance();
          return;
        }

        // Track credits for the live counter (edge fn already deducted server-side)
        const batchComments = Math.max(0, totalComments - prevTotalComments);
        totalCreditsUsed += batchComments;
        setLiveCreditsUsed(totalCreditsUsed);

        await new Promise((r) => setTimeout(r, 500));
      }

      toast.error("Job is very large. Check your Jobs page to monitor progress.");
      setState("failed");
      setIsRunning(false);
    } finally {
      // Always release the mutex so future calls can start a new loop.
      loopRunningRef.current = false;
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    abortRef.current = false;
    reconnectedRef.current = false; // this is a fresh scrape, not a reconnect
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

    if (liveCommentCount >= 100 && activeJobId) {
      // Enough partial data — keep the explorer open
      setActiveJob((prev) => prev ? { ...prev, status: "cancelled" } : prev);
      setIsPartialResult(true);
      setState("completed");
      toast.warning(
        `Job cancelled at ${liveCommentCount.toLocaleString()} comments. Showing available data.`,
        { duration: 6000 }
      );
    } else {
      setState("input");
      setActiveJobId(null);
      setActiveJob(null);
      toast.info("Job cancelled.");
    }
  };

  const handleReset = () => {
    // Remember this job was explicitly dismissed so checkActive doesn't re-show
    // it the next time the user navigates back to this page.
    if (activeJobId) {
      sessionStorage.setItem("dismissed_job_id", activeJobId);
    }
    setState("input");
    setVideoUrl('');
    setVideoId(null);
    setUrlError(null);
    setVideoPreview(null);
    setSelectedChip('all');
    setCustomAmount('');
    setActiveJobId(null);
    setActiveJob(null);
    setIsPartialResult(false);
    // Always fetch a live balance before showing the form again so the
    // credit counter in the topbar and the chip shortfall warning are accurate.
    refetchBalance();
  };

  // Try Again keeps URL + video preview so the user doesn't have to re-enter
  const handleTryAgain = () => {
    setState("input");
    setIsRunning(false);
    setActiveJobId(null);
    setActiveJob(null);
    setLiveCommentCount(0);
    setLiveCreditsUsed(0);
    setIsPartialResult(false);
    refetchBalance();
  };

  const progressPercent = activeJob?.requested_comments
    ? Math.min(100, Math.round((liveCommentCount / activeJob.requested_comments) * 100))
    : null;

  return (
    <DashboardShell title="New Scrape">
      <div className="mt-4 sm:mt-10">

        {state === "input" && (
          <div className="max-w-3xl mx-auto">
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
              <div className="p-6 space-y-6">

                {/* ── CHANGE 1: URL input with real-time video preview ── */}
                <div className="space-y-3">
                  <div className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-all ${
                    urlError
                      ? 'border-red-400 bg-red-50'
                      : videoPreview
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 bg-white focus-within:border-red-400'
                  }`}>
                    <div className="flex-shrink-0">
                      {urlError ? (
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      ) : videoPreview ? (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21.582 6.186a2.506 2.506 0 00-1.768-1.768C18.254 4 12 4 12 4s-6.254 0-7.814.418a2.506 2.506 0 00-1.768 1.768C2 7.746 2 12 2 12s0 4.254.418 5.814a2.506 2.506 0 001.768 1.768C5.746 20 12 20 12 20s6.254 0 7.814-.418a2.506 2.506 0 001.768-1.768C22 16.254 22 12 22 12s0-4.254-.418-5.814zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                        </svg>
                      )}
                    </div>

                    <input
                      type="url"
                      value={videoUrl}
                      onChange={e => handleUrlChange(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-sm font-medium"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />

                    {previewLoading && (
                      <div className="flex-shrink-0">
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {videoUrl && !previewLoading && (
                      <button
                        type="button"
                        onClick={() => {
                          setVideoUrl('');
                          setVideoId(null);
                          setUrlError(null);
                          setVideoPreview(null);
                        }}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {urlError && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5 px-1">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {urlError}
                    </p>
                  )}

                  {videoPreview && !previewLoading && (
                    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                      <div className="flex-shrink-0 relative">
                        <img
                          src={videoPreview.thumbnail}
                          alt={videoPreview.title}
                          className="w-24 h-[54px] object-cover rounded-lg bg-gray-100"
                          onError={e => {
                            const img = e.target as HTMLImageElement;
                            img.src = `https://img.youtube.com/vi/${videoPreview.videoId}/default.jpg`;
                          }}
                        />
                        {videoPreview.type === 'shorts' && (
                          <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                            SHORT
                          </span>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                          {videoPreview.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21.582 6.186a2.506 2.506 0 00-1.768-1.768C18.254 4 12 4 12 4s-6.254 0-7.814.418a2.506 2.506 0 00-1.768 1.768C2 7.746 2 12 2 12s0 4.254.418 5.814a2.506 2.506 0 001.768 1.768C5.746 20 12 20 12 20s6.254 0 7.814-.418a2.506 2.506 0 001.768-1.768C22 16.254 22 12 22 12s0-4.254-.418-5.814zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                          </svg>
                          {videoPreview.author}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                          ID: {videoPreview.videoId}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Valid
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── CHANGE 2: Chip-based comment count selector (visible when URL is valid) ── */}
                {videoPreview && (
                  <div className="space-y-4 border-t border-gray-100 pt-5">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Target amount</h3>
                      <p className="text-sm text-gray-500 mt-0.5">How many comments do you need?</p>
                    </div>

                    {/* All chips always clickable — never disabled */}
                    <div className="flex gap-2 flex-wrap">
                      {chips.map(chip => {
                        const isSelected = selectedChip === chip.id;
                        const chipCost = typeof chip.id === 'number' ? chip.id : null;
                        const chipShortfall = chipCost && balance < chipCost ? chipCost - balance : null;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => {
                              setSelectedChip(chip.id);
                              setCustomAmount('');
                            }}
                            className={`
                              flex flex-col items-center px-5 py-3 rounded-xl border-2 transition-all
                              cursor-pointer select-none
                              ${isSelected
                                ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50/40'
                              }
                            `}
                          >
                            <span className={`font-bold text-base leading-none ${isSelected ? 'text-red-700' : 'text-gray-900'}`}>
                              {chip.label}
                            </span>
                            <span className={`text-[11px] mt-1 leading-none ${isSelected ? 'text-red-500' : 'text-gray-400'}`}>
                              {!isSelected && chipShortfall
                                ? `Need ${chipShortfall.toLocaleString()} more`
                                : chip.sub
                              }
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom input — user can type any value freely, no auto-capping */}
                    {selectedChip === 'custom' && (
                      <div className="space-y-1.5">
                        <div className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 bg-white transition-all ${
                          shortfall !== null ? 'border-amber-400' : 'border-gray-200 focus-within:border-red-400'
                        }`}>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={customAmount}
                            onChange={e => {
                              const clean = e.target.value.replace(/[^0-9]/g, '');
                              setCustomAmount(clean);
                            }}
                            placeholder="e.g. 500"
                            className="flex-1 outline-none text-gray-900 font-semibold text-base bg-transparent placeholder-gray-300"
                            autoFocus
                          />
                          <span className="text-sm text-gray-400 flex-shrink-0">comments</span>
                        </div>

                        {customAmount && parseInt(customAmount) < 100 && (
                          <p className="text-xs text-red-600 flex items-center gap-1.5 px-1">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                            </svg>
                            Minimum is 100 comments
                          </p>
                        )}

                        {shortfall !== null && customAmount && parseInt(customAmount) >= 100 && (
                          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <p className="text-xs text-amber-800 flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                              Add <strong className="mx-0.5">{shortfall.toLocaleString()}</strong> more credits to fetch {parseInt(customAmount).toLocaleString()} comments
                            </p>
                            <a href="/dashboard/credits" className="text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 ml-3 flex-shrink-0">
                              Buy credits →
                            </a>
                          </div>
                        )}

                        {customAmount && parseInt(customAmount) >= 100 && shortfall === null && (
                          <p className="text-xs text-green-600 flex items-center gap-1.5 px-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            ✓ {parseInt(customAmount).toLocaleString()} credits available
                          </p>
                        )}
                      </div>
                    )}

                    {/* Shortfall warning for fixed chips (5000 or 10000) */}
                    {(selectedChip === 5000 || selectedChip === 10000) && shortfall !== null && (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <p className="text-sm text-amber-800 flex items-center gap-2">
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                          </svg>
                          Add <strong className="mx-1">{shortfall.toLocaleString()}</strong> more credits to fetch {selectedChip.toLocaleString()} comments
                        </p>
                        <a href="/dashboard/credits" className="text-sm font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 flex-shrink-0 ml-4">
                          Buy credits →
                        </a>
                      </div>
                    )}

                    {/* Cost summary row */}
                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Cost: </span>
                        <span className="font-mono font-semibold text-gray-900">
                          {selectedChip === 'all'
                            ? `up to ${balance.toLocaleString()} credits`
                            : selectedChip === 'custom'
                            ? customAmount && parseInt(customAmount) > 0
                              ? `${parseInt(customAmount).toLocaleString()} credits`
                              : '— credits'
                            : `${selectedChip.toLocaleString()} credits`
                          }
                        </span>
                        <span className="text-gray-400 text-xs ml-1">(1 credit = 1 comment)</span>
                      </div>

                      {selectedChip === 'all' && (
                        <span className="text-sm text-gray-500">Budget: {balance.toLocaleString()} credits</span>
                      )}
                      {(selectedChip === 5000 || selectedChip === 10000) && shortfall === null && (
                        <span className="text-sm text-green-600 font-medium">
                          Balance after: {(balance - selectedChip).toLocaleString()}
                        </span>
                      )}
                      {selectedChip === 'custom' && customAmount && parseInt(customAmount) >= 100 && shortfall === null && (
                        <span className="text-sm text-green-600 font-medium">
                          Balance after: {(balance - parseInt(customAmount)).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <button type="button" className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
                        <Settings className="w-4 h-4" />
                        Advanced options (Coming soon)
                      </button>
                    </div>
                  </div>
                )}

                {/* ── CHANGE 3: Scrape Now button with canSubmit/disabledReason ── */}
                <div className="space-y-1">
                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                    className={`
                      w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-base transition-all
                      ${canSubmit
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md active:scale-[0.98]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {isRunning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Scraping...
                      </>
                    ) : (
                      <>
                        Scrape Now
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>

                  {!canSubmit && disabledReason && (
                    <p className="text-center text-xs text-gray-400 mt-2">{disabledReason}</p>
                  )}
                </div>

                {/* Credit status — error banner if below minimum, normal info otherwise */}
                {!hasMinCredits ? (
                  <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-red-800">Not enough credits</p>
                        <p className="text-xs text-red-600">You have <strong>{balance.toLocaleString()}</strong> credits. Minimum <strong>100</strong> required to start a scrape.</p>
                      </div>
                    </div>
                    <a
                      href="/dashboard/credits"
                      className="shrink-0 ml-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Buy Credits →
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-sm px-1">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      <span>
                        You have{' '}
                        <span className="font-semibold text-gray-900">{balance.toLocaleString()}</span>
                        {' '}credits available
                      </span>
                    </div>
                    <a
                      href="/dashboard/credits"
                      className="text-red-600 hover:text-red-700 font-medium transition-colors text-xs"
                    >
                      Get more →
                    </a>
                  </div>
                )}
                {freeCredits && balance < 1000 && (
                  <p className="text-xs text-gray-400 mt-2 px-1 text-center">
                    New users receive <span className="font-semibold">{Number(freeCredits).toLocaleString()}</span> free credits on signup
                  </p>
                )}

              </div>
            </div>
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
            <div className="max-w-3xl mx-auto mb-6">
            {isPartialResult ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-amber-900 text-sm truncate">Partial Results Available</h4>
                    <p className="text-xs text-amber-700">
                      {(activeJob?.downloaded_comments ?? liveCommentCount).toLocaleString()} comments collected ·{' '}
                      {activeJob?.status === 'cancelled' ? 'Job was cancelled' : 'Credits ran out'}
                      {' '}· <a href="/dashboard/credits" className="underline font-semibold">Buy more credits →</a>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="bg-white border border-amber-300 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors shrink-0"
                >
                  Start New Scrape
                </button>
              </div>
            ) : (
              <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-foreground text-sm truncate">Scrape Completed</h4>
                    <p className="text-xs text-muted-foreground">
                      {(activeJob?.downloaded_comments ?? liveCommentCount).toLocaleString()} comments · {liveCreditsUsed.toLocaleString()} credits used
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="bg-background border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors shrink-0"
                >
                  Start New Scrape
                </button>
              </div>
            )}
            </div>

            {activeJobId && (activeJob?.downloaded_comments ?? liveCommentCount) > 0 ? (
              <CommentExplorer
                key={activeJobId}
                jobId={activeJobId}
                videoTitle={activeJob?.video_title || "Scraped Video"}
                videoUrl={activeJob?.video_url ?? undefined}
                totalCount={activeJob?.downloaded_comments ?? liveCommentCount}
                isPartial={isPartialResult}
                jobStatus={activeJob?.status}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-border rounded-xl bg-card">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="font-bold text-foreground mb-1">Not enough data to show</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  The scrape collected fewer than 100 comments. Start a new scrape or add more credits.
                </p>
                <button
                  onClick={handleReset}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors text-sm"
                >
                  Start New Scrape
                </button>
              </div>
            )}
          </div>
        )}

        {state === "failed" && (
          <div className="max-w-3xl mx-auto">
          <div className="text-center py-16">
            <div className="text-destructive text-5xl mb-4">✕</div>
            <h2 className="text-xl font-bold text-foreground mb-2">Scrape Failed</h2>
            <p className="text-muted-foreground mb-6">Something went wrong. Please try again.</p>
            <button
              onClick={handleTryAgain}
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
