import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const defaultForm = { title: '', body: '', type: 'info', target_audience: 'all', placement: 'banner', cta_label: '', cta_url: '', is_dismissable: true, is_active: false, show_from: '', show_until: '' };

const typeBadge: Record<string, string> = { info: 'bg-blue-100 text-blue-700', warning: 'bg-amber-100 text-amber-700', success: 'bg-green-100 text-green-700', danger: 'bg-red-100 text-red-700' };

export default function AnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [working, setWorking] = useState(false);

  const load = () => { api.get('/admin/announcements').then(d => setItems(d.data ?? [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setWorking(true);
    try {
      if (editId) await api.patch(`/admin/announcements/${editId}`, form);
      else await api.post('/admin/announcements', form);
      toast.success('Saved');
      setModal(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  const toggleActive = async (item: any) => {
    try {
      await api.patch(`/admin/announcements/${item.id}`, { is_active: !item.is_active });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const F = ({ label, k, type = 'text', options }: { label: string; k: string; type?: string; options?: string[] }) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {options ? (
        <select value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-1 focus:ring-indigo-500 outline-none" />
      ) : (
        <input type={type} value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
      )}
    </div>
  );

  return (
    <AdminLayout title="Announcements">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setForm(defaultForm); setEditId(null); setModal('create'); }}>
          <Plus className="w-4 h-4 mr-1" /> New Announcement
        </Button>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="grid grid-cols-10 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Title</div><div className="col-span-1">Type</div><div className="col-span-1">Audience</div><div className="col-span-1">Placement</div><div className="col-span-1 text-center">Active</div><div className="col-span-2">Show Period</div><div className="col-span-1">Actions</div>
        </div>
        {loading ? <div className="p-4 text-sm text-gray-400">Loading...</div> : items.map(item => (
          <div key={item.id} className="grid grid-cols-10 gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 text-xs items-center">
            <div className="col-span-3">
              <p className="font-semibold text-gray-800 truncate">{item.title}</p>
              <p className="text-gray-400 truncate">{item.body}</p>
            </div>
            <div className="col-span-1"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${typeBadge[item.type] ?? 'bg-gray-100 text-gray-600'}`}>{item.type}</span></div>
            <div className="col-span-1 text-gray-600 capitalize">{item.target_audience}</div>
            <div className="col-span-1 text-gray-600">{item.placement}</div>
            <div className="col-span-1 flex justify-center">
              <button onClick={() => toggleActive(item)} className={`w-8 h-4 rounded-full relative transition-colors ${item.is_active ? 'bg-green-400' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${item.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="col-span-2 text-gray-400 text-[10px]">
              {item.show_from ? new Date(item.show_from).toLocaleDateString() : '—'} → {item.show_until ? new Date(item.show_until).toLocaleDateString() : '∞'}
            </div>
            <div className="col-span-1 flex gap-2">
              <button onClick={() => { setForm({ ...defaultForm, ...item }); setEditId(item.id); setModal('edit'); }} className="text-indigo-600 hover:underline">Edit</button>
              <button onClick={() => setDeleteConfirm(item)} className="text-red-600 hover:underline">Del</button>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && <div className="px-4 py-8 text-center text-sm text-gray-400">No announcements</div>}
      </div>

      {modal && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{modal === 'create' ? 'New Announcement' : 'Edit Announcement'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <F label="Title" k="title" />
              <F label="Body" k="body" type="textarea" />
              <div className="grid grid-cols-2 gap-3">
                <F label="Type" k="type" options={['info', 'warning', 'success', 'danger']} />
                <F label="Audience" k="target_audience" options={['all', 'free', 'starter', 'pro', 'agency']} />
                <F label="Placement" k="placement" options={['banner', 'modal', 'dashboard', 'email']} />
                <div className="flex items-center gap-3 pt-5">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_dismissable} onChange={e => setForm({ ...form, is_dismissable: e.target.checked })} /> Dismissable</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
                </div>
                <F label="CTA Label" k="cta_label" />
                <F label="CTA URL" k="cta_url" />
                <F label="Show From" k="show_from" type="datetime-local" />
                <F label="Show Until" k="show_until" type="datetime-local" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={save} disabled={working}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {deleteConfirm && (
        <ConfirmDialog open title="Delete Announcement" description={`Delete "${deleteConfirm.title}"?`} confirmLabel="Delete" danger onConfirm={async () => { await api.delete(`/admin/announcements/${deleteConfirm.id}`); toast.success('Deleted'); setDeleteConfirm(null); load(); }} onCancel={() => setDeleteConfirm(null)} />
      )}
    </AdminLayout>
  );
}
