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
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function Scrape() {
  const { user } = useAuth();
  const { balance, refetch: refetchBalance } = useCredits(user?.id);

  const [state, setState] = useState<ScrapeState>("input");

  // URL state
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<VideoPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Chip state
  const [selectedChip, setSelectedChip] = useState<'all' | 5000 | 10000 | 'custom'>('all');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);

  // Job state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [liveCommentCount, setLiveCommentCount] = useState(0);
  const [liveCreditsUsed, setLiveCreditsUsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);

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
      const preview = await fetchVideoPreview(id);
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
      return isNaN(n) ? null : n;
    }
    return selectedChip;
  })();

  const isAffordable = maxComments === null
    ? balance > 0
    : balance >= maxComments;

  const balanceAfter = maxComments !== null ? balance - maxComments : 0;

  const chips = [
    { id: 'all' as const,    label: 'All',    sublabel: 'Every comment', disabled: balance === 0 },
    { id: 5000 as const,     label: '5,000',  sublabel: '5K comments',   disabled: balance < 5000 },
    { id: 10000 as const,    label: '10,000', sublabel: '10K comments',  disabled: balance < 10000 },
    { id: 'custom' as const, label: 'Custom', sublabel: 'Enter amount',  disabled: balance === 0 },
  ];

  const handleCustomAmountChange = (value: string) => {
    setCustomError(null);
    const clean = value.replace(/[^0-9]/g, '');
    const n = parseInt(clean);
    if (clean && n > balance) {
      setCustomError(`You only have ${balance.toLocaleString()} credits available`);
      setCustomAmount(String(balance));
    } else {
      setCustomAmount(clean);
      if (clean && n < 100) {
        setCustomError('Minimum is 100 comments');
      }
    }
  };

  // Submit validation
  const urlValid = videoPreview !== null && !urlError;
  const amountValid = selectedChip === 'all'
    ? balance > 0
    : selectedChip === 'custom'
    ? !!customAmount && parseInt(customAmount) >= 100 && parseInt(customAmount) <= balance
    : balance >= selectedChip;

  const canSubmit = urlValid && amountValid && !isRunning;

  const disabledReason = !urlValid
    ? 'Enter a valid YouTube URL first'
    : !amountValid
    ? selectedChip === 'custom' && !customAmount
      ? 'Enter a custom amount'
      : 'Not enough credits'
    : isRunning
    ? 'Scrape in progress...'
    : null;

  const fetchJobDetails = async (jobId: string) => {
    const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (data) setActiveJob(data);
  };

  const runScrapeJob = async () => {
    if (!user) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Not authenticated"); return; }

    const finalMaxComments: number | null = (() => {
      if (selectedChip === 'all') return null;
      if (selectedChip === 'custom') return parseInt(customAmount);
      return selectedChip;
    })();

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
        videoUrl,
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

  const handleSubmit = async () => {
    if (!canSubmit) return;
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

  const handleReset = () => {
    setState("input");
    setVideoUrl('');
    setVideoId(null);
    setUrlError(null);
    setVideoPreview(null);
    setSelectedChip('all');
    setCustomAmount('');
    setCustomError(null);
    setActiveJobId(null);
    setActiveJob(null);
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

                    <div className="flex gap-2 flex-wrap">
                      {chips.map(chip => (
                        <button
                          key={chip.id}
                          type="button"
                          disabled={chip.disabled}
                          onClick={() => {
                            if (chip.disabled) return;
                            setSelectedChip(chip.id);
                            setCustomAmount('');
                            setCustomError(null);
                          }}
                          className={`
                            flex flex-col items-center px-5 py-3 rounded-xl border-2 transition-all
                            font-medium text-sm leading-tight
                            ${chip.disabled
                              ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                              : selectedChip === chip.id
                              ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50/50 cursor-pointer'
                            }
                          `}
                        >
                          <span className="font-bold text-base leading-none">{chip.label}</span>
                          <span className={`text-[11px] mt-1 leading-none ${
                            chip.disabled ? 'text-gray-300' : selectedChip === chip.id ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            {chip.disabled && chip.id !== 'all' && chip.id !== 'custom'
                              ? `Need ${(chip.id as number).toLocaleString()} credits`
                              : chip.sublabel
                            }
                          </span>
                        </button>
                      ))}
                    </div>

                    {selectedChip === 'custom' && (
                      <div className="space-y-1.5">
                        <div className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 bg-white transition-all ${
                          customError ? 'border-red-400' : 'border-gray-200 focus-within:border-red-400'
                        }`}>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={customAmount}
                            onChange={e => handleCustomAmountChange(e.target.value)}
                            placeholder={`Enter amount (max ${balance.toLocaleString()})`}
                            className="flex-1 outline-none text-gray-900 font-semibold text-base bg-transparent placeholder-gray-300"
                            autoFocus
                          />
                          <span className="text-sm text-gray-400 flex-shrink-0">comments</span>
                        </div>
                        {customError ? (
                          <p className="text-xs text-red-600 flex items-center gap-1 px-1">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {customError}
                          </p>
                        ) : customAmount && parseInt(customAmount) >= 100 ? (
                          <p className="text-xs text-gray-500 px-1">
                            Will use {parseInt(customAmount).toLocaleString()} credits
                          </p>
                        ) : null}
                      </div>
                    )}

                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Cost: </span>
                        <span className="font-mono font-semibold text-gray-900">
                          {selectedChip === 'all'
                            ? `up to ${balance.toLocaleString()} credits`
                            : selectedChip === 'custom'
                            ? customAmount
                              ? `${parseInt(customAmount).toLocaleString()} credits`
                              : '— credits'
                            : `${selectedChip.toLocaleString()} credits`
                          }
                        </span>
                        <span className="text-gray-400 text-xs ml-1">(1 credit = 1 comment)</span>
                      </div>

                      {selectedChip !== 'all' && (
                        <div className={`text-sm font-medium ${isAffordable ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedChip === 'custom' && !customAmount
                            ? null
                            : isAffordable
                            ? `Balance after: ${balanceAfter.toLocaleString()}`
                            : '⚠ Insufficient credits'
                          }
                        </div>
                      )}

                      {selectedChip === 'all' && (
                        <div className="text-sm text-gray-500">
                          Budget: {balance.toLocaleString()} credits
                        </div>
                      )}
                    </div>

                    {!isAffordable && selectedChip !== 'all' && (
                      <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-red-700">
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Not enough credits for this amount
                        </div>
                        <a
                          href="/dashboard/credits"
                          className="text-sm font-semibold text-red-700 underline underline-offset-2 hover:text-red-800 transition-colors"
                        >
                          Buy credits →
                        </a>
                      </div>
                    )}

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

                {/* ── CHANGE 5: Richer credit status line ── */}
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
                onClick={handleReset}
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
              onClick={handleReset}
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
