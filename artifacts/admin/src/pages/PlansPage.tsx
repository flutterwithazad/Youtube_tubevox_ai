import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const defaultForm = { name: '', description: '', credits_per_month: 0, price_monthly: 0, price_yearly: 0, stripe_price_id_monthly: '', stripe_price_id_yearly: '', razorpay_plan_id_monthly: '', razorpay_plan_id_yearly: '', is_active: true, is_visible: true };

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = () => { api.get('/admin/plans').then(d => setPlans(d.data ?? [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setWorking(true);
    try {
      if (editId) await api.patch(`/admin/plans/${editId}`, form);
      else await api.post('/admin/plans', form);
      toast.success('Plan saved');
      setModal(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  const toggle = async (plan: any, field: 'is_active' | 'is_visible') => {
    try {
      await api.patch(`/admin/plans/${plan.id}`, { [field]: !plan[field] });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const F = ({ label, k, type = 'text' }: { label: string; k: string; type?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: type === 'number' ? Number(e.target.value) : e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
    </div>
  );

  return (
    <AdminLayout title="Plans">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setForm(defaultForm); setEditId(null); setModal('create'); }}>
          <Plus className="w-4 h-4 mr-1" /> New Plan
        </Button>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="grid grid-cols-8 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">Name</div><div className="col-span-1 text-right">$/mo</div><div className="col-span-1 text-right">$/yr</div><div className="col-span-2 text-right">Credits/mo</div><div className="col-span-1 text-center">Active</div><div className="col-span-1">Edit</div>
        </div>
        {loading ? <div className="p-4 text-sm text-gray-400">Loading...</div> : plans.map(p => (
          <div key={p.id} className="grid grid-cols-8 gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 text-xs items-center">
            <div className="col-span-2">
              <p className="font-semibold text-gray-800">{p.name}</p>
              <p className="text-gray-400 text-[11px]">{p.description}</p>
            </div>
            <div className="col-span-1 text-right font-mono">${p.price_monthly}</div>
            <div className="col-span-1 text-right font-mono">${p.price_yearly ?? '—'}</div>
            <div className="col-span-2 text-right font-mono">{p.credits_per_month?.toLocaleString()}</div>
            <div className="col-span-1 flex justify-center gap-2">
              <button onClick={() => toggle(p, 'is_active')} className={`w-8 h-4 rounded-full transition-colors ${p.is_active ? 'bg-green-400' : 'bg-gray-300'} relative`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow ${p.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="col-span-1">
              <button onClick={() => { setForm({ ...defaultForm, ...p }); setEditId(p.id); setModal('edit'); }} className="text-indigo-600 hover:underline text-[11px]">Edit</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{modal === 'create' ? 'Create Plan' : 'Edit Plan'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <F label="Name" k="name" />
              <F label="Credits/month" k="credits_per_month" type="number" />
              <F label="Price (monthly)" k="price_monthly" type="number" />
              <F label="Price (yearly)" k="price_yearly" type="number" />
              <F label="Stripe Price ID (monthly)" k="stripe_price_id_monthly" />
              <F label="Stripe Price ID (yearly)" k="stripe_price_id_yearly" />
              <F label="Razorpay Plan (monthly)" k="razorpay_plan_id_monthly" />
              <F label="Razorpay Plan (yearly)" k="razorpay_plan_id_yearly" />
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_visible} onChange={e => setForm({ ...form, is_visible: e.target.checked })} /> Visible</label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={save} disabled={working}>Save Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
