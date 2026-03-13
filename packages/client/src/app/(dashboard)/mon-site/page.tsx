'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Loader,
  ExternalLink,
  Sparkles,
  Layout,
  Link2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Types ───
interface Section {
  id: string;
  type: string;
  titre: string | null;
  config: Record<string, unknown>;
  ordre: number;
  actif: boolean;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface TenantInfo {
  id: string;
  slug: string | null;
  nomEntreprise: string;
}

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero (Bannière principale)', icon: '🏠' },
  { value: 'stats', label: 'Statistiques', icon: '📊' },
  { value: 'modules', label: 'Nos services / Modules', icon: '📦' },
  { value: 'agent_ia', label: 'Agent IA', icon: '🤖' },
  { value: 'how_it_works', label: 'Comment ça marche', icon: '🔄' },
  { value: 'testimonials', label: 'Témoignages', icon: '💬' },
  { value: 'contact', label: 'Contact', icon: '📧' },
  { value: 'cta', label: 'Appel à action (CTA)', icon: '🚀' },
  { value: 'trust_badges', label: 'Badges de confiance', icon: '✅' },
  { value: 'custom_html', label: 'HTML personnalisé', icon: '🔧' },
  { value: 'dashboard_showcase', label: 'Vitrine Dashboard', icon: '💻' },
];

// ─── Helpers ───
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || localStorage.getItem('token');
};

const fetchApi = async <T = { success: boolean; data: unknown }>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  const response = await fetch(`${API}${url}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur API' }));
    throw new Error(error.message || `Erreur ${response.status}`);
  }
  return response.json();
};

// ─── Component ───
export default function MonSitePage() {
  const { isAuthenticated } = useAuthStore();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);

  // Tenant info
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);

  // Sections
  const [sections, setSections] = useState<Section[]>([]);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionType, setNewSectionType] = useState('hero');
  const [newSectionTitre, setNewSectionTitre] = useState('');

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ─── Fetch data ───
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [infoRes, sectionsRes] = await Promise.all([
        fetchApi<{ success: boolean; data: TenantInfo }>('/api/landing/my-site/info'),
        fetchApi<{ success: boolean; data: Section[] }>('/api/landing/my-site/sections'),
      ]);
      setTenantInfo(infoRes.data);
      setSlugInput(infoRes.data.slug || '');
      setSections(sectionsRes.data || []);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, fetchData]);

  // ─── Slug ───
  const saveSlug = async () => {
    if (!slugInput.trim()) return;
    setSavingSlug(true);
    try {
      const res = await fetchApi<{ success: boolean; data: TenantInfo }>('/api/landing/my-site/slug', {
        method: 'PUT',
        body: JSON.stringify({ slug: slugInput.trim().toLowerCase() }),
      });
      setTenantInfo(res.data);
      addToast('success', 'URL de votre site mise à jour !');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSavingSlug(false);
    }
  };

  // ─── Init default sections ───
  const initSections = async () => {
    try {
      const res = await fetchApi<{ success: boolean; data: Section[] }>('/api/landing/my-site/init', {
        method: 'POST',
      });
      setSections(res.data || []);
      addToast('success', 'Sections par défaut créées !');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erreur');
    }
  };

  // ─── Add section ───
  const addSection = async () => {
    try {
      const res = await fetchApi<{ success: boolean; data: Section }>('/api/landing/my-site/sections', {
        method: 'POST',
        body: JSON.stringify({ type: newSectionType, titre: newSectionTitre || null }),
      });
      setSections(prev => [...prev, res.data]);
      setShowAddSection(false);
      setNewSectionTitre('');
      addToast('success', 'Section ajoutée');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erreur');
    }
  };

  // ─── Toggle section actif ───
  const toggleSection = async (section: Section) => {
    try {
      await fetchApi(`/api/landing/my-site/sections/${section.id}`, {
        method: 'PUT',
        body: JSON.stringify({ actif: !section.actif }),
      });
      setSections(prev => prev.map(s => s.id === section.id ? { ...s, actif: !s.actif } : s));
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erreur');
    }
  };

  // ─── Delete section ───
  const deleteSection = async (id: string) => {
    if (!confirm('Supprimer cette section ?')) return;
    try {
      await fetchApi(`/api/landing/my-site/sections/${id}`, { method: 'DELETE' });
      setSections(prev => prev.filter(s => s.id !== id));
      addToast('success', 'Section supprimée');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erreur');
    }
  };

  // ─── Move section ───
  const moveSection = async (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

    const items = newSections.map((s, i) => ({ id: s.id, ordre: i }));
    setSections(newSections.map((s, i) => ({ ...s, ordre: i })));

    try {
      await fetchApi('/api/landing/my-site/sections/reorder', {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erreur');
      fetchData();
    }
  };

  // ─── Save section config ───
  const saveSectionConfig = async () => {
    if (!editingSection) return;
    try {
      await fetchApi(`/api/landing/my-site/sections/${editingSection.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          titre: editingSection.titre,
          config: editingSection.config,
        }),
      });
      setSections(prev => prev.map(s => s.id === editingSection.id ? editingSection : s));
      setEditingSection(null);
      addToast('success', 'Section mise à jour');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Connectez-vous pour accéder à votre site.</p>
      </div>
    );
  }

  const siteUrl = tenantInfo?.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/site/${tenantInfo.slug}`
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${t.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
            {t.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Globe className="w-7 h-7 text-blue-600" />
            Mon Site Web
          </h1>
          <p className="text-slate-500 mt-1">
            Personnalisez votre landing page publique
          </p>
        </div>
        {siteUrl && (
          <a href={siteUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <ExternalLink className="w-4 h-4" />
            Voir mon site
          </a>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* URL / Slug */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-blue-500" />
              Adresse de votre site
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 text-sm whitespace-nowrap">
                {typeof window !== 'undefined' ? window.location.origin : ''}/site/
              </span>
              <input
                type="text"
                value={slugInput}
                onChange={e => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="mon-entreprise"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                onClick={saveSlug}
                disabled={savingSlug || !slugInput.trim()}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingSlug ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
            {tenantInfo?.slug && (
              <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Votre site est accessible à <a href={siteUrl!} target="_blank" rel="noopener noreferrer" className="underline">{siteUrl}</a>
              </p>
            )}
          </div>

          {/* Sections */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Layout className="w-5 h-5 text-violet-500" />
                Sections de votre page
              </h2>
              <div className="flex gap-2">
                {sections.length === 0 && (
                  <button
                    onClick={initSections}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Initialiser avec les sections par défaut
                  </button>
                )}
                <button
                  onClick={() => setShowAddSection(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </button>
              </div>
            </div>

            {/* Add section modal */}
            {showAddSection && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Nouvelle section</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={newSectionType}
                    onChange={e => setNewSectionType(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    {SECTION_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newSectionTitre}
                    onChange={e => setNewSectionTitre(e.target.value)}
                    placeholder="Titre interne (optionnel)"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={addSection} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">
                      Ajouter
                    </button>
                    <button onClick={() => setShowAddSection(false)} className="px-4 py-2 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sections list */}
            {sections.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Layout className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucune section. Cliquez sur &quot;Initialiser&quot; pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sections.map((section, index) => {
                  const typeInfo = SECTION_TYPES.find(t => t.value === section.type);
                  return (
                    <div key={section.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${section.actif ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                    >
                      <span className="text-lg">{typeInfo?.icon || '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {section.titre || typeInfo?.label || section.type}
                        </p>
                        <p className="text-xs text-slate-400">{section.type}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveSection(index, 'up')} disabled={index === 0}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleSection(section)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400">
                          {section.actif ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setEditingSection({ ...section })}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400">
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button onClick={() => deleteSection(section.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section editor modal */}
          {editingSection && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Modifier : {editingSection.titre || editingSection.type}
                  </h3>
                  <button onClick={() => setEditingSection(null)} className="p-2 rounded-lg hover:bg-slate-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Titre interne</label>
                    <input
                      type="text"
                      value={editingSection.titre || ''}
                      onChange={e => setEditingSection({ ...editingSection, titre: e.target.value || null })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Configuration (JSON)
                    </label>
                    <textarea
                      value={JSON.stringify(editingSection.config, null, 2)}
                      onChange={e => {
                        try {
                          const config = JSON.parse(e.target.value);
                          setEditingSection({ ...editingSection, config });
                        } catch { /* invalid JSON, ignore */ }
                      }}
                      rows={12}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Modifiez le JSON pour personnaliser les textes, couleurs, contenus de cette section.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button onClick={() => setEditingSection(null)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                    Annuler
                  </button>
                  <button onClick={saveSectionConfig}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
