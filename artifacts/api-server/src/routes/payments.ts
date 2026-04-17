import { Router, type Request, type Response } from 'express';
import * as Webhooks from 'standardwebhooks';
const Webhook = (Webhooks as any).Webhook || (Webhooks as any).default || Webhooks;
import { getDodoClient, getPaymentMode, getWebhookSecret } from '../lib/dodo.js';
import { createSupabaseAdmin } from '../lib/supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import { checkUserSuspension } from '../middleware/platform.js';

const router = Router();

// Helper to resolve user from Supabase JWT (copied from credits.ts pattern)
function getUserSupabase(accessToken: string) {
  const url = process.env['VITE_SUPABASE_URL']!;
  const anonKey = process.env['VITE_SUPABASE_ANON_KEY']!;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveUser(req: Request, res: Response): Promise<{ id: string, email: string } | null> {
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
    });
    return null;
  }
  return { id: user.id, email: user.email! };
}

// ─── CHECKOUT SESSION ─────────────────────────────────
router.post('/checkout', async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { packageId } = req.body;
    if (!packageId) return res.status(400).json({ error: 'packageId is required' });

    const supabase = createSupabaseAdmin();
    
    // Load package
    const { data: pkg, error: pkgErr } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (pkgErr || !pkg) return res.status(404).json({ error: 'Package not found or inactive' });
    if (!pkg.dodo_product_id) return res.status(400).json({ error: 'Package not configured for Dodo Payments' });

    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const mode = await getPaymentMode();
    const dodo = await getDodoClient();

    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: pkg.dodo_product_id, quantity: 1 }],
      customer: {
        email: user.email,
        name: profile?.full_name || 'Customer',
      },
      // Assuming NEXT_PUBLIC_APP_URL is where the dashboard is hosted
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tubevox.com'}/dashboard/credits?payment=success&pkg=${packageId}`,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        mode,
      },
    });

    // Create pending purchase record
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
        checkout_url: session.checkout_url,
      })
      .select()
      .single();

    if (purchaseErr) throw purchaseErr;

    console.log(`[DODO] Checkout session created: user=${user.id}, pkg=${packageId}, mode=${mode}`);

    return res.json({
      checkout_url: session.checkout_url,
      purchase_id: purchase.id,
      mode,
    });

  } catch (err: any) {
    console.error('[DODO] Checkout error:', err.stack || err.message);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: err.message 
    });
  }
});

// ─── WEBHOOK HANDLER ──────────────────────────────────
// Note: Webhook endpoint needs raw body for signature verification
router.post('/webhook', async (req: any, res) => {
  const rawBody = req.rawBody;
  
  if (!rawBody) {
    console.error('[WEBHOOK] Missing raw body');
    return res.status(400).json({ error: 'Missing body' });
  }
  
  const webhookId = req.headers['webhook-id'] as string;
  const webhookSignature = req.headers['webhook-signature'] as string;
  const webhookTimestamp = req.headers['webhook-timestamp'] as string;

  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    console.error('[WEBHOOK] Missing headers');
    return res.status(400).json({ error: 'Missing webhook headers' });
  }

  try {
    const secret = await getWebhookSecret();
    const webhook = new Webhook(secret);
    await webhook.verify(rawBody, {
      'webhook-id': webhookId,
      'webhook-signature': webhookSignature,
      'webhook-timestamp': webhookTimestamp,
    });
  } catch (err: any) {
    console.error('[WEBHOOK] Signature verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(rawBody);
  const eventType = payload.type || payload.event_type;
  const supabaseAdmin = createSupabaseAdmin();

  console.log(`[WEBHOOK] Received ${eventType} for payment ${payload.data?.payment_id}`);

  // Log raw event — skip if user_id is missing (NOT NULL constraint)
  const logUserId = payload.data?.metadata?.user_id;
  if (logUserId) {
    supabaseAdmin.from('payment_transactions').insert({
      user_id: logUserId,
      provider: 'dodopayments',
      provider_event_id: webhookId,
      event_type: eventType,
      amount: payload.data?.total_amount || payload.data?.amount || 0,
      currency: payload.data?.currency || 'USD',
      status: eventType.includes('succeeded') ? 'success' : eventType.includes('failed') ? 'failed' : 'pending',
      raw_payload: payload,
    }).then(({ error }) => {
      if (error) console.error('[WEBHOOK] Failed to log payment_transaction:', error.message);
    });
  }

  // Handle events
  try {
    switch (eventType) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(payload, supabaseAdmin);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload, supabaseAdmin);
        break;
      case 'payment.refunded':
        await handlePaymentRefunded(payload, supabaseAdmin);
        break;
    }
  } catch (err: any) {
    console.error(`[WEBHOOK] Error processing ${eventType}:`, err.message);
    // Return 200 to acknowledge receipt even if processing failed
  }

  res.json({ received: true });
});

async function handlePaymentSucceeded(payload: any, supabaseAdmin: any) {
  const paymentId = payload.data?.payment_id;
  const metadata = payload.data?.metadata || {};
  const userId = metadata.user_id;
  const packageId = metadata.package_id;

  if (!userId || !packageId) {
    console.error('[WEBHOOK] Missing metadata');
    return;
  }

  // Idempotency check
  const { data: existing } = await supabaseAdmin
    .from('package_purchases')
    .select('id')
    .eq('dodo_payment_id', paymentId)
    .eq('payment_status', 'completed')
    .maybeSingle();

  if (existing) return;

  // Load package
  const { data: pkg } = await supabaseAdmin
    .from('credit_packages')
    .select('*')
    .eq('id', packageId)
    .single();

  if (!pkg) return;

  // Update purchase
  await supabaseAdmin
    .from('package_purchases')
    .update({
      payment_status: 'completed',
      dodo_payment_id: paymentId,
      dodo_customer_id: payload.data?.customer?.id || null,
      completed_at: new Date().toISOString(),
    })
    .match({ user_id: userId, package_id: packageId, payment_status: 'pending' });

  // Grant credits
  await supabaseAdmin.from('credit_ledger').insert({
    user_id: userId,
    amount: pkg.credits_amount,
    source_type: 'purchase',
    description: `Purchased ${pkg.name} — ${pkg.credits_amount.toLocaleString()} credits`,
  });

  // Notification
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type: 'system',
    title: 'Payment Successful',
    body: `Your purchase of ${pkg.credits_amount.toLocaleString()} credits was successful!`,
    action_url: '/dashboard/credits',
    channel: 'in_app'
  });
}

async function handlePaymentFailed(payload: any, supabaseAdmin: any) {
  const metadata = payload.data?.metadata || {};
  const userId = metadata.user_id;
  const packageId = metadata.package_id;

  if (!userId) return;

  await supabaseAdmin
    .from('package_purchases')
    .update({ payment_status: 'failed' })
    .match({ user_id: userId, package_id: packageId, payment_status: 'pending' });

  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type: 'system',
    title: 'Payment Failed',
    body: 'Your payment attempt for credits was unsuccessful. Please try again.',
    action_url: '/dashboard/credits',
    channel: 'in_app'
  });
}

async function handlePaymentRefunded(payload: any, supabaseAdmin: any) {
  const paymentId = payload.data?.payment_id;
  const { data: purchase } = await supabaseAdmin
    .from('package_purchases')
    .select('*')
    .eq('dodo_payment_id', paymentId)
    .single();

  if (purchase) {
    await supabaseAdmin.from('credit_ledger').insert({
      user_id: purchase.user_id,
      amount: -purchase.credits_total,
      source_type: 'refund',
      description: `Refund processed — ${purchase.credits_total.toLocaleString()} credits removed`
    });

    await supabaseAdmin
      .from('package_purchases')
      .update({ payment_status: 'refunded' })
      .eq('id', purchase.id);
  }
}

export default router;
