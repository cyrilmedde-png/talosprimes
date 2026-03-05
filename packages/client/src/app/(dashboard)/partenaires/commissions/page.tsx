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

interface FilterState {
  statut: string;
  mois: string;
  niveau: string;
}

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export default function CommissionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [filteredCommissions, setFilteredCommissions] = useState<Commission[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    statut: '',
    mois: '',
    niveau: '',
  });
  const [months, setMonths] = useState<string[]>([]);
  const [totals, setTotals] = useState({
    total: 0,
    enAttente: 0,
    validee: 0,
    annulee: 0,
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
  }, [commissions, filters]);

  useEffect(() => {
    calculateTotals();
  }, [filteredCommissions]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.revenue.commissions();
      const data = (response.data?.commissions || []) as Commission[];
      setCommissions(data);

      const uniqueMonths = Array.from(
        new Set(data.map((c) => c.mois).filter(Boolean))
      ).sort((a, b) => b.localeCompare(a));
      setMonths(uniqueMonths);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des commissions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = commissions;
    if (filters.statut) filtered = filtered.filter((c) => c.statut === filters.statut);
    if (filters.mois) filtered = filtered.filter((c) => c.mois === filters.mois);
    if (filters.niveau) filtered = filtered.filter((c) => String(c.niveau) === filters.niveau);
    setFilteredCommissions(filtered);
  };

  const calculateTotals = () => {
    let total = 0, enAttente = 0, validee = 0, annulee = 0;
    filteredCommissions.forEach((c) => {
      total += c.montantCommission;
      if (c.statut === 'en_attente') enAttente += c.montantCommission;
      if (c.statut === 'validee') validee += c.montantCommission;
      if (c.statut === 'annulee') annulee += c.montantCommission;
    });
    setTotals({ total, enAttente, validee, annulee });
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'validee': return 'text-green-400 bg-green-400/10';
      case 'payee': return 'text-blue-400 bg-blue-400/10';
      case 'en_attente': return 'text-yellow-400 bg-yellow-400/10';
      case 'annulee': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'validee': return 'Validée';
      case 'payee': return 'Payée';
      case 'en_attente': return 'En attente';
      case 'annulee': return 'Annulée';
      default: return statut;
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'validee': case 'payee': return <CheckCircleIcon className="w-4 h-4" />;
      case 'en_attente': return <ClockIcon className="w-4 h-4" />;
      case 'annulee': return <XCircleIcon className="w-4 h-4" />;
      default: return null;
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Commissions</h1>
        <p className="text-gray-400">
          Suivi des commissions partenaires ({filteredCommissions.length})
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total</p>
              <p className="text-2xl font-bold text-white">{fmt(totals.total)}</p>
            </div>
            <CurrencyEuroIcon className="w-10 h-10 text-amber-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Validées</p>
              <p className="text-2xl font-bold text-green-400">{fmt(totals.validee)}</p>
            </div>
            <CheckCircleIcon className="w-10 h-10 text-green-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">En attente</p>
              <p className="text-2xl font-bold text-yellow-400">{fmt(totals.enAttente)}</p>
            </div>
            <ClockIcon className="w-10 h-10 text-yellow-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Annulées</p>
              <p className="text-2xl font-bold text-red-400">{fmt(totals.annulee)}</p>
            </div>
            <XCircleIcon className="w-10 h-10 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <select
          value={filters.statut}
          onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="validee">Validée</option>
          <option value="payee">Payée</option>
          <option value="annulee">Annulée</option>
        </select>

        <select
          value={filters.mois}
          onChange={(e) => setFilters({ ...filters, mois: e.target.value })}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
        >
          <option value="">Tous les mois</option>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={filters.niveau}
          onChange={(e) => setFilters({ ...filters, niveau: e.target.value })}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
        >
          <option value="">Tous les niveaux</option>
          <option value="1">Niveau 1 (N1)</option>
          <option value="2">Niveau 2 (N2)</option>
        </select>
      </div>

      {/* Commissions Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {filteredCommissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-700/50">
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Partenaire</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Client</th>
                  <th className="px-6 py-4 text-center text-gray-400 font-semibold">Niveau</th>
                  <th className="px-6 py-4 text-right text-gray-400 font-semibold">Base HT</th>
                  <th className="px-6 py-4 text-center text-gray-400 font-semibold">Taux</th>
                  <th className="px-6 py-4 text-right text-gray-400 font-semibold">Commission</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Statut</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Mois</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredCommissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 text-white font-medium">{c.partnerNom}</td>
                    <td className="px-6 py-4 text-gray-400">{c.clientNom}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded px-3 py-1 font-semibold text-xs ${c.niveau === 1 ? 'bg-purple-400/10 text-purple-400' : 'bg-indigo-400/10 text-indigo-400'}`}>
                        N{c.niveau}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300">{fmt(c.montantBaseHt)}</td>
                    <td className="px-6 py-4 text-center text-gray-300">{c.tauxApplique}%</td>
                    <td className="px-6 py-4 text-right text-white font-semibold">{fmt(c.montantCommission)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(c.statut)}`}>
                        {getStatusIcon(c.statut)}
                        {getStatusLabel(c.statut)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{c.mois}</td>
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

      <div className="mt-4 text-center text-sm text-gray-500">
        {filteredCommissions.length} commission{filteredCommissions.length > 1 ? 's' : ''} sur {commissions.length}
      </div>
    </div>
  );
}
