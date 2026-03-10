'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import { ExclamationTriangleIcon, CheckCircleIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface StockAlert {
  id: string;
  articleId: string;
  siteId: string;
  typeAlerte: string;
  statut: string;
  dateAlerte: string;
  article: { code: string; designation: string };
  site: { code: string; designation: string };
}

const typeAlerteLabels: Record<string, string> = {
  seuil_minimum: 'Stock bas',
  rupture: 'Rupture',
};

const typeAlerteColors: Record<string, { bg: string; text: string }> = {
  seuil_minimum: { bg: 'bg-orange-900', text: 'text-orange-200' },
  rupture: { bg: 'bg-red-900', text: 'text-red-200' },
};

const statutColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-yellow-900', text: 'text-yellow-200', label: 'Active' },
  resolue: { bg: 'bg-green-900', text: 'text-green-200', label: 'Résolue' },
};

export default function AlertesPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statut, setStatut] = useState('');

  // Data
  const [alerts, setAlerts] = useState<StockAlert[]>([]);

  // Resolving state
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    setAuthenticated(true);
  }, [router]);

  // Load alerts
  useEffect(() => {
    if (!authenticated) return;

    const loadAlerts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.stockAlerts.list({
          statut: statut || undefined,
        });

        if (response.success) {
          setAlerts(response.data.alerts);
        } else {
          setError('Failed to load alerts');
        }
      } catch (err) {
        setError('An error occurred while loading alerts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [authenticated, statut]);

  const handleResolveAlert = async (alertId: string) => {
    setResolving(alertId);
    setResolveError(null);

    try {
      const response = await apiClient.stockAlerts.resolve(alertId);

      if (response.success) {
        // Remove the resolved alert from the list or update its status
        setAlerts((prevAlerts) =>
          prevAlerts.map((alert) =>
            alert.id === alertId ? { ...alert, statut: 'resolue' } : alert
          )
        );
      } else {
        setResolveError('Failed to resolve alert');
      }
    } catch (err) {
      setResolveError('An error occurred while resolving alert');
      console.error(err);
    } finally {
      setResolving(null);
    }
  };

  const handleResetFilters = () => {
    setStatut('');
  };

  const filteredAlerts =
    statut === ''
      ? alerts
      : alerts.filter((alert) => alert.statut === statut);

  const activeCount = alerts.filter((alert) => alert.statut === 'active').length;
  const resolvedCount = alerts.filter((alert) => alert.statut === 'resolue').length;

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Alertes Stock</h1>
          <p className="mt-2 text-gray-400">Gestion des alertes de stock bas et ruptures</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Alertes actives</p>
                <p className="text-3xl font-bold text-yellow-400">{activeCount}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Alertes résolues</p>
                <p className="text-3xl font-bold text-green-400">{resolvedCount}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
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

        {resolveError && (
          <div className="mb-6 rounded-lg bg-red-900/50 border border-red-700 p-4 text-red-200 flex items-center justify-between">
            <span>{resolveError}</span>
            <button onClick={() => setResolveError(null)}>
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

          <div className="flex gap-4 items-end">
            {/* Statut Filter */}
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Tous les statuts</option>
                <option value="active">Active</option>
                <option value="resolue">Résolue</option>
              </select>
            </div>

            {/* Reset Button */}
            {statut && (
              <button
                onClick={handleResetFilters}
                className="rounded-lg bg-gray-700 px-4 py-2 text-gray-300 hover:bg-gray-600 transition flex items-center gap-2"
              >
                <XMarkIcon className="h-4 w-4" />
                Réinitialiser
              </button>
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
        {!loading && alerts.length > 0 && (
          <div className="rounded-lg bg-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-300">
                <thead className="bg-gray-700 border-b border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Date</th>
                    <th className="px-6 py-3 text-left font-semibold">Type</th>
                    <th className="px-6 py-3 text-left font-semibold">Article</th>
                    <th className="px-6 py-3 text-left font-semibold">Site</th>
                    <th className="px-6 py-3 text-left font-semibold">Statut</th>
                    <th className="px-6 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert) => {
                    const typeInfo = typeAlerteColors[alert.typeAlerte] || {
                      bg: 'bg-gray-700',
                      text: 'text-gray-300',
                    };
                    const typeLabel = typeAlerteLabels[alert.typeAlerte] || alert.typeAlerte;
                    const statutInfo = statutColors[alert.statut] || {
                      bg: 'bg-gray-700',
                      text: 'text-gray-300',
                      label: alert.statut,
                    };
                    const alertDate = new Date(alert.dateAlerte).toLocaleDateString('fr-FR');
                    const isActive = alert.statut === 'active';

                    return (
                      <tr key={alert.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition">
                        <td className="px-6 py-3">{alertDate}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.text}`}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div>
                            <div className="font-medium">{alert.article.code}</div>
                            <div className="text-gray-400 text-xs">{alert.article.designation}</div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div>
                            <div className="font-medium">{alert.site.code}</div>
                            <div className="text-gray-400 text-xs">{alert.site.designation}</div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statutInfo.bg} ${statutInfo.text}`}>
                            {statutInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {isActive && (
                            <button
                              onClick={() => handleResolveAlert(alert.id)}
                              disabled={resolving === alert.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              {resolving === alert.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Résolution...
                                </>
                              ) : (
                                <>
                                  <CheckCircleIcon className="h-4 w-4" />
                                  Résoudre
                                </>
                              )}
                            </button>
                          )}
                          {!isActive && (
                            <span className="text-gray-500 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && alerts.length === 0 && (
          <div className="rounded-lg bg-gray-800 px-6 py-12 text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucune alerte</h3>
            <p className="text-gray-400">Tous vos stocks sont à jour</p>
          </div>
        )}

        {/* No Results State */}
        {!loading && alerts.length > 0 && filteredAlerts.length === 0 && (
          <div className="rounded-lg bg-gray-800 px-6 py-12 text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucune alerte trouvée</h3>
            <p className="text-gray-400">Essayez d'ajuster vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}
