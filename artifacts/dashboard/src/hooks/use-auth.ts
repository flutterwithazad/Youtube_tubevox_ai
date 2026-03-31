import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  account_status: string;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
}

const POLL_INTERVAL_MS = 30_000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  async function fetchProfile(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,full_name,account_status,is_suspended,suspended_reason,suspended_at")
      .eq("id", uid)
      .single();
    if (data) {
      setProfile(data);
      // If the user is suspended, persist the reason before signing out
      // so the login page can read it after remounting
      if (data.is_suspended) {
        sessionStorage.setItem(
          "suspended_info",
          JSON.stringify({
            reason: data.suspended_reason || "Your account has been suspended.",
            suspended_at: data.suspended_at,
          })
        );
        await supabase.auth.signOut();
      }
    } else {
      setProfile(null);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      userIdRef.current = user?.id ?? null;
      if (user) {
        fetchProfile(user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        userIdRef.current = u?.id ?? null;
        if (u) {
          // Hold AuthGuard in loading state until we know if the user is suspended.
          // Without this, AuthGuard redirects to /scrape before the profile check
          // completes, causing a 1-second flash before suspension kicks them out.
          setIsLoading(true);
          fetchProfile(u.id).finally(() => setIsLoading(false));
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    // Poll profile every 30s to catch real-time suspension
    const pollInterval = setInterval(() => {
      const uid = userIdRef.current;
      if (uid) fetchProfile(uid);
    }, POLL_INTERVAL_MS);

    return () => {
      subscription.unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  return { user, profile, isLoading };
}
