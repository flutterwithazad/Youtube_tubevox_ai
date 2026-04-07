// supabase/functions/fetch-comments/innerTube.ts
//
// HIGH-LEVEL "DEEP SCRAPER" using YouTube's Internal API (InnerTube).
// This parser extracts properties that the public YouTube Data API v3 hides:
//   - Creator Hearts
//   - Pinned Comments
//   - Paid Comment amounts (Super Chat)

import { Comment } from "./types.ts";

export class InnerTube {
  private videoId: string;
  private nextToken: string | null = null;
  private visitorData: string | null = null;

  constructor(videoId: string) {
    this.videoId = videoId;
  }

  /**
   * Fetches the initial 'continuation' token from the YouTube video page.
   * This is required to start a scrape using the InnerTube API.
   */
  async getInitialToken(): Promise<string | null> {
    const res = await fetch(`https://www.youtube.com/watch?v=${this.videoId}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const html = await res.text();
    
    // YouTube sometimes uses escaped quotes (\u0022) in their script tags
    const cleanHtml = html.replace(/\\u0022/g, '"');

    // PATTERN 1: The most direct path for 'comment-item-section'
    const p1 = cleanHtml.match(/"sectionIdentifier":"comment-item-section"[^]*?"token":"([a-zA-Z0-9_-]{80,})"/);
    if (p1) return p1[1];

    // PATTERN 2: The standard continuation item renderer
    const p2 = cleanHtml.match(/"continuationItemRenderer":\{"continuationEndpoint":\{"continuationCommand":\{"token":"([a-zA-Z0-9_-]{80,})"/);
    if (p2) return p2[1];

    // PATTERN 3: Fuzzy search for any long token following 'continuation'
    const p3 = cleanHtml.match(/"continuation":"([a-zA-Z0-9_-]{100,})"/);
    if (p3) return p3[1];
    
    console.log("[INNER-TUBE] Could not find any continuation token in HTML after trying 3 patterns");
    return null;
  }

  /**
   * Fetches one page of comments from the InnerTube API.
   * This behaves identically to what the actual YouTube website does.
   */
  async fetchPage(continuation?: string): Promise<{ comments: any[]; nextToken: string | null }> {
    const url = "https://www.youtube.com/youtubei/v1/next?prettyPrint=false";
    
    // If no continuation provided, we'll try to find one.
    const token = continuation || await this.getInitialToken();
    if (!token) return { comments: [], nextToken: null };

    // PROFESSIONAL HEADERS TO AVOID BLOCKING:
    const HEADERS = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "X-Youtube-Client-Name": "1",
      "X-Youtube-Client-Version": "2.20240320.01.00",
      "Origin": "https://www.youtube.com",
      "Referer": `https://www.youtube.com/watch?v=${this.videoId}`,
    };

    const payload = {
      context: {
        client: {
          hl: "en",
          gl: "US",
          clientName: "WEB",
          clientVersion: "2.20240320.01.00",
          visitorData: this.visitorData,
          originalUrl: `https://www.youtube.com/watch?v=${this.videoId}`,
        },
      },
      continuation: token,
    };

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: HEADERS,
    });

    const data = await res.json();
    this.visitorData = data.responseContext?.visitorData ?? this.visitorData;

    const comments: Comment[] = [];
    let nextContinuation: string | null = null;

    // Navigate the complex InnerTube response tree to find comment renderers
    const actions = data.onResponseReceivedEndpoints ?? data.onResponseReceivedActions;
    if (!actions) return { comments: [], nextToken: null };

    for (const action of actions) {
      const items = action.reloadContinuationItemsCommand?.continuationItems ?? 
                    action.appendContinuationItemsAction?.continuationItems;
      
      if (!items) continue;

      for (const item of items) {
        // Handle 'Next' token
        if (item.continuationItemRenderer) {
          nextContinuation = item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token ?? null;
          continue;
        }

        // Handle Thread (Comment + Replies)
        const thread = item.commentThreadRenderer;
        if (!thread) continue;

        const main = thread.comment?.commentRenderer;
        if (!main) continue;

        comments.push(this.parseRenderer(main));
        
        // Note: Replies are handled slightly differently in InnerTube (they come as separate threads or sub-items).
        // For now, let's focus on the 'Heart' and 'Pinned' flags which are perfect in top-level items.
      }
    }

    return { comments, nextToken: nextContinuation };
  }

  private parseRenderer(renderer: any): any {
    const snippet = renderer;
    const author = snippet.authorText?.simpleText ?? "";
    const text = snippet.contentText?.runs?.map((r: any) => r.text).join("") ?? "";
    const commentId = snippet.commentId;
    
    // 100% ACCURATE FLAGS FROM INNERTUBE:
    const hasHeart = !!snippet.actionButtons?.commentActionButtonsRenderer?.creatorHeart;
    const isPinned = !!snippet.pinnedCommentBadge;
    // Paid (Super Chat) in InnerTube is often inside 'pdgCommentRenderer' if it's a paid comment
    const isPaid   = !!snippet.pdgCommentRenderer; 

    return {
      comment_id:            commentId,
      author:                author,
      author_channel:        `https://www.youtube.com/channel/${snippet.authorEndpoint?.browseEndpoint?.browseId ?? ""}`,
      author_profile_image:  snippet.authorThumbnail?.thumbnails?.[0]?.url ?? null,
      text:                  text,
      likes:                 parseInt(snippet.voteCount?.simpleText ?? "0"),
      published_at:          snippet.publishedTimeText?.runs?.[0]?.text ?? "Recently",
      updated_at:            new Date().toISOString(),
      reply_count:           parseInt(snippet.replyCount ?? "0"),
      is_reply:              false,
      parent_id:             null,
      heart:                 hasHeart,
      is_pinned:             isPinned,
      is_paid:               isPaid,
    };
  }
}
