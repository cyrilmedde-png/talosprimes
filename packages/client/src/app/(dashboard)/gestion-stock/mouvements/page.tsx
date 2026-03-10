'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  ArrowsRightLeftIcon,
  PlusIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface StockMovement {
  id: string;
  typeOperation: string;
  quantite: number;
  quantiteAvant: number;
  quantiteApres: number;
  dateOperation: string;
  motif?: string | null;
  utilisateurNom?: string | null;
  article: { code: string; designation: string };
  site: { code: string; designation: string };
}

interface StockSite {
  id: string;
  code: string;
  designation: string;
}

const typeOperationColors: Record<string, { bg: string; text: string; label: string }> = {
  entree: { bg: 'bg-green-900', text: 'text-green-200', label: 'Entrée' },
  sortie: { bg: 'bg-red-900', text: 'text-red-200', label: 'Sortie' },
  ajustement: { bg: 'bg-yellow-900', text: 'text-yellow-200', label: 'Ajustement' },
  transfer_in: { bg: 'bg-blue-900', text: 'text-blue-200', label: 'Transfert In' },
  transfer_out: { bg: 'bg-orange-900', text: 'text-orange-200', label: 'Transfert Out' },
};

export default function MouvementsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [siteId, setSiteId] = useState('');
  const [typeOperation, setTypeOperation] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Data
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [sites, setSites] = useState<StockSite[]>([]);
  const [total, setTotal] = useState(0);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [articleId, setArticleId] = useState('');
  const [modalSiteId, setModalSiteId] = useState('');
  const [modalTypeOperation, setModalTypeOperation] = useState('entree');
  const [quantite, setQuantite] = useState('');
  const [motif, setMotif] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    setAuthenticated(true);
  }, [router]);

  // Load sites on mount
  useEffect(() => {
    if (!authenticated) return;
    const loadSites = async () => {
      try {
        const response = await apiClient.stockSites.list();
        if (response.success) {
          setSites(response.data?.sites ?? []);
        }
      } catch (err) {
        console.error('Failed to load sites:', err);
      }
    };
    loadSites();
  }, [authenticated]);

  // Load movements
  useEffect(() => {
    if (!authenticated) return;

    const loadMovements = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.stockMovements.list({
          siteId: siteId || undefined,
          typeOperation: typeOperation || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          page: page.toString(),
          limit: limit.toString(),
        });

        if (response.success) {
          setMovements(response.data.movements);
          setTotal(response.data.total);
        } else {
          setError('Failed to load movements');
        }
      } catch (err) {
        setError('An error occurred while loading movements');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMovements();
  }, [authenticated, siteId, typeOperation, dateFrom, dateTo, page, limit]);

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    if (!articleId || !modalSiteId || !quantite) {
      setSubmitError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }

    try {
      const response = await apiClient.stockMovements.createManual({
        articleId,
        siteId: modalSiteId,
        typeOperation: modalTypeOperation,
        quantite: parseInt(quantite, 10),
        motif: motif || null,
      });

      if (response.success) {
        setShowModal(false);
        setArticleId('');
        setModalSiteId('');
        setModalTypeOperation('entree');
        setQuantite('');
        setMotif('');
        setPage(1);
      } else {
        setSubmitError('Failed to create movement');
      }
    } catch (err) {
      setSubmitError('An error occurred while creating movement');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setSiteId('');
    setTypeOperation('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = siteId || typeOperation || dateFrom || dateTo;
  const totalPages = Math.ceil(total / limit);

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Mouvements de Stock</h1>
            <p className="mt-2 text-gray-400">Suivi des entrées, sorties et transferts</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
          >
            <PlusIcon className="h-5 w-5" />
            Nouveau mouvement
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-900/50 border border-red-700 p-4 text-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-lg bg-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Filtres</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Site Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Site</label>
              <select
                value={siteId}
                onChange={(e) => {
                  setSiteId(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Tous les sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.designation}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                value={typeOperation}
                onChange={(e) => {
                  setTypeOperation(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Tous les types</option>
                <option value="entree">Entrée</option>
                <option value="sortie">Sortie</option>
                <option value="ajustement">Ajustement</option>
                <option value="transfer_in">Transfert In</option>
                <option value="transfer_out">Transfert Out</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date Début</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date Fin</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Reset Button */}
            {hasFilters && (
              <div className="flex items-end">
                <button
                  onClick={handleResetFilters}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-gray-300 hover:bg-gray-600 transition flex items-center justify-center gap-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Réinitialiser
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Table */}
        {!loading && movements.length > 0 && (
          <div className="rounded-lg bg-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-300">
                <thead className="bg-gray-700 border-b border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Date</th>
                    <th className="px-6 py-3 text-left font-semibold">Type</th>
                    <th className="px-6 py-3 text-left font-semibold">Article</th>
                    <th className="px-6 py-3 text-left font-semibold">Site</th>
                    <th className="px-6 py-3 text-center font-semibold">Quantité</th>
                    <th className="px-6 py-3 text-center font-semibold">Avant → Après</th>
                    <th className="px-6 py-3 text-left font-semibold">Motif</th>
                    <th className="px-6 py-3 text-left font-semibold">Utilisateur</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const typeInfo = typeOperationColors[movement.typeOperation] || {
                      bg: 'bg-gray-700',
                      text: 'text-gray-300',
                      label: movement.typeOperation,
                    };
                    const movementDate = new Date(movement.dateOperation).toLocaleDateString('fr-FR');

                    return (
                      <tr key={movement.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition">
                        <td className="px-6 py-3">{movementDate}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.text}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div>
                            <div className="font-medium">{movement.article.code}</div>
                            <div className="text-gray-400 text-xs">{movement.article.designation}</div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div>
                            <div className="font-medium">{movement.site.code}</div>
                            <div className="text-gray-400 text-xs">{movement.site.designation}</div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">{movement.quantite}</td>
                        <td className="px-6 py-3 text-center">
                          {movement.quantiteAvant} → {movement.quantiteApres}
                        </td>
                        <td className="px-6 py-3 text-gray-400">{movement.motif || '—'}</td>
                        <td className="px-6 py-3 text-gray-400">{movement.utilisateurNom || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-700 px-6 py-4 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Page {page} sur {totalPages} ({total} résultats)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 rounded-lg bg-gray-600 px-3 py-2 text-gray-300 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Précédent
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 rounded-lg bg-gray-600 px-3 py-2 text-gray-300 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Suivant
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && movements.length === 0 && (
          <div className="rounded-lg bg-gray-800 px-6 py-12 text-center">
            <ArrowsRightLeftIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucun mouvement trouvé</h3>
            <p className="text-gray-400">Essayez d'ajuster vos filtres ou créez un nouveau mouvement</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Nouveau mouvement</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSubmitError(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {submitError && (
              <div className="mb-4 rounded-lg bg-red-900/50 border border-red-700 p-3 text-red-200 text-sm">
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreateMovement} className="space-y-4">
              {/* Article ID */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Article*</label>
                <input
                  type="text"
                  value={articleId}
                  onChange={(e) => setArticleId(e.target.value)}
                  placeholder="Code ou ID de l'article"
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              {/* Site ID */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Site*</label>
                <select
                  value={modalSiteId}
                  onChange={(e) => setModalSiteId(e.target.value)}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Sélectionner un site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.designation}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Operation */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type*</label>
                <select
                  value={modalTypeOperation}
                  onChange={(e) => setModalTypeOperation(e.target.value)}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="entree">Entrée</option>
                  <option value="sortie">Sortie</option>
                  <option value="ajustement">Ajustement</option>
                </select>
              </div>

              {/* Quantité */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Quantité*</label>
                <input
                  type="number"
                  value={quantite}
                  onChange={(e) => setQuantite(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                  min="1"
                />
              </div>

              {/* Motif */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Motif</label>
                <textarea
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Raison du mouvement (optionnel)"
                  rows={3}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSubmitError(null);
                  }}
                  className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-gray-300 hover:bg-gray-600 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  {submitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
