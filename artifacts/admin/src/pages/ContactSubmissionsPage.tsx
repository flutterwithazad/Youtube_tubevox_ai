import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, Trash2, ChevronDown, ChevronUp, Inbox } from 'lucide-react';

interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
  is_read: boolean;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ContactSubmissionsPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get('/admin/contact-submissions');
      setItems(d.submissions ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleExpand = async (item: Submission) => {
    const next = expanded === item.id ? null : item.id;
    setExpanded(next);
    if (next && !item.is_read) {
      try {
        await api.patch(`/admin/contact-submissions/${item.id}`, { is_read: true });
        setItems(prev => prev.map(s => s.id === item.id ? { ...s, is_read: true } : s));
      } catch {}
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/admin/contact-submissions/${id}`);
      setItems(prev => prev.filter(s => s.id !== id));
      if (expanded === id) setExpanded(null);
      toast.success('Deleted');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const unread = items.filter(s => !s.is_read).length;

  return (
    <AdminLayout title="Contact Submissions">
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">Messages sent through the public contact form.</p>
          {unread > 0 && (
            <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
              {unread} unread
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white border border-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No contact submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className={`bg-white border rounded-xl overflow-hidden transition-colors ${
                  !item.is_read ? 'border-indigo-300' : 'border-[#E5E7EB]'
                }`}
              >
                {/* Row */}
                <div
                  className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleExpand(item)}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center">
                      <Mail className="w-4 h-4 text-indigo-500" />
                    </div>
                    {!item.is_read && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-sm ${!item.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-400 truncate">{item.email}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {item.subject || item.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{timeAgo(item.created_at)}</span>
                    {expanded === item.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </div>

                {/* Expanded body */}
                {expanded === item.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    {item.subject && (
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        Subject: <span className="text-gray-700 font-normal">{item.subject}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-3">
                      <a
                        href={`mailto:${item.email}?subject=Re: ${item.subject ?? 'Your message'}`}
                        className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                      >
                        Reply via email
                      </a>
                      {confirmId === item.id ? (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                          <span className="text-xs text-red-700 font-medium">Delete this message?</span>
                          <button
                            onClick={() => handleDeleteConfirm(item.id)}
                            disabled={deletingId === item.id}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
                          >
                            {deletingId === item.id ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(item.id)}
                          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
