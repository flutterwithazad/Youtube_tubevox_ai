// supabase/functions/fetch-comments/keyManager.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ApiKey } from "./types.ts";

export class KeyManager {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL")              ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
  }

  // ── Get the best available key ──────────────────
  async getAvailableKey(): Promise<ApiKey> {
    // Reset daily quota for keys not reset in 24h (best-effort)
    try {
      await this.supabase.rpc("reset_youtube_quota");
    } catch (_) {
      // RPC may not exist yet — non-fatal
    }

    // Fetch all active keys, ordered by least recently used + fewest errors
    const { data: keys, error } = await this.supabase
      .from("youtube_api_keys")
      .select("*")
      .eq("is_active", true)
      .order("last_used_at", { ascending: true, nullsFirst: true })
      .order("error_count",  { ascending: true });

    if (error) throw new Error(`DB error fetching API keys: ${error.message}`);

    if (!keys?.length) {
      throw new Error(
        "No active YouTube API keys found. " +
        "Please add at least one key to the youtube_api_keys table."
      );
    }

    // Filter by quota in application code (avoids unsupported column comparison)
    const available = keys.filter((k: ApiKey) => k.quota_used < k.quota_limit);

    if (!available.length) {
      throw new Error(
        "All YouTube API keys have hit their daily quota. " +
        "Please try again tomorrow or add more keys."
      );
    }

    return available[0];
  }

  // ── Increment quota_used and update last_used_at ─
  async markUsed(keyId: string, unitsUsed: number = 1) {
    const { data: key } = await this.supabase
      .from("youtube_api_keys")
      .select("quota_used")
      .eq("id", keyId)
      .single();

    await this.supabase
      .from("youtube_api_keys")
      .update({
        quota_used:   (key?.quota_used ?? 0) + unitsUsed,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", keyId);
  }

  // ── Increment error_count; optionally disable ────
  async markError(keyId: string, disable: boolean = false) {
    const { data: key } = await this.supabase
      .from("youtube_api_keys")
      .select("error_count")
      .eq("id", keyId)
      .single();

    await this.supabase
      .from("youtube_api_keys")
      .update({
        error_count: (key?.error_count ?? 0) + 1,
        is_active:   disable ? false : true,
      })
      .eq("id", keyId);
  }

  // ── Disable key ──────────────────────────────────
  async disableKey(keyId: string) {
    await this.supabase
      .from("youtube_api_keys")
      .update({ is_active: false })
      .eq("id", keyId);
  }

  // ── Rotate to next key after quota exhaustion ────
  async rotateKey(exhaustedKeyId: string): Promise<ApiKey> {
    console.log(`Rotating away from key: ${exhaustedKeyId}`);
    await this.disableKey(exhaustedKeyId);
    return await this.getAvailableKey();
  }
}
