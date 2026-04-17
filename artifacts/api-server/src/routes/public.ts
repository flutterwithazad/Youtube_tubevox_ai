import { Router } from 'express';
import { createSupabaseAdmin } from '../lib/supabase-admin.js';

const router = Router();

router.get('/settings', async (req, res) => {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key,value')
      .in('key', ['free_plan_credits', 'max_job_comments', 'maintenance_mode', 'new_signups_enabled', 'email_signin_enabled',
                  'contact_email', 'contact_phone', 'contact_address', 'contact_hours',
                  'company_name', 'company_email']);
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
      .select('id,name,description,credits_amount,price,currency,sort_order,dodo_product_id,stripe_price_id')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return res.json({ data: data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/social-links', async (req, res) => {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('social_links')
      .select('id,platform,url,icon_key,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return res.json({ data: data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, and message are required' });
    }
    const supabase = createSupabaseAdmin();
    await supabase.from('contact_submissions').insert({
      name: String(name).slice(0, 200),
      email: String(email).slice(0, 200),
      subject: subject ? String(subject).slice(0, 300) : null,
      message: String(message).slice(0, 5000),
    });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
