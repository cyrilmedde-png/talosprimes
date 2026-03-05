'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';


interface Commission {
  id: string;
  partnerId: string;
  partnerNom: string;
  clientFinalId: string;
  clientNom: string;
  niveau: number;
  type: string;
  montantBaseHt: number;
  tauxApplique: number;
  montantCommission: number;
  statut: string;
  mois: string;
  datePaiement: string | null;
  createdAt: string;
}

interface CommissionsData {
  commissions: Commission[];
}

type CommissionStatut = 'en_attente' | 'validee' | 'payee' | 'annulee';

const STATUT_OPTIONS: CommissionStatut[] = ['en_attente', 'validee', 'payee', 'annulee'];

export default function RevenueCommissions() {
  const [data, setData] = useState<CommissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    statut: CommissionStatut | '';
    mois: string;
  }>({
    statut: '',
    mois: '',
  });

  const fetchCommissions = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filters.statut) params.statut = filters.statut;
      if (filters.mois) params.mois = filters.mois;

      const response = await apiClient.revenue.commissions(params);
      if (response.success) {
        setData(response.data as CommissionsData);
      } else {
        setError('Erreur lors du chargement des commissions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  const getStatutBadgeColor = (statut: string) => {
    const colors: Record<string, string> = {
      'en_attente': 'bg-yellow-500/20 text-yellow-400',
      'validee': 'bg-blue-500/20 text-blue-400',
      'payee': 'bg-green-500/20 text-green-400',
      'annulee': 'bg-red-500/20 text-red-400',
    };
    return colors[statut] || 'bg-gray-500/20 text-gray-400';
  };

  const getNiveauBadgeColor = (niveau: number) => {
    return niveau === 1 ? 'bg-purple-500/20 text-purple-400' : 'bg-indigo-500/20 text-indigo-400';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="text-center text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="rounded-lg bg-red-500/20 p-4 text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Commissions — Vue Revenus</h1>
          <p className="mt-2 text-gray-400">Gestion des commissions par partenaire</p>
        </div>

        {/* Filter Bar */}
        <div className="mb-8 rounded-lg bg-gray-800 border border-gray-700 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Statut Filter */}
            <div className="flex flex-col">
              <label htmlFor="statut-filter" className="mb-2 text-sm font-medium text-gray-300">
                Statut
              </label>
              <select
                id="statut-filter"
                value={filters.statut}
                onChange={(e) =>
                  setFilters({ ...filters, statut: (e.target.value as CommissionStatut) || '' })
                }
                className="rounded border border-gray-600 bg-gray-700 px-4 py-2 text-gray-200 hover:border-blue-500/50 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">Tous les statuts</option>
                {STATUT_OPTIONS.map((statut) => (
                  <option key={statut} value={statut}>
                    {statut.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="flex flex-col">
              <label htmlFor="month-filter" className="mb-2 text-sm font-medium text-gray-300">
                Mois (YYYY-MM)
              </label>
              <input
                id="month-filter"
                type="month"
                value={filters.mois}
                onChange={(e) => setFilters({ ...filters, mois: e.target.value })}
                className="rounded border border-gray-600 bg-gray-700 px-4 py-2 text-gray-200 hover:border-blue-500/50 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ statut: '', mois: '' })}
                className="w-full rounded bg-gray-600 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-500 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Commissions Table */}
        <div className="rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              Commissions {data?.commissions.length ? `(${data.commissions.length})` : ''}
            </h2>
          </div>
          <div className="overflow-x-auto">
            {data?.commissions && data.commissions.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-700/50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      Partenaire
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      Client
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                      Niveau
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Type</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                      Montant Base HT
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Taux</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                      Montant Commission
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Mois</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.map((commission, idx) => (
                    <tr
                      key={commission.id || idx}
                      className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-300 font-medium">
                        {commission.partnerNom}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {commission.clientNom}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getNiveauBadgeColor(
                            commission.niveau
                          )}`}
                        >
                          N{commission.niveau}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{commission.type}</td>
                      <td className="px-6 py-4 text-right text-sm text-green-400 font-semibold">
                        {formatCurrency(commission.montantBaseHt)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-300">
                        {(commission.tauxApplique * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-cyan-400 font-semibold">
                        {formatCurrency(commission.montantCommission)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getStatutBadgeColor(
                            commission.statut
                          )}`}
                        >
                          {commission.statut.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-400">
                        {commission.mois}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-400">
                        {commission.datePaiement ? formatDate(commission.datePaiement) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-12 text-center text-gray-400">
                Aucune commission trouvée avec les filtres appliqués.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
