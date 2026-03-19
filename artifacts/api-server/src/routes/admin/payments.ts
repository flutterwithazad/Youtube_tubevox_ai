import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';
import { logAdminAction } from '../../lib/audit.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 25;
    const from = (page - 1) * limit;
    const tab = req.query.tab as string || 'purchases';

    if (tab === 'transactions') {
      const { data, count, error } = await supabase.from('payment_transactions').select('*,profiles(email)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + limit - 1);
      if (error) throw error;
      return res.json({ data, count, page, limit });
    }

    const { data, count, error } = await supabase.from('package_purchases').select('*,profiles(email),credit_packages(name)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + limit - 1);
    if (error) throw error;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [allRevenue, monthRevenue, failedCount, refundCount] = await Promise.all([
      supabase.from('package_purchases').select('price_paid').eq('payment_status', 'completed'),
      supabase.from('package_purchases').select('price_paid').eq('payment_status', 'completed').gte('created_at', startOfMonth),
      supabase.from('package_purchases').select('*', { count: 'exact', head: true }).eq('payment_status', 'failed'),
      supabase.from('package_purchases').select('*', { count: 'exact', head: true }).eq('payment_status', 'refunded')
    ]);

    const totalRevenue = (allRevenue.data ?? []).reduce((s, r) => s + Number(r.price_paid), 0);
    const monthlyRevenue = (monthRevenue.data ?? []).reduce((s, r) => s + Number(r.price_paid), 0);

    return res.json({ data, count, page, limit, stats: { totalRevenue, monthlyRevenue, failedCount: failedCount.count, refundCount: refundCount.count } });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:id/refund', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data: purchase } = await supabase.from('package_purchases').select('*').eq('id', req.params.id).single();
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    await supabase.from('package_purchases').update({ payment_status: 'refunded' }).eq('id', req.params.id);

    const { data: bal } = await supabase.from('user_credit_balance').select('balance').eq('user_id', purchase.user_id).single();
    await supabase.from('credit_ledger').insert({ user_id: purchase.user_id, amount: -purchase.credits_total, source_type: 'refund', description: 'Admin issued refund', balance_after: (bal?.balance ?? 0) - purchase.credits_total, source_id: purchase.id });
    await supabase.from('payment_transactions').insert({ purchase_id: purchase.id, user_id: purchase.user_id, provider: purchase.payment_provider, provider_event_id: `admin-refund-${Date.now()}`, event_type: 'refund.created', amount: purchase.price_paid, currency: purchase.currency, status: 'refunded' });
    await logAdminAction({ adminId: admin.adminId, action: 'payment.refund', targetType: 'payment', targetId: req.params.id, afterValue: { refunded: true } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
