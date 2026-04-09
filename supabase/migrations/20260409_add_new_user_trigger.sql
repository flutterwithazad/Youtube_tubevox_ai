-- ============================================================
-- Migration: Add trigger to auto-create profile + free credits
-- on new user signup (Google OAuth or email)
-- ============================================================

-- 1. Function that runs after a new row is inserted into auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_credits integer := 1000;
  v_setting text;
BEGIN
  -- Read free_plan_credits setting (default 1000 if missing)
  SELECT value INTO v_setting
  FROM public.platform_settings
  WHERE key = 'free_plan_credits'
  LIMIT 1;

  IF v_setting IS NOT NULL AND v_setting ~ '^\d+$' THEN
    v_free_credits := v_setting::integer;
  END IF;

  -- Create the profile row (id mirrors auth.users.id)
  INSERT INTO public.profiles (id, email, full_name, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: skip if already exists

  -- Award free credits via credit_ledger
  INSERT INTO public.credit_ledger (user_id, amount, source_type, description)
  VALUES (
    NEW.id,
    v_free_credits,
    'signup_bonus',
    'Welcome bonus credits'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
