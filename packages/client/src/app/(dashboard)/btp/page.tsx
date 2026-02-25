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
        setStats(response.data as unknown as BtpStats);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load statistics';
        setLoading({ isLoading: false, error: errorMessage });
      } finally {
        setLoading({ isLoading: false, error: null });
      }
    };

    fetchStats();
  }, []);

  if (loading.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
        </div>
      </div>
    );
  }

  if (loading.error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{loading.error}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Chantiers',
      value: stats.totalChantiers,
      icon: BuildingOffice2Icon,
      color: 'bg-blue-50 text-blue-700',
      iconColor: 'text-blue-600',
    },
    {
      title: 'En Cours',
      value: stats.enCoursCount,
      icon: ArrowTrendingUpIcon,
      color: 'bg-green-50 text-green-700',
      iconColor: 'text-green-600',
    },
    {
      title: 'Montant Marché Total',
      value: `€${(stats.montantMarcheTotal / 1000).toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}k`,
      icon: CurrencyEuroIcon,
      color: 'bg-purple-50 text-purple-700',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Taux Avancement Moyen',
      value: `${stats.tauxAvancementMoyen.toFixed(1)}%`,
      icon: ChartBarIcon,
      color: 'bg-orange-50 text-orange-700',
      iconColor: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">BTP Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Vue d'ensemble de vos chantiers et situations
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.title}
              className={`rounded-lg border border-gray-200 p-6 ${card.color}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">{card.title}</p>
                  <p className="mt-2 text-2xl font-bold">{card.value}</p>
                </div>
                <IconComponent className={`h-12 w-12 ${card.iconColor}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Accès rapide</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Link
            href="/dashboard/btp/chantiers"
            className="rounded-lg border-2 border-blue-600 p-6 text-center hover:bg-blue-50"
          >
            <BuildingOffice2Icon className="mx-auto h-8 w-8 text-blue-600" />
            <p className="mt-2 font-semibold text-blue-600">Chantiers</p>
            <p className="mt-1 text-sm text-gray-600">Gérer les chantiers</p>
          </Link>

          <Link
            href="/dashboard/btp/situations"
            className="rounded-lg border-2 border-green-600 p-6 text-center hover:bg-green-50"
          >
            <ChartBarIcon className="mx-auto h-8 w-8 text-green-600" />
            <p className="mt-2 font-semibold text-green-600">Situations</p>
            <p className="mt-1 text-sm text-gray-600">Consulter les situations</p>
          </Link>

          <Link
            href="/dashboard/btp/chantiers"
            className="rounded-lg border-2 border-purple-600 p-6 text-center hover:bg-purple-50"
          >
            <CurrencyEuroIcon className="mx-auto h-8 w-8 text-purple-600" />
            <p className="mt-2 font-semibold text-purple-600">Finances</p>
            <p className="mt-1 text-sm text-gray-600">Suivi budgétaire</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
