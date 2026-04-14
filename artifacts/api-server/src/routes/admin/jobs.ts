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
    const search = req.query.search as string;
    const status = req.query.status as string;
    const jobType = req.query.type as string;

    let q = supabase.from('jobs').select('*,profiles(email)', { count: 'exact' });
    if (search) q = q.or(`video_title.ilike.%${search}%,video_id.ilike.%${search}%`);
    if (status && status !== 'all') q = q.eq('status', status);
    if (jobType && jobType !== 'all') q = q.eq('job_type', jobType);
    q = q.order('created_at', { ascending: false }).range(from, from + limit - 1);

    const { data, count, error } = await q;
    if (error) throw error;
    return res.json({ data, count, page, limit });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data: job } = await supabase.from('jobs').select('*,profiles(email)').eq('id', req.params.id).single();
    
    // Fetch comments from VPS
    const { getCommentsByJob } = await import('../../lib/vps-db.js');
    const comments = await getCommentsByJob(req.params.id, { limit: 100, orderBy: 'likes' });

    await logAdminAction({ adminId: admin.adminId, action: 'job.view', targetType: 'job', targetId: req.params.id });
    return res.json({ job, comments });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:id/kill', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const { data: job } = await supabase.from('jobs').select('credits_reserved,credits_used,user_id').eq('id', req.params.id).single();
    await supabase.from('jobs').update({ status: 'cancelled', completed_at: new Date().toISOString() }).eq('id', req.params.id);

    if (job && job.credits_reserved > job.credits_used) {
      const refund = job.credits_reserved - job.credits_used;
      const { data: bal } = await supabase.from('user_credit_balance').select('balance').eq('user_id', job.user_id).single();
      await supabase.from('credit_ledger').insert({ user_id: job.user_id, amount: refund, source_type: 'job_cancel_refund', description: 'Job killed by admin - credits refunded', balance_after: (bal?.balance ?? 0) + refund, source_id: req.params.id });
    }
    await logAdminAction({ adminId: admin.adminId, action: 'job.kill', targetType: 'job', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:id/retry', async (req, res) => {
  try {
    const admin = requireAdmin(req);
    const supabase = createSupabaseAdmin();
    await supabase.from('jobs').update({ status: 'queued', error_message: null }).eq('id', req.params.id);
    await logAdminAction({ adminId: admin.adminId, action: 'job.retry', targetType: 'job', targetId: req.params.id });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
