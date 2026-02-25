'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  BuildingOffice2Icon,
  ChartBarIcon,
  CurrencyEuroIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

interface BtpStats {
  totalChantiers: number;
  enCoursCount: number;
  montantMarcheTotal: number;
  tauxAvancementMoyen: number;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export default function BtpDashboard() {
  const [stats, setStats] = useState<BtpStats>({
    totalChantiers: 0,
    enCoursCount: 0,
    montantMarcheTotal: 0,
    tauxAvancementMoyen: 0,
  });
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading({ isLoading: true, error: null });
        const response = await apiClient.btp.dashboard();
        const raw = response.data as unknown as { success?: boolean; data?: BtpStats };
        setStats(raw?.data ?? {
          totalChantiers: 0,
          enCoursCount: 0,
          montantMarcheTotal: 0,
          tauxAvancementMoyen: 0,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load statistics';
        setLoading((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
        return;
      } finally {
        setLoading((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  if (loading.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  if (loading.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          <p>{loading.error}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Chantiers',
      value: stats.totalChantiers,
      icon: BuildingOffice2Icon,
      color: 'text-indigo-400',
    },
    {
      title: 'En Cours',
      value: stats.enCoursCount,
      icon: ArrowTrendingUpIcon,
      color: 'text-green-400',
    },
    {
      title: 'Montant Marché Total',
      value: `€${(stats.montantMarcheTotal / 1000).toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}k`,
      icon: CurrencyEuroIcon,
      color: 'text-purple-400',
    },
    {
      title: 'Taux Avancement Moyen',
      value: `${stats.tauxAvancementMoyen.toFixed(1)}%`,
      icon: ChartBarIcon,
      color: 'text-orange-400',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">BTP Dashboard</h1>
        <p className="mt-2 text-sm text-gray-400">
          Vue d'ensemble de vos chantiers et situations
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.title}
              className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-400">{card.title}</p>
                  <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">{card.value}</p>
                </div>
                <IconComponent className={`h-12 w-12 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Accès rapide</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/btp/chantiers"
            className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-6 text-center hover:bg-gray-800/40 transition-colors backdrop-blur-md"
          >
            <BuildingOffice2Icon className="mx-auto h-8 w-8 text-indigo-400" />
            <p className="mt-2 font-semibold text-white">Chantiers</p>
            <p className="mt-1 text-sm text-gray-400">Gérer les chantiers</p>
          </Link>

          <Link
            href="/btp/situations"
            className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-6 text-center hover:bg-gray-800/40 transition-colors backdrop-blur-md"
          >
            <ChartBarIcon className="mx-auto h-8 w-8 text-green-400" />
            <p className="mt-2 font-semibold text-white">Situations</p>
            <p className="mt-1 text-sm text-gray-400">Consulter les situations</p>
          </Link>

          <Link
            href="/btp/chantiers"
            className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-6 text-center hover:bg-gray-800/40 transition-colors backdrop-blur-md"
          >
            <CurrencyEuroIcon className="mx-auto h-8 w-8 text-purple-400" />
            <p className="mt-2 font-semibold text-white">Finances</p>
            <p className="mt-1 text-sm text-gray-400">Suivi budgétaire</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
