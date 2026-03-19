import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { api } from '@/lib/api';
import { Users, Activity, Play, DollarSign, UserPlus, Key, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { Link } from 'wouter';

export default function OverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats/overview').then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const signupData = stats ? Array.from({ length: 30 }, (_, i) => {
    const d = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
    return { date: format(subDays(new Date(), 29 - i), 'MMM d'), count: stats.signupChart[d] ?? 0 };
  }) : [];

  const jobData = stats ? Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    return { date: format(subDays(new Date(), 13 - i), 'MMM d'), count: stats.jobChart[d] ?? 0 };
  }) : [];

  return (
    <AdminLayout title="Overview">
      {stats?.maintenanceMode && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Maintenance mode is currently ON — all users see a maintenance page
        </div>
      )}
      {stats?.errorApiKeys > 0 && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> ⚠ {stats.errorApiKeys} API key(s) failing — check YouTube API Keys
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={Users} loading={loading} color="indigo" />
        <StatCard label="Active Subs" value={stats?.activeSubscriptions ?? 0} icon={Activity} loading={loading} color="green" />
        <StatCard label="Jobs Today" value={stats?.jobsToday ?? 0} icon={Play} loading={loading} color="blue" />
        <StatCard label="Running Jobs" value={stats?.runningJobs ?? 0} icon={Activity} loading={loading} color="amber" />
        <StatCard label="Revenue (mo)" value={`$${(stats?.revenueThisMonth ?? 0).toFixed(2)}`} icon={DollarSign} loading={loading} color="green" />
        <StatCard label="Signups Today" value={stats?.signupsToday ?? 0} icon={UserPlus} loading={loading} color="purple" />
      </div>

      {/* System Health */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">System Health</h3>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Active API Keys:</span>
            <span className="font-semibold text-green-600">{stats?.activeApiKeys ?? '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Keys in error:</span>
            <span className={`font-semibold ${(stats?.errorApiKeys ?? 0) > 0 ? 'text-red-600' : 'text-gray-500'}`}>{stats?.errorApiKeys ?? '-'}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Signups — last 30 days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={signupData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Jobs per day — last 14 days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={jobData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent tables */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Recent Users</h3>
            <Link href="/users"><a className="text-xs text-indigo-600 hover:underline">View all →</a></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats?.recentUsers ?? []).slice(0, 8).map((u: any) => (
              <div key={u.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-800">{u.email}</p>
                  <p className="text-[10px] text-gray-400">{u.plans?.name ?? 'Free'} · {new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={u.account_status} />
                  <Link href={`/users/${u.id}`}><a className="text-xs text-indigo-600 hover:underline">View</a></Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Recent Jobs</h3>
            <Link href="/jobs"><a className="text-xs text-indigo-600 hover:underline">View all →</a></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats?.recentJobs ?? []).slice(0, 8).map((j: any) => (
              <div key={j.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-xs font-medium text-gray-800 truncate">{j.video_title || 'Untitled'}</p>
                  <p className="text-[10px] text-gray-400">{j.profiles?.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={j.status} />
                  <Link href={`/jobs/${j.id}`}><a className="text-xs text-indigo-600 hover:underline">View</a></Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
