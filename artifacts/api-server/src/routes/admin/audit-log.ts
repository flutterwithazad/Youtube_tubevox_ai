import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 25;
    const from = (page - 1) * limit;
    const search = req.query.search as string;
    const adminId = req.query.adminId as string;
    const targetType = req.query.targetType as string;

    let q = supabase.from('admin_audit_log').select('*,admin_users(full_name,email)', { count: 'exact' });
    if (search) q = q.ilike('action', `%${search}%`);
    if (adminId) q = q.eq('admin_id', adminId);
    if (targetType && targetType !== 'all') q = q.eq('target_type', targetType);
    q = q.order('created_at', { ascending: false }).range(from, from + limit - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    return res.json({ data, count, page, limit });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/admins', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data } = await supabase.from('admin_users').select('id,full_name,email');
    return res.json({ data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
