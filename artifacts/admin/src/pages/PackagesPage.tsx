import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

const defaultForm = { name: '', description: '', credits_amount: 0, price: 0, currency: 'USD', stripe_price_id: '', razorpay_plan_id: '', sort_order: 0, is_active: true };

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [working, setWorking] = useState(false);

  const load = () => { api.get('/admin/packages').then(d => setPackages(d.data ?? [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setWorking(true);
    try {
      if (editId) await api.patch(`/admin/packages/${editId}`, form);
      else await api.post('/admin/packages', form);
      toast.success('Saved');
      setModal(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  const doDelete = async () => {
    setWorking(true);
    try {
      await api.delete(`/admin/packages/${deleteConfirm.id}`);
      toast.success('Deleted');
      setDeleteConfirm(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  const F = ({ label, k, type = 'text' }: { label: string; k: string; type?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: type === 'number' ? Number(e.target.value) : e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
    </div>
  );

  return (
    <AdminLayout title="Credit Packages">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setForm(defaultForm); setEditId(null); setModal('create'); }}>
          <Plus className="w-4 h-4 mr-1" /> New Package
        </Button>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="grid grid-cols-9 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">Name</div><div className="col-span-1 text-right">Credits</div><div className="col-span-1 text-right">Price</div><div className="col-span-1">Currency</div><div className="col-span-1 text-center">Active</div><div className="col-span-1 text-center">Sort</div><div className="col-span-2">Actions</div>
        </div>
        {loading ? <div className="p-4 text-sm text-gray-400">Loading...</div> : packages.map(p => (
          <div key={p.id} className="grid grid-cols-9 gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 text-xs items-center">
            <div className="col-span-2"><p className="font-semibold">{p.name}</p><p className="text-gray-400">{p.description}</p></div>
            <div className="col-span-1 text-right font-mono">{p.credits_amount?.toLocaleString()}</div>
            <div className="col-span-1 text-right font-mono">${p.price}</div>
            <div className="col-span-1 text-gray-600">{p.currency}</div>
            <div className="col-span-1 text-center">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.is_active ? 'Active' : 'Off'}</span>
            </div>
            <div className="col-span-1 text-center">{p.sort_order}</div>
            <div className="col-span-2 flex gap-2">
              <button onClick={() => { setForm({ ...defaultForm, ...p }); setEditId(p.id); setModal('edit'); }} className="text-indigo-600 hover:underline">Edit</button>
              <button onClick={() => setDeleteConfirm(p)} className="text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{modal === 'create' ? 'New Package' : 'Edit Package'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><F label="Name" k="name" /></div>
              <F label="Credits Amount" k="credits_amount" type="number" />
              <F label="Price" k="price" type="number" />
              <F label="Currency" k="currency" />
              <F label="Sort Order" k="sort_order" type="number" />
              <F label="Stripe Price ID" k="stripe_price_id" />
              <F label="Razorpay Plan ID" k="razorpay_plan_id" />
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={save} disabled={working}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {deleteConfirm && (
        <ConfirmDialog open title="Delete Package" description={`Delete "${deleteConfirm.name}"? This cannot be undone.`} confirmLabel="Delete" danger onConfirm={doDelete} onCancel={() => setDeleteConfirm(null)} loading={working} />
      )}
    </AdminLayout>
  );
}
