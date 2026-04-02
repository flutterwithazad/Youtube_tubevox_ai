import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Globe, GripVertical } from 'lucide-react';

const ICON_KEYS = ['twitter', 'youtube', 'linkedin', 'instagram', 'facebook', 'github', 'tiktok'];

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon_key: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = { platform: '', url: '', icon_key: 'twitter', sort_order: 0 };

export default function SocialLinksPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SocialLink>>({});

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get('/admin/social-links');
      setLinks(d.links ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.platform || !form.url || !form.icon_key) {
      toast.error('Platform, URL, and icon key are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/social-links', form);
      toast.success('Social link added');
      setShowAdd(false);
      setForm(emptyForm);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/admin/social-links/${id}`);
      toast.success('Deleted');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (link: SocialLink) => {
    try {
      await api.patch(`/admin/social-links/${link.id}`, { is_active: !link.is_active });
      toast.success(link.is_active ? 'Hidden from footer' : 'Shown in footer');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const startEdit = (link: SocialLink) => {
    setEditId(link.id);
    setEditForm({ platform: link.platform, url: link.url, icon_key: link.icon_key, sort_order: link.sort_order });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await api.patch(`/admin/social-links/${id}`, editForm);
      toast.success('Saved');
      setEditId(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Social Links">
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Social links shown in the footer of the public website. Drag to reorder.
          </p>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add link
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-800">New social link</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Platform name</label>
                <input
                  value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  placeholder="e.g. Twitter/X"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Icon key</label>
                <select
                  value={form.icon_key}
                  onChange={e => setForm(f => ({ ...f, icon_key: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                >
                  {ICON_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">URL</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://twitter.com/yourhandle"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sort order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-1.5 text-gray-500 text-xs hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Links list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white border border-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center">
            <Globe className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No social links yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {links.map(link => (
              <div key={link.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                {editId === link.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Platform</label>
                        <input
                          value={editForm.platform ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, platform: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Icon</label>
                        <select
                          value={editForm.icon_key ?? 'twitter'}
                          onChange={e => setEditForm(f => ({ ...f, icon_key: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                        >
                          {ICON_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">URL</label>
                        <input
                          type="url"
                          value={editForm.url ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(link.id)}
                        disabled={saving}
                        className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditId(null)} className="px-3 py-1 text-gray-500 text-xs hover:text-gray-700">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-mono text-gray-500">{link.icon_key.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{link.platform}</p>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                        {link.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(link)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                          link.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {link.is_active ? 'Active' : 'Hidden'}
                      </button>
                      <button
                        onClick={() => startEdit(link)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 hover:bg-indigo-50 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        disabled={deletingId === link.id}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
