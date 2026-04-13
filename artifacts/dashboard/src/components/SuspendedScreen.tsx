import { ShieldX, Mail, Clock } from "lucide-react";
import type { UserProfile } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

interface Props {
  profile: UserProfile;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SuspendedScreen({ profile }: Props) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/dashboard/login";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-destructive" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Account Suspended
          </h1>
          <p className="text-muted-foreground">
            Your account has been suspended and you are unable to access TubeVox at this time.
          </p>
        </div>

        {/* Details card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 mb-6">
          {profile.suspended_reason && (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ShieldX className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Reason
                </p>
                <p className="text-sm text-foreground font-medium">
                  {profile.suspended_reason}
                </p>
              </div>
            </div>
          )}

          {profile.suspended_at && (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Suspended on
                </p>
                <p className="text-sm text-foreground">
                  {formatDate(profile.suspended_at)}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Contact support
              </p>
              <a
                href="mailto:support@tubevox.com"
                className="text-sm text-primary hover:underline font-medium"
              >
                support@tubevox.com
              </a>
              <p className="text-xs text-muted-foreground mt-0.5">
                Include your account email when writing to us.
              </p>
            </div>
          </div>
        </div>

        {/* Account info */}
        <p className="text-center text-xs text-muted-foreground mb-6">
          Logged in as <span className="font-medium text-foreground">{profile.email}</span>
        </p>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 px-6 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
