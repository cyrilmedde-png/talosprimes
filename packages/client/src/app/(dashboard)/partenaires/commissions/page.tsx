'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CurrencyEuroIcon,
} from '@heroicons/react/24/outline';

interface Commission {
  id: string;
  partnerName: string;
  partnerSiret: string;
  clientName: string;
  level: 'N1' | 'N2';
  amount: number;
  status: string;
  month: string;
  createdAt: string;
}

interface FilterState {
  status: string;
  month: string;
  level: string;
}

export default function CommissionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [filteredCommissions, setFilteredCommissions] = useState<Commission[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    month: '',
    level: '',
  });
  const [months, setMonths] = useState<string[]>([]);
  const [totals, setTotals] = useState({
    total: 0,
    pending: 0,
    validated: 0,
    rejected: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadCommissions();
  }, [user, router]);

  useEffect(() => {
    applyFilters();
    calculateTotals();
  }, [commissions, filters]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/commissions');
      const data = response.data || [];
      setCommissions(data);

      // Extract unique months for filter
      const uniqueMonths = Array.from(
        new Set(data.map((c: Commission) => c.month))
      ).sort((a: string, b: string) => b.localeCompare(a)) as string[];
      setMonths(uniqueMonths);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur lors du chargement des commissions';
      setError(errorMessage);
      console.error('Error loading commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = commissions;

    if (filters.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters.month) {
      filtered = filtered.filter((c) => c.month === filters.month);
    }

    if (filters.level) {
      filtered = filtered.filter((c) => c.level === filters.level);
    }

    setFilteredCommissions(filtered);
  };

  const calculateTotals = () => {
    let total = 0;
    let pending = 0;
    let validated = 0;
    let rejected = 0;

    filteredCommissions.forEach((commission) => {
      total += commission.amount;
      if (commission.status === 'pending') pending += commission.amount;
      if (commission.status === 'validated') validated += commission.amount;
      if (commission.status === 'rejected') rejected += commission.amount;
    });

    setTotals({ total, pending, validated, rejected });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated':
        return 'text-green-400 bg-green-400/10';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'rejected':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated':
        return 'Validée';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Rejetée';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      case 'rejected':
        return <XCircleIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Commissions</h1>
        <p className="text-gray-400">
          Gérez et suivez toutes les commissions ({filteredCommissions.length})
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-2">Total</p>
              <p className="text-3xl font-bold text-white">{totals.total.toFixed(0)}€</p>
            </div>
            <CurrencyEuroIcon className="w-12 h-12 text-amber-400" />
          </div>
        </div>

        {/* Validated */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-2">Validées</p>
              <p className="text-3xl font-bold text-green-400">{totals.validated.toFixed(0)}€</p>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-green-400" />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-2">En attente</p>
              <p className="text-3xl font-bold text-yellow-400">{totals.pending.toFixed(0)}€</p>
            </div>
            <ClockIcon className="w-12 h-12 text-yellow-400" />
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-2">Rejetées</p>
              <p className="text-3xl font-bold text-red-400">{totals.rejected.toFixed(0)}€</p>
            </div>
            <XCircleIcon className="w-12 h-12 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value })
          }
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
        >
          <option value="">Tous les statuts</option>
          <option value="validated">Validée</option>
          <option value="pending">En attente</option>
          <option value="rejected">Rejetée</option>
        </select>

        <select
          value={filters.month}
          onChange={(e) =>
            setFilters({ ...filters, month: e.target.value })
          }
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
        >
          <option value="">Tous les mois</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>

        <select
          value={filters.level}
          onChange={(e) =>
            setFilters({ ...filters, level: e.target.value })
          }
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
        >
          <option value="">Tous les niveaux</option>
          <option value="N1">Niveau 1 (N1)</option>
          <option value="N2">Niveau 2 (N2)</option>
        </select>
      </div>

      {/* Commissions Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {filteredCommissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-700/50">
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">
                    Partenaire
                  </th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">
                    Client
                  </th>
                  <th className="px-6 py-4 text-center text-gray-400 font-semibold">
                    Niveau
                  </th>
                  <th className="px-6 py-4 text-right text-gray-400 font-semibold">
                    Montant
                  </th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">
                    Mois
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredCommissions.map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{commission.partnerName}</p>
                        <p className="text-gray-400 text-xs font-mono">
                          {commission.partnerSiret}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{commission.clientName}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-amber-400/10 text-amber-400 rounded px-3 py-1 font-semibold">
                        {commission.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-white font-semibold">
                      {commission.amount.toFixed(2)}€
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          commission.status
                        )}`}
                      >
                        {getStatusIcon(commission.status)}
                        {getStatusLabel(commission.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{commission.month}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">Aucune commission trouvée</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-sm text-gray-400">
        <p>
          Affichage de {filteredCommissions.length} commission
          {filteredCommissions.length > 1 ? 's' : ''} sur {commissions.length}
        </p>
      </div>
    </div>
  );
}
