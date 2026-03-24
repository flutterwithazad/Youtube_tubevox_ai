import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function useCredits(userId: string | undefined) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fetchBalance = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("user_credit_balance")
      .select("balance")
      .eq("user_id", userId)
      .single();
    setBalance(data?.balance ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchBalance();

    // Poll every 10s so balance stays current during active scraping
    intervalRef.current = setInterval(fetchBalance, 10_000);

    // Refresh immediately when the user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchBalance();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}
