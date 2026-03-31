import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

const TOGGLE_KEYS = ['maintenance_mode', 'new_signups_enabled'];
const NUMBER_KEYS  = ['max_job_comments', 'free_plan_credits', 'credit_cost_per_1000'];

const FRIENDLY: Record<string, { label: string; description: string }> = {
  maintenance_mode: {
    label: 'Maintenance Mode',
    description: 'When ON, all users see a maintenance page instead of the app. Admin panel is unaffected.',
  },
  new_signups_enabled: {
    label: 'New Signups Enabled',
    description: 'When OFF, the signup page shows a "Registration closed" message and blocks new accounts.',
  },
  free_plan_credits: {
    label: 'Signup Bonus (free_plan_credits)',
    description: 'Credits granted to every new user on signup. Appears on the landing page, pricing, FAQ, and signup page automatically.',
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [values,   setValues]   = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/settings').then(d => {
      setSettings(d.data ?? []);
      const vals: Record<string, string> = {};
      for (const s of d.data ?? []) vals[s.key] = s.value ?? '';
      setValues(vals);
    }).finally(() => setLoading(false));
  }, []);

  const saveValue = async (key: string, value: string) => {
    if (key === 'free_plan_credits') {
      const n = parseInt(value);
      if (isNaN(n) || n < 0)  { toast.error('Signup bonus must be a positive number'); return; }
      if (n > 100000)          { toast.error('Signup bonus cannot exceed 100,000 credits'); return; }
    }
    setSaving(key);
    try {
      await api.post(`/admin/settings/${key}`, { value });
      if (key === 'maintenance_mode') {
        toast[value === 'true' ? 'warning' : 'success'](
          value === 'true'
            ? '⚠ Maintenance mode ON — users now see the maintenance page'
            : '✓ Maintenance mode OFF — users can access the app again'
        );
      } else if (key === 'new_signups_enabled') {
        toast[value === 'true' ? 'success' : 'warning'](
          value === 'true'
            ? '✓ New signups are now enabled'
            : '⚠ New signups DISABLED — registration is now blocked'
        );
      } else if (key === 'free_plan_credits') {
        toast.success(`Signup bonus updated to ${Number(value).toLocaleString()} credits.`);
      } else {
        toast.success(`Saved: ${key}`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = (key: string) => {
    const newVal = values[key] === 'true' ? 'false' : 'true';
    setValues(v => ({ ...v, [key]: newVal }));
    saveValue(key, newVal);
  };

  if (loading) return <AdminLayout title="Platform Settings"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></AdminLayout>;

  return (
    <AdminLayout title="Platform Settings">
      {values['maintenance_mode'] === 'true' && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Maintenance mode is currently ON — all users see the maintenance page
        </div>
      )}

      <div className="space-y-3">
        {settings.map(s => {
          const friendly = FRIENDLY[s.key];
          const isToggle = TOGGLE_KEYS.includes(s.key);
          const isNumber = NUMBER_KEYS.includes(s.key);
          const isSaving = saving === s.key;

          if (isToggle) {
            const isOn = values[s.key] === 'true';
            const isMaintenance  = s.key === 'maintenance_mode';
            const isSignupsOff   = s.key === 'new_signups_enabled' && !isOn;

            return (
              <div key={s.key} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {friendly?.label ?? s.key}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {friendly?.description ?? s.description ?? ''}
                    </p>
                    {isMaintenance && isOn && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Currently ACTIVE — users cannot access the app
                      </span>
                    )}
                    {isSignupsOff && (
                      <span className="inline-block mt-1.5 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        ⚠ Registration is currently CLOSED
                      </span>
                    )}
                    {s.updated_at && (
                      <p className="text-[10px] text-gray-300 mt-1.5">
                        Updated {new Date(s.updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(s.key)}
                    disabled={isSaving}
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${
                      isOn
                        ? isMaintenance ? 'bg-red-500' : 'bg-indigo-500'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        isOn ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          }

          if (s.key === 'free_plan_credits') {
            return (
              <div key={s.key} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-sm font-semibold text-gray-800">free_plan_credits</p>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Signup bonus</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Credits granted to every new user on signup. Currently: <strong>{Number(values['free_plan_credits'] || 0).toLocaleString()} credits</strong>.
                      This number appears on the landing page, pricing, FAQ, and signup page automatically.
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      If you change this to 1000, new signups will receive 1,000 credits and the landing page updates immediately.
                    </p>
                    {s.updated_at && <p className="text-[10px] text-gray-300 mt-1">Updated {new Date(s.updated_at).toLocaleString()}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      step="100"
                      value={values['free_plan_credits'] ?? ''}
                      onChange={e => setValues(v => ({ ...v, free_plan_credits: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-28 text-right font-mono font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <span className="text-xs text-gray-400">credits</span>
                    <button
                      onClick={() => saveValue('free_plan_credits', values['free_plan_credits'])}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={s.key} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-800">{s.key}</p>
                  {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                  {s.updated_at && <p className="text-[10px] text-gray-300 mt-1">Updated {new Date(s.updated_at).toLocaleString()}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isNumber ? (
                    <input
                      type="number"
                      value={values[s.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-32 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  ) : (
                    <input
                      value={values[s.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-48 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  )}
                  <button
                    onClick={() => saveValue(s.key, values[s.key])}
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
