import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';
import { logAdminAction } from '../../lib/audit.js';

const router = Router();

// List users with pagination + filters
router.get('/', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 25;
    const from = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const planId = req.query.planId as string;
    const sort = req.query.sort as string || 'newest';

    let q = supabase.from('profiles').select('*,plans(name),user_credit_balance(balance)', { count: 'exact' });

    if (search) q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    if (status && status !== 'all') q = q.eq('account_status', status);
    if (planId) q = q.eq('current_plan_id', planId);

    switch (sort) {
      case 'oldest': q = q.order('created_at', { ascending: true }); break;
      case 'alpha': q = q.order('full_name', { ascending: true }); break;
      default: q = q.order('created_at', { ascending: false });
    }

    const { data, count, error } = await q.range(from, from + limit - 1);
    if (error) throw error;
    return res.json({ data, count, page, limit });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .select('*,plans(name),subscriptions(*,plans(name)),user_credit_balance(balance)')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'User not found' });
    await logAdminAction({ adminId: admin.adminId, action: 'user.view', targetType: 'user', targetId: req.params.id });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Update profile
router.patch('/:id', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { full_name, timezone, locale } = req.body;
    const { data: before } = await supabase.from('profiles').select('full_name,timezone,locale').eq('id', req.params.id).single();
    await supabase.from('profiles').update({ full_name, timezone, locale, updated_at: new Date().toISOString() }).eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'user.view', targetType: 'user', targetId: req.params.id, beforeValue: before ?? {}, afterValue: { full_name, timezone, locale } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Suspend
router.post('/:id/suspend', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { reason } = req.body;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_suspended:     true,
        account_status:   'suspended',
        suspended_reason: reason || null,
        suspended_at:     new Date().toISOString(),
      })
      .eq('id', req.params.id);

    if (updateError) {
      console.error('Suspend update failed:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Invalidate all Supabase auth sessions immediately (best-effort)
    const { error: signOutError } = await supabase.auth.admin.signOut(req.params.id, 'global');
    if (signOutError) console.warn('signOut warning (non-fatal):', signOutError.message);

    // Mark tracked sessions as inactive (best-effort)
    await supabase
      .from('user_sessions')
      .update({ is_active: false, logged_out_at: new Date().toISOString() })
      .eq('user_id', req.params.id)
      .eq('is_active', true);

    await logAdminAction({ adminId: admin.adminId, action: 'user.suspend', targetType: 'user', targetId: req.params.id, afterValue: { reason } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Unsuspend
router.post('/:id/unsuspend', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_suspended:     false,
        account_status:   'active',
        suspended_reason: null,
        suspended_at:     null,
        suspended_by:     null,
      })
      .eq('id', req.params.id);

    if (updateError) {
      console.error('Unsuspend update failed:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    await logAdminAction({ adminId: admin.adminId, action: 'user.unsuspend', targetType: 'user', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Change plan
router.post('/:id/plan', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { planId } = req.body;
    const { data: before } = await supabase.from('profiles').select('current_plan_id').eq('id', req.params.id).single();
    await supabase.from('profiles').update({ current_plan_id: planId }).eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'user.plan_change', targetType: 'user', targetId: req.params.id, beforeValue: before ?? {}, afterValue: { planId } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Credits
router.post('/:id/credits', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { amount, reason, type } = req.body; // type: 'add' | 'deduct'
    const creditAmount = type === 'deduct' ? -Math.abs(amount) : Math.abs(amount);
    const source = type === 'deduct' ? 'admin_deduct' : 'admin_grant';

    const { data: bal } = await supabase.from('user_credit_balance').select('balance').eq('user_id', req.params.id).single();
    const newBalance = (bal?.balance ?? 0) + creditAmount;

    await supabase.from('credit_ledger').insert({ user_id: req.params.id, amount: creditAmount, source_type: source, description: reason, balance_after: newBalance });
    await logAdminAction({ adminId: admin.adminId, action: type === 'deduct' ? 'user.credits_deduct' : 'user.credits_add', targetType: 'user', targetId: req.params.id, afterValue: { amount: creditAmount, reason } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// User jobs
router.get('/:id/jobs', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 25;
    const from = (page - 1) * limit;
    const { data, count, error } = await supabase.from('jobs').select('*', { count: 'exact' }).eq('user_id', req.params.id).order('created_at', { ascending: false }).range(from, from + limit - 1);
    if (error) throw error;
    return res.json({ data, count, page, limit });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// User payments
router.get('/:id/payments', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const [purchases, transactions] = await Promise.all([
      supabase.from('package_purchases').select('*,credit_packages(name)').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('payment_transactions').select('*').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(50)
    ]);
    return res.json({ purchases: purchases.data, transactions: transactions.data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// User credit history — returns per-video spending + received credits
router.get('/:id/credits', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const userId = req.params.id;

    const [debitsRes, creditsRes, jobsRes] = await Promise.all([
      // All debit rows (job usage)
      supabase.from('credit_ledger').select('*').eq('user_id', userId).lt('amount', 0).order('created_at', { ascending: false }),
      // All positive rows (purchases, grants, etc.)
      supabase.from('credit_ledger').select('*').eq('user_id', userId).gt('amount', 0).order('created_at', { ascending: false }),
      // Jobs to get video titles / thumbnails
      supabase.from('jobs').select('id,video_title,channel_name,thumbnail,downloaded_comments,status,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    // Group debits by source_id (job ID)
    const grouped = new Map<string, any>();
    for (const row of debitsRes.data ?? []) {
      const key = row.source_id ?? `no-job-${row.id}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.totalSpent += Math.abs(row.amount);
        if (new Date(row.created_at) > new Date(existing.latestDate)) {
          existing.latestDate = row.created_at;
        }
      } else {
        const job = (jobsRes.data ?? []).find(j => j.id === row.source_id);
        grouped.set(key, {
          jobId: row.source_id,
          totalSpent: Math.abs(row.amount),
          latestDate: row.created_at,
          job,
        });
      }
    }

    const spentByJob = Array.from(grouped.values()).sort(
      (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );

    return res.json({ spentByJob, received: creditsRes.data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// User sessions
router.get('/:id/sessions', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const [sessions, events, loginHistory] = await Promise.all([
      supabase.from('user_sessions').select('*').eq('user_id', req.params.id).order('last_activity_at', { ascending: false }).limit(20),
      supabase.from('security_events').select('*').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('login_history').select('*').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(20)
    ]);
    return res.json({ sessions: sessions.data, events: events.data, loginHistory: loginHistory.data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Force logout session
router.post('/:id/force-logout', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    await supabase.from('user_sessions').update({ is_active: false, logged_out_at: new Date().toISOString() }).eq('user_id', req.params.id).eq('is_active', true);
    await logAdminAction({ adminId: admin.adminId, action: 'user.force_logout', targetType: 'user', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// User notifications
router.get('/:id/notifications', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return res.json({ data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Send notification
router.post('/:id/notify', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { title, body, type, channel, action_url } = req.body;
    await supabase.from('notifications').insert({ user_id: req.params.id, title, body, type: type || 'job_complete', channel: channel || 'in_app', action_url, sent_at: new Date().toISOString() });
    await logAdminAction({ adminId: admin.adminId, action: 'user.view', targetType: 'user', targetId: req.params.id, notes: `Sent notification: ${title}` });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
