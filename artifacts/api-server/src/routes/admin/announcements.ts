import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';
import { logAdminAction } from '../../lib/audit.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
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
    const { data, error } = await supabase.from('announcements').insert({ ...req.body, created_by: admin.adminId }).select().single();
    if (error) throw error;
    await logAdminAction({ adminId: admin.adminId, action: 'announcement.create', afterValue: req.body });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data: before } = await supabase.from('announcements').select('*').eq('id', req.params.id).single();
    const { data, error } = await supabase.from('announcements').update({ ...req.body, updated_by: admin.adminId, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    await logAdminAction({ adminId: admin.adminId, action: 'announcement.update', targetId: req.params.id, beforeValue: before ?? {}, afterValue: req.body });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    await supabase.from('announcements').delete().eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'announcement.delete', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
