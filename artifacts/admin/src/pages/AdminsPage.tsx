import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function AdminsPage() {
  const { admin: me } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role_id: '' });
  const [roleModal, setRoleModal] = useState<any>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState<any>(null);
  const [working, setWorking] = useState(false);

  const load = () => { api.get('/admin/admins').then(d => { setAdmins(d.admins ?? []); setRoles(d.roles ?? []); }).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const createAdmin = async () => {
    setWorking(true);
    try {
      await api.post('/admin/admins', form);
      toast.success('Admin created');
      setCreateModal(false);
      setForm({ full_name: '', email: '', password: '', role_id: '' });
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  const changeRole = async (adminId: string, role_id: string) => {
    try {
      await api.patch(`/admin/admins/${adminId}/role`, { role_id });
      toast.success('Role updated');
      setRoleModal(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const deactivate = async () => {
    setWorking(true);
    try {
      await api.post(`/admin/admins/${deactivateConfirm.id}/deactivate`);
      toast.success('Admin deactivated');
      setDeactivateConfirm(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  const permKeys = ['can_view_users', 'can_suspend_users', 'can_delete_users', 'can_change_user_plan', 'can_add_credits', 'can_view_payments', 'can_issue_refunds', 'can_manage_plans', 'can_view_jobs', 'can_kill_jobs', 'can_manage_api_keys', 'can_edit_settings', 'can_manage_announcements', 'can_manage_ip_blocklist', 'can_manage_admins', 'can_view_audit_log'];

  return (
    <AdminLayout title="Admin Users">
      {me?.permissions['can_manage_admins'] && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => { setForm({ full_name: '', email: '', password: '', role_id: roles[0]?.id ?? '' }); setCreateModal(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Admin
          </Button>
        </div>
      )}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden mb-6">
        <div className="grid grid-cols-9 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Admin</div><div className="col-span-1">Role</div><div className="col-span-1 text-center">2FA</div><div className="col-span-1 text-center">Status</div><div className="col-span-2">Last Login</div><div className="col-span-1">Actions</div>
        </div>
        {loading ? <div className="p-4 text-sm text-gray-400">Loading...</div> : admins.map(a => (
          <div key={a.id} className="grid grid-cols-9 gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 text-xs items-center">
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">{a.full_name[0]}</div>
                <div><p className="font-medium text-gray-800">{a.full_name}</p><p className="text-gray-400">{a.email}</p></div>
              </div>
            </div>
            <div className="col-span-1"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-medium">{a.admin_roles?.name?.replace('_', ' ')}</span></div>
            <div className="col-span-1 text-center">{a.is_2fa_enabled ? <span className="text-green-600">On</span> : <span className="text-gray-400">Off</span>}</div>
            <div className="col-span-1 text-center"><StatusBadge status={a.is_active ? 'active' : 'inactive'} /></div>
            <div className="col-span-2 text-gray-400">{a.last_login_at ? new Date(a.last_login_at).toLocaleString() : 'Never'}</div>
            <div className="col-span-1 flex gap-1">
              {me?.permissions['can_manage_admins'] && <>
                <button onClick={() => setRoleModal(a)} className="text-indigo-600 hover:underline text-[11px]">Role</button>
                {a.id !== me?.adminId && a.is_active && <button onClick={() => setDeactivateConfirm(a)} className="text-red-600 hover:underline text-[11px]">Deact.</button>}
              </>}
            </div>
          </div>
        ))}
      </div>

      {/* Permissions grid */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Role Permissions Reference</h3>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-gray-500">Permission</th>
                {roles.map(r => <th key={r.id} className="px-4 py-2 text-indigo-700 font-medium">{r.name.replace('_', ' ')}</th>)}
              </tr>
            </thead>
            <tbody>
              {permKeys.map(p => (
                <tr key={p} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-1.5 pr-4 text-gray-600 font-mono text-[10px]">{p.replace('can_', '').replace(/_/g, ' ')}</td>
                  {roles.map(r => (
                    <td key={r.id} className="px-4 py-1.5 text-center">
                      {r[p] ? <Check className="w-3 h-3 text-green-500 mx-auto" /> : <X className="w-3 h-3 text-gray-300 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {createModal && (
        <Dialog open onOpenChange={() => setCreateModal(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Create Admin</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {[['Full Name', 'full_name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password']].map(([label, k, type]) => (
                <div key={k}><label className="block text-xs font-medium text-gray-700 mb-1">{label}</label><input type={type} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
              ))}
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModal(false)}>Cancel</Button>
              <Button onClick={createAdmin} disabled={working}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Role change modal */}
      {roleModal && (
        <Dialog open onOpenChange={() => setRoleModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Change Role: {roleModal.full_name}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              {roles.map(r => (
                <button key={r.id} onClick={() => changeRole(roleModal.id, r.id)} className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${roleModal.role_id === r.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  {r.name.replace('_', ' ')}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {deactivateConfirm && (
        <ConfirmDialog open title="Deactivate Admin" description={`Deactivate ${deactivateConfirm.full_name}? They will no longer be able to log in.`} confirmLabel="Deactivate" danger onConfirm={deactivate} onCancel={() => setDeactivateConfirm(null)} loading={working} />
      )}
    </AdminLayout>
  );
}
