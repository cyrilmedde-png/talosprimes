'use client';

import { useState } from 'react';
import type { CMSPage } from './types';
import { RichTextEditor } from './RichTextEditor';

interface Props {
  pages: CMSPage[];
  setPages: (p: CMSPage[]) => void;
  api: {
    createPage: (data: Partial<CMSPage>) => Promise<{ data?: CMSPage }>;
    updatePage: (id: string, data: Partial<CMSPage>) => Promise<unknown>;
    deletePage: (id: string) => Promise<unknown>;
  };
  showToast: (type: 'success' | 'error', message: string) => void;
}

export function PagesManager({ pages, setPages, api, showToast }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ slug: '', titre: '', contenu: '', published: true });
  const [saving, setSaving] = useState(false);

  const editingPage = pages.find(p => p.id === editingId);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await api.createPage(form);
      if (res.data) setPages([...pages, res.data]);
      setShowNew(false);
      setForm({ slug: '', titre: '', contenu: '', published: true });
      showToast('success', 'Page créée');
    } catch {
      showToast('error', 'Erreur création');
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingPage) return;
    setSaving(true);
    try {
      await api.updatePage(editingPage.id, form);
      setPages(pages.map(p => p.id === editingPage.id ? { ...p, ...form } : p));
      setEditingId(null);
      showToast('success', 'Page mise à jour');
    } catch {
      showToast('error', 'Erreur mise à jour');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette page ?')) return;
    try {
      await api.deletePage(id);
      setPages(pages.filter(p => p.id !== id));
      showToast('success', 'Page supprimée');
    } catch {
      showToast('error', 'Erreur');
    }
  };

  const startEdit = (page: CMSPage) => {
    setEditingId(page.id);
    setForm({ slug: page.slug, titre: page.titre, contenu: page.contenu, published: page.published });
    setShowNew(false);
  };

  const isFormOpen = showNew || editingId;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Pages</h2>
          <p className="text-sm text-slate-500">Créez et gérez vos pages personnalisées</p>
        </div>
        <button
          onClick={() => { setShowNew(true); setEditingId(null); setForm({ slug: '', titre: '', contenu: '', published: true }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
        >
          + Nouvelle page
        </button>
      </div>

      <div className={`${isFormOpen ? 'grid grid-cols-2 gap-6' : ''}`}>
        {/* Pages list */}
        <div className="space-y-2">
          {pages.map((page) => (
            <div
              key={page.id}
              onClick={() => startEdit(page)}
              className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                editingId === page.id
                  ? 'bg-blue-600/10 border-blue-500/30'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0">📄</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{page.titre}</div>
                <div className="text-xs text-slate-500 font-mono">/page/{page.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${page.published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  {page.published ? 'Publié' : 'Brouillon'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(page.id); }}
                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-xs"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {pages.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-3">📄</div>
              <p>Aucune page. Créez-en une !</p>
            </div>
          )}
        </div>

        {/* Editor */}
        {isFormOpen && (
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-700 space-y-4">
            <h3 className="text-base font-semibold text-white">{showNew ? 'Nouvelle page' : 'Modifier la page'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Titre</label>
                <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Slug</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="mon-slug" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Contenu</label>
              <RichTextEditor
                content={form.contenu}
                onChange={(html) => setForm({ ...form, contenu: html })}
                placeholder="Commencez à rédiger votre page..."
                minHeight="350px"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm({ ...form, published: !form.published })}
                className={`w-10 h-5 rounded-full transition-colors ${form.published ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${form.published ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-slate-400">{form.published ? 'Publié' : 'Brouillon'}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={showNew ? handleCreate : handleUpdate}
                disabled={saving || !form.titre || !form.slug}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition disabled:opacity-50"
              >
                {saving ? '⏳' : '💾'} {showNew ? 'Créer' : 'Sauvegarder'}
              </button>
              <button onClick={() => { setShowNew(false); setEditingId(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
