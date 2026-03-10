'use client';

import { useEffect, useState, useRef } from 'react';
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
  ArrowUpTrayIcon,
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

export default function ArticlesPage() {
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

  // CSV Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    errors: Array<{ row: number; message: string }>;
    totalProcessed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // CSV Import handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);
      const lines = text.split('\n').filter((l) => l.trim());
      setCsvPreview(lines.slice(0, 6)); // header + 5 rows
      setImportResult(null);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (!csvContent.trim()) return;

    try {
      setImporting(true);
      setError(null);
      const result = await apiClient.articleCodes.import(csvContent);
      if (result.success && result.data) {
        setImportResult(result.data);
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImport = () => {
    setShowImportModal(false);
    setCsvContent('');
    setCsvPreview([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          <p className="mt-4 text-gray-300">Chargement des articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Articles</h1>
          <p className="mt-2 text-sm text-gray-400">
            G&eacute;rez votre catalogue d&apos;articles et codes produits
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Importer CSV
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setForm(emptyForm);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Nouveau article
          </button>
        </div>
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

      {/* Formulaire article */}
      {showForm && (
        <div className="mb-6 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Modifier l\'article' : 'Nouvel article'}
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
              <label className="block text-sm font-medium text-gray-300 mb-1">D&eacute;signation *</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Unit&eacute;</label>
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
                {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Cr&eacute;er'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Importer des articles (CSV)</h3>
              <button
                onClick={handleCloseImport}
                className="p-1 text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 text-sm text-gray-400">
              <p className="mb-2">Format attendu (s&eacute;parateur : <code className="text-indigo-300">;</code> ou <code className="text-indigo-300">,</code>) :</p>
              <code className="block bg-gray-900/50 p-2 rounded text-xs text-gray-300">
                code;designation;prixUnitaireHt;tvaTaux;unite<br />
                ART-001;Prestation standard;100.00;20;heure<br />
                ART-002;Maintenance mensuelle;250.00;20;forfait
              </code>
              <p className="mt-2 text-xs">
                Colonnes obligatoires : <strong className="text-white">code</strong>, <strong className="text-white">designation</strong>.
                Les articles existants (m&ecirc;me code) seront mis &agrave; jour.
              </p>
            </div>

            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer"
              />
            </div>

            {/* Preview */}
            {csvPreview.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Aper&ccedil;u ({csvPreview.length - 1} premi&egrave;res lignes) :</h4>
                <div className="bg-gray-900/50 rounded p-3 overflow-x-auto">
                  <table className="text-xs text-gray-300">
                    <tbody>
                      {csvPreview.map((line, i) => (
                        <tr key={i} className={i === 0 ? 'font-bold text-indigo-300' : ''}>
                          {line.split(/[;,]/).map((cell, j) => (
                            <td key={j} className="pr-4 py-0.5 whitespace-nowrap">{cell.trim()}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Result */}
            {importResult && (
              <div className="mb-4 bg-gray-900/50 rounded p-4">
                <h4 className="text-sm font-medium text-white mb-2">R&eacute;sultat de l&apos;import :</h4>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{importResult.created}</p>
                    <p className="text-xs text-gray-400">Cr&eacute;&eacute;s</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">{importResult.updated}</p>
                    <p className="text-xs text-gray-400">Mis &agrave; jour</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">{importResult.errors.length}</p>
                    <p className="text-xs text-gray-400">Erreurs</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-300">
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <p key={i}>Ligne {e.row}: {e.message}</p>
                    ))}
                    {importResult.errors.length > 5 && (
                      <p>... et {importResult.errors.length - 5} autres erreurs</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCloseImport}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
              >
                {importResult ? 'Fermer' : 'Annuler'}
              </button>
              {!importResult && (
                <button
                  onClick={handleImport}
                  disabled={!csvContent.trim() || importing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                  {importing ? 'Import en cours...' : 'Importer'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Rechercher par code ou d&eacute;signation..."
        />
      </div>

      {/* Confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Confirmer la suppression</h3>
            <p className="text-gray-300 mb-6">
              Voulez-vous vraiment supprimer cet article ? Cette action est irr&eacute;versible.
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">D&eacute;signation</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Prix HT</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">TVA</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Unit&eacute;</th>
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
                        ? `${Number(article.prixUnitaireHt).toFixed(2)} \u20AC`
                        : '\u2014'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">
                      {article.tvaTaux != null ? `${article.tvaTaux}%` : '\u2014'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{article.unite || '\u2014'}</td>
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
                    {searchTerm ? 'Aucun article trouv\u00E9 pour cette recherche' : 'Aucun article enregistr\u00E9'}
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
