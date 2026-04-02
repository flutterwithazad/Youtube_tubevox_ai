import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('social_links')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return res.json({ links: data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    requireAdmin(req);
    const { platform, url, icon_key, sort_order } = req.body;
    if (!platform || !url || !icon_key) {
      return res.status(400).json({ error: 'platform, url, and icon_key are required' });
    }
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('social_links')
      .insert({ platform, url, icon_key, sort_order: sort_order ?? 0 })
      .select()
      .single();
    if (error) throw error;
    return res.json({ link: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    requireAdmin(req);
    const { id } = req.params;
    const updates = req.body;
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('social_links')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return res.json({ link: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    requireAdmin(req);
    const { id } = req.params;
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from('social_links').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
