import pg from 'pg';
const { Pool } = pg;

// Singleton pool — reused across requests
let pool: Pool | null = null;

export function getVpsPool(): pg.Pool {
  if (!pool) {
    if (!process.env.VPS_DATABASE_URL) {
      throw new Error('VPS_DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString: process.env.VPS_DATABASE_URL,
      max:              10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.VPS_DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    });
  }
  return pool;
}

// Typed comment row
export interface CommentRow {
  id:                   string;
  job_id:               string;
  comment_id:           string;
  author:               string | null;
  author_channel:       string | null;
  author_channel_id:   string | null;
  author_profile_image: string | null;
  text:                string | null;
  text_original:       string | null;
  likes:               number;
  reply_count:         number;
  is_reply:            boolean;
  parent_id:           string | null;
  heart:               boolean;
  is_pinned:           boolean;
  is_paid:             boolean;
  sentiment:           string | null;
  language:            string | null;
  published_at:        Date | null;
  created_at:          Date;
}

// Fetch paginated comments for a job
export async function getCommentsByJob(
  jobId:  string,
  opts: {
    limit?:   number;
    offset?:  number;
    orderBy?: 'likes' | 'newest' | 'oldest';
  } = {}
): Promise<CommentRow[]> {
  const pool   = getVpsPool();
  const limit  = opts.limit  ?? 50;
  const offset = opts.offset ?? 0;
  const order  = opts.orderBy === 'newest' ? 'published_at DESC'
               : opts.orderBy === 'oldest' ? 'published_at ASC'
               : 'likes DESC';                                    // default: top

  const { rows } = await pool.query<CommentRow>(`
    SELECT * FROM public.comments
    WHERE job_id = $1
    ORDER BY ${order}
    LIMIT $2 OFFSET $3
  `, [jobId, limit, offset]);

  return rows;
}

// Fetch ALL comments for a job (for export)
export async function getAllCommentsByJob(jobId: string): Promise<CommentRow[]> {
  const pool = getVpsPool();
  const { rows } = await pool.query<CommentRow>(`
    SELECT * FROM public.comments
    WHERE job_id = $1
    ORDER BY likes DESC
  `, [jobId]);
  return rows;
}

// Count comments for a job
export async function countCommentsByJob(jobId: string): Promise<number> {
  const pool = getVpsPool();
  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM public.comments WHERE job_id = $1',
    [jobId]
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

// Delete all comments for a job (when user deletes a job)
export async function deleteCommentsByJob(jobId: string): Promise<number> {
  const pool = getVpsPool();
  const { rowCount } = await pool.query(
    'DELETE FROM public.comments WHERE job_id = $1',
    [jobId]
  );
  return rowCount ?? 0;
}
