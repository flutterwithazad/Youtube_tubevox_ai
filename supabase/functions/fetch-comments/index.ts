// supabase/functions/fetch-comments/index.ts
//
// Schema alignment:
//   jobs           → user_id, job_type, video_url, video_id, requested_comments,
//                    filters, credits_reserved, status, video_title, channel_name,
//                    thumbnail, downloaded_comments, created_at
//   credit_ledger  → user_id, amount, source_type, source_id, description, balance_after
//                    source_type values: "purchase" | "admin_grant" | "refund" | "job_reserve"
//   comments       → job_id, comment_id, author, author_channel, text,
//                    likes, published_at, updated_at, reply_count, is_reply, parent_id
//
// Credit safety:
//   All credit deductions go through atomic_credit_deduct() — a PostgreSQL function
//   with a per-user advisory lock. This prevents double-spending even if the same
//   user starts multiple concurrent scrapes from different browser tabs.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { YouTubeApi, extractVideoId } from "./youtubeApi.ts";
import { FetchFilters } from "./types.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    // Admin client — service role key, bypasses RLS for all DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")              ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // User client — verifies JWT and resolves user identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")      ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // ── 2. Parse body ────────────────────────────────────────
    // Comments fetched per Edge Function invocation (measured at page boundaries).
    // Supabase free plan has ~150s timeout. With parallel reply fetching each page
    // takes ~5-10s, so 500 comments ≈ 1-5 pages ≈ well within the timeout.
    // The backend chains multiple calls via pageToken to fetch everything.
    const PER_INVOCATION_LIMIT = 500;

    const body = await req.json();
    const {
      videoUrl,
      maxComments,
      filters = {},
      jobId: existingJobId,
      pageToken: startPageToken,  // resume token from a previous invocation
    }: {
      videoUrl:         string;
      maxComments:      number | null | undefined;
      filters:          FetchFilters;
      jobId?:           string;
      pageToken?:       string;
    } = body;

    if (!videoUrl) return json({ error: "videoUrl is required" }, 400);

    const videoId = extractVideoId(videoUrl);
    if (!videoId) return json({ error: "Invalid YouTube URL" }, 400);

    const fetchAll      = maxComments == null;
    const commentTarget = fetchAll ? Infinity : Math.max(Number(maxComments), 100);

    // ── 3. Check credit balance (fast-fail before touching YouTube API) ──
    const { data: ledger, error: ledgerErr } = await supabase
      .from("credit_ledger")
      .select("amount")
      .eq("user_id", user.id);

    if (ledgerErr) throw ledgerErr;

    const balance = (ledger ?? []).reduce((sum: number, r: any) => sum + r.amount, 0);

    // On the very first invocation, verify the user has enough credits upfront.
    // On continuation invocations (startPageToken is set), credits have already
    // been partially deducted — just ensure at least 1 credit remains so the
    // per-batch atomic_credit_deduct can still run and stop naturally.
    const isContinuation = !!startPageToken;
    const creditsNeeded  = isContinuation ? 1 : (fetchAll ? 1 : commentTarget);

    if (balance < creditsNeeded) {
      return json({
        error:          "insufficient_credits",
        message:        "Not enough credits. Please top up.",
        balance,
        credits_needed: fetchAll ? "unknown (all comments)" : creditsNeeded,
      }, 402);
    }

    // ── 4. Fetch video metadata from YouTube ─────────────────
    const yt    = new YouTubeApi();
    const video = await yt.getVideoMetadata(videoId);

    // ── 5. Load or create job ────────────────────────────────
    let job: any;

    if (existingJobId) {
      const { data: existingJob, error: getErr } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", existingJobId)
        .eq("user_id", user.id)
        .single();

      if (getErr || !existingJob) return json({ error: "Job not found" }, 404);
      job = existingJob;
    } else {
      const { data: newJob, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          user_id:            user.id,
          job_type:           "single_video",
          video_url:          videoUrl,
          video_id:           videoId,
          video_title:        video.title,
          channel_name:       video.channelName,
          thumbnail:          video.thumbnail,
          requested_comments: fetchAll ? null : commentTarget,
          credits_reserved:   fetchAll ? null : creditsNeeded,
          filters:            filters,
          status:             "queued",
        })
        .select()
        .single();

      if (jobErr) throw jobErr;
      job = newJob;
    }

    // How many comments were already inserted by previous invocations.
    // This is the base offset used so subsequent invocations don't reset
    // the downloaded_comments counter back to 0.
    const alreadyFetched: number = job.downloaded_comments ?? 0;

    // ── 6. Mark job as running (only set started_at on the first invocation) ──
    const runningUpdate: Record<string, any> = {
      status:       "running",
      video_title:  video.title,
      channel_name: video.channelName,
      thumbnail:    video.thumbnail,
    };
    // Only stamp started_at on the very first invocation (no resume token)
    if (!startPageToken) {
      runningUpdate.started_at = new Date().toISOString();
    }
    await supabase.from("jobs").update(runningUpdate).eq("id", job.id);

    let totalInserted  = 0;  // count for THIS invocation only
    let creditsUsed    = 0;
    let isCancelled    = false;
    let creditExhausted = false;  // true when atomic_credit_deduct returns ok:false

    // ── 7. onBatch — insert comments + atomic credit deduction ──
    //
    // Called by youtubeApi every FLUSH_EVERY threads (≈20 top-level comments
    // + their replies), giving real-time progress for any video size.
    //
    // atomic_credit_deduct() is a PostgreSQL function that:
    //   1. Acquires a per-user advisory lock (pg_advisory_xact_lock)
    //   2. Reads the CURRENT balance from credit_ledger (not cached)
    //   3. Returns {ok: false} if balance < batch_size (stops the scrape)
    //   4. INSERTs a new negative ledger row: amount = -batch_size
    //
    // Using INSERT (not UPDATE) means there's no "target row ID" to go wrong —
    // every batch creates its own self-contained deduction record.
    //
    const onBatch = async (batch: any[], _totalSoFar: number): Promise<boolean> => {
      // Check for external cancellation
      const { data: jobCheck } = await supabase
        .from("jobs")
        .select("status")
        .eq("id", job.id)
        .single();

      if (jobCheck?.status === "cancelled") {
        isCancelled = true;
        return false;
      }

      // Optimistically bump the counter so polling sees progress immediately.
      // alreadyFetched is the base from previous invocations — must be added
      // so the counter never resets to 0 on invocation 2+.
      const optimisticTotal = alreadyFetched + totalInserted + batch.length;
      await supabase
        .from("jobs")
        .update({ downloaded_comments: optimisticTotal })
        .eq("id", job.id);

      // Insert comments into DB (chunked to stay within PostgREST limits)
      const CHUNK = 500;
      for (let i = 0; i < batch.length; i += CHUNK) {
        const chunk = batch.slice(i, i + CHUNK);
        const { error: insertErr } = await supabase.from("comments").insert(chunk);
        if (!insertErr) {
          totalInserted += chunk.length;
        } else {
          console.error(`Insert error (chunk ${i / CHUNK}):`, insertErr.message);
        }
      }

      // Atomically check balance and deduct credits via DB function.
      // Uses a per-user advisory lock — safe even with multiple concurrent sessions.
      // INSERTs a new negative row instead of updating a pre-created entry,
      // so there is no risk of a null target-row ID silently being a no-op.
      const { data: deductResult, error: rpcErr } = await supabase.rpc(
        "atomic_credit_deduct",
        {
          p_user_id:     user.id,
          p_batch_size:  batch.length,
          p_source_id:   job.id,
          p_description: `Batch: ${alreadyFetched + totalInserted} comments fetched — 1 credit per comment`,
        }
      );

      if (rpcErr) {
        console.error("atomic_credit_deduct RPC error:", rpcErr.message);
        return false; // stop safely on RPC error
      }

      if (!deductResult?.ok) {
        console.log(`Insufficient credits (balance=${deductResult?.balance}) — flagging creditExhausted`);
        creditExhausted = true;
        return false;
      }

      creditsUsed += batch.length;

      // Confirm final downloaded count after inserts (accumulated across all invocations)
      await supabase
        .from("jobs")
        .update({ downloaded_comments: alreadyFetched + totalInserted })
        .eq("id", job.id);

      return true;
    };

    // ── 9. Stream-fetch comments via batch callback ──────────
    // Each invocation fetches at most PER_INVOCATION_LIMIT comments.
    // The backend chains invocations using the returned nextPageToken.
    let nextPageToken: string | null = null;
    try {
      const result = await yt.fetchAllComments(
        job.id,
        videoId,
        { ...filters, maxComments: commentTarget },
        commentTarget,
        onBatch,
        startPageToken,    // resume from previous invocation (undefined on first call)
        PER_INVOCATION_LIMIT,
      );
      nextPageToken = result.nextPageToken;
    } catch (fetchErr: any) {
      const { data: statusCheck } = await supabase
        .from("jobs").select("status").eq("id", job.id).single();
      if (statusCheck?.status === "cancelled") {
        isCancelled = true;
      } else {
        await supabase.from("jobs")
          .update({ status: "failed", error_message: fetchErr.message })
          .eq("id", job.id);
        throw fetchErr;
      }
    }

    // ── 10. Finalise job status ──────────────────────────────
    const { data: finalCheck } = await supabase
      .from("jobs").select("status").eq("id", job.id).single();
    isCancelled = isCancelled || finalCheck?.status === "cancelled";

    // Total across ALL invocations (previous + this one) — needed for all branches below
    const totalAcrossAllInvocations = alreadyFetched + totalInserted;
    const finalBalance = balance - creditsUsed;

    // ── Credits exhausted mid-scrape ─────────────────────────
    // atomic_credit_deduct returned ok:false inside onBatch.
    // fetchAllComments returned nextPageToken:null (same as "done") but the
    // scrape was NOT naturally complete — credits simply ran out.
    // Return 402 so the frontend shows "Partial Results" instead of "Completed".
    if (creditExhausted && !isCancelled) {
      await supabase.from("jobs").update({
        status:              "cancelled",
        downloaded_comments: totalAcrossAllInvocations,
        completed_at:        new Date().toISOString(),
        error_message:       "Scrape stopped: insufficient credits",
      }).eq("id", job.id);

      return json({
        error:          "insufficient_credits",
        message:        "Not enough credits to continue scraping.",
        balance:        finalBalance,
        credits_needed: 1,
        job_id:         job.id,
        comment_count:  totalAcrossAllInvocations,
        credits_used:   creditsUsed,
        balance_after:  finalBalance,
      }, 402);
    }

    // done = no more pages AND not cancelled AND credits were not exhausted
    const done = nextPageToken === null;

    if (!isCancelled) {
      if (done) {
        // All comments fetched — mark completed with the full accumulated count
        await supabase.from("jobs").update({
          status:              "completed",
          downloaded_comments: totalAcrossAllInvocations,
          completed_at:        new Date().toISOString(),
        }).eq("id", job.id);
      } else {
        // More pages remain — keep status "running", update accumulated progress
        await supabase.from("jobs").update({
          downloaded_comments: totalAcrossAllInvocations,
        }).eq("id", job.id);
      }
    } else {
      await supabase.from("jobs").update({
        downloaded_comments: totalAcrossAllInvocations,
        completed_at:        new Date().toISOString(),
        status:              "cancelled",
      }).eq("id", job.id);
    }

    // ── 11. Return result ────────────────────────────────────
    return json({
      success:       true,
      done,
      nextPageToken,                         // non-null = backend should call again
      job_id:        job.id,
      video_title:   video.title,
      channel_name:  video.channelName,
      thumbnail:     video.thumbnail,
      comment_count: totalAcrossAllInvocations,  // accumulated total
      credits_used:  creditsUsed,
      balance_after: finalBalance,
      cancelled:     isCancelled,
    });

  } catch (err: any) {
    console.error("Edge Function error:", err?.message ?? err);
    return json({ error: err?.message ?? "Internal server error" }, 500);
  }
});
