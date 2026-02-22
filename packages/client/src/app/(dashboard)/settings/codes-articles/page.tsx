'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient, ArticleCode } from '@/lib/api-client';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  TagIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface FormData {
  code: string;
  designation: string;
  prixUnitaireHt: string;
  tvaTaux: string;
  unite: string;
}

const emptyForm: FormData = {
  code: '',
  designation: '',
  prixUnitaireHt: '',
  tvaTaux: '20',
  unite: '',
};

export default function CodesArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.articleCodes.list();
      if (response.success && response.data) {
        setArticles(response.data.articles || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(errorMessage);
      if (errorMessage.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.designation.trim()) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        code: form.code.trim(),
        designation: form.designation.trim(),
        prixUnitaireHt: form.prixUnitaireHt ? parseFloat(form.prixUnitaireHt) : null,
        tvaTaux: form.tvaTaux ? parseFloat(form.tvaTaux) : null,
        unite: form.unite.trim() || null,
      };

      if (editingId) {
        await apiClient.articleCodes.update(editingId, payload);
      } else {
        await apiClient.articleCodes.create(payload);
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (article: ArticleCode) => {
    setEditingId(article.id);
    setForm({
      code: article.code,
      designation: article.designation,
      prixUnitaireHt: article.prixUnitaireHt?.toString() || '',
      tvaTaux: article.tvaTaux?.toString() || '20',
      unite: article.unite || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await apiClient.articleCodes.delete(id);
      setConfirmDelete(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = articles.filter((a) => a.actif).length;

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement des codes articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Codes Articles</h1>
          <p className="mt-2 text-sm text-gray-400">
            Gérez votre catalogue d&apos;articles et codes produits
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm(emptyForm);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Nouveau code article
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-400 hover:text-red-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Total articles</h3>
            <TagIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{articles.length}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Actifs</h3>
            <CheckIcon className="h-6 w-6 text-green-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{activeCount}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Inactifs</h3>
            <XMarkIcon className="h-6 w-6 text-red-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{articles.length - activeCount}</p>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="mb-6 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Modifier le code article' : 'Nouveau code article'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="ex: ART-001"
                required
              />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Désignation *</label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Description de l'article"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Prix unitaire HT</label>
              <input
                type="number"
                step="0.01"
                value={form.prixUnitaireHt}
                onChange={(e) => setForm({ ...form, prixUnitaireHt: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">TVA (%)</label>
              <input
                type="number"
                step="0.01"
                value={form.tvaTaux}
                onChange={(e) => setForm({ ...form, tvaTaux: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Unité</label>
              <input
                type="text"
                value={form.unite}
                onChange={(e) => setForm({ ...form, unite: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="ex: pièce, heure, kg"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
              >
                {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recherche */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Rechercher par code ou désignation..."
        />
      </div>

      {/* Confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Confirmer la suppression</h3>
            <p className="text-gray-300 mb-6">
              Voulez-vous vraiment supprimer ce code article ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md overflow-hidden">
        <div className="p-6 border-b border-gray-700/30">
          <h2 className="text-xl font-bold text-white">
            Catalogue ({filteredArticles.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700/30">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Désignation</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Prix HT</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">TVA</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Unité</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Statut</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {filteredArticles.length > 0 ? (
                filteredArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-medium text-indigo-300">{article.code}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">{article.designation}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">
                      {article.prixUnitaireHt != null
                        ? `${Number(article.prixUnitaireHt).toFixed(2)} €`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">
                      {article.tvaTaux != null ? `${article.tvaTaux}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{article.unite || '—'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full border text-xs font-medium ${
                          article.actif
                            ? 'bg-green-900/30 text-green-300 border-green-700/30'
                            : 'bg-red-900/30 text-red-300 border-red-700/30'
                        }`}
                      >
                        {article.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(article)}
                          className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded transition-colors"
                          title="Modifier"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(article.id)}
                          className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded transition-colors"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    {searchTerm ? 'Aucun article trouvé pour cette recherche' : 'Aucun code article enregistré'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
