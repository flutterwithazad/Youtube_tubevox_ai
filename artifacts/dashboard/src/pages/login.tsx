import { useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Play, Eye, EyeOff, ShieldX } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Read suspension info from sessionStorage on mount — survives the
  // unmount/remount cycle caused by onAuthStateChange setting isLoading=true.
  const [suspendedInfo, setSuspendedInfo] = useState<{ reason: string; suspended_at: string | null } | null>(() => {
    try {
      const raw = sessionStorage.getItem("suspended_info");
      if (raw) { sessionStorage.removeItem("suspended_info"); return JSON.parse(raw); }
    } catch {}
    return null;
  });

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuspendedInfo(null);
    try {
      setEmailLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_suspended, suspended_reason, suspended_at")
          .eq("id", userId)
          .single();

        if (profile?.is_suspended) {
          const info = {
            reason: profile.suspended_reason || "Your account has been suspended.",
            suspended_at: profile.suspended_at ?? null,
          };
          // Persist before signOut so the banner survives the component remount
          sessionStorage.setItem("suspended_info", JSON.stringify(info));
          await supabase.auth.signOut();
          setSuspendedInfo(info);
          return;
        }
      }

      toast.success("Welcome back!");
      setLocation("/scrape");
    } catch (error: any) {
      toast.error(error.message || "Invalid email or password");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email address first");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard/auth/callback`,
      });
      if (error) throw error;
      toast.success("Password reset link sent — check your inbox");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard/auth/callback` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Sign in to your YTScraper account
          </p>
        </div>

        {/* Suspension banner */}
        {suspendedInfo && (
          <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <div className="flex gap-3 mb-3">
              <ShieldX className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-destructive">Account Suspended</p>
                <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                  {suspendedInfo.reason}
                </p>
                {suspendedInfo.suspended_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Suspended on{" "}
                    {new Date(suspendedInfo.suspended_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background/60 rounded-lg px-3 py-2 border border-border">
              <span className="text-xs text-muted-foreground">Need help?</span>
              <a
                href="mailto:support@ytscraper.com"
                className="text-xs font-semibold text-primary hover:underline"
              >
                support@ytscraper.com
              </a>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/5 px-8 py-8">
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || emailLoading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-secondary hover:border-muted-foreground/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleEmailLogin}>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-background border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={emailLoading || googleLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all duration-200"
            >
              {emailLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
