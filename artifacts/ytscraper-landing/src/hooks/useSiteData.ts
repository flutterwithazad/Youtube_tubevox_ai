import { useState, useEffect } from 'react';

const API = '/api/public';

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon_key: string;
  sort_order: number;
}

export interface SiteSettings {
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  contact_hours: string;
  company_name: string;
  company_email: string;
}

export interface SiteData {
  settings: SiteSettings;
  socialLinks: SocialLink[];
  loading: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  contact_email: 'support@ytscraper.com',
  contact_phone: '',
  contact_address: '',
  contact_hours: 'Monday–Friday, 9am–6pm PST',
  company_name: 'YTScraper Inc.',
  company_email: 'legal@ytscraper.com',
};

export function useSiteData(): SiteData {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [settingsRes, socialRes] = await Promise.all([
          fetch(`${API}/settings`),
          fetch(`${API}/social-links`),
        ]);
        if (cancelled) return;
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setSettings({
            contact_email: s.contact_email ?? DEFAULT_SETTINGS.contact_email,
            contact_phone: s.contact_phone ?? '',
            contact_address: s.contact_address ?? '',
            contact_hours: s.contact_hours ?? DEFAULT_SETTINGS.contact_hours,
            company_name: s.company_name ?? DEFAULT_SETTINGS.company_name,
            company_email: s.company_email ?? DEFAULT_SETTINGS.company_email,
          });
        }
        if (socialRes.ok) {
          const s = await socialRes.json();
          setSocialLinks(s.data ?? []);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { settings, socialLinks, loading };
}
