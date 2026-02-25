'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalMembres: number;
  absencesEnCours: number;
  pointagesAujourdhui: number;
  tauxPresence: number;
}

export default function EquipeDashboard(): JSX.Element {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembres: 0,
    absencesEnCours: 0,
    pointagesAujourdhui: 0,
    tauxPresence: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.equipe.dashboard();
        setStats(response.data as unknown as DashboardStats);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Équipe</h1>
        <p className="mt-2 text-gray-600">
          Gestion de l'équipe, absences et pointages
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Membres */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Membres</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.totalMembres}
              </p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Absences en cours */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Absences en cours
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.absencesEnCours}
              </p>
            </div>
            <div className="rounded-lg bg-red-100 p-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Pointages Aujourd'hui */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Pointages aujourd'hui
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.pointagesAujourdhui}
              </p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Taux de présence */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Taux de présence
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.tauxPresence}%
              </p>
            </div>
            <div className="rounded-lg bg-purple-100 p-3">
              <CheckCircleIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Actions rapides</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            href="/equipe/membres"
            className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-500 hover:bg-blue-50"
          >
            <UsersIcon className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Membres</p>
              <p className="text-sm text-gray-600">Gérer les membres</p>
            </div>
          </Link>

          <Link
            href="/equipe/absences"
            className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-red-500 hover:bg-red-50"
          >
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-gray-900">Absences</p>
              <p className="text-sm text-gray-600">Gérer les absences</p>
            </div>
          </Link>

          <Link
            href="/equipe/pointage"
            className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-green-500 hover:bg-green-50"
          >
            <ClockIcon className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Pointage</p>
              <p className="text-sm text-gray-600">Gérer les pointages</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
