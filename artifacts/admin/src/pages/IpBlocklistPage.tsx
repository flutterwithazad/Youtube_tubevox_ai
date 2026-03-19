import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const defaultForm = { ip_address: '', ip_range: '', reason: 'manual', expires_at: '', user_id: '' };

export default function IpBlocklistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(defaultForm);
  const [working, setWorking] = useState(false);

  const load = () => { api.get('/admin/ip-blocklist').then(d => setItems(d.data ?? [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const add = async () => {
    setWorking(true);
    try {
      await api.post('/admin/ip-blocklist', form);
      toast.success('IP blocked');
      setModal(false);
      setForm(defaultForm);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  const unblock = async (id: string) => {
    try {
      await api.post(`/admin/ip-blocklist/${id}/unblock`);
      toast.success('Unblocked');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AdminLayout title="IP Blocklist">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setForm(defaultForm); setModal(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Block IP
        </Button>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="grid grid-cols-9 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">IP / Range</div><div className="col-span-1">Reason</div><div className="col-span-2">Linked User</div><div className="col-span-1">Expires</div><div className="col-span-1">Status</div><div className="col-span-1">Added by</div><div className="col-span-1">Action</div>
        </div>
        {loading ? <div className="p-4 text-sm text-gray-400">Loading...</div> : items.map(item => {
          const expired = item.expires_at && new Date(item.expires_at) < new Date();
          return (
            <div key={item.id} className="grid grid-cols-9 gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 text-xs items-center">
              <div className="col-span-2 font-mono">
                <p>{item.ip_address}</p>
                {item.ip_range && <p className="text-gray-400">{item.ip_range}</p>}
              </div>
              <div className="col-span-1"><span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[10px]">{item.reason}</span></div>
              <div className="col-span-2 text-gray-500 truncate">{item.profiles?.email || '—'}</div>
              <div className="col-span-1 text-gray-500">{item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'Permanent'}</div>
              <div className="col-span-1">
                {expired ? <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">Expired</span>
                  : <StatusBadge status={item.is_active ? 'active' : 'inactive'} />}
              </div>
              <div className="col-span-1 text-gray-400">{item.admin_users?.full_name || '—'}</div>
              <div className="col-span-1">
                {item.is_active && <button onClick={() => unblock(item.id)} className="text-indigo-600 hover:underline text-[11px]">Unblock</button>}
              </div>
            </div>
          );
        })}
        {items.length === 0 && !loading && <div className="px-4 py-8 text-center text-sm text-gray-400">No blocked IPs</div>}
      </div>

      {modal && (
        <Dialog open onOpenChange={() => setModal(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Block IP Address</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">IP Address *</label><input value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="192.168.1.1" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">IP Range (CIDR, optional)</label><input value={form.ip_range} onChange={e => setForm({ ...form, ip_range: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="192.168.1.0/24" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
                  {['abuse', 'spam', 'brute_force', 'scraping_abuse', 'manual'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Expires at (optional)</label><input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={add} disabled={working || !form.ip_address}>Block IP</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
