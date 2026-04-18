-- 20260418_add_payment_error_fields.sql

-- Add technical detail fields to package_purchases for better admin visibility
ALTER TABLE public.package_purchases
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.package_purchases.error_message IS 'Detailed error message from the payment provider (e.g. Dodo Payments)';
COMMENT ON COLUMN public.package_purchases.error_code IS 'Technical error code from the payment provider';
