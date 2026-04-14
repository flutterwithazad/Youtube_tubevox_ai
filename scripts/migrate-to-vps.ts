// scripts/migrate-to-vps.ts
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Pool } = pg;

// Load Env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VPS_DATABASE_URL = process.env.VPS_DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VPS_DATABASE_URL) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const vpsPool = new Pool({ connectionString: VPS_DATABASE_URL, max: 20 });

async function migrate() {
  console.log('🚀 Starting OPTIMIZED Comment Migration: Supabase -> VPS');
  
  const { count } = await supabase.from('comments').select('*', { count: 'exact', head: true });
  console.log(`📊 Total comments to migrate: ${count}`);

  const BATCH_SIZE = 1000;
  let offset = 0;
  let totalMigrated = 0;
  let startTime = Date.now();

  while (true) {
    const batchStart = Date.now();
    console.log(`\n⏳ Fetching batch ${offset / BATCH_SIZE + 1} (${offset} to ${offset + BATCH_SIZE})...`);

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Supabase Error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;

    // Build Bulk Insert Query
    // Table columns: (id, job_id, comment_id, author, author_channel, author_channel_id, author_profile_image, text, text_original, likes, reply_count, is_reply, parent_id, heart, is_pinned, is_paid, sentiment, sentiment_score, is_spam, language, topics, published_at, updated_at, created_at)
    
    const client = await vpsPool.connect();
    try {
      await client.query('BEGIN');
      
      // We'll prepare a multi-row insert: INSERT INTO ... VALUES ($1, $2...), ($25, $26...)
      const columns = [
        'id', 'job_id', 'comment_id', 'author', 'author_channel', 'author_channel_id',
        'author_profile_image', 'text', 'text_original', 'likes', 'reply_count',
        'is_reply', 'parent_id', 'heart', 'is_pinned', 'is_paid',
        'sentiment', 'sentiment_score', 'is_spam', 'language', 'topics',
        'published_at', 'updated_at', 'created_at'
      ];
      
      const values: any[] = [];
      const placeholders: string[] = [];
      
      data.forEach((c, i) => {
        const base = i * columns.length;
        const rowPlaceholders = columns.map((_, j) => `$${base + j + 1}`);
        placeholders.push(`(${rowPlaceholders.join(',')})`);
        
        values.push(
          c.id, c.job_id, c.comment_id, c.author, c.author_channel, c.author_channel_id,
          c.author_profile_image, c.text, c.text_original, c.likes ?? 0, c.reply_count ?? 0,
          c.is_reply ?? false, c.parent_id, c.heart ?? false, c.is_pinned ?? false, c.is_paid ?? false,
          c.sentiment, c.sentiment_score, c.is_spam, c.language, JSON.stringify(c.topics ?? []),
          c.published_at, c.updated_at, c.created_at
        );
      });

      const sql = `
        INSERT INTO public.comments (${columns.join(',')})
        VALUES ${placeholders.join(',')}
        ON CONFLICT (job_id, comment_id) DO NOTHING
      `;
      
      const res = await client.query(sql, values);
      await client.query('COMMIT');
      
      totalMigrated += data.length;
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = totalMigrated / elapsed;
      const remaining = count ? (count - totalMigrated) / rate : 0;

      console.log(`✅ Migrated ${data.length} rows (Total: ${totalMigrated}/${count})`);
      console.log(`⏱️ Speed: ${rate.toFixed(1)} rows/sec. Est. remaining: ${(remaining / 60).toFixed(1)} mins`);

    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('❌ VPS Error:', err.message);
    } finally {
      client.release();
    }

    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log('\n✨ Migration Complete!');
  console.log(`🏁 Total: ${totalMigrated}`);
  console.log(`⏱️ Total time: ${((Date.now() - startTime) / 1000 / 60).toFixed(2)} minutes`);
  
  await vpsPool.end();
}

migrate().catch(console.error);
