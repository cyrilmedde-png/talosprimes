'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  UserGroupIcon,
  DocumentTextIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  FolderIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

interface RhDashboardStats {
  totalContrats: number;
  contratsActifs: number;
  congesEnAttente: number;
  formationsEnCours: number;
  evaluationsCeMois: number;
  masseSalariale: number;
  tauxAbsenteisme: number;
  effectifTotal: number;
}

export default function RhDashboard(): JSX.Element {
  const [stats, setStats] = useState<RhDashboardStats>({
    totalContrats: 0,
    contratsActifs: 0,
    congesEnAttente: 0,
    formationsEnCours: 0,
    evaluationsCeMois: 0,
    masseSalariale: 0,
    tauxAbsenteisme: 0,
    effectifTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.rh.dashboard();
        const raw = response.data as unknown as { success: boolean; data: RhDashboardStats };
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
        <h1 className="text-3xl font-bold text-white">Ressources Humaines</h1>
        <p className="mt-2 text-sm text-gray-400">
          Gestion des contrats, paie, congés et évaluations
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Effectif Total */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">Effectif Total</p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {stats.effectifTotal}
              </p>
            </div>
            <div className="rounded-lg bg-indigo-500/20 p-3">
              <UserGroupIcon className="h-6 w-6 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Contrats Actifs */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                Contrats Actifs
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {stats.contratsActifs}
              </p>
            </div>
            <div className="rounded-lg bg-green-500/20 p-3">
              <DocumentTextIcon className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>

        {/* Masse Salariale */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                Masse Salariale
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                €{(stats.masseSalariale / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k
              </p>
            </div>
            <div className="rounded-lg bg-purple-500/20 p-3">
              <CurrencyEuroIcon className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Taux d'Absentéisme */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                Taux d'Absentéisme
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {stats.tauxAbsenteisme.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg bg-orange-500/20 p-3">
              <ChartBarIcon className="h-6 w-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 mb-8">
        {/* Congés en Attente */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                Congés en Attente
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {stats.congesEnAttente}
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-3">
              <CalendarDaysIcon className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Formations en Cours */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                Formations en Cours
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {stats.formationsEnCours}
              </p>
            </div>
            <div className="rounded-lg bg-teal-500/20 p-3">
              <AcademicCapIcon className="h-6 w-6 text-teal-400" />
            </div>
          </div>
        </div>

        {/* Évaluations ce Mois */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                Évaluations ce Mois
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {stats.evaluationsCeMois}
              </p>
            </div>
            <div className="rounded-lg bg-pink-500/20 p-3">
              <ClipboardDocumentCheckIcon className="h-6 w-6 text-pink-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-white">Liens rapides</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/rh/contrats"
            className="flex items-center space-x-3 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-blue-500/50 hover:bg-blue-900/20"
          >
            <DocumentTextIcon className="h-6 w-6 text-blue-400" />
            <div>
              <p className="font-medium text-white">Contrats</p>
              <p className="text-sm text-gray-400">Gérer les contrats</p>
            </div>
          </Link>

          <Link
            href="/rh/paie"
            className="flex items-center space-x-3 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-green-500/50 hover:bg-green-900/20"
          >
            <BanknotesIcon className="h-6 w-6 text-green-400" />
            <div>
              <p className="font-medium text-white">Paie</p>
              <p className="text-sm text-gray-400">Gérer la paie</p>
            </div>
          </Link>

          <Link
            href="/rh/conges"
            className="flex items-center space-x-3 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-yellow-500/50 hover:bg-yellow-900/20"
          >
            <CalendarDaysIcon className="h-6 w-6 text-yellow-400" />
            <div>
              <p className="font-medium text-white">Congés</p>
              <p className="text-sm text-gray-400">Gérer les congés</p>
            </div>
          </Link>

          <Link
            href="/rh/documents"
            className="flex items-center space-x-3 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-purple-500/50 hover:bg-purple-900/20"
          >
            <FolderIcon className="h-6 w-6 text-purple-400" />
            <div>
              <p className="font-medium text-white">Documents</p>
              <p className="text-sm text-gray-400">Gérer les documents</p>
            </div>
          </Link>

          <Link
            href="/rh/entretiens"
            className="flex items-center space-x-3 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-pink-500/50 hover:bg-pink-900/20"
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-pink-400" />
            <div>
              <p className="font-medium text-white">Entretiens</p>
              <p className="text-sm text-gray-400">Gérer les entretiens</p>
            </div>
          </Link>

          <Link
            href="/rh/formations"
            className="flex items-center space-x-3 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-teal-500/50 hover:bg-teal-900/20"
          >
            <AcademicCapIcon className="h-6 w-6 text-teal-400" />
            <div>
              <p className="font-medium text-white">Formations</p>
              <p className="text-sm text-gray-400">Gérer les formations</p>
            </div>
          </Link>

          <Link
            href="/rh/evaluations"
            className="flex items-center space-x-3 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-indigo-500/50 hover:bg-indigo-900/20"
          >
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-indigo-400" />
            <div>
              <p className="font-medium text-white">Évaluations</p>
              <p className="text-sm text-gray-400">Gérer les évaluations</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
