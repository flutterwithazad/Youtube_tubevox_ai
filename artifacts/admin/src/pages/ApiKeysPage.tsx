import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/api';
import { Plus, Key, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | null>(null);
  const [form, setForm] = useState({ label: '', key_value: '', quota_limit: 10000 });
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [working, setWorking] = useState(false);

  const load = () => { api.get('/admin/api-keys').then(d => setKeys(d.data ?? [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const addKey = async () => {
    setWorking(true);
    try {
      await api.post('/admin/api-keys', form);
      toast.success('API key added');
      setModal(null);
      setForm({ label: '', key_value: '', quota_limit: 10000 });
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  const action = async (id: string, act: string) => {
    try {
      if (act === 'delete') await api.delete(`/admin/api-keys/${id}`);
      else await api.post(`/admin/api-keys/${id}/${act}`);
      toast.success('Done');
      setDeleteConfirm(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const activeKeys = keys.filter(k => k.is_active && !k.is_paused).length;
  const errorKeys = keys.filter(k => (k.consecutive_errors ?? 0) >= 3).length;
  const pausedKeys = keys.filter(k => k.is_paused).length;
  const totalQuota = keys.reduce((s, k) => s + (k.quota_used ?? 0), 0);

  return (
    <AdminLayout title="YouTube API Keys">
      {keys.some(k => (k.consecutive_errors ?? 0) >= 5) && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Critical: API keys have 5+ consecutive errors!
        </div>
      )}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Keys" value={activeKeys} icon={Key} color="green" />
        <StatCard label="Total Quota Used" value={totalQuota.toLocaleString()} color="blue" />
        <StatCard label="Keys in Error" value={errorKeys} color={errorKeys > 0 ? 'red' : 'indigo'} />
        <StatCard label="Paused Keys" value={pausedKeys} color="amber" />
      </div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setModal('add')}><Plus className="w-4 h-4 mr-1" /> Add Key</Button>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="grid grid-cols-10 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">Label / Key</div><div className="col-span-3">Quota</div><div className="col-span-1 text-center">Errors</div><div className="col-span-1">Status</div><div className="col-span-1">Last Used</div><div className="col-span-2">Actions</div>
        </div>
        {loading ? <div className="p-4 text-sm text-gray-400">Loading...</div> : keys.map(k => {
          const pct = k.quota_used_pct ?? 0;
          const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
          return (
            <div key={k.id} className="grid grid-cols-10 gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 text-xs items-center">
              <div className="col-span-2">
                <p className="font-semibold">{k.label || 'Unnamed'}</p>
                <p className="font-mono text-gray-400 text-[10px]">{'••••••••'}</p>
              </div>
              <div className="col-span-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-gray-500 shrink-0">{k.quota_used?.toLocaleString()}/{k.quota_limit?.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-gray-400">{pct}% used</p>
              </div>
              <div className="col-span-1 text-center">
                <span className={`font-bold ${(k.consecutive_errors ?? 0) >= 3 ? 'text-red-600' : 'text-gray-600'}`}>{k.consecutive_errors ?? 0}</span>
                <p className="text-[10px] text-gray-400">total: {k.error_count ?? 0}</p>
              </div>
              <div className="col-span-1">
                {k.is_paused ? <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">Paused</span>
                  : k.is_active ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">Active</span>
                  : <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">Inactive</span>}
              </div>
              <div className="col-span-1 text-gray-400">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : '—'}</div>
              <div className="col-span-2 flex flex-wrap gap-1">
                {k.is_paused ? <button onClick={() => action(k.id, 'resume')} className="text-green-600 hover:underline text-[11px]">Resume</button>
                  : <button onClick={() => action(k.id, 'pause')} className="text-amber-600 hover:underline text-[11px]">Pause</button>}
                <button onClick={() => action(k.id, 'reset')} className="text-blue-600 hover:underline text-[11px]">Reset</button>
                <button onClick={() => setDeleteConfirm(k)} className="text-red-600 hover:underline text-[11px]">Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal === 'add' && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add YouTube API Key</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Label</label><input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. Key #1" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">API Key Value</label><input type="password" value={form.key_value} onChange={e => setForm({ ...form, key_value: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="AIza..." /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Quota Limit</label><input type="number" value={form.quota_limit} onChange={e => setForm({ ...form, quota_limit: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
              <p className="text-xs text-gray-400">The key value will never be shown again after saving.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={addKey} disabled={working || !form.key_value}>Add Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {deleteConfirm && (
        <ConfirmDialog open title="Delete API Key" description={`Delete key "${deleteConfirm.label}"? This cannot be undone.`} confirmLabel="Delete" danger onConfirm={() => action(deleteConfirm.id, 'delete')} onCancel={() => setDeleteConfirm(null)} />
      )}
    </AdminLayout>
  );
}
