import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SkeletonTable } from '@/components/admin/SkeletonTable';
import { api } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogPage() {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adminId, setAdminId] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [admins, setAdmins] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { api.get('/admin/audit-log/admins').then(d => setAdmins(d.data ?? [])); }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/audit-log?${new URLSearchParams({ page: String(page), search, adminId, targetType })}`).then(d => { setData(d.data ?? []); setCount(d.count ?? 0); }).finally(() => setLoading(false));
  }, [page, search, adminId, targetType]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(count / 25);

  return (
    <AdminLayout title="Audit Log">
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search action..." className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none" />
          </div>
          <select value={adminId} onChange={e => { setAdminId(e.target.value); setPage(1); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="">All Admins</option>
            {admins.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
          <select value={targetType} onChange={e => { setTargetType(e.target.value); setPage(1); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="all">All Types</option>
            {['user', 'job', 'payment', 'settings', 'announcement', 'ip', 'api_key', 'admin'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{count} entries</span>
        </div>

        <div className="grid grid-cols-10 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">Admin</div><div className="col-span-2">Action</div><div className="col-span-2">Target</div><div className="col-span-2">IP</div><div className="col-span-1">Time</div><div className="col-span-1">Details</div>
        </div>

        {loading ? <SkeletonTable rows={10} cols={6} /> : (
          <div className="divide-y divide-gray-50">
            {data.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No audit log entries</div> : data.map(log => (
              <>
                <div key={log.id} className="grid grid-cols-10 gap-2 px-4 py-2.5 hover:bg-gray-50 text-xs items-center">
                  <div className="col-span-2">
                    <p className="font-medium text-gray-800">{log.admin_users?.full_name || 'System'}</p>
                    <p className="text-gray-400 text-[10px]">{log.admin_users?.email}</p>
                  </div>
                  <div className="col-span-2"><code className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-mono">{log.action}</code></div>
                  <div className="col-span-2 text-gray-500">
                    {log.target_type && <p>{log.target_type}</p>}
                    {log.target_id && <p className="font-mono text-[10px] text-gray-400 truncate">{log.target_id}</p>}
                  </div>
                  <div className="col-span-2 text-gray-400 font-mono text-[10px]">{log.ip_address || '—'}</div>
                  <div className="col-span-1 text-gray-400 text-[10px]">{new Date(log.created_at).toLocaleString()}</div>
                  <div className="col-span-1">
                    {(log.before_value || log.after_value) && Object.keys({ ...(log.before_value ?? {}), ...(log.after_value ?? {}) }).length > 0 && (
                      <button onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="text-indigo-600 hover:underline text-[11px]">
                        {expanded === log.id ? 'Hide' : 'Details'}
                      </button>
                    )}
                  </div>
                </div>
                {expanded === log.id && (
                  <div key={`${log.id}-exp`} className="px-4 py-3 bg-gray-50 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-red-600 mb-1">BEFORE</p>
                      <pre className="text-[10px] font-mono text-gray-600 bg-red-50 rounded p-2 overflow-auto max-h-32">{JSON.stringify(log.before_value, null, 2)}</pre>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-green-600 mb-1">AFTER</p>
                      <pre className="text-[10px] font-mono text-gray-600 bg-green-50 rounded p-2 overflow-auto max-h-32">{JSON.stringify(log.after_value, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </>
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
    </AdminLayout>
  );
}
