import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SkeletonTable } from '@/components/admin/SkeletonTable';
import { api } from '@/lib/api';
import { DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function PaymentsPage() {
  const [tab, setTab] = useState('purchases');
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get(`/admin/payments?${new URLSearchParams({ page: String(page), tab })}`).then(d => {
      setData(d.data ?? []); setCount(d.count ?? 0);
      if (d.stats) setStats(d.stats);
      if (d.chart) setChartData(d.chart);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, tab]);

  const handleRefund = async (purchaseId: string, amount: string) => {
    if (!confirm(`Issue refund for $${amount}?`)) return;
    try {
      await api.post(`/admin/payments/${purchaseId}/refund`);
      toast.success('Refund issued');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const totalPages = Math.ceil(count / 25);

  return (
    <AdminLayout title="Payments">
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="All-time Revenue" value={`$${(stats.totalRevenue ?? 0).toFixed(2)}`} icon={DollarSign} color="green" />
          <StatCard label="This Month" value={`$${(stats.monthlyRevenue ?? 0).toFixed(2)}`} icon={DollarSign} color="indigo" />
          <StatCard label="Failed Payments" value={stats.failedCount ?? 0} color="red" />
          <StatCard label="Refunds Issued" value={stats.refundCount ?? 0} color="amber" />
        </div>
      )}
      {chartData.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Daily Revenue (Last 30 Days)</h3>
          <div className="h-32 flex items-end gap-1.5">
            {chartData.map((d: any) => {
              const max = Math.max(...chartData.map(x => x.revenue || 0), 10);
              const height = ((d.revenue || 0) / max) * 100;
              return (
                <div key={d.purchase_date} className="flex-1 group relative">
                  <div 
                    className="w-full bg-indigo-100 group-hover:bg-indigo-500 transition-colors rounded-t-sm" 
                    style={{ height: `${Math.max(4, height)}%` }} 
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap">
                      ${d.revenue} ({d.successful} sales)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
             <span>{new Date(chartData[chartData.length - 1].purchase_date).toLocaleDateString()}</span>
             <span>{new Date(chartData[0].purchase_date).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="flex gap-1 p-3 border-b border-gray-100">
          {['purchases', 'transactions'].map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }} className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{t}</button>
          ))}
        </div>

        {tab === 'purchases' && (
          <>
            <div className="grid grid-cols-10 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">User</div><div className="col-span-2">Package</div><div className="col-span-1 text-right">Credits</div><div className="col-span-1 text-right">Price</div><div className="col-span-1">Provider</div><div className="col-span-1">Status</div><div className="col-span-1">Date</div><div className="col-span-1">Action</div>
            </div>
            {loading ? <SkeletonTable rows={10} cols={6} /> : (
              <div className="divide-y divide-gray-50">
                {data.map((p: any) => (
                  <div key={p.id} className="grid grid-cols-10 gap-2 px-4 py-2.5 hover:bg-gray-50 text-xs items-center">
                    <div className="col-span-2 truncate"><Link href={`/users/${p.user_id}`}><a className="text-indigo-600 hover:underline truncate">{p.profiles?.email}</a></Link></div>
                    <div className="col-span-2 text-gray-700">{p.credit_packages?.name}</div>
                    <div className="col-span-1 text-right">{p.credits_total?.toLocaleString()}</div>
                    <div className="col-span-1 text-right font-semibold">${p.price_paid}</div>
                    <div className="col-span-1"><StatusBadge status={p.payment_provider} /></div>
                    <div className="col-span-1"><StatusBadge status={p.payment_status} /></div>
                    <div className="col-span-1 text-gray-400">{new Date(p.created_at).toLocaleDateString()}</div>
                    <div className="col-span-1">
                      {p.payment_status === 'completed' && (
                        <button onClick={() => handleRefund(p.id, p.price_paid)} className="text-red-600 hover:underline text-[11px]">Refund</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'transactions' && (
          <>
            <div className="grid grid-cols-8 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">User</div><div className="col-span-2">Event</div><div className="col-span-1">Provider</div><div className="col-span-1 text-right">Amount</div><div className="col-span-1">Status</div><div className="col-span-1">Date</div>
            </div>
            {loading ? <SkeletonTable rows={10} cols={6} /> : (
              <div className="divide-y divide-gray-50">
                {data.map((t: any) => (
                  <>
                    <div key={t.id} className="grid grid-cols-8 gap-2 px-4 py-2.5 hover:bg-gray-50 text-xs items-center cursor-pointer" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                      <div className="col-span-2 truncate text-indigo-600">{t.profiles?.email}</div>
                      <div className="col-span-2 font-mono text-gray-700">{t.event_type}</div>
                      <div className="col-span-1"><StatusBadge status={t.provider} /></div>
                      <div className="col-span-1 text-right font-semibold">${t.amount}</div>
                      <div className="col-span-1"><StatusBadge status={t.status} /></div>
                      <div className="col-span-1 text-gray-400">{new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                    {expanded === t.id && (
                      <div className="px-4 py-3 bg-gray-50 text-xs">
                        <pre className="font-mono text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">{JSON.stringify(t.raw_payload, null, 2)}</pre>
                      </div>
                    )}
                  </>
                ))}
              </div>
            )}
          </>
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
