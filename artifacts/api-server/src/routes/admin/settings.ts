import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';
import { logAdminAction } from '../../lib/audit.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from('platform_settings').select('key,value,description,updated_at,updated_by');
    if (error) throw error;
    return res.json({ data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:key', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { value } = req.body;
    const { data: before } = await supabase.from('platform_settings').select('value').eq('key', req.params.key).single();
    await supabase.from('platform_settings').upsert({ key: req.params.key, value, updated_by: admin.adminId, updated_at: new Date().toISOString() });
    await logAdminAction({ adminId: admin.adminId, action: 'settings.update', targetType: 'settings', beforeValue: { value: before?.value }, afterValue: { value } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
