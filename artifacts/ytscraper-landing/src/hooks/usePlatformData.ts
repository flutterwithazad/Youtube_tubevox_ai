import { useState, useEffect } from 'react';

export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits_amount: number;
  price: number;
  currency: string;
  sort_order: number;
}

export interface PlatformData {
  freeCredits: string;
  packages: CreditPackage[];
  loading: boolean;
}

const API = '/api/public';

export function usePlatformData(): PlatformData {
  const [freeCredits, setFreeCredits] = useState('500');
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [settingsRes, packagesRes] = await Promise.all([
          fetch(`${API}/settings`),
          fetch(`${API}/packages`),
        ]);
        if (cancelled) return;
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setFreeCredits(s.free_plan_credits ?? '500');
        }
        if (packagesRes.ok) {
          const p = await packagesRes.json();
          setPackages(p.data ?? []);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { freeCredits, packages, loading };
}
