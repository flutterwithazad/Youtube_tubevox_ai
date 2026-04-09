-- Fix: use valid source_type 'admin_grant' for signup bonus
-- 'signup_bonus' was rejected by the CHECK constraint

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
  ON CONFLICT (id) DO NOTHING;

  -- Award free credits using 'admin_grant' (valid source_type in CHECK constraint)
  INSERT INTO public.credit_ledger (user_id, amount, source_type, description)
  VALUES (
    NEW.id,
    v_free_credits,
    'admin_grant',
    'Welcome bonus — free credits on signup'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block signup
  RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
