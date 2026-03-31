// supabase/functions/fetch-comments/youtubeApi.ts
//
// Fetching strategy mirrors the Python reference implementation:
//
//   1. GET commentThreads (paginated, 100 per page) → top-level comments
//   2. For each thread where totalReplyCount > 0:
//        GET comments.list(parentId=threadId, paginated) → ALL replies
//
// KEY DESIGN DECISION — page-level batching:
//   We collect ALL threads on a YouTube page (up to 100) including their
//   replies BEFORE calling onBatch. This means the resume token (nextPageToken)
//   always sits at a clean page boundary and we never skip threads mid-page.
//
//   Previous approach: flush every 20 threads, save nextPageToken of current
//   page → threads 21-100 silently skipped every invocation → only ~20% scraped.
//
// SPEED — parallel reply fetching:
//   Replies for all threads on a page are fetched with 5 concurrent requests
//   instead of sequentially, giving ~5× speed improvement.

import { KeyManager } from "./keyManager.ts";
import { FetchFilters, Comment, ApiKey } from "./types.ts";

/* ── YouTube API response shapes ──────────────────────────── */

interface YTError    { code: number; message: string; errors?: any[] }
interface YTResponse { items: any[]; nextPageToken?: string; error?: YTError }

/* ── Max concurrent reply-fetch requests per page ─────────── */
const REPLY_CONCURRENCY = 5;

/* ═══════════════════════════════════════════════════════════ */

export class YouTubeApi {
  private km:        KeyManager;
  private activeKey: ApiKey | null = null;

  constructor() {
    this.km = new KeyManager();
  }

  /* ── Ensure we have a live key ────────────────────────────── */
  private async key(): Promise<ApiKey> {
    if (!this.activeKey) {
      this.activeKey = await this.km.getAvailableKey();
      console.log(`Using key: ${this.activeKey.label}`);
    }
    return this.activeKey;
  }

  /* ── Make one GET request, rotate key on quota errors ────── */
  private async ytGet(baseUrl: string): Promise<YTResponse> {
    let attempts = 0;
    while (attempts++ < 10) {
      const k   = await this.key();
      const url = `${baseUrl}&key=${k.key_value}`;
      const res = await fetch(url);
      const data: YTResponse = await res.json();

      if (!data.error) {
        await this.km.markUsed(k.id, 1);
        return data;
      }

      const { code, message } = data.error;

      // Quota exhausted → rotate to next key and retry
      if (code === 403 && (message.includes("quota") || message.includes("Quota"))) {
        console.log(`Key "${k.label}" quota exceeded — rotating…`);
        this.activeKey = await this.km.rotateKey(k.id);
        console.log(`Now using key: ${this.activeKey.label}`);
        continue;
      }

      // Comments disabled on this video
      if (code === 403) throw new Error("Comments are disabled on this video");

      // Video not found / private
      if (code === 404) throw new Error("Video not found or is private");

      // Unexpected error
      await this.km.markError(k.id);
      throw new Error(message);
    }

    throw new Error("Too many key-rotation attempts — all keys may be exhausted");
  }

  /* ── Video metadata ───────────────────────────────────────── */
  async getVideoMetadata(videoId: string) {
    const data = await this.ytGet(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}`
    );

    if (!data.items?.length) throw new Error("Video not found or is private");

    const video = data.items[0];
    return {
      title:        video.snippet.title,
      channelName:  video.snippet.channelTitle,
      thumbnail:    video.snippet.thumbnails?.medium?.url ?? "",
      publishedAt:  video.snippet.publishedAt,
      commentCount: parseInt(video.statistics.commentCount ?? "0"),
      viewCount:    parseInt(video.statistics.viewCount    ?? "0"),
      likeCount:    parseInt(video.statistics.likeCount    ?? "0"),
    };
  }

  /* ── Fetch ALL replies for one thread (paginated) ────────── */
  private async fetchRepliesForThread(
    jobId:    string,
    parentId: string,
    maxLeft:  number,
  ): Promise<Comment[]> {
    const replies: Comment[] = [];
    let   pageToken = "";

    do {
      const url =
        `https://www.googleapis.com/youtube/v3/comments?` +
        `part=snippet` +
        `&parentId=${parentId}` +
        `&maxResults=100` +
        `&textFormat=plainText` +
        (pageToken ? `&pageToken=${pageToken}` : "");

      const data = await this.ytGet(url);

      for (const item of data.items ?? []) {
        if (replies.length >= maxLeft) break;

        const rs = item.snippet;
        replies.push({
          job_id:                jobId,
          comment_id:            item.id,
          author:                rs.authorDisplayName    ?? "",
          author_channel:        rs.authorChannelUrl     ?? "",
          author_profile_image:  rs.authorProfileImageUrl ?? null,
          text:                  rs.textDisplay          ?? rs.textOriginal ?? "",
          likes:                 rs.likeCount            ?? 0,
          published_at:          rs.publishedAt,
          updated_at:            rs.updatedAt,
          reply_count:           0,
          is_reply:              true,
          parent_id:             parentId,
          heart:                 rs.likedByCreator        ?? false,
          is_pinned:             false,
          is_paid:               false,
        });
      }

      pageToken = (replies.length < maxLeft ? data.nextPageToken : "") ?? "";

    } while (pageToken);

    return replies;
  }

  /**
   * Fetch comments page by page, calling onBatch once per YouTube page.
   *
   * KEY RULE: we NEVER flush mid-page. Every thread on a page is processed
   * before onBatch is called. This means the resume pageToken always sits at
   * a clean page boundary — no threads are ever skipped.
   *
   * Replies for all threads on a page are fetched in parallel (REPLY_CONCURRENCY
   * at a time) for speed.
   *
   * @param startPageToken  Resume from a previous invocation's nextPageToken.
   * @param perInvocationLimit  Stop after at least this many comments have been
   *                            flushed (always at a page boundary).
   *                            Defaults to Infinity (fetch everything in one call).
   *
   * Returns { totalFetched, nextPageToken } where nextPageToken is null when done.
   */
  async fetchAllComments(
    jobId:               string,
    videoId:             string,
    filters:             FetchFilters,
    maxComments:         number,
    onBatch:             (batch: Comment[], totalSoFar: number) => Promise<boolean>,
    startPageToken?:     string,
    perInvocationLimit?: number,
  ): Promise<{ totalFetched: number; nextPageToken: string | null }> {

    const invocationCap = perInvocationLimit ?? Infinity;
    const startTime     = Date.now();
    let totalFetched    = 0;
    let pageToken       = startPageToken ?? "";
    const order         = filters.sortBy === "newest" ? "time" : (filters.sortBy === "relevance" ? "relevance" : "time");

    console.log(
      `fetchAllComments: videoId=${videoId} max=${maxComments} ` +
      `cap=${invocationCap} startPage=${startPageToken ? "yes" : "no"} order=${order}`
    );

    do {
      // ── 1. Fetch one page of top-level comment threads (up to 100) ──
      const url =
        `https://www.googleapis.com/youtube/v3/commentThreads?` +
        `part=snippet` +
        `&videoId=${videoId}` +
        `&maxResults=100` +
        `&order=${order}` +
        `&textFormat=plainText` +
        (pageToken ? `&pageToken=${pageToken}` : "");

      const data = await this.ytGet(url);
      if (!data.items?.length) break;

      // ── 2. Filter threads and determine which need reply fetching ──
      const filteredItems: any[] = [];
      for (const item of data.items) {
        // ONLY break based on user's maxComments, NEVER based on invocationCap mid-page.
        if (totalFetched + filteredItems.length >= maxComments) break;

        const top = item.snippet.topLevelComment.snippet;

        if (filters.minLikes && (top.likeCount ?? 0) < filters.minLikes) continue;
        if (filters.keyword) {
          const kws  = filters.keyword.split(",").map((k: string) => k.trim().toLowerCase());
          const text = (top.textDisplay ?? "").toLowerCase();
          if (!kws.some((k: string) => text.includes(k))) continue;
        }
        if (filters.dateFrom) {
          if (new Date(top.publishedAt) < new Date(filters.dateFrom)) continue;
        }

        filteredItems.push(item);
      }

      // ── 3. Fetch replies in parallel (REPLY_CONCURRENCY at a time) ──
      const pageBatch: Comment[] = [];

      const processThread = async (item: any): Promise<Comment[]> => {
        const top      = item.snippet.topLevelComment.snippet;
        const comments: Comment[] = [];

        comments.push({
          job_id:                jobId,
          comment_id:            item.id,
          author:                top.authorDisplayName    ?? "",
          author_channel:        top.authorChannelUrl     ?? "",
          author_profile_image:  top.authorProfileImageUrl ?? null,
          text:                  top.textDisplay          ?? top.textOriginal ?? "",
          likes:                 top.likeCount            ?? 0,
          published_at:          top.publishedAt,
          updated_at:            top.updatedAt,
          reply_count:           item.snippet.totalReplyCount ?? 0,
          is_reply:              false,
          parent_id:             null,
          heart:                 top.likedByCreator        ?? false,
          is_pinned:             false,
          is_paid:               false,
        });

        const totalReplies = item.snippet.totalReplyCount ?? 0;
        if (totalReplies > 0) {
          const maxLeft = Math.max(0, maxComments - totalFetched - pageBatch.length - comments.length);
          if (maxLeft > 0) {
            const replies = await this.fetchRepliesForThread(jobId, item.id, maxLeft);
            comments.push(...replies);
            if (replies.length > 0) {
              console.log(`  Thread ${item.id}: ${replies.length}/${totalReplies} replies`);
            }
          }
        }

        return comments;
      };

      // Process in concurrent batches of REPLY_CONCURRENCY
      for (let i = 0; i < filteredItems.length; i += REPLY_CONCURRENCY) {
        const chunk   = filteredItems.slice(i, i + REPLY_CONCURRENCY);
        const results = await Promise.all(chunk.map(processThread));
        for (const threadComments of results) {
          pageBatch.push(...threadComments);
        }
      }

      // ── 4. Flush the entire page to DB at once ───────────────
      if (pageBatch.length > 0) {
        totalFetched += pageBatch.length;
        console.log(`Page flushed: ${pageBatch.length} comments, invocation total: ${totalFetched}`);
        const shouldContinue = await onBatch([...pageBatch], totalFetched);
        if (!shouldContinue) {
          console.log(`Stopping at ${totalFetched} (cancelled or out of credits)`);
          return { totalFetched, nextPageToken: null };
        }
      }

      // ── 5. Check invocation cap OR approaching timeout AFTER the full page ──
      const elapsedMs = Date.now() - startTime;
      const isExpired = elapsedMs > 120_000; // 120s safety stop (Edge Function limit is ~150s)

      if (totalFetched >= invocationCap || isExpired) {
        const resumeToken = data.nextPageToken ?? null;
        console.log(
          `Stopping batch (total=${totalFetched}, time=${Math.round(elapsedMs/1000)}s, capHit=${totalFetched >= invocationCap}) ` +
          `— resumeToken: ${resumeToken ? "yes" : "none"}`
        );
        return { totalFetched, nextPageToken: resumeToken };
      }

      // ── 6. Check user-requested max ──────────────────────────
      if (totalFetched >= maxComments) {
        console.log(`Reached maxComments ${maxComments} — done`);
        return { totalFetched, nextPageToken: null };
      }

      pageToken = data.nextPageToken ?? "";

    } while (pageToken);

    console.log(`fetchAllComments invocation done: ${totalFetched} total, no more pages`);
    return { totalFetched, nextPageToken: null };
  }
}

/* ── Extract video ID from any YouTube URL ─────────────────── */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}
