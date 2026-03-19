import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, Users, Play, CreditCard, Package, Coins,
  Key, Settings, Megaphone, Shield, ClipboardList, UserCog, LogOut,
  ChevronLeft, ChevronRight
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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
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
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen bg-[#0F0F14] flex flex-col z-40 transition-all duration-200 ease-in-out overflow-visible',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="px-3 py-5 border-b border-white/10 relative">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2.5')}>
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-white font-bold text-base whitespace-nowrap">Admin Panel</span>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0F0F14] border border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-indigo-500/60 transition-all z-50 shadow-md"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.title && !collapsed && (
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 pt-4 pb-1.5">
                {group.title}
              </p>
            )}
            {group.title && collapsed && <div className="pt-3 pb-1 border-t border-white/5 mx-1 mt-2" />}
            {group.items.map(item => {
              if (item.perm && !admin?.permissions[item.perm]) return null;
              const active = location === item.href || location.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center py-2 rounded-lg text-sm transition-colors cursor-pointer',
                      collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
                      active
                        ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-500 rounded-l-none'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </a>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Admin footer */}
      <div className="border-t border-white/10 p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold"
              title={`${admin?.fullName} — ${admin?.roleName?.replace('_', ' ')}`}
            >
              {admin?.fullName?.[0] ?? 'A'}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center justify-center w-7 h-7 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-2 px-1">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {admin?.fullName?.[0] ?? 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{admin?.fullName}</p>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', roleBadge[admin?.roleName ?? ''] ?? 'bg-gray-700 text-gray-300')}>
                  {admin?.roleName?.replace('_', ' ')}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
