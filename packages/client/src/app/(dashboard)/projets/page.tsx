'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyEuroIcon,
  PlusIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface StatCard {
  title: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export default function ProjetsDashboard() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.projets.dashboard();
        const raw = response.data as unknown as { success: boolean; dashboard: Record<string, unknown> };
        if (raw.dashboard) {
          setStats(raw.dashboard);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch statistics';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards: StatCard[] = [
    {
      title: 'Total Projets',
      value: String(stats?.totalProjets ?? 0),
      icon: ArrowTrendingUpIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'En Cours',
      value: String(stats?.enCours ?? 0),
      icon: ClockIcon,
      color: 'bg-amber-500',
    },
    {
      title: 'Terminés',
      value: String(stats?.termines ?? 0),
      icon: CheckCircleIcon,
      color: 'bg-green-500',
    },
    {
      title: 'Budget Total',
      value: `€${Number(stats?.budgetTotal ?? 0).toLocaleString('fr-FR')}`,
      icon: CurrencyEuroIcon,
      color: 'bg-purple-500',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      title: 'Nouveau Projet',
      description: 'Créer un nouveau projet',
      href: '/projets/nouveau',
      icon: PlusIcon,
    },
    {
      title: 'Voir Tous les Projets',
      description: 'Consulter la liste complète',
      href: '/projets/liste',
      icon: ArrowRightIcon,
    },
    {
      title: 'Toutes les Tâches',
      description: 'Gérer les tâches',
      href: '/projets/taches',
      icon: ArrowRightIcon,
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Tableau de Bord Projets</h1>
          <p className="mt-2 text-sm text-gray-400">Bienvenue sur votre tableau de bord projets</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
            <p>Erreur: {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div
                    key={index}
                    className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-400">{card.title}</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white mt-2">{card.value}</p>
                      </div>
                      <div className={`${card.color} p-3 rounded-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
              <h2 className="text-lg font-semibold text-white mb-4">Actions Rapides</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={index}
                      href={action.href}
                      className="p-4 border border-gray-700/30 rounded-lg hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-indigo-400" />
                        <div>
                          <p className="font-medium text-white">{action.title}</p>
                          <p className="text-sm text-gray-400">{action.description}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
