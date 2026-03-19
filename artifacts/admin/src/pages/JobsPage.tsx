import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SkeletonTable } from '@/components/admin/SkeletonTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

export default function JobsPage() {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [confirm, setConfirm] = useState<{ job: any; action: 'kill' | 'retry' } | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/jobs?${new URLSearchParams({ page: String(page), search, status, type })}`).then(d => { setData(d.data ?? []); setCount(d.count ?? 0); }).finally(() => setLoading(false));
  }, [page, search, status, type]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!confirm) return;
    setWorking(true);
    try {
      await api.post(`/admin/jobs/${confirm.job.id}/${confirm.action}`);
      toast.success(confirm.action === 'kill' ? 'Job cancelled' : 'Job queued for retry');
      setConfirm(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  const totalPages = Math.ceil(count / 25);

  return (
    <AdminLayout title="Jobs">
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search title or video ID..." className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none" />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="all">All Status</option>
            {['queued', 'running', 'completed', 'failed', 'cancelled', 'paused'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="all">All Types</option>
            {['single_video', 'bulk', 'scheduled', 'channel'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{count} total</span>
        </div>

        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Video</div><div className="col-span-2">User</div><div className="col-span-1">Type</div><div className="col-span-1">Status</div><div className="col-span-1 text-right">Comments</div><div className="col-span-1 text-right">Credits</div><div className="col-span-2">Created</div><div className="col-span-1">Actions</div>
        </div>

        {loading ? <SkeletonTable rows={10} cols={7} /> : (
          <div className="divide-y divide-gray-50">
            {data.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No jobs found</div> : data.map(j => (
              <div key={j.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-gray-50 text-xs items-center">
                <div className="col-span-3 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{j.video_title || 'Untitled'}</p>
                  <p className="text-gray-400 font-mono">{j.video_id}</p>
                </div>
                <div className="col-span-2 text-gray-500 truncate">{j.profiles?.email}</div>
                <div className="col-span-1"><StatusBadge status={j.job_type} /></div>
                <div className="col-span-1"><StatusBadge status={j.status} /></div>
                <div className="col-span-1 text-right text-gray-600">{j.downloaded_comments}/{j.requested_comments}</div>
                <div className="col-span-1 text-right text-gray-600">{j.credits_used}</div>
                <div className="col-span-2 text-gray-400">{new Date(j.created_at).toLocaleDateString()}</div>
                <div className="col-span-1 flex gap-1">
                  <Link href={`/jobs/${j.id}`}><a className="text-indigo-600 hover:underline text-[11px]">View</a></Link>
                  {(j.status === 'running' || j.status === 'queued') && <button onClick={() => setConfirm({ job: j, action: 'kill' })} className="text-red-600 hover:underline text-[11px]">Kill</button>}
                  {j.status === 'failed' && <button onClick={() => setConfirm({ job: j, action: 'retry' })} className="text-amber-600 hover:underline text-[11px]">Retry</button>}
                </div>
              </div>
            ))}
          </div>
        )}

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

      {confirm && (
        <ConfirmDialog
          open title={confirm.action === 'kill' ? 'Kill Job?' : 'Retry Job?'}
          description={`${confirm.action === 'kill' ? 'Cancel this job and refund reserved credits.' : 'Queue this job for retry.'}\n\nJob: ${confirm.job.video_title || confirm.job.id}`}
          confirmLabel={confirm.action === 'kill' ? 'Kill Job' : 'Retry'}
          danger={confirm.action === 'kill'}
          onConfirm={handleAction} onCancel={() => setConfirm(null)} loading={working}
        />
      )}
    </AdminLayout>
  );
}
