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
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface KPIData {
  totalPartners: number;
  activePartners: number;
  suspendedPartners: number;
  totalCommissions: number;
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
      const response = await apiClient.partners.list();
      const partners = (response.data?.partners || []) as Array<{ statut: string }>;
      const commResponse = await apiClient.revenue.commissions();
      const comms = (commResponse.data?.commissions || []) as Array<{ montantCommission: number }>;
      setKpis({
        totalPartners: partners.length,
        activePartners: partners.filter((p) => p.statut === 'actif').length,
        suspendedPartners: partners.filter((p) => p.statut === 'suspendu').length,
        totalCommissions: comms.reduce((s, c) => s + (c.montantCommission || 0), 0),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

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
        <h1 className="text-3xl font-bold text-white mb-2">Partenaires</h1>
        <p className="text-gray-400">Gérez vos partenaires et leurs commissions</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Partenaires totaux</p>
              <p className="text-2xl font-bold text-white">{kpis.totalPartners}</p>
            </div>
            <UserGroupIcon className="w-10 h-10 text-amber-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Actifs</p>
              <p className="text-2xl font-bold text-green-400">{kpis.activePartners}</p>
            </div>
            <CheckCircleIcon className="w-10 h-10 text-green-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Suspendus</p>
              <p className="text-2xl font-bold text-red-400">{kpis.suspendedPartners}</p>
            </div>
            <XCircleIcon className="w-10 h-10 text-red-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Commissions totales</p>
              <p className="text-2xl font-bold text-amber-400">{fmt(kpis.totalCommissions)}</p>
            </div>
            <CurrencyEuroIcon className="w-10 h-10 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/partenaires/liste">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-amber-400 transition cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Liste des partenaires</h3>
              <ArrowRightIcon className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-gray-400 text-sm">Consultez, créez et gérez tous vos partenaires</p>
          </div>
        </Link>
        <Link href="/partenaires/commissions">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-amber-400 transition cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Commissions</h3>
              <ArrowRightIcon className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-gray-400 text-sm">Visualisez et filtrez toutes les commissions N1/N2</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
