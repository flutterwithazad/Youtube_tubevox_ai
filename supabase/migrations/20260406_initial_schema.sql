-- YTScraper Database Migration
-- Generated: 2026-04-06T06:59:37.810Z
-- Project: jxceenqmcyclbxaxvxto

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- IMPORTANT NOTES
-- 1. This migration assumes Supabase Auth is enabled (auth.users table exists).
-- 2. The 'profiles' table uses the same UUID as auth.users.id as its primary key.
--    After recreating: add a trigger so new auth users auto-insert into profiles.
-- 3. Run this after creating a new Supabase project.
-- 4. RLS policies are not included — re-apply them from your Supabase dashboard.

-- Tables

CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  name text NOT NULL,
  description text,
  can_view_users boolean DEFAULT false,
  can_suspend_users boolean DEFAULT false,
  can_delete_users boolean DEFAULT false,
  can_change_user_plan boolean DEFAULT false,
  can_add_credits boolean DEFAULT false,
  can_view_payments boolean DEFAULT false,
  can_issue_refunds boolean DEFAULT false,
  can_manage_plans boolean DEFAULT false,
  can_view_jobs boolean DEFAULT false,
  can_kill_jobs boolean DEFAULT false,
  can_manage_api_keys boolean DEFAULT false,
  can_edit_settings boolean DEFAULT false,
  can_manage_announcements boolean DEFAULT false,
  can_manage_ip_blocklist boolean DEFAULT false,
  can_manage_admins boolean DEFAULT false,
  can_view_audit_log boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  role_id uuid NOT NULL,
  password_hash text,
  totp_secret text,
  is_2fa_enabled boolean DEFAULT false,
  is_active boolean DEFAULT true,
  deactivated_at timestamptz,
  deactivated_by uuid,
  last_login_at timestamptz,
  last_login_ip text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  PRIMARY KEY (id),
  UNIQUE (email),
  FOREIGN KEY (role_id) REFERENCES admin_roles(id),
  FOREIGN KEY (deactivated_by) REFERENCES admin_users(id),
  FOREIGN KEY (created_by) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  before_value jsonb DEFAULT '{}'::jsonb,
  after_value jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  notes text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (admin_id) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS admin_roles_test (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text DEFAULT 'info'::text NOT NULL,
  target_audience text DEFAULT 'all'::text NOT NULL,
  placement text DEFAULT 'banner'::text NOT NULL,
  cta_label text,
  cta_url text,
  is_dismissable boolean DEFAULT true,
  is_active boolean DEFAULT false,
  show_from timestamptz,
  show_until timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS plans (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  name text NOT NULL,
  description text,
  credits_per_month integer DEFAULT 0 NOT NULL,
  price_monthly numeric DEFAULT 0 NOT NULL,
  price_yearly numeric,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  razorpay_plan_id_monthly text,
  razorpay_plan_id_yearly text,
  is_active boolean DEFAULT true,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  billing_cycle text DEFAULT 'monthly'::text NOT NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  razorpay_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  current_plan_id uuid,
  current_subscription_id uuid,
  account_status text DEFAULT 'active'::text,
  is_suspended boolean DEFAULT false,
  suspended_reason text,
  suspended_at timestamptz,
  suspended_by uuid,
  timezone text DEFAULT 'UTC'::text,
  locale text DEFAULT 'en'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login_at timestamptz,
  last_job_created_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (id),
  -- NOTE: id references auth.users(id) — enforced by Supabase Auth
  UNIQUE (email),
  FOREIGN KEY (current_plan_id) REFERENCES plans(id),
  FOREIGN KEY (current_subscription_id) REFERENCES subscriptions(id),
  FOREIGN KEY (suspended_by) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  scopes jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  usage_count integer DEFAULT 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  name text,
  video_url text NOT NULL,
  video_id text,
  cron_expression text NOT NULL,
  timezone text DEFAULT 'UTC'::text,
  filters jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  last_job_id uuid,
  next_run_at timestamptz,
  run_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (last_job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  job_type text NOT NULL,
  video_url text NOT NULL,
  video_id text,
  video_title text,
  channel_name text,
  channel_id text,
  thumbnail text,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  requested_comments integer,
  downloaded_comments integer DEFAULT 0,
  credits_reserved integer DEFAULT 0,
  credits_used integer DEFAULT 0,
  status text DEFAULT 'queued'::text NOT NULL,
  progress integer DEFAULT 0,
  filters jsonb DEFAULT '{}'::jsonb,
  next_page_token text,
  pages_processed integer DEFAULT 0,
  queue_job_id text,
  worker_id text,
  error_message text,
  retry_count integer DEFAULT 0,
  scheduled_job_id uuid,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (scheduled_job_id) REFERENCES scheduled_jobs(id)
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  job_id uuid NOT NULL,
  comment_id text NOT NULL,
  author text,
  author_channel text,
  author_channel_id text,
  text text,
  text_original text,
  likes integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  is_reply boolean DEFAULT false,
  parent_id text,
  sentiment text,
  sentiment_score numeric,
  is_spam boolean,
  language text,
  topics jsonb DEFAULT '[]'::jsonb,
  published_at timestamptz,
  updated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  heart boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  is_paid boolean DEFAULT false,
  author_profile_image text,
  PRIMARY KEY (id),
  UNIQUE (job_id, comment_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  description text,
  balance_after integer,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  name text NOT NULL,
  description text,
  credits_amount integer NOT NULL,
  price numeric NOT NULL,
  currency text DEFAULT 'USD'::text,
  stripe_price_id text,
  razorpay_plan_id text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS exports (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  job_id uuid NOT NULL,
  user_id uuid NOT NULL,
  format text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  file_url text,
  file_size_bytes bigint,
  row_count integer,
  external_url text,
  external_id text,
  error_message text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS features (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (key)
);

CREATE TABLE IF NOT EXISTS ip_blocklist (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  ip_address text NOT NULL,
  ip_range text,
  reason text NOT NULL,
  blocked_by uuid NOT NULL,
  user_id uuid,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  session_token_hash text NOT NULL,
  device_type text,
  device_name text,
  browser text,
  os text,
  ip_address text,
  country text,
  city text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_activity_at timestamptz,
  logged_out_at timestamptz,
  expires_at timestamptz,
  session_token text,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_history (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  session_id uuid,
  login_method text,
  ip_address text,
  country text,
  city text,
  device_name text,
  browser text,
  os text,
  success boolean DEFAULT true,
  failure_reason text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES user_sessions(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  action_url text,
  channel text DEFAULT 'in_app'::text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS package_purchases (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  package_id uuid NOT NULL,
  credits_total integer NOT NULL,
  price_paid numeric NOT NULL,
  currency text DEFAULT 'USD'::text,
  payment_status text DEFAULT 'pending'::text NOT NULL,
  payment_provider text NOT NULL,
  stripe_payment_intent_id text,
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (package_id) REFERENCES credit_packages(id)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  purchase_id uuid,
  subscription_id uuid,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD'::text,
  status text NOT NULL,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (purchase_id) REFERENCES package_purchases(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS plan_features (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  plan_id uuid NOT NULL,
  feature_id uuid NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (plan_id, feature_id),
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key text NOT NULL,
  value text,
  description text,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (key),
  FOREIGN KEY (updated_by) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS security_events (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  description text,
  ip_address text,
  device_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_links (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  platform text NOT NULL,
  url text NOT NULL,
  icon_key text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  job_id uuid,
  credits_used integer NOT NULL,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS youtube_api_keys (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  key_value text NOT NULL,
  label text,
  quota_used integer DEFAULT 0,
  quota_limit integer DEFAULT 10000,
  quota_used_pct numeric,
  error_count integer DEFAULT 0,
  consecutive_errors integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_paused boolean DEFAULT false,
  last_used_at timestamptz,
  last_reset_at timestamptz,
  last_error_at timestamptz,
  last_error_msg text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Views
CREATE OR REPLACE VIEW active_jobs_summary AS
  SELECT id, user_id, job_type, video_title, status, progress,
         downloaded_comments, requested_comments, credits_reserved, created_at
  FROM jobs
  WHERE status = ANY (ARRAY['queued', 'running']);

CREATE OR REPLACE VIEW user_credit_balance AS
  SELECT user_id, COALESCE(SUM(amount), 0)::integer AS balance
  FROM credit_ledger
  GROUP BY user_id;

-- Indexes
CREATE INDEX idx_admin_audit_log_admin_id ON public.admin_audit_log USING btree (admin_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log USING btree (created_at DESC);
CREATE INDEX idx_admin_audit_log_target ON public.admin_audit_log USING btree (target_type, target_id);
CREATE INDEX idx_admin_users_email ON public.admin_users USING btree (email);
CREATE INDEX idx_announcements_is_active ON public.announcements USING btree (is_active);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys USING btree (key_hash);
CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);
CREATE INDEX idx_comments_job_id ON public.comments USING btree (job_id);
CREATE INDEX idx_comments_language ON public.comments USING btree (language);
CREATE INDEX idx_comments_published ON public.comments USING btree (published_at DESC);
CREATE INDEX idx_comments_sentiment ON public.comments USING btree (sentiment);
CREATE INDEX idx_credit_ledger_created_at ON public.credit_ledger USING btree (created_at);
CREATE INDEX idx_credit_ledger_user_id ON public.credit_ledger USING btree (user_id);
CREATE INDEX idx_exports_job_id ON public.exports USING btree (job_id);
CREATE INDEX idx_exports_user_id ON public.exports USING btree (user_id);
CREATE INDEX idx_ip_blocklist_ip_address ON public.ip_blocklist USING btree (ip_address);
CREATE INDEX idx_ip_blocklist_is_active ON public.ip_blocklist USING btree (is_active);
CREATE INDEX idx_jobs_created_at ON public.jobs USING btree (created_at DESC);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);
CREATE INDEX idx_jobs_user_id ON public.jobs USING btree (user_id);
CREATE INDEX idx_login_history_user_id ON public.login_history USING btree (user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_package_purchases_user_id ON public.package_purchases USING btree (user_id);
CREATE INDEX idx_payment_transactions_provider_event ON public.payment_transactions USING btree (provider_event_id);
CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions USING btree (user_id);
CREATE INDEX idx_profiles_account_status ON public.profiles USING btree (account_status);
CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs USING btree (created_at DESC);
CREATE INDEX idx_usage_logs_user_id ON public.usage_logs USING btree (user_id);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions USING btree (is_active);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);
CREATE INDEX user_sessions_token_idx ON public.user_sessions USING btree (session_token);

-- Row Level Security
-- NOTE: Enable RLS on tables that need it and add appropriate policies.
-- Example:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- Seed: platform_settings
INSERT INTO platform_settings (key, value) VALUES
  ('company_name', 'YTScraper'),
  ('company_email', 'hello@ytscraper.com'),
  ('contact_email', 'support@ytscraper.com'),
  ('contact_phone', ''),
  ('contact_address', ''),
  ('contact_hours', 'Mon–Fri 9am–6pm UTC'),
  ('maintenance_mode', 'false'),
  ('new_signups_enabled', 'true'),
  ('free_plan_credits', '100'),
  ('max_job_comments', '10000')
ON CONFLICT (key) DO NOTHING;
