'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

// Types
interface KnowledgeEntry {
  id: string;
  tenantId: string;
  categorie: string;
  titre: string;
  contenu: string;
  motsCles: string | null;
  actif: boolean;
  ordre: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: 'faq', label: 'FAQ', color: 'bg-blue-900/30 text-blue-300 border-blue-700/30' },
  { value: 'info_entreprise', label: 'Info Entreprise', color: 'bg-purple-900/30 text-purple-300 border-purple-700/30' },
  { value: 'services', label: 'Services', color: 'bg-green-900/30 text-green-300 border-green-700/30' },
  { value: 'tarifs', label: 'Tarifs', color: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/30' },
  { value: 'politiques', label: 'Politiques', color: 'bg-red-900/30 text-red-300 border-red-700/30' },
  { value: 'actions', label: 'Actions', color: 'bg-indigo-900/30 text-indigo-300 border-indigo-700/30' },
  { value: 'autre', label: 'Autre', color: 'bg-gray-900/30 text-gray-300 border-gray-700/30' },
];

const getCategoryBadge = (cat: string) => {
  const found = CATEGORIES.find((c) => c.value === cat);
  return found || { value: cat, label: cat, color: 'bg-gray-900/30 text-gray-300 border-gray-700/30' };
};

export default function BaseConnaissancesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtres
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [formData, setFormData] = useState({
    titre: '',
    contenu: '',
    categorie: 'faq',
    motsCles: '',
    actif: true,
    ordre: 0,
  });
  const [saving, setSaving] = useState(false);

  // Confirmation suppression
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterCategorie, filterSearch]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (filterCategorie) params.categorie = filterCategorie;
      if (filterSearch) params.search = filterSearch;

      const res = await apiClient.agentKnowledge.list(params);
      if (res.success && res.data) {
        setEntries((res.data.entries || []) as KnowledgeEntry[]);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingEntry(null);
    setFormData({ titre: '', contenu: '', categorie: 'faq', motsCles: '', actif: true, ordre: 0 });
    setShowModal(true);
  };

  const openEditModal = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setFormData({
      titre: entry.titre,
      contenu: entry.contenu,
      categorie: entry.categorie,
      motsCles: entry.motsCles || '',
      actif: entry.actif,
      ordre: entry.ordre,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (editingEntry) {
        await apiClient.agentKnowledge.update(editingEntry.id, {
          ...formData,
          motsCles: formData.motsCles || null,
        });
      } else {
        await apiClient.agentKnowledge.create({
          ...formData,
          motsCles: formData.motsCles || null,
        });
      }

      setShowModal(false);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await apiClient.agentKnowledge.delete(id);
      setDeleteConfirm(null);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleToggleActif = async (entry: KnowledgeEntry) => {
    try {
      setError(null);
      await apiClient.agentKnowledge.update(entry.id, { actif: !entry.actif });
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleSearch = () => {
    setPage(1);
    setFilterSearch(searchInput);
  };

  if (loading && entries.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpenIcon className="h-8 w-8 text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Base de Connaissances</h1>
            <p className="text-gray-400 text-sm">Informations utilisées par l&apos;agent téléphonique IA</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Ajouter
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
          <button onClick={() => setError(null)} className="float-right text-red-400 hover:text-red-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="mb-6 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">Rechercher</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Titre, contenu, mots-clés..."
                className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSearch}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Catégorie</label>
            <select
              value={filterCategorie}
              onChange={(e) => { setFilterCategorie(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Toutes</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md overflow-hidden">
        <div className="p-4 border-b border-gray-700/30 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Entrées ({total})</h2>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <BookOpenIcon className="h-12 w-12 mx-auto mb-3 text-gray-600" />
            <p>Aucune entrée trouvée</p>
            <button onClick={openCreateModal} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">
              Créer la première entrée
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/50 border-b border-gray-700/30">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Titre</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Catégorie</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Mots-clés</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Actif</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Ordre</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {entries.map((entry) => {
                  const catBadge = getCategoryBadge(entry.categorie);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{entry.titre}</div>
                        <div className="text-xs text-gray-400 mt-1 line-clamp-1">{entry.contenu.substring(0, 80)}{entry.contenu.length > 80 ? '...' : ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full border text-xs font-medium ${catBadge.color}`}>
                          {catBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {entry.motsCles || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActif(entry)}
                          className={`w-10 h-5 rounded-full relative transition-colors ${entry.actif ? 'bg-green-600' : 'bg-gray-600'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${entry.actif ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-300">{entry.ordre}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(entry)}
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                            title="Modifier"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {deleteConfirm === entry.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                              >
                                Oui
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(entry.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Supprimer"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-700/30 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Page {page} / {totalPages} — {total} entrées
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Création / Édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700/50 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700/30 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Titre *</label>
                <input
                  type="text"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  placeholder="Ex: Quels sont vos horaires ?"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Catégorie</label>
                <select
                  value={formData.categorie}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Contenu */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contenu *</label>
                <textarea
                  value={formData.contenu}
                  onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                  placeholder="Réponse détaillée que l'agent pourra utiliser..."
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>

              {/* Mots-clés */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Mots-clés</label>
                <input
                  type="text"
                  value={formData.motsCles}
                  onChange={(e) => setFormData({ ...formData, motsCles: e.target.value })}
                  placeholder="horaires, ouverture, disponibilité (séparés par virgule)"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Aide l&apos;agent à trouver cette entrée plus facilement</p>
              </div>

              {/* Ordre + Actif */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Ordre</label>
                  <input
                    type="number"
                    value={formData.ordre}
                    onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, actif: !formData.actif })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${formData.actif ? 'bg-green-600' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.actif ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <span className="text-sm text-gray-300">{formData.actif ? 'Actif' : 'Inactif'}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700/30 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.titre || !formData.contenu}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                {saving ? 'Enregistrement...' : editingEntry ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
