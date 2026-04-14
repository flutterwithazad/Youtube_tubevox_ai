// scripts/migrate-to-vps.ts
// Run: npx tsx scripts/migrate-to-vps.ts

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Pool } = pg;

// Load Env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VPS_DATABASE_URL = process.env.VPS_DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VPS_DATABASE_URL) {
  console.error('Missing required environment variables:');
  console.error('VITE_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  console.error('VPS_DATABASE_URL:', !!VPS_DATABASE_URL);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const vpsPool = new Pool({
  connectionString: VPS_DATABASE_URL,
  ssl: false, 
});

async function migrate() {
  console.log('--- Starting Comment Migration: Supabase -> VPS ---');

  let offset   = 0;
  const BATCH  = 1000;
  let total    = 0;
  let errors   = 0;

  // Use a temporary file to keep track of where we left off if needed, 
  // but for a one-off small migration, range offset is fine.

  while (true) {
    console.log(`Fetching batch from Supabase (offset: ${offset})...`);
    
    // Fetch batch from Supabase
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .range(offset, offset + BATCH - 1)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase read error:', error.message);
      break;
    }

    if (!data || data.length === 0) {
      console.log('No more comments to migrate.');
      break;
    }

    // Insert batch into VPS Postgres
    const client = await vpsPool.connect();
    try {
      await client.query('BEGIN');

      for (const c of data) {
        await client.query(`
          INSERT INTO public.comments (
            id, job_id, comment_id, author, author_channel, author_channel_id,
            author_profile_image, text, text_original, likes, reply_count,
            is_reply, parent_id, heart, is_pinned, is_paid,
            sentiment, sentiment_score, is_spam, language, topics,
            published_at, updated_at, created_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
            $17,$18,$19,$20,$21,$22,$23,$24
          )
          ON CONFLICT (job_id, comment_id) DO NOTHING
        `, [
          c.id, c.job_id, c.comment_id, c.author, c.author_channel,
          c.author_channel_id, c.author_profile_image, c.text, c.text_original,
          c.likes ?? 0, c.reply_count ?? 0, c.is_reply ?? false,
          c.parent_id, c.heart ?? false, c.is_pinned ?? false, c.is_paid ?? false,
          c.sentiment, c.sentiment_score, c.is_spam, c.language,
          JSON.stringify(c.topics ?? []),
          c.published_at, c.updated_at, c.created_at
        ]);
        total++;
      }

      await client.query('COMMIT');
      console.log(`Successfully migrated ${total} comments...`);
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('VPS insert error:', err.message);
      errors++;
    } finally {
      client.release();
    }

    if (data.length < BATCH) break;
    offset += BATCH;
  }

  console.log('--- Migration Finished ---');
  console.log(`Total: ${total}`);
  console.log(`Errors (batches): ${errors}`);
  
  await vpsPool.end();
}

migrate().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
