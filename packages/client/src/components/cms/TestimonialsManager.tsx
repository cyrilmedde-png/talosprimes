'use client';

import { useState } from 'react';
import type { Testimonial } from './types';

interface Props {
  testimonials: Testimonial[];
  setTestimonials: (t: Testimonial[]) => void;
  api: {
    createTestimonial: (data: Partial<Testimonial>) => Promise<{ data?: Testimonial }>;
    updateTestimonial: (id: string, data: Partial<Testimonial>) => Promise<unknown>;
    deleteTestimonial: (id: string) => Promise<unknown>;
  };
  showToast: (type: 'success' | 'error', message: string) => void;
  refreshPreview: () => void;
}

const defaultForm = { nom: '', prenom: '', entreprise: '', poste: '', note: 5, commentaire: '', affiche: true, ordre: 0 };

export function TestimonialsManager({ testimonials, setTestimonials, api, showToast, refreshPreview }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const startEdit = (t: Testimonial) => {
    setEditingId(t.id);
    setForm({ nom: t.nom, prenom: t.prenom, entreprise: t.entreprise || '', poste: t.poste || '', note: t.note, commentaire: t.commentaire, affiche: t.affiche, ordre: t.ordre });
    setShowNew(false);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await api.createTestimonial(form);
      if (res.data) setTestimonials([...testimonials, res.data]);
      setShowNew(false);
      setForm(defaultForm);
      showToast('success', 'Témoignage créé');
      refreshPreview();
    } catch { showToast('error', 'Erreur'); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await api.updateTestimonial(editingId, form);
      setTestimonials(testimonials.map(t => t.id === editingId ? { ...t, ...form } : t));
      setEditingId(null);
      showToast('success', 'Mis à jour');
      refreshPreview();
    } catch { showToast('error', 'Erreur'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ?')) return;
    try {
      await api.deleteTestimonial(id);
      setTestimonials(testimonials.filter(t => t.id !== id));
      showToast('success', 'Supprimé');
      refreshPreview();
    } catch { showToast('error', 'Erreur'); }
  };

  const isFormOpen = showNew || editingId;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Témoignages</h2>
          <p className="text-sm text-slate-500">{testimonials.length} avis clients</p>
        </div>
        <button onClick={() => { setShowNew(true); setEditingId(null); setForm(defaultForm); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-600/20">
          + Nouveau
        </button>
      </div>

      <div className={`${isFormOpen ? 'grid grid-cols-2 gap-6' : ''}`}>
        <div className="space-y-2">
          {testimonials.map((t) => (
            <div key={t.id} onClick={() => startEdit(t)} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${editingId === t.id ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {t.prenom[0]}{t.nom[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{t.prenom} {t.nom}</div>
                <div className="text-xs text-slate-500">{t.entreprise} {t.poste && `• ${t.poste}`}</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">&quot;{t.commentaire}&quot;</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-xs text-amber-400">{'★'.repeat(t.note)}{'☆'.repeat(5 - t.note)}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.affiche ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  {t.affiche ? 'Visible' : 'Masqué'}
                </span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs">🗑️</button>
            </div>
          ))}
        </div>

        {isFormOpen && (
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-700 space-y-3">
            <h3 className="text-base font-semibold text-white">{showNew ? 'Nouveau témoignage' : 'Modifier'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Prénom" className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none" />
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom" className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none" />
              <input value={form.entreprise} onChange={(e) => setForm({ ...form, entreprise: e.target.value })} placeholder="Entreprise" className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none" />
              <input value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} placeholder="Poste" className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Note</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setForm({ ...form, note: n })} className={`text-lg ${n <= form.note ? 'text-amber-400' : 'text-slate-600'}`}>★</button>
                ))}
              </div>
            </div>
            <textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} rows={4} placeholder="Commentaire..." className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none resize-none" />
            <div className="flex items-center gap-3">
              <button onClick={() => setForm({ ...form, affiche: !form.affiche })} className={`w-10 h-5 rounded-full transition ${form.affiche ? 'bg-blue-600' : 'bg-slate-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${form.affiche ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-slate-400">{form.affiche ? 'Visible' : 'Masqué'}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={showNew ? handleCreate : handleUpdate} disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition disabled:opacity-50">
                {saving ? '⏳' : '💾'} {showNew ? 'Créer' : 'Sauvegarder'}
              </button>
              <button onClick={() => { setShowNew(false); setEditingId(null); }} className="px-4 py-2 text-sm text-slate-400">Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
