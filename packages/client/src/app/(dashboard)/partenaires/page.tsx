'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { 
  UserGroupIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  CurrencyEuroIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';

interface KPIData {
  totalPartners: number;
  activePartners: number;
  suspendedPartners: number;
  totalCommissions: number;
  commissionsByMonth: Array<{ month: string; amount: number }>;
}

export default function PartenairesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState<KPIData>({
    totalPartners: 0,
    activePartners: 0,
    suspendedPartners: 0,
    totalCommissions: 0,
    commissionsByMonth: [],
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch KPI data
      const response = await apiClient.partners.list();
      const partners = (response.data?.partners || []) as Array<{ statut: string }>;
      const commResponse = await apiClient.revenue.commissions();
      const comms = (commResponse.data?.commissions || []) as Array<{ montantCommission: number }>;
      setKpis({
        totalPartners: partners.length,
        activePartners: partners.filter((p) => p.statut === 'actif').length,
        suspendedPartners: partners.filter((p) => p.statut === 'suspendu').length,
        totalCommissions: comms.reduce((s, c) => s + (c.montantCommission || 0), 0),
        commissionsByMonth: [],
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des données';
      setError(errorMessage);
      console.error('Error loading KPIs:', err);
    } finally {
      setLoading(false);
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
        <h1 className="text-4xl font-bold text-white mb-2">Partenaires</h1>
        <p className="text-gray-400">Gérez vos partenaires et leurs commissions</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Partners */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-2">Partenaires totaux</p>
              <p className="text-3xl font-bold text-white">{kpis.totalPartners}</p>
            </div>
            <UserGroupIcon className="w-12 h-12 text-amber-400" />
          </div>
        </div>

        {/* Active Partners */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-2">Partenaires actifs</p>
              <p className="text-3xl font-bold text-white">{kpis.activePartners}</p>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-green-400" />
          </div>
        </div>

        {/* Suspended Partners */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-2">Partenaires suspendus</p>
              <p className="text-3xl font-bold text-white">{kpis.suspendedPartners}</p>
            </div>
            <XCircleIcon className="w-12 h-12 text-red-400" />
          </div>
        </div>

        {/* Total Commissions */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-2">Commissions totales</p>
              <p className="text-3xl font-bold text-white">{kpis.totalCommissions.toFixed(0)}€</p>
            </div>
            <CurrencyEuroIcon className="w-12 h-12 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Commissions by Month Table */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Commissions par mois</h2>
          <Link href="/partenaires/commissions">
            <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg px-4 py-2 font-medium transition">
              Voir plus <ArrowRightIcon className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {kpis.commissionsByMonth && kpis.commissionsByMonth.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-3 text-left text-gray-400 font-semibold">Mois</th>
                  <th className="px-6 py-3 text-right text-gray-400 font-semibold">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {kpis.commissionsByMonth.slice(0, 5).map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 text-white">{commission.month}</td>
                    <td className="px-6 py-4 text-right text-amber-400 font-semibold">
                      {commission.amount.toFixed(2)}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">Aucune donnée de commissions disponible</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Partners List Link */}
        <Link href="/partenaires/liste">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-amber-400 transition cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Liste des partenaires</h3>
              <ArrowRightIcon className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-gray-400">Consultez et gérez tous vos partenaires</p>
          </div>
        </Link>

        {/* Commissions Link */}
        <Link href="/partenaires/commissions">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-amber-400 transition cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Commissions</h3>
              <ArrowRightIcon className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-gray-400">Visualisez et filtrez toutes les commissions</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
