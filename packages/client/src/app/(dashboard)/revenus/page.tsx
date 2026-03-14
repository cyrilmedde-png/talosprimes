'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ArrowTrendingUpIcon, CurrencyEuroIcon, ShoppingCartIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface DashboardData {
  mrr: number;
  currentMonth: string;
  totalHt: number;
  totalTtc: number;
  totalTransactions: number;
  revenueByType: Array<{
    type: string;
    totalHt: number;
    totalTtc: number;
    count: number;
  }>;
  commissionsStats: Array<{
    statut: string;
    total: number;
    count: number;
  }>;
  evolutionMensuelle: Array<{
    mois: string;
    totalHt: number;
  }>;
}

export default function RevenueDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await apiClient.revenue.dashboard();
        if (response.success) {
          setData(response.data as unknown as DashboardData);
        } else {
          setError('Erreur lors du chargement du tableau de bord');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  const getMaxValue = () => {
    if (!data?.evolutionMensuelle) return 0;
    return Math.max(...data.evolutionMensuelle.map(m => m.totalHt));
  };

  const getStatusColor = (statut: string) => {
    const colors: Record<string, string> = {
      'en_attente': 'bg-yellow-500/20 text-yellow-400',
      'validee': 'bg-blue-500/20 text-blue-400',
      'payee': 'bg-green-500/20 text-green-400',
      'annulee': 'bg-red-500/20 text-red-400',
    };
    return colors[statut] || 'bg-gray-500/20 text-gray-400';
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

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="text-center text-gray-400">Aucune donnée disponible</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard Revenus</h1>
          <p className="mt-2 text-gray-400">Mois courant: {data.currentMonth}</p>
        </div>

        {/* KPI Cards Row */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* MRR Card */}
          <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">MRR (Mois courant)</p>
                <p className="mt-2 text-2xl font-bold text-blue-400">
                  {formatCurrency(data.mrr)}
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-12 w-12 text-blue-500/50" />
            </div>
          </div>

          {/* Total HT Card */}
          <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 hover:border-green-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total HT</p>
                <p className="mt-2 text-2xl font-bold text-green-400">
                  {formatCurrency(data.totalHt)}
                </p>
              </div>
              <CurrencyEuroIcon className="h-12 w-12 text-green-500/50" />
            </div>
          </div>

          {/* Total TTC Card */}
          <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 hover:border-cyan-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total TTC</p>
                <p className="mt-2 text-2xl font-bold text-cyan-400">
                  {formatCurrency(data.totalTtc)}
                </p>
              </div>
              <ShoppingCartIcon className="h-12 w-12 text-cyan-500/50" />
            </div>
          </div>

          {/* Transactions Card */}
          <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 hover:border-purple-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Nombre de transactions</p>
                <p className="mt-2 text-2xl font-bold text-purple-400">
                  {data.totalTransactions.toLocaleString('fr-FR')}
                </p>
              </div>
              <CheckCircleIcon className="h-12 w-12 text-purple-500/50" />
            </div>
          </div>
        </div>

        {/* Revenue by Type Table */}
        <div className="mb-8 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Revenus par type</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-700/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Type</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Total HT</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Total TTC</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Nombre</th>
                </tr>
              </thead>
              <tbody>
                {data.revenueByType.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-300">{item.type}</td>
                    <td className="px-6 py-4 text-right text-sm text-green-400 font-semibold">
                      {formatCurrency(item.totalHt)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-cyan-400 font-semibold">
                      {formatCurrency(item.totalTtc)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-300">
                      {item.count.toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Evolution Chart */}
        <div className="mb-8 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Évolution mensuelle (12 derniers mois)</h2>
          </div>
          <div className="p-6">
            <div className="flex items-end gap-2 h-64 justify-between">
              {data.evolutionMensuelle.map((month, idx) => {
                const maxValue = getMaxValue();
                const percentage = maxValue > 0 ? (month.totalHt / maxValue) * 100 : 0;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-full flex flex-col items-center">
                      <div className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t" style={{ height: `${percentage}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-400 text-center">{month.mois}</div>
                    <div className="text-xs text-gray-300 font-semibold text-center">
                      {formatCurrency(month.totalHt)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Commission Stats Cards */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Statut des commissions</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {data.commissionsStats.map((stat, idx) => (
              <div
                key={idx}
                className={`rounded-lg border border-gray-700 p-4 ${getStatusColor(stat.statut)}`}
              >
                <p className="text-sm opacity-75 capitalize">{stat.statut.replace('_', ' ')}</p>
                <p className="mt-2 text-2xl font-bold">{formatCurrency(stat.total)}</p>
                <p className="mt-1 text-xs opacity-75">{stat.count} commissions</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
