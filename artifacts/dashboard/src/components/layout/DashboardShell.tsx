import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useLocation } from "wouter";
import { PlaySquare, List, Zap, Settings } from "lucide-react";
import { Link } from "wouter";

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardShell({ children, title }: DashboardShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/scrape", icon: PlaySquare },
    { href: "/jobs", icon: List },
    { href: "/credits", icon: Zap },
    { href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Mobile Tab Bar */}
        <div className="md:hidden border-t border-border bg-card h-16 shrink-0 flex items-center justify-around px-4">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div className={`p-3 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  <item.icon className="w-6 h-6" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
