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
        setStats(response.data);
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Projets</h1>
          <p className="text-gray-600 mt-2">Bienvenue sur votre tableau de bord projets</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Erreur: {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-spin" />
            </div>
            <span className="ml-3 text-gray-600">Chargement des statistiques...</span>
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
                    className="bg-white rounded-lg shadow p-6 border-l-4"
                    style={{
                      borderLeftColor: card.color.replace('bg-', ''),
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">{card.title}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
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
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={index}
                      href={action.href}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">{action.title}</p>
                          <p className="text-sm text-gray-500">{action.description}</p>
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
