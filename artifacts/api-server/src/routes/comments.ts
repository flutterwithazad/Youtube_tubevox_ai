import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { getCommentsByJob, countCommentsByJob, getAllCommentsByJob } from '../lib/vps-db.js';
import { checkUserSuspension } from '../middleware/platform.js';

const router = Router();

function getUserSupabase(accessToken: string) {
  const url = process.env['VITE_SUPABASE_URL']!;
  const anonKey = process.env['VITE_SUPABASE_ANON_KEY']!;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveUser(req: Request, res: Response): Promise<{ id: string } | null> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return null;
  }
  const accessToken = authHeader.slice(7);
  const userClient = getUserSupabase(accessToken);
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  
  if (authError || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
  
  const suspension = await checkUserSuspension(user.id);
  if (suspension.suspended) {
    res.status(403).json({
      error: 'SUSPENDED',
      message: 'Your account has been suspended.',
      reason: suspension.reason,
    });
    return null;
  }
  return { id: user.id };
}

// GET /api/comments?jobId=...&limit=50&offset=0&orderBy=likes
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const jobId = req.query.jobId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const orderBy = (req.query.orderBy as 'likes' | 'newest' | 'oldest') || 'likes';

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    // Verify user owns this job in Supabase
    const url = process.env['VITE_SUPABASE_URL']!;
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
    const adminSupabase = createClient(url, key);
    
    const { data: job, error: jobErr } = await adminSupabase
      .from('jobs')
      .select('id, user_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobErr || !job) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    // Fetch from VPS
    const [comments, total] = await Promise.all([
      getCommentsByJob(jobId, { limit, offset, orderBy }),
      countCommentsByJob(jobId),
    ]);

    return res.json({ comments, total });
  } catch (e: any) {
    console.error('[GET /api/comments] Error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/comments/export?jobId=...&format=csv|json
router.get('/export', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const jobId = req.query.jobId as string;
    const format = (req.query.format as string) || 'json';

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    // Verify ownership
    const url = process.env['VITE_SUPABASE_URL']!;
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
    const adminSupabase = createClient(url, key);
    
    const { data: job, error: jobErr } = await adminSupabase
      .from('jobs')
      .select('id, user_id, video_title')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobErr || !job) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    // Fetch ALL from VPS
    const comments = await getAllCommentsByJob(jobId);

    if (format === 'json') {
      return res.json({ 
        comments, 
        total: comments.length, 
        video_title: job.video_title 
      });
    }

    if (format === 'csv') {
      const headers = ['comment_id','author','author_channel','text','likes','reply_count','is_reply','parent_id','language','published_at'];
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      
      const rows = comments.map(c => [
        esc(c.comment_id), 
        esc(c.author), 
        esc(c.author_channel), 
        esc(c.text),
        c.likes, 
        c.reply_count, 
        c.is_reply, 
        esc(c.parent_id),
        esc(c.language), 
        c.published_at ? new Date(c.published_at).toISOString() : ''
      ].join(','));
      
      const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="comments_${jobId}.csv"`);
      return res.send(csv);
    }

    return res.status(400).json({ error: 'Invalid format' });
  } catch (e: any) {
    console.error('[GET /api/comments/export] Error:', e);
    return res.status(500).json({ error: e.message });
  }
});

export default router;
