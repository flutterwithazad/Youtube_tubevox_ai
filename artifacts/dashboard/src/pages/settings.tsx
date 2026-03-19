import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarColor } from "@/lib/utils/youtube";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  id: string;
  full_name?: string;
  timezone?: string;
  locale?: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"profile" | "security">("profile");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setProfileLoading(true);
    const { data } = await supabase.from("profiles").select("*").single();
    if (data) {
      setProfile(data);
      setName(data.full_name || user?.user_metadata?.full_name || "");
    } else {
      setName(user?.user_metadata?.full_name || "");
    }
    setProfileLoading(false);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setPwLoading(false);
    }
  };

  const displayName = name || user?.email || "U";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <DashboardShell title="Settings">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground">Account Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your profile, preferences, and security.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto">
          <button
            onClick={() => setTab("profile")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${tab === "profile" ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            <User className="w-4 h-4" /> Profile
          </button>
          <button
            onClick={() => setTab("security")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${tab === "security" ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            <Shield className="w-4 h-4" /> Security
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {tab === "profile" && (
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-foreground mb-6">Profile Details</h3>

              <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
                {profileLoading ? (
                  <Skeleton className="w-20 h-20 rounded-full" />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md border-4 border-background"
                    style={{ backgroundColor: getAvatarColor(displayName) }}
                  >
                    {initials}
                  </div>
                )}
                <div>
                  <button
                    onClick={() => toast("Avatar uploads coming soon")}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium rounded-lg transition-colors border border-border mb-2"
                  >
                    Change Avatar
                  </button>
                  <p className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</p>
                </div>
              </div>

              {profileLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ) : (
                <form onSubmit={handleProfileSave} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Email cannot be changed directly. Contact support.</p>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {tab === "security" && (
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-foreground mb-6">Change Password</h3>

              <form onSubmit={handlePasswordSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    minLength={8}
                    placeholder="Min. 8 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    minLength={8}
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={pwLoading || !password}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                  >
                    {pwLoading ? "Updating…" : "Update Password"}
                  </button>
                </div>
              </form>

              <div className="mt-12 pt-8 border-t border-border">
                <h4 className="text-destructive font-bold mb-2">Danger Zone</h4>
                <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data.</p>
                <button
                  onClick={() => toast.error("Please contact support to delete your account.")}
                  className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white text-sm font-bold rounded-xl transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
