import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdmin } from '../lib/supabase-admin.js';

const router = Router();

function getUserSupabase(accessToken: string) {
  const url = process.env['VITE_SUPABASE_URL']!;
  const anonKey = process.env['VITE_SUPABASE_ANON_KEY']!;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

router.post('/deduct', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const accessToken = authHeader.slice(7);

    const userClient = getUserSupabase(accessToken);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { amount, job_id, description } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }
    if (!job_id || typeof job_id !== 'string') {
      return res.status(400).json({ error: 'job_id is required' });
    }

    const supabase = createSupabaseAdmin();

    // Verify the job belongs to this user
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, user_id, status, credits_used')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .single();

    if (jobErr || !job) {
      return res.status(403).json({ error: 'Job not found or does not belong to this user' });
    }

    // Call atomic_credit_deduct
    const { data: result, error: rpcErr } = await supabase.rpc('atomic_credit_deduct', {
      p_user_id: user.id,
      p_batch_size: amount,
      p_source_id: job_id,
      p_description: description ?? `Batch: ${amount} comments fetched — 1 credit per comment`,
    });

    if (rpcErr) {
      console.error('[credits/deduct] RPC error:', rpcErr);
      return res.status(500).json({ error: rpcErr.message });
    }

    const deductResult = result as { ok: boolean; balance: number; needed?: number; deducted?: number };

    if (!deductResult.ok) {
      // Deduction failed — the edge function handles its own credit checks server-side,
      // so this path is rare. Return the current balance without draining anything.
      // (Draining caused false "insufficient_credits" errors on subsequent batches.)
      return res.status(402).json({
        error: 'insufficient_credits',
        balance: deductResult.balance ?? 0,
        credits_needed: amount,
        deducted: 0,
      });
    }

    // Update jobs.credits_used with the newly deducted amount
    const newCreditsUsed = (job.credits_used ?? 0) + amount;
    const { error: updateErr } = await supabase
      .from('jobs')
      .update({ credits_used: newCreditsUsed })
      .eq('id', job_id);

    if (updateErr) {
      console.error('[credits/deduct] Failed to update jobs.credits_used:', updateErr);
    }

    return res.json({
      ok: true,
      deducted: amount,
      balance: deductResult.balance,
      credits_used: newCreditsUsed,
    });
  } catch (e: any) {
    console.error('[credits/deduct] Unexpected error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// Simulate a purchase — adds credits directly without a payment gateway.
// Replace this route's internals with a real Stripe/payment flow later.
router.post('/purchase', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const accessToken = authHeader.slice(7);

    const userClient = getUserSupabase(accessToken);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { package_id } = req.body;
    if (!package_id || typeof package_id !== 'string') {
      return res.status(400).json({ error: 'package_id is required' });
    }

    const supabase = createSupabaseAdmin();

    // Look up the package
    const { data: pkg, error: pkgErr } = await supabase
      .from('credit_packages')
      .select('id, name, credits_amount, price')
      .eq('id', package_id)
      .maybeSingle();

    if (pkgErr || !pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Get current balance for balance_after calculation
    const { data: balData } = await supabase
      .from('user_credit_balance')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();
    const currentBalance = balData?.balance ?? 0;

    // Insert a positive ledger row (simulated purchase)
    const { error: ledgerErr } = await supabase.from('credit_ledger').insert({
      user_id:      user.id,
      amount:       pkg.credits_amount,
      source_type:  'purchase',
      source_id:    pkg.id,
      description:  `Purchased: ${pkg.name} — ${pkg.credits_amount.toLocaleString()} credits`,
      balance_after: currentBalance + pkg.credits_amount,
    });

    if (ledgerErr) throw ledgerErr;

    return res.json({
      ok:      true,
      credits: pkg.credits_amount,
      balance: currentBalance + pkg.credits_amount,
      package: pkg.name,
    });
  } catch (e: any) {
    console.error('[credits/purchase] Unexpected error:', e);
    return res.status(500).json({ error: e.message });
  }
});

router.get('/balance', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const accessToken = authHeader.slice(7);

    const userClient = getUserSupabase(accessToken);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_credit_balance')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return res.json({ balance: data?.balance ?? 0, user_id: user.id });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
