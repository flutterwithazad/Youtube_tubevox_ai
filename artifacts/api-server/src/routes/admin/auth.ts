import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { signAdminToken, requireAdmin } from '../../lib/admin-auth.js';
import { logAdminAction } from '../../lib/audit.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const supabase = createSupabaseAdmin();
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*, admin_roles(*)')
      .eq('email', email)
      .single();

    if (error || !admin) return res.status(401).json({ error: 'Invalid credentials' });
    if (!admin.is_active) return res.status(403).json({ error: 'Your account has been deactivated' });
    if (!admin.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const role = admin.admin_roles;
    const permissions: Record<string, boolean> = {};
    const permKeys = [
      'can_view_users','can_suspend_users','can_delete_users','can_change_user_plan',
      'can_add_credits','can_view_payments','can_issue_refunds','can_manage_plans',
      'can_view_jobs','can_kill_jobs','can_manage_api_keys','can_edit_settings',
      'can_manage_announcements','can_manage_ip_blocklist','can_manage_admins','can_view_audit_log'
    ];
    for (const k of permKeys) permissions[k] = role?.[k] ?? false;

    const token = signAdminToken({
      adminId: admin.id, email: admin.email, roleId: admin.role_id,
      roleName: role?.name ?? '', fullName: admin.full_name, permissions
    });

    await supabase.from('admin_users').update({
      last_login_at: new Date().toISOString(),
      last_login_ip: req.ip
    }).eq('id', admin.id);

    await logAdminAction({ adminId: admin.id, action: 'admin.login', ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    res.cookie('admin_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 8 * 3600 * 1000 });
    return res.json({ success: true, admin: { id: admin.id, email: admin.email, fullName: admin.full_name, roleName: role?.name, permissions } });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    await logAdminAction({ adminId: admin.adminId, action: 'admin.logout', ipAddress: req.ip });
    res.clearCookie('admin_token');
    return res.json({ success: true });
  } catch {
    res.clearCookie('admin_token');
    return res.json({ success: true });
  }
});

router.get('/me', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    return res.json({ admin });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

export default router;
