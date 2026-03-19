import { Router } from 'express';
import { createSupabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAdmin } from '../../lib/admin-auth.js';

const router = Router();

router.get('/overview', async (req, res) => {
  try {
    requireAdmin(req);
    const supabase = createSupabaseAdmin();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfToday = new Date(now.toDateString()).toISOString();

    const [users, subs, jobsToday, runningJobs, revenue, signupsToday, apiKeys, maintenanceMode] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'running'),
      supabase.from('package_purchases').select('price_paid').eq('payment_status', 'completed').gte('created_at', startOfMonth),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
      supabase.from('youtube_api_keys').select('is_active,is_paused,consecutive_errors'),
      supabase.from('platform_settings').select('key,value').eq('key', 'maintenance_mode').single()
    ]);

    const totalRevenue = (revenue.data ?? []).reduce((sum, r) => sum + Number(r.price_paid), 0);
    const activeKeys = (apiKeys.data ?? []).filter((k: any) => k.is_active && !k.is_paused).length;
    const errorKeys = (apiKeys.data ?? []).filter((k: any) => (k.consecutive_errors ?? 0) >= 3).length;

    // Signups last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: signupData } = await supabase.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo).is('deleted_at', null);
    const signupByDay: Record<string, number> = {};
    for (const row of signupData ?? []) {
      const day = row.created_at.split('T')[0];
      signupByDay[day] = (signupByDay[day] ?? 0) + 1;
    }

    // Jobs last 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data: jobData } = await supabase.from('jobs').select('created_at').gte('created_at', fourteenDaysAgo);
    const jobByDay: Record<string, number> = {};
    for (const row of jobData ?? []) {
      const day = row.created_at.split('T')[0];
      jobByDay[day] = (jobByDay[day] ?? 0) + 1;
    }

    // Recent users
    const { data: recentUsers } = await supabase
      .from('profiles').select('id,email,full_name,account_status,created_at,current_plan_id,plans(name)').is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(10);

    // Recent jobs
    const { data: recentJobs } = await supabase
      .from('jobs').select('id,video_title,status,created_at,profiles(email)').order('created_at', { ascending: false }).limit(10);

    return res.json({
      totalUsers: users.count ?? 0,
      activeSubscriptions: subs.count ?? 0,
      jobsToday: jobsToday.count ?? 0,
      runningJobs: runningJobs.count ?? 0,
      revenueThisMonth: totalRevenue,
      signupsToday: signupsToday.count ?? 0,
      activeApiKeys: activeKeys,
      errorApiKeys: errorKeys,
      maintenanceMode: maintenanceMode.data?.value === 'true',
      signupChart: signupByDay,
      jobChart: jobByDay,
      recentUsers: recentUsers ?? [],
      recentJobs: recentJobs ?? []
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
