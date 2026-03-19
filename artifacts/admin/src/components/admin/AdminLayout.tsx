import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/lib/auth-context';
import { useLocation } from 'wouter';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const STORAGE_KEY = "admin_sidebar_collapsed";

export function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { admin, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    if (!loading && !admin) setLocation('/login');
  }, [admin, loading]);

  if (loading) return (
    <div className="min-h-screen bg-[#F4F4F8] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!admin) return null;

  const sidebarWidth = collapsed ? 60 : 240;

  return (
    <div className="min-h-screen bg-[#F4F4F8] flex">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-200 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Topbar */}
        <header className="bg-white border-b border-[#E5E7EB] px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          <a href="/dashboard" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">
            Open User Panel ↗
          </a>
        </header>
        {/* Mobile warning */}
        <div className="md:hidden bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700">
          Use a desktop browser for the best admin experience.
        </div>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
