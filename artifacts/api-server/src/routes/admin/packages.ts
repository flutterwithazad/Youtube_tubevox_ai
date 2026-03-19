import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';
import { logAdminAction } from '../../lib/audit.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from('credit_packages').select('*').order('sort_order');
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
    const { data, error } = await supabase.from('credit_packages').insert(req.body).select().single();
    if (error) throw error;
    await logAdminAction({ adminId: admin.adminId, action: 'package.create', afterValue: req.body });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data: before } = await supabase.from('credit_packages').select('*').eq('id', req.params.id).single();
    const { data, error } = await supabase.from('credit_packages').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    await logAdminAction({ adminId: admin.adminId, action: 'package.update', targetId: req.params.id, beforeValue: before ?? {}, afterValue: req.body });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { count } = await supabase.from('package_purchases').select('*', { count: 'exact', head: true }).eq('package_id', req.params.id);
    if (count && count > 0) return res.status(400).json({ error: 'Cannot delete package with existing purchases' });
    await supabase.from('credit_packages').delete().eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'package.delete', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
