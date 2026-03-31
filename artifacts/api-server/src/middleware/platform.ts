import type { Request, Response, NextFunction } from 'express';
import { createSupabaseAdmin } from '../lib/supabase-admin.js';

// ── Settings cache (30-second TTL) ─────────────────────────────────────────

const cache: Record<string, { value: string; expiresAt: number }> = {};
const CACHE_TTL_MS = 30_000;

export async function getPlatformSetting(key: string): Promise<string | null> {
  const now = Date.now();
  if (cache[key] && cache[key].expiresAt > now) return cache[key].value;

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single();

  const value = data?.value ?? null;
  if (value !== null) cache[key] = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

export function invalidateSettingsCache() {
  for (const key of Object.keys(cache)) delete cache[key];
}

// ── Maintenance mode middleware ─────────────────────────────────────────────
// Blocks all user-facing routes when maintenance_mode = 'true'.
// Admin routes (/api/admin/*) are exempt.

export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const maintenance = await getPlatformSetting('maintenance_mode');
    if (maintenance === 'true') {
      res.status(503).json({
        error: 'MAINTENANCE',
        message: 'The platform is currently under maintenance. Please check back shortly.',
      });
      return;
    }
    next();
  } catch {
    next();
  }
}

// ── Suspension check helper ─────────────────────────────────────────────────

export async function checkUserSuspension(userId: string): Promise<{ suspended: boolean; reason: string | null }> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('profiles')
    .select('is_suspended,suspended_reason')
    .eq('id', userId)
    .single();

  return {
    suspended: data?.is_suspended === true,
    reason: data?.suspended_reason ?? null,
  };
}
