import { Router } from 'express';
import { createSupabaseAdmin } from '../lib/supabase-admin.js';

const router = Router();

router.get('/settings', async (req, res) => {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key,value')
      .in('key', ['free_plan_credits', 'max_job_comments', 'maintenance_mode', 'new_signups_enabled']);
    if (error) throw error;
    const settings: Record<string, string> = {};
    for (const row of data ?? []) settings[row.key] = row.value ?? '';
    return res.json(settings);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/packages', async (req, res) => {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('credit_packages')
      .select('id,name,description,credits_amount,price,currency,sort_order')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return res.json({ data: data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
