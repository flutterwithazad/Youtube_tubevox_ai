import { Link, useLocation } from "wouter";
import { Play, PlaySquare, List, Zap, Settings, LogOut } from "lucide-react";
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

export function Sidebar() {
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
    <aside className="w-[220px] bg-sidebar flex flex-col h-screen border-r border-sidebar-border hidden md:flex shrink-0">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="font-display font-bold text-xl text-white tracking-tight">YTScraper</span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-6 flex flex-col gap-1 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm border-l-2 border-primary rounded-l-none pl-2.5"
                    : "text-sidebar-foreground/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-9 w-9 border border-white/10">
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
      </div>
    </aside>
  );
}
