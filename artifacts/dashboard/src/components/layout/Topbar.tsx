import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export function Topbar({ title }: { title: string }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchBalance = async () => {
      try {
        // Mock query - adjust to real view name
        const { data } = await supabase
          .from("user_credit_balance")
          .select("balance")
          .eq("user_id", user.id)
          .single();
        if (data) setBalance(data.balance);
      } catch (e) {
        // gracefully fail if view doesn't exist
        setBalance(1240); // mock fallback
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
      <h1 className="text-xl font-display font-bold text-foreground">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium border border-primary/20">
          <span>⚡</span>
          <span className="font-mono">{balance !== null ? balance.toLocaleString() : '---'}</span>
          <span className="hidden sm:inline">credits</span>
        </div>

        <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card"></span>
          )}
        </button>
      </div>
    </header>
  );
}
