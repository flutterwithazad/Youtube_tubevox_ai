import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, Users, Play, CreditCard, Package, Coins,
  Key, Settings, Megaphone, Shield, ClipboardList, UserCog, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const navGroups = [
  {
    items: [{ label: 'Overview', href: '/overview', icon: LayoutDashboard, perm: null }]
  },
  {
    title: 'USERS',
    items: [{ label: 'All Users', href: '/users', icon: Users, perm: 'can_view_users' }]
  },
  {
    title: 'JOBS',
    items: [{ label: 'All Jobs', href: '/jobs', icon: Play, perm: 'can_view_jobs' }]
  },
  {
    title: 'PAYMENTS',
    items: [{ label: 'Transactions', href: '/payments', icon: CreditCard, perm: 'can_view_payments' }]
  },
  {
    title: 'CATALOG',
    items: [
      { label: 'Plans', href: '/plans', icon: Package, perm: 'can_manage_plans' },
      { label: 'Credit Packages', href: '/packages', icon: Coins, perm: 'can_manage_plans' }
    ]
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'YT API Keys', href: '/api-keys', icon: Key, perm: 'can_manage_api_keys' },
      { label: 'Platform Settings', href: '/settings', icon: Settings, perm: 'can_edit_settings' },
      { label: 'Announcements', href: '/announcements', icon: Megaphone, perm: 'can_manage_announcements' },
      { label: 'IP Blocklist', href: '/ip-blocklist', icon: Shield, perm: 'can_manage_ip_blocklist' }
    ]
  },
  {
    title: 'SECURITY',
    items: [
      { label: 'Audit Log', href: '/audit-log', icon: ClipboardList, perm: 'can_view_audit_log' },
      { label: 'Admin Users', href: '/admins', icon: UserCog, perm: 'can_manage_admins' }
    ]
  }
];

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function Sidebar() {
  const { admin, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = async () => {
    try { await api.post('/admin/auth/logout'); } catch {}
    await logout();
    window.location.href = `${base}/login`;
  };

  const roleBadge: Record<string, string> = {
    super_admin: 'bg-indigo-100 text-indigo-700',
    support_admin: 'bg-blue-100 text-blue-700',
    billing_admin: 'bg-green-100 text-green-700',
  };

  return (
    <aside className="fixed top-0 left-0 h-screen w-[240px] bg-[#0F0F14] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base">Admin Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 pt-4 pb-1.5">{group.title}</p>
            )}
            {group.items.map(item => {
              if (item.perm && !admin?.permissions[item.perm]) return null;
              const href = `${base}${item.href}`;
              const active = location === item.href || location.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href}>
                  <a className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer',
                    active
                      ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-500'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Admin footer */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 mb-2 px-1">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {admin?.fullName?.[0] ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{admin?.fullName}</p>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', roleBadge[admin?.roleName ?? ''] ?? 'bg-gray-700 text-gray-300')}>
              {admin?.roleName?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg text-xs transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
