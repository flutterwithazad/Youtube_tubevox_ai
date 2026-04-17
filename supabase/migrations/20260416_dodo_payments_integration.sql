-- 20260416_dodo_payments_integration.sql

-- Add dodo_product_id to credit_packages
ALTER TABLE public.credit_packages
  ADD COLUMN IF NOT EXISTS dodo_product_id TEXT;

-- Add Dodo specific fields to package_purchases
ALTER TABLE public.package_purchases
  ADD COLUMN IF NOT EXISTS dodo_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS dodo_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- Update check constraint to allow dodopayments
ALTER TABLE public.package_purchases 
  DROP CONSTRAINT IF EXISTS package_purchases_payment_provider_check;
ALTER TABLE public.package_purchases 
  ADD CONSTRAINT package_purchases_payment_provider_check 
  CHECK (payment_provider IN ('stripe', 'razorpay', 'dodopayments', 'manual'));

-- Index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_package_purchases_dodo_payment_id
  ON public.package_purchases (dodo_payment_id);

-- Payment configuration settings
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('payment_mode', 'test', 'test = use Dodo test keys, live = use Dodo live keys'),
  ('dodo_test_api_key', '', 'Dodo Payments test API key (test_xxx)'),
  ('dodo_live_api_key', '', 'Dodo Payments live API key (live_xxx)'),
  ('dodo_test_webhook_secret', '', 'Dodo webhook secret for test mode'),
  ('dodo_live_webhook_secret', '', 'Dodo webhook secret for live mode')
ON CONFLICT (key) DO NOTHING;

-- Daily purchase summary view for admin dashboards
CREATE OR REPLACE VIEW public.daily_purchase_summary AS
SELECT
  DATE(created_at AT TIME ZONE 'UTC') AS purchase_date,
  COUNT(*)                             AS total_purchases,
  COUNT(*) FILTER (WHERE payment_status = 'completed') AS successful,
  COUNT(*) FILTER (WHERE payment_status = 'failed')    AS failed,
  COALESCE(SUM(price_paid) FILTER (WHERE payment_status = 'completed'), 0) AS revenue,
  COALESCE(SUM(credits_total) FILTER (WHERE payment_status = 'completed'), 0) AS credits_sold
FROM public.package_purchases
GROUP BY DATE(created_at AT TIME ZONE 'UTC')
ORDER BY purchase_date DESC;

GRANT SELECT ON public.daily_purchase_summary TO service_role;
GRANT SELECT ON public.daily_purchase_summary TO anon, authenticated; -- Adjust as needed for admin visibility
