import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SkeletonTable } from '@/components/admin/SkeletonTable';
import { api } from '@/lib/api';
import { useParams, Link } from 'wouter';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsCount, setJobsCount] = useState(0);
  const [payments, setPayments] = useState<any>(null);
  const [spentByJob, setSpentByJob] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);
  const [spentPage, setSpentPage] = useState(0);
  const [receivedPage, setReceivedPage] = useState(0);
  const CREDITS_PER_PAGE = 10;
  const [sessions, setSessions] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [working, setWorking] = useState(false);

  const PAGE_SIZE = 25;

  useEffect(() => {
    api.get(`/admin/users/${id}`).then(setUser).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === 'jobs') api.get(`/admin/users/${id}/jobs?page=${jobsPage}`).then(d => { setJobs(d.data ?? []); setJobsCount(d.count ?? 0); });
    if (tab === 'payments') api.get(`/admin/users/${id}/payments`).then(setPayments);
    if (tab === 'credits') api.get(`/admin/users/${id}/credits`).then(d => { setSpentByJob(d.spentByJob ?? []); setReceived(d.received ?? []); setSpentPage(0); setReceivedPage(0); });
    if (tab === 'security') api.get(`/admin/users/${id}/sessions`).then(setSessions);
    if (tab === 'notifications') api.get(`/admin/users/${id}/notifications`).then(d => setNotifications(d.data ?? []));
  }, [tab, id, jobsPage]);

  const doAction = async (action: string, body?: any) => {
    setWorking(true);
    try {
      await api.post(`/admin/users/${id}/${action}`, body);

      // Optimistic state update so the button/badge flip immediately
      if (action === 'suspend') {
        setUser((u: any) => u ? { ...u, is_suspended: true, account_status: 'suspended', suspended_reason: body?.reason ?? null } : u);
        toast.success('User suspended');
      } else if (action === 'unsuspend') {
        setUser((u: any) => u ? { ...u, is_suspended: false, account_status: 'active', suspended_reason: null } : u);
        toast.success('User unsuspended');
      } else {
        toast.success('Done');
      }

      setModal(null);

      // Refresh from server to sync any other state changes
      try {
        const fresh = await api.get(`/admin/users/${id}`);
        setUser(fresh);
      } catch {
        // Refresh failed — optimistic state is still shown, that's fine
      }
    } catch (e: any) { toast.error(e.message); } finally { setWorking(false); }
  };

  if (loading) return <AdminLayout title="User Detail"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></AdminLayout>;
  if (!user) return <AdminLayout title="User Detail"><p>User not found</p></AdminLayout>;

  const tabs = ['profile', 'jobs', 'payments', 'credits', 'security', 'notifications'];

  return (
    <AdminLayout title={`User: ${user.email}`}>
      <Link href="/users"><a className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mb-4"><ArrowLeft className="w-3 h-3" />Back to Users</a></Link>

      {/* Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
              {(user.full_name || user.email)[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{user.full_name || '—'}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={user.account_status} />
            {user.is_suspended ? (
              <Button size="sm" onClick={() => doAction('unsuspend')}>Unsuspend</Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => setModal('suspend')}>Suspend</Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div><p className="text-xs text-gray-400">Credit Balance</p><p className="text-lg font-bold text-gray-900">{(user.user_credit_balance?.balance ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-gray-400">Plan</p><p className="text-lg font-bold text-gray-900">{user.plans?.name ?? 'Free'}</p></div>
          <div><p className="text-xs text-gray-400">Member since</p><p className="text-sm font-semibold text-gray-900">{new Date(user.created_at).toLocaleDateString()}</p></div>
          <div><p className="text-xs text-gray-400">Last login</p><p className="text-sm font-semibold text-gray-900">{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : '—'}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white border border-[#E5E7EB] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[['ID', user.id], ['Email', user.email], ['Full Name', user.full_name], ['Status', user.account_status], ['Timezone', user.timezone], ['Locale', user.locale], ['Created', new Date(user.created_at).toLocaleString()], ['Updated', new Date(user.updated_at).toLocaleString()]].map(([k, v]) => (
                <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-mono text-xs text-gray-700 break-all">{v || '—'}</p></div>
              ))}
            </div>
            {user.is_suspended && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                <p className="font-semibold text-red-700">Suspended</p>
                <p className="text-red-600 text-xs mt-1">{user.suspended_reason}</p>
                <p className="text-red-400 text-xs">{user.suspended_at ? new Date(user.suspended_at).toLocaleString() : ''}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setModal('editProfile')}>Edit Profile</Button>
              <Button size="sm" variant="outline" onClick={() => setModal('changePlan')}>Change Plan</Button>
              <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={() => { setForm({ type: 'add' }); setModal('credits'); }}>Add Credits</Button>
              <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={() => { setForm({ type: 'deduct' }); setModal('credits'); }}>Deduct Credits</Button>
            </div>
          </div>
        )}

        {tab === 'jobs' && (
          <div>
            <div className="grid grid-cols-7 gap-2 text-[10px] font-bold text-gray-400 uppercase pb-2 border-b border-gray-100">
              <div className="col-span-2">Title</div><div>Type</div><div>Status</div><div className="text-right">Comments</div><div className="text-right">Credits</div><div>Created</div>
            </div>
            {jobs.map(j => (
              <div key={j.id} className="grid grid-cols-7 gap-2 py-2 border-b border-gray-50 text-xs items-center">
                <div className="col-span-2 truncate font-medium">{j.video_title || 'Untitled'}</div>
                <div><StatusBadge status={j.job_type} /></div>
                <div><StatusBadge status={j.status} /></div>
                <div className="text-right text-gray-600">{j.downloaded_comments}/{j.requested_comments}</div>
                <div className="text-right text-gray-600">{j.credits_used}</div>
                <div className="text-gray-400">{new Date(j.created_at).toLocaleDateString()}</div>
              </div>
            ))}
            {jobs.length === 0 && <p className="text-sm text-gray-400 py-4">No jobs found</p>}
            {jobsCount > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
                <p className="text-xs text-gray-400">
                  {((jobsPage - 1) * PAGE_SIZE) + 1}–{Math.min(jobsPage * PAGE_SIZE, jobsCount)} of {jobsCount.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={jobsPage <= 1}
                    onClick={() => setJobsPage(p => p - 1)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs text-gray-500 font-medium">Page {jobsPage} of {Math.ceil(jobsCount / PAGE_SIZE)}</span>
                  <button
                    disabled={jobsPage >= Math.ceil(jobsCount / PAGE_SIZE)}
                    onClick={() => setJobsPage(p => p + 1)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'payments' && payments && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Purchases</h3>
              {(payments.purchases ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 text-xs">
                  <div><p className="font-medium">{p.credit_packages?.name}</p><p className="text-gray-400">{p.credits_total.toLocaleString()} credits · {p.payment_provider}</p></div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">${p.price_paid}</span>
                    <StatusBadge status={p.payment_status} />
                    {p.payment_status === 'completed' && <Button size="sm" variant="outline" className="text-xs h-6" onClick={async () => { if (confirm(`Refund $${p.price_paid}?`)) { await api.post(`/admin/payments/${p.id}/refund`); toast.success('Refunded'); api.get(`/admin/users/${id}/payments`).then(setPayments); } }}>Refund</Button>}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Transactions</h3>
              {(payments.transactions ?? []).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 text-xs">
                  <div><p className="font-mono">{t.event_type}</p><p className="text-gray-400">{t.provider}</p></div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">${t.amount}</span>
                    <StatusBadge status={t.status} />
                    <span className="text-gray-400">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'credits' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
              <div><p className="text-xs text-gray-400">Balance</p><p className="font-bold">{(user.user_credit_balance?.balance ?? 0).toLocaleString()}</p></div>
              <div><p className="text-xs text-gray-400">Total Added</p><p className="font-bold text-green-600">{received.reduce((s, c) => s + (c.amount ?? 0), 0).toLocaleString()}</p></div>
              <div><p className="text-xs text-gray-400">Total Spent</p><p className="font-bold text-red-600">{spentByJob.reduce((s, j) => s + (j.totalSpent ?? 0), 0).toLocaleString()}</p></div>
            </div>

            {/* Credits Spent — per video */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Credits Spent — Per Video</h3>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
                {spentByJob.length === 0 && (
                  <p className="text-xs text-gray-400 px-3 py-4">No credits spent yet.</p>
                )}
                {spentByJob.slice(spentPage * CREDITS_PER_PAGE, (spentPage + 1) * CREDITS_PER_PAGE).map((tx: any) => (
                  <div key={tx.jobId ?? tx.latestDate} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                    {tx.job?.thumbnail ? (
                      <img src={tx.job.thumbnail} alt="" className="w-12 h-9 object-cover rounded shrink-0 bg-gray-100" />
                    ) : (
                      <div className="w-12 h-9 bg-gray-100 rounded shrink-0 flex items-center justify-center text-gray-300 text-xs">▶</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{tx.job?.video_title ?? 'Unknown video'}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {(tx.job?.downloaded_comments ?? 0).toLocaleString()} comments · {new Date(tx.latestDate).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-red-600 block">-{tx.totalSpent.toLocaleString()}</span>
                      {tx.balanceAfter != null && (
                        <span className="text-[10px] text-gray-400 font-mono">bal: {tx.balanceAfter.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {spentByJob.length > CREDITS_PER_PAGE && (
                <div className="flex items-center justify-between pt-3">
                  <p className="text-xs text-gray-400">{spentPage * CREDITS_PER_PAGE + 1}–{Math.min((spentPage + 1) * CREDITS_PER_PAGE, spentByJob.length)} of {spentByJob.length}</p>
                  <div className="flex gap-2">
                    <button disabled={spentPage === 0} onClick={() => setSpentPage(p => p - 1)} className="text-xs px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
                    <button disabled={(spentPage + 1) * CREDITS_PER_PAGE >= spentByJob.length} onClick={() => setSpentPage(p => p + 1)} className="text-xs px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next →</button>
                  </div>
                </div>
              )}
            </div>

            {/* Credits Received */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Credits Received</h3>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
                {received.length === 0 && (
                  <p className="text-xs text-gray-400 px-3 py-4">No credits received yet.</p>
                )}
                {received.slice(receivedPage * CREDITS_PER_PAGE, (receivedPage + 1) * CREDITS_PER_PAGE).map((c: any) => {
                  const labelMap: Record<string, string> = {
                    purchase: 'Credit purchase',
                    admin_grant: 'Admin grant',
                    free_signup: 'Sign-up bonus',
                    signup_bonus: 'Sign-up bonus',
                    referral: 'Referral bonus',
                    refund: 'Refund',
                    plan_upgrade: 'Plan upgrade bonus',
                    adjustment: 'Manual adjustment',
                  };
                  const label = labelMap[c.source_type] || c.description || c.source_type?.replace(/_/g, ' ');
                  return (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-xs font-medium text-gray-800 capitalize">{label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-green-600 block">+{c.amount.toLocaleString()}</span>
                        {c.balance_after != null && (
                          <span className="text-[10px] text-gray-400 font-mono">bal: {c.balance_after.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {received.length > CREDITS_PER_PAGE && (
                <div className="flex items-center justify-between pt-3">
                  <p className="text-xs text-gray-400">{receivedPage * CREDITS_PER_PAGE + 1}–{Math.min((receivedPage + 1) * CREDITS_PER_PAGE, received.length)} of {received.length}</p>
                  <div className="flex gap-2">
                    <button disabled={receivedPage === 0} onClick={() => setReceivedPage(p => p - 1)} className="text-xs px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
                    <button disabled={(receivedPage + 1) * CREDITS_PER_PAGE >= received.length} onClick={() => setReceivedPage(p => p + 1)} className="text-xs px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'security' && sessions && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Active Sessions</h3>
                <Button size="sm" variant="destructive" onClick={() => doAction('force-logout')}>Force Logout All</Button>
              </div>
              {(sessions.sessions ?? []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 text-xs">
                  <div><p className="font-medium">{s.device_name || s.device_type || 'Unknown'} · {s.browser}</p><p className="text-gray-400">{s.ip_address} · {s.country}</p></div>
                  <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Login History</h3>
              {(sessions.loginHistory ?? []).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 text-xs">
                  <div><p className="font-medium">{l.login_method} · {l.ip_address}</p><p className="text-gray-400">{l.country} · {new Date(l.created_at).toLocaleString()}</p></div>
                  <StatusBadge status={l.success ? 'success' : 'failed'} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setModal('notify')}>Send Notification</Button>
            </div>
            {notifications.map(n => (
              <div key={n.id} className="flex items-start justify-between py-2 border-b border-gray-50 text-xs">
                <div><p className="font-medium">{n.title}</p><p className="text-gray-400">{n.body}</p></div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <StatusBadge status={n.is_read ? 'active' : 'pending'} />
                  <span className="text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'suspend' && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Suspend User</DialogTitle></DialogHeader>
            <textarea value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for suspension..." className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none h-24 focus:ring-1 focus:ring-indigo-500 outline-none" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => doAction('suspend', { reason: form.reason })} disabled={working}>Suspend</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {modal === 'credits' && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{form.type === 'add' ? 'Add Credits' : 'Deduct Credits'}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <input type="number" defaultValue={100} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Amount" />
              <input onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Reason" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={() => doAction('credits', { amount: form.amount || 100, reason: form.reason, type: form.type })} disabled={working}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {modal === 'notify' && (
        <Dialog open onOpenChange={() => setModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <input onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Title" />
              <textarea onChange={e => setForm({ ...form, body: e.target.value })} className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none h-20 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Body" />
              <select onChange={e => setForm({ ...form, channel: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
                <option value="in_app">In-App</option><option value="email">Email</option><option value="both">Both</option>
              </select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={() => doAction('notify', { ...form, type: 'job_complete' })} disabled={working}>Send</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
