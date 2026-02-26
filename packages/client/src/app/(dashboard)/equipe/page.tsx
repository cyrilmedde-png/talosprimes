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
  totalMembers: number;
  activeMembers: number;
  absencesThisMonth: number;
  avgHoursWorked: number;
}

export default function EquipeDashboard(): JSX.Element {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    absencesThisMonth: 0,
    avgHoursWorked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.equipe.dashboard();
        const raw = response.data as unknown as { success: boolean; data: DashboardStats };
        setStats(raw.data);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Équipe</h1>
        <p className="mt-2 text-sm text-gray-400">
          Gestion de l'équipe, absences et pointages
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Total Members */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">Total Membres</p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {stats.totalMembers}
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-3">
              <UsersIcon className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                Membres Actifs
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {stats.activeMembers}
              </p>
            </div>
            <div className="rounded-lg bg-green-500/20 p-3">
              <CheckCircleIcon className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>

        {/* Absences This Month */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                Absences ce mois
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {stats.absencesThisMonth}
              </p>
            </div>
            <div className="rounded-lg bg-red-500/20 p-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
            </div>
          </div>
        </div>

        {/* Average Hours Worked */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                Heures moyennes
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {stats.avgHoursWorked.toFixed(1)}h
              </p>
            </div>
            <div className="rounded-lg bg-purple-500/20 p-3">
              <ClockIcon className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-white">Actions rapides</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            href="/equipe/membres"
            className="flex items-center space-x-3 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-blue-500/50 hover:bg-blue-900/20"
          >
            <UsersIcon className="h-6 w-6 text-blue-400" />
            <div>
              <p className="font-medium text-white">Membres</p>
              <p className="text-sm text-gray-400">Gérer les membres</p>
            </div>
          </Link>

          <Link
            href="/equipe/absences"
            className="flex items-center space-x-3 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-red-500/50 hover:bg-red-900/20"
          >
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
            <div>
              <p className="font-medium text-white">Absences</p>
              <p className="text-sm text-gray-400">Gérer les absences</p>
            </div>
          </Link>

          <Link
            href="/equipe/pointage"
            className="flex items-center space-x-3 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-green-500/50 hover:bg-green-900/20"
          >
            <ClockIcon className="h-6 w-6 text-green-400" />
            <div>
              <p className="font-medium text-white">Pointage</p>
              <p className="text-sm text-gray-400">Gérer les pointages</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
