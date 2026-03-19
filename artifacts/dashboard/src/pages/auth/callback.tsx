import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Play } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error("Authentication failed. Please try again.");
          setLocation("/login");
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLocation("/login");
        return;
      }

      const isNewUser =
        user.created_at &&
        Date.now() - new Date(user.created_at).getTime() < 30_000;

      if (isNewUser && !localStorage.getItem("yt_welcome_shown")) {
        try {
          const { data: setting } = await supabase
            .from("platform_settings")
            .select("value")
            .eq("key", "free_plan_credits")
            .single();
          const credits = setting?.value ?? "free";
          toast.success(`Welcome! You have ${credits} credits to get started.`, {
            duration: 6000,
          });
        } catch {
          toast.success("Welcome to YTScraper!", { duration: 4000 });
        }
        localStorage.setItem("yt_welcome_shown", "1");
      }

      setLocation("/scrape");
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5">
      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
        <Play className="w-6 h-6 text-white fill-white ml-1" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
