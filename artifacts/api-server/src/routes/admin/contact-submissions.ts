import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('id,name,email,subject,message,is_read,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return res.json({ submissions: data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    requireAdmin(req);
    const { id } = req.params;
    const { is_read } = req.body;
    const supabase = createSupabaseAdmin();
    const { error } = await supabase
      .from('contact_submissions')
      .update({ is_read })
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    requireAdmin(req);
    const { id } = req.params;
    const supabase = createSupabaseAdmin();
    const { error } = await supabase
      .from('contact_submissions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
