import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';
import { logAdminAction } from '../../lib/audit.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from('ip_blocklist').select('*,admin_users(full_name),profiles(email)').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from('ip_blocklist').insert({ ...req.body, blocked_by: admin.adminId }).select().single();
    if (error) throw error;
    await logAdminAction({ adminId: admin.adminId, action: 'ip.block', afterValue: req.body });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:id/unblock', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    await supabase.from('ip_blocklist').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'ip.unblock', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
