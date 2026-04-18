import { Router, type Request, type Response } from 'express';
import * as _Webhooks from 'standardwebhooks';
const Webhook = (_Webhooks as any).Webhook ?? (_Webhooks as any).default ?? _Webhooks;
import { getDodoClient, getPaymentMode, getWebhookSecret } from '../lib/dodo.js';
import { createSupabaseAdmin } from '../lib/supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
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

async function resolveUser(req: Request, res: Response): Promise<{ id: string; email: string } | null> {
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
    res.status(403).json({ error: 'SUSPENDED', message: 'Your account has been suspended.' });
    return null;
  }
  return { id: user.id, email: user.email! };
}

// ─── CHECKOUT SESSION ─────────────────────────────────────────────────────────
//
// IMPORTANT: We create the purchase record FIRST so we have its ID to embed in
// the return_url. Dodo redirects to the SAME return_url for both success AND
// failure — we NEVER use "payment=success" in the URL. Instead we use
// "payment=pending" and the frontend polls the real purchase row for status.
//
router.post('/checkout', async (req, res) => {
  const supabase = createSupabaseAdmin();
  let purchaseId: string | null = null;

  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { packageId } = req.body;
    if (!packageId) return res.status(400).json({ error: 'packageId is required' });

    // ── 1. Load package ───────────────────────────────────────────────────────
    const { data: pkg, error: pkgErr } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (pkgErr || !pkg) return res.status(404).json({ error: 'Package not found or inactive' });
    if (!pkg.dodo_product_id) return res.status(400).json({ error: 'Package not configured for Dodo Payments' });

    // ── 2. Load profile ───────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const mode = await getPaymentMode();

    // ── 3. Create the purchase record BEFORE calling Dodo ────────────────────
    //    This gives us a purchaseId we can embed in the redirect URLs.
    const { data: purchase, error: purchaseErr } = await supabase
      .from('package_purchases')
      .insert({
        user_id: user.id,
        package_id: packageId,
        credits_total: pkg.credits_amount,
        price_paid: pkg.price,
        currency: pkg.currency || 'USD',
        payment_status: 'pending',
        payment_provider: 'dodopayments',
      })
      .select()
      .single();

    if (purchaseErr || !purchase) throw purchaseErr ?? new Error('Failed to create purchase record');
    purchaseId = purchase.id;

    // ── 4. Build redirect URLs ────────────────────────────────────────────────
    //    Dodo uses ONE return_url for both success AND failure — we never
    //    hard-code "success". The frontend checks the real DB status instead.
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    // Dodo appends ?status=... and ?payment_id=... to the return_url automatically.
    const returnUrl = `${appUrl}/dashboard/credits?purchase_id=${purchase.id}`;
    const cancelUrl = `${appUrl}/dashboard/credits?dodo_cancel=true&purchase_id=${purchase.id}`;

    // ── 5. Create Dodo checkout session ───────────────────────────────────────
    const dodo = await getDodoClient();
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: pkg.dodo_product_id, quantity: 1 }],
      customer: {
        email: user.email,
        name: profile?.full_name || undefined,
      },
      return_url: returnUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        package_id: String(packageId),
        purchase_id: purchase.id,
        mode,
      },
    });

    if (!session.checkout_url) {
      // Roll back the pending purchase so the user isn't left with a ghost record
      await supabase.from('package_purchases').delete().eq('id', purchase.id);
      return res.status(500).json({ error: 'Dodo did not return a checkout URL' });
    }

    // ── 6. Persist checkout URL on the purchase row ───────────────────────────
    await supabase
      .from('package_purchases')
      .update({ checkout_url: session.checkout_url })
      .eq('id', purchase.id);

    console.log(`[DODO] Checkout created: user=${user.id} pkg=${packageId} purchase=${purchase.id} mode=${mode}`);

    return res.json({
      checkout_url: session.checkout_url,
      purchase_id: purchase.id,
      mode,
    });

  } catch (err: any) {
    // If we already created a purchase row, mark it failed so it doesn't linger
    if (purchaseId) {
      createSupabaseAdmin()
        .from('package_purchases')
        .update({ payment_status: 'failed' })
        .eq('id', purchaseId)
        .then(() => {});
    }
    console.error('[DODO] Checkout error:', err.stack || err.message);
    return res.status(500).json({ error: 'Failed to create checkout session', details: err.message });
  }
});

// ─── PURCHASE STATUS ENDPOINT ─────────────────────────────────────────────────
// Frontend polls this to get the real payment status after redirect.
router.get('/purchase/:id/status', async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('package_purchases')
      .select('id, payment_status, credits_total, price_paid, currency, dodo_payment_id, created_at')
      .eq('id', req.params.id)
      .eq('user_id', user.id)   // enforce ownership
      .single();

    if (error || !data) return res.status(404).json({ error: 'Purchase not found' });

    return res.json(data);
  } catch (err: any) {
    console.error('[DODO] Status check error:', err.message);
    return res.status(500).json({ error: 'Failed to get purchase status' });
  }
});

router.post('/cancel', async (req: any, res) => {
  const { purchase_id } = req.body;
  const userId = req.user?.id;

  if (!purchase_id) return res.status(400).json({ error: 'Missing purchase_id' });

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('package_purchases')
      .update({ payment_status: 'cancelled' })
      .eq('id', purchase_id)
      .eq('user_id', userId)
      .eq('payment_status', 'pending')
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[CANCEL ERROR]', err.message);
    res.status(500).json({ error: 'Failed to cancel purchase' });
  }
});

// ─── WEBHOOK HANDLER ──────────────────────────────────────────────────────────
// Raw body is required for signature verification — see app.ts verify callback.
router.post('/webhook', async (req: any, res) => {
  const rawBody = (req as any).rawBody || '';

  if (!rawBody) {
    console.error('[WEBHOOK] Missing raw body');
    return res.status(400).json({ error: 'Missing body' });
  }
  const webhookId        = req.headers['webhook-id']        as string;
  const webhookSignature = req.headers['webhook-signature'] as string;
  const webhookTimestamp = req.headers['webhook-timestamp'] as string;

  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    console.error('[WEBHOOK] Missing signature headers');
    return res.status(400).json({ error: 'Missing webhook headers' });
  }

  // ── Signature verification ────────────────────────────────────────────────
  try {
    const secret  = await getWebhookSecret();
    if (!secret) {
      console.error('[WEBHOOK ERROR] No webhook secret found in platform_settings!');
      return res.status(401).json({ error: 'Secret not configured' });
    }

    const webhook = new Webhook(secret);
    
    // Verify signature
    try {
      webhook.verify(rawBody, {
        'webhook-id':        webhookId,
        'webhook-signature': webhookSignature,
        'webhook-timestamp': webhookTimestamp,
      });
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] Signature verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (err: any) {
    console.error('[WEBHOOK] Signature verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload    = JSON.parse(rawBody);
  const eventType: string = payload.type || payload.event_type;
  const supabaseAdmin     = createSupabaseAdmin();

  console.log(`[WEBHOOK] ${eventType} — payment=${payload.data?.payment_id}`);

  // ── Fire-and-forget audit log (never blocks payment processing) ───────────
  const logUserId = payload.data?.metadata?.user_id;
  if (logUserId) {
    supabaseAdmin.from('payment_transactions').insert({
      user_id:          logUserId,
      provider:         'dodopayments',
      provider_event_id: webhookId,
      event_type:       eventType,
      amount:           payload.data?.total_amount || payload.data?.amount || 0,
      currency:         payload.data?.currency || 'USD',
      status:           eventType.includes('succeeded') ? 'success'
                        : eventType.includes('failed')  ? 'failed' : 'pending',
      raw_payload:      payload,
    }).then(({ error }) => {
      if (error) console.error('[WEBHOOK] Audit log failed:', error.message);
    });
  }

  // ── Event dispatch ────────────────────────────────────────────────────────
  try {
    switch (eventType) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(payload, supabaseAdmin);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload, supabaseAdmin);
        break;
      case 'payment.cancelled':
        await handlePaymentCancelled(payload, supabaseAdmin);
        break;
      case 'refund.succeeded':
        await handleRefundSucceeded(payload, supabaseAdmin);
        break;
      default:
        console.log(`[WEBHOOK] Unhandled event type: ${eventType}`);
    }
  } catch (err: any) {
    console.error(`[WEBHOOK] Handler error for ${eventType}:`, err.message);
    // Always return 200 so Dodo doesn't retry indefinitely
  }

  return res.json({ received: true });
});

// ─── EVENT HANDLERS ───────────────────────────────────────────────────────────

async function handlePaymentSucceeded(payload: any, supabase: any) {
  const paymentId  = payload.data?.payment_id;
  const metadata   = payload.data?.metadata || {};
  const userId     = metadata.user_id;
  const packageId  = metadata.package_id;
  const purchaseId = metadata.purchase_id;   // preferred — set since the new checkout flow

  if (!userId) {
    console.error('[WEBHOOK:succeeded] Missing user_id in metadata');
    return;
  }

  // ── Idempotency: skip if already completed ────────────────────────────────
  if (paymentId) {
    const { data: existing } = await supabase
      .from('package_purchases')
      .select('id')
      .eq('dodo_payment_id', paymentId)
      .eq('payment_status', 'completed')
      .maybeSingle();
    if (existing) {
      console.log(`[WEBHOOK:succeeded] Already processed — skipping (payment=${paymentId})`);
      return;
    }
  }

  // ── Load the package ──────────────────────────────────────────────────────
  const { data: pkg } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('id', packageId)
    .single();

  if (!pkg) {
    console.error(`[WEBHOOK:succeeded] Package ${packageId} not found`);
    return;
  }

  // ── Mark purchase completed ───────────────────────────────────────────────
  const updateFields = {
    payment_status:    'completed',
    dodo_payment_id:   paymentId || null,
    dodo_customer_id:  payload.data?.customer?.customer_id || null,
    completed_at:      new Date().toISOString(),
  };

  if (purchaseId) {
    // Direct match by purchase ID (preferred)
    await supabase
      .from('package_purchases')
      .update(updateFields)
      .eq('id', purchaseId)
      .eq('user_id', userId);
  } else {
    // Fallback: match by user + package + pending (older sessions)
    await supabase
      .from('package_purchases')
      .update(updateFields)
      .match({ user_id: userId, package_id: packageId, payment_status: 'pending' });
  }

  // ── Grant credits ─────────────────────────────────────────────────────────
  const { error: ledgerErr } = await supabase.from('credit_ledger').insert({
    user_id:     userId,
    amount:      pkg.credits_amount,
    source_type: 'purchase',
    description: `Purchased ${pkg.name} — ${pkg.credits_amount.toLocaleString()} credits`,
  });
  if (ledgerErr) console.error('[WEBHOOK:succeeded] Credit ledger error:', ledgerErr.message);

  // ── Notify user ───────────────────────────────────────────────────────────
  await supabase.from('notifications').insert({
    user_id:    userId,
    type:       'system',
    title:      'Payment Successful',
    body:       `Your purchase of ${pkg.credits_amount.toLocaleString()} credits was successful!`,
    action_url: '/dashboard/credits',
    channel:    'in_app',
  });

  console.log(`[WEBHOOK:succeeded] ${pkg.credits_amount} credits granted to user=${userId}`);
}

async function handlePaymentFailed(payload: any, supabase: any) {
  const metadata   = payload.data?.metadata || {};
  const userId     = metadata.user_id;
  const packageId  = metadata.package_id;
  const purchaseId = metadata.purchase_id;

  if (!userId) return;

  if (purchaseId) {
    await supabase
      .from('package_purchases')
      .update({ payment_status: 'failed' })
      .eq('id', purchaseId)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('package_purchases')
      .update({ payment_status: 'failed' })
      .match({ user_id: userId, package_id: packageId, payment_status: 'pending' });
  }

  await supabase.from('notifications').insert({
    user_id:    userId,
    type:       'system',
    title:      'Payment Failed',
    body:       'Your payment attempt was unsuccessful. Please try again.',
    action_url: '/dashboard/credits',
    channel:    'in_app',
  });

  console.log(`[WEBHOOK:failed] Marked failed for user=${userId}`);
}

async function handlePaymentCancelled(payload: any, supabase: any) {
  const metadata   = payload.data?.metadata || {};
  const userId     = metadata.user_id;
  const packageId  = metadata.package_id;
  const purchaseId = metadata.purchase_id;

  if (!userId) return;

  if (purchaseId) {
    await supabase
      .from('package_purchases')
      .update({ payment_status: 'cancelled' })
      .eq('id', purchaseId)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('package_purchases')
      .update({ payment_status: 'cancelled' })
      .match({ user_id: userId, package_id: packageId, payment_status: 'pending' });
  }

  console.log(`[WEBHOOK:cancelled] Marked cancelled for user=${userId}`);
}

async function handleRefundSucceeded(payload: any, supabase: any) {
  const paymentId = payload.data?.payment_id;
  if (!paymentId) return;

  const { data: purchase } = await supabase
    .from('package_purchases')
    .select('*')
    .eq('dodo_payment_id', paymentId)
    .single();

  if (!purchase) {
    console.error(`[WEBHOOK:refund] No purchase found for payment=${paymentId}`);
    return;
  }

  await supabase.from('credit_ledger').insert({
    user_id:     purchase.user_id,
    amount:      -purchase.credits_total,
    source_type: 'refund',
    description: `Refund processed — ${purchase.credits_total.toLocaleString()} credits removed`,
  });

  await supabase
    .from('package_purchases')
    .update({ payment_status: 'refunded' })
    .eq('id', purchase.id);

  await supabase.from('notifications').insert({
    user_id:    purchase.user_id,
    type:       'system',
    title:      'Refund Processed',
    body:       `A refund of ${purchase.credits_total.toLocaleString()} credits has been reversed from your account.`,
    action_url: '/dashboard/credits',
    channel:    'in_app',
  });

  console.log(`[WEBHOOK:refund] Refunded ${purchase.credits_total} credits for user=${purchase.user_id}`);
}

export default router;
