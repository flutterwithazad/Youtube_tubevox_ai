import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';
import { logAdminAction } from '../../lib/audit.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const [admins, roles] = await Promise.all([
      supabase.from('admin_users').select('id,email,full_name,avatar_url,role_id,is_2fa_enabled,is_active,last_login_at,created_at,admin_roles(name)').order('created_at'),
      supabase.from('admin_roles').select('*').order('name')
    ]);
    return res.json({ admins: admins.data, roles: roles.data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    if (!admin.permissions['can_manage_admins']) return res.status(403).json({ error: 'Forbidden' });
    const supabase = createSupabaseAdmin();
    const { full_name, email, password, role_id } = req.body;
    const password_hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase.from('admin_users').insert({ full_name, email, password_hash, role_id, created_by: admin.adminId }).select('id,email,full_name').single();
    if (error) throw error;
    await logAdminAction({ adminId: admin.adminId, action: 'admin.create', targetType: 'admin', targetId: data.id, afterValue: { email, full_name, role_id } });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/role', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    if (!admin.permissions['can_manage_admins']) return res.status(403).json({ error: 'Forbidden' });
    const supabase = createSupabaseAdmin();
    const { role_id } = req.body;
    const { data: before } = await supabase.from('admin_users').select('role_id').eq('id', req.params.id).single();
    await supabase.from('admin_users').update({ role_id }).eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'admin.role_change', targetType: 'admin', targetId: req.params.id, beforeValue: before ?? {}, afterValue: { role_id } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:id/deactivate', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    if (!admin.permissions['can_manage_admins']) return res.status(403).json({ error: 'Forbidden' });
    if (admin.adminId === req.params.id) return res.status(400).json({ error: 'Cannot deactivate your own account' });
    const supabase = createSupabaseAdmin();
    await supabase.from('admin_users').update({ is_active: false, deactivated_at: new Date().toISOString(), deactivated_by: admin.adminId }).eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'admin.deactivate', targetType: 'admin', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
