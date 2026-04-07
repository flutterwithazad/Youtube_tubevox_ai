// supabase/functions/fetch-comments/types.ts

export interface ApiKey {
  id:           string;
  key_value:    string;
  label:        string;
  quota_used:   number;
  quota_limit:  number;
  last_used_at: string;
  error_count:  number;
}

export interface FetchFilters {
  sortBy?:         "relevance" | "newest";
  minLikes?:       number;
  dateFrom?:       string;
  keyword?:        string;
  includeReplies?: boolean;
  maxComments?:    number;
  onlyHearted?:    boolean;
  onlyPinned?:     boolean;
  onlyPaid?:       boolean;
}

export interface Comment {
  job_id:                string;
  comment_id:            string;
  author:                string;
  author_channel:        string;
  author_profile_image?: string;
  text:                  string;
  likes:                 number;
  published_at:          string;
  updated_at:            string;
  reply_count:           number;
  is_reply:              boolean;
  parent_id:             string | null;
  heart:                 boolean;
  is_pinned:             boolean;
  is_paid:               boolean;
}

export interface YouTubeApiResponse {
  items:          any[];
  nextPageToken?: string;
  error?:         { code: number; message: string };
}
