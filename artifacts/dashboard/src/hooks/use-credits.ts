import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useCredits(userId: string | undefined) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}
