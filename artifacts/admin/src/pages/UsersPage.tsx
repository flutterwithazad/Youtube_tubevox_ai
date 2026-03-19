import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SkeletonTable } from '@/components/admin/SkeletonTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight, UserX, UserCheck, DollarSign, Package } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function UsersPage() {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [confirmSuspend, setConfirmSuspend] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [creditsModal, setCreditsModal] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState(100);
  const [creditReason, setCreditReason] = useState('');
  const [creditType, setCreditType] = useState<'add' | 'deduct'>('add');
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, status, sort });
    api.get(`/admin/users?${params}`).then(d => { setData(d.data ?? []); setCount(d.count ?? 0); }).finally(() => setLoading(false));
  }, [page, search, status, sort]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(count / 25);

  const handleSuspend = async () => {
    setWorking(true);
    try {
      const action = confirmSuspend.is_suspended ? 'unsuspend' : 'suspend';
      await api.post(`/admin/users/${confirmSuspend.id}/${action}`, { reason: suspendReason });
      toast.success(`User ${action}ed`);
      setConfirmSuspend(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  const handleCredits = async () => {
    setWorking(true);
    try {
      await api.post(`/admin/users/${creditsModal.id}/credits`, { amount: creditAmount, reason: creditReason, type: creditType });
      toast.success('Credits updated');
      setCreditsModal(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  return (
    <AdminLayout title="Users">
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search email or name..." className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none" />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="alpha">Alphabetical</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">{count} total</span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">User</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Credits</div>
          <div className="col-span-1 text-right">Jobs</div>
          <div className="col-span-2">Joined</div>
          <div className="col-span-2">Actions</div>
        </div>

        {loading ? <SkeletonTable rows={10} cols={6} /> : (
          <div className="divide-y divide-gray-50">
            {data.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No users found</div>
            ) : data.map(u => (
              <div key={u.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-gray-50 text-xs items-center">
                <div className="col-span-3 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{u.full_name || '—'}</p>
                  <p className="text-gray-400 truncate">{u.email}</p>
                </div>
                <div className="col-span-2 text-gray-600">{u.plans?.name || 'Free'}</div>
                <div className="col-span-1"><StatusBadge status={u.account_status} /></div>
                <div className="col-span-1 text-right text-gray-700 font-mono">{(u.user_credit_balance?.balance ?? 0).toLocaleString()}</div>
                <div className="col-span-1 text-right text-gray-500">—</div>
                <div className="col-span-2 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</div>
                <div className="col-span-2 flex items-center gap-1">
                  <Link href={`/users/${u.id}`}><a className="text-indigo-600 hover:underline text-[11px]">View</a></Link>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => { setConfirmSuspend(u); setSuspendReason(''); }} className="text-[11px] text-amber-600 hover:underline">
                    {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => { setCreditsModal(u); setCreditAmount(100); setCreditReason(''); setCreditType('add'); }} className="text-[11px] text-green-600 hover:underline">Credits</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Suspend confirm */}
      {confirmSuspend && (
        <Dialog open onOpenChange={() => setConfirmSuspend(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{confirmSuspend.is_suspended ? 'Unsuspend User' : 'Suspend User'}</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-600">{confirmSuspend.email}</p>
            {!confirmSuspend.is_suspended && (
              <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension..." className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none h-20 focus:ring-1 focus:ring-indigo-500 outline-none" />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmSuspend(null)}>Cancel</Button>
              <Button variant={confirmSuspend.is_suspended ? 'default' : 'destructive'} onClick={handleSuspend} disabled={working}>
                {confirmSuspend.is_suspended ? 'Unsuspend' : 'Suspend'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Credits modal */}
      {creditsModal && (
        <Dialog open onOpenChange={() => setCreditsModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Manage Credits</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-600">{creditsModal.email}</p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setCreditType('add')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium border ${creditType === 'add' ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200 text-gray-600'}`}>Add Credits</button>
                <button onClick={() => setCreditType('deduct')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium border ${creditType === 'deduct' ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-200 text-gray-600'}`}>Deduct Credits</button>
              </div>
              <input type="number" value={creditAmount} onChange={e => setCreditAmount(Number(e.target.value))} min={1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
              <input value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Reason..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreditsModal(null)}>Cancel</Button>
              <Button onClick={handleCredits} disabled={working}>{creditType === 'add' ? 'Add' : 'Deduct'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
