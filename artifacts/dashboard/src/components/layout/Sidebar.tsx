import { Link, useLocation } from "wouter";
import { Play, PlaySquare, List, Zap, Settings, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarColor } from "@/lib/utils/youtube";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const navItems = [
  { href: "/scrape", label: "Scrape", icon: PlaySquare },
  { href: "/jobs", label: "My Jobs", icon: List },
  { href: "/credits", label: "Credits", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    window.location.href = "/dashboard/login";
  };

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <aside
      className={`relative bg-sidebar flex flex-col h-screen border-r border-sidebar-border hidden md:flex shrink-0 transition-all duration-200 ease-in-out overflow-visible ${
        collapsed ? 'w-[60px]' : 'w-[220px]'
      }`}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center border-b border-sidebar-border shrink-0 relative px-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
        {!collapsed && (
          <span className="ml-3 font-display font-bold text-xl text-white tracking-tight whitespace-nowrap">
            YTScraper
          </span>
        )}

        {/* Toggle button — sits on the right edge of the sidebar border */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#1c1c24] border border-sidebar-border flex items-center justify-center text-sidebar-foreground/60 hover:text-white hover:border-primary/50 transition-all z-50 shadow-md"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
                  collapsed ? 'justify-center px-2' : 'px-3'
                } ${
                  isActive
                    ? "bg-white/10 text-white border-l-2 border-primary rounded-l-none"
                    : "text-sidebar-foreground/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && (
                  <span className="font-medium text-sm whitespace-nowrap overflow-hidden">
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className={`border-t border-sidebar-border ${collapsed ? 'p-2' : 'p-4'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-8 w-8 border border-white/10" title={`${name} — ${user?.email}`}>
              <AvatarFallback style={{ backgroundColor: getAvatarColor(name), color: 'white', fontSize: '11px' }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleLogout}
              title="Log out"
              className="flex items-center justify-center w-8 h-8 text-sidebar-foreground/60 hover:text-white hover:bg-white/5 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-9 w-9 border border-white/10 shrink-0">
                <AvatarFallback style={{ backgroundColor: getAvatarColor(name), color: 'white' }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 overflow-hidden text-sm">
                <p className="text-white font-medium truncate">{name}</p>
                <p className="text-sidebar-foreground/50 truncate text-xs">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-sidebar-foreground/60 hover:text-white hover:bg-white/5 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
