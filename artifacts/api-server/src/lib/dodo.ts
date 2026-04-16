import * as Dodo from 'dodopayments';
const DodoPayments = (Dodo as any).default || Dodo.DodoPayments || Dodo;
import { createSupabaseAdmin } from './supabase-admin.js';

type PaymentMode = 'test' | 'live';

/**
 * Get current payment mode from DB (platform_settings)
 */
export async function getPaymentMode(): Promise<PaymentMode> {
  const supabaseAdmin = createSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', 'payment_mode')
    .single();
    
  return (data?.value === 'live') ? 'live' : 'test';
}

/**
 * Initialize and return a Dodo client based on current mode
 */
export async function getDodoClient(): Promise<DodoPayments> {
  const supabaseAdmin = createSupabaseAdmin();
  const mode = await getPaymentMode();
  const keyName = mode === 'live' ? 'dodo_live_api_key' : 'dodo_test_api_key';

  const { data } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', keyName)
    .single();

  const apiKey = data?.value || (mode === 'live' ? process.env.DODO_LIVE_API_KEY : process.env.DODO_TEST_API_KEY);

  if (!apiKey) {
    throw new Error(`Dodo API key (${keyName}) not found in database or environment`);
  }

  return new DodoPayments({
    bearerToken: apiKey,
    environment: mode === 'live' ? 'live_mode' : 'test_mode',
  });
}

/**
 * Get webhook secret for the current mode
 */
export async function getWebhookSecret(): Promise<string> {
  const supabaseAdmin = createSupabaseAdmin();
  const mode = await getPaymentMode();
  const keyName = mode === 'live' ? 'dodo_live_webhook_secret' : 'dodo_test_webhook_secret';

  const { data } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', keyName)
    .single();

  const secret = data?.value || (mode === 'live' ? process.env.DODO_LIVE_WEBHOOK_SECRET : process.env.DODO_TEST_WEBHOOK_SECRET);
  
  if (!secret) {
    throw new Error(`Dodo webhook secret (${keyName}) not found`);
  }
  
  return secret;
}
