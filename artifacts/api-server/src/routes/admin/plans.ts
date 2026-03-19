import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';
import { logAdminAction } from '../../lib/audit.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from('plans').select('*').order('price_monthly');
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
    const { data, error } = await supabase.from('plans').insert(req.body).select().single();
    if (error) throw error;
    await logAdminAction({ adminId: admin.adminId, action: 'plans.create', targetType: 'plan', targetId: data.id, afterValue: req.body });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data: before } = await supabase.from('plans').select('*').eq('id', req.params.id).single();
    const { data, error } = await supabase.from('plans').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    await logAdminAction({ adminId: admin.adminId, action: 'plans.update', targetType: 'plan', targetId: req.params.id, beforeValue: before ?? {}, afterValue: req.body });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
