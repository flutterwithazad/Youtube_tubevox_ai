import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';
import { logAdminAction } from '../../lib/audit.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from('youtube_api_keys').select('id,label,quota_used,quota_limit,quota_used_pct,error_count,consecutive_errors,is_active,is_paused,last_used_at,last_reset_at,last_error_at,last_error_msg,created_at,updated_at').order('created_at');
    if (error) throw error;
    // Return only first 8 chars of key — never the full key
    return res.json({ data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { label, key_value, quota_limit } = req.body;
    const { data, error } = await supabase.from('youtube_api_keys').insert({ label, key_value, quota_limit: quota_limit || 10000 }).select('id,label,quota_used,quota_limit,is_active,is_paused,created_at').single();
    if (error) throw error;
    await logAdminAction({ adminId: admin.adminId, action: 'api_key.add', afterValue: { label, quota_limit } });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    await supabase.from('youtube_api_keys').update({ is_paused: true }).eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'api_key.pause', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:id/resume', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    await supabase.from('youtube_api_keys').update({ is_paused: false }).eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'api_key.resume', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:id/reset', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    await supabase.from('youtube_api_keys').update({ quota_used: 0, consecutive_errors: 0, last_reset_at: new Date().toISOString() }).eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'api_key.reset', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    await supabase.from('youtube_api_keys').delete().eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'api_key.delete', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
