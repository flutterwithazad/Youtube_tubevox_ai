
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentPurchases() {
  console.log("--- Recent Purchases ---");
  const { data: purchases, error: pErr } = await supabase
    .from('package_purchases')
    .select('id, payment_status, dodo_payment_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (pErr) console.error(pErr);
  else console.table(purchases);

  console.log("\n--- Recent Webhook Transactions (Audit Log) ---");
  const { data: txs, error: tErr } = await supabase
    .from('payment_transactions')
    .select('event_type, status, amount, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (tErr) console.error(tErr);
  else console.table(txs);
}

checkRecentPurchases();
