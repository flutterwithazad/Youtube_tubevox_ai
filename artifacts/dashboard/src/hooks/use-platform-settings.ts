import { useEffect, useState } from "react";

export interface PlatformSettings {
  maintenance_mode: boolean;
  new_signups_enabled: boolean;
}

const POLL_INTERVAL_MS = 60_000;

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchSettings() {
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/public/settings`);
      if (!res.ok) return;
      const data = await res.json();
      setSettings({
        maintenance_mode: data.maintenance_mode === "true",
        new_signups_enabled: data.new_signups_enabled !== "false",
      });
    } catch {
      // silently ignore — don't block the app if this fails
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
    const interval = setInterval(fetchSettings, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return { settings, isLoading };
}
