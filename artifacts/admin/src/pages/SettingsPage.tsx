import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/settings').then(d => {
      setSettings(d.data ?? []);
      const vals: Record<string, string> = {};
      for (const s of d.data ?? []) vals[s.key] = s.value ?? '';
      setValues(vals);
    }).finally(() => setLoading(false));
  }, []);

  const save = async (key: string) => {
    if (key === 'free_plan_credits') {
      const n = parseInt(values[key]);
      if (isNaN(n) || n < 0) { toast.error('Signup bonus must be a positive number'); return; }
      if (n > 100000) { toast.error('Signup bonus cannot exceed 100,000 credits'); return; }
    }
    setSaving(key);
    try {
      await api.post(`/admin/settings/${key}`, { value: values[key] });
      if (key === 'free_plan_credits') {
        toast.success(`Signup bonus updated to ${Number(values[key]).toLocaleString()} credits. New signups will now receive this amount.`);
      } else {
        toast.success(`Saved: ${key}`);
      }
    } catch (e: any) { toast.error(e.message); } finally { setSaving(null); }
  };

  const toggleKeys = ['maintenance_mode', 'new_signups_enabled'];
  const numberKeys = ['max_job_comments', 'free_plan_credits', 'credit_cost_per_1000'];

  if (loading) return <AdminLayout title="Platform Settings"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></AdminLayout>;

  return (
    <AdminLayout title="Platform Settings">
      {values['maintenance_mode'] === 'true' && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Maintenance mode is currently ON — all users see a maintenance page
        </div>
      )}
      <div className="space-y-3">
        {settings.map(s => (
          <div key={s.key} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
            {s.key === 'free_plan_credits' ? (
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
                    onChange={e => setValues({ ...values, free_plan_credits: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-28 text-right font-mono font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-xs text-gray-400">credits</span>
                  <button onClick={() => save('free_plan_credits')} disabled={saving === 'free_plan_credits'} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                    {saving === 'free_plan_credits' ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-800">{s.key}</p>
                  {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                  {s.updated_at && <p className="text-[10px] text-gray-300 mt-1">Updated {new Date(s.updated_at).toLocaleString()}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {toggleKeys.includes(s.key) ? (
                    <button
                      onClick={() => { const nv = values[s.key] === 'true' ? 'false' : 'true'; setValues({ ...values, [s.key]: nv }); }}
                      className={`w-10 h-5 rounded-full transition-colors relative ${values[s.key] === 'true' ? 'bg-indigo-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${values[s.key] === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  ) : numberKeys.includes(s.key) ? (
                    <input type="number" value={values[s.key] ?? ''} onChange={e => setValues({ ...values, [s.key]: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-32 focus:ring-1 focus:ring-indigo-500 outline-none" />
                  ) : (
                    <input value={values[s.key] ?? ''} onChange={e => setValues({ ...values, [s.key]: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-48 focus:ring-1 focus:ring-indigo-500 outline-none" />
                  )}
                  <button onClick={() => save(s.key)} disabled={saving === s.key} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                    {saving === s.key ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
