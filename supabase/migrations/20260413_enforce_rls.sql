-- Enforce Row Level Security (RLS) on all user-facing tables
-- Created: 2026-04-13
-- Project: TubeVox

-- 1. Enable RLS on all relevant tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
    DROP POLICY IF EXISTS "Users can view comments for own jobs" ON public.comments;
    DROP POLICY IF EXISTS "Users can view own ledger" ON public.credit_ledger;
    DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
    DROP POLICY IF EXISTS "Public can view plans" ON public.plans;
    DROP POLICY IF EXISTS "Public can view packages" ON public.credit_packages;
    DROP POLICY IF EXISTS "Public can view public settings" ON public.platform_settings;
    DROP POLICY IF EXISTS "Public can view social links" ON public.social_links;
    DROP POLICY IF EXISTS "Public can insert contact submissions" ON public.contact_submissions;
END $$;

-- 3. PROFILES: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 4. JOBS: Users can only see their own jobs
CREATE POLICY "Users can view own jobs" ON public.jobs
    FOR SELECT USING (auth.uid() = user_id);

-- 5. COMMENTS: Users can only see comments belonging to their jobs
CREATE POLICY "Users can view comments for own jobs" ON public.comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = comments.job_id AND jobs.user_id = auth.uid()
        )
    );

-- 6. LEDGER: Users can only see their own credit history
CREATE POLICY "Users can view own ledger" ON public.credit_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- 7. SUBSCRIPTIONS: Users can only see their own
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- 8. PLANS: Everyone can see active plans
CREATE POLICY "Public can view plans" ON public.plans
    FOR SELECT USING (is_active = true);

-- 9. CURRENCY/PACKAGES: Everyone can see active credit packages
CREATE POLICY "Public can view packages" ON public.credit_packages
    FOR SELECT USING (is_active = true);

-- 10. SETTINGS: Public can only see specific public-facing settings
CREATE POLICY "Public can view public settings" ON public.platform_settings
    FOR SELECT USING (
        key IN (
            'free_plan_credits', 'max_job_comments', 'maintenance_mode', 
            'new_signups_enabled', 'email_signin_enabled', 'company_name'
        )
    );

-- 11. SOCIAL: Everyone can see active social links
CREATE POLICY "Public can view social links" ON public.social_links
    FOR SELECT USING (is_active = true);

-- 12. CONTACT: Anyone can submit a contact request
CREATE POLICY "Public can insert contact submissions" ON public.contact_submissions
    FOR INSERT WITH CHECK (true);

-- 13. ADMIN TABLES: Compltely restricted (Backend uses service_role_key anyway)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- No public policies means only service_role_key can access these.
