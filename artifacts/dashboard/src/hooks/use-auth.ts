import { useEffect, useState } from "react";
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchProfile(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,full_name,account_status,is_suspended,suspended_reason,suspended_at")
      .eq("id", uid)
      .single();
    setProfile(data ?? null);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
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
        if (u) {
          fetchProfile(u.id).finally(() => setIsLoading(false));
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, isLoading };
}
