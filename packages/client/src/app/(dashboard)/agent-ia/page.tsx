'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  PhoneIcon,
  ClockIcon,
  ArrowUpRightIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Call {
  id: string;
  dateAppel: string;
  appelant: string;
  telephone: string;
  duree: number; // en secondes
  urgence: 'CRITIQUE' | 'URGENT' | 'STANDARD' | 'INFO';
  sentiment: 'POSITIF' | 'NEUTRE' | 'FRUSTRE' | 'EN_DETRESSE';
  suivi: string;
}

interface DashboardStats {
  totalCalls: number;
  todayCalls: number;
  avgDuration: number;
  urgentCalls: number;
  rdvPris: number;
  dispatches: number;
  pendingFollowups: number;
  positiveSentiment: number;
  negativeSentiment: number;
  callsByDay: CallsPerDay[];
}

interface CallsByDay {
  jour: string;
  nombre: number;
}

interface CallsPerDay {
  jour: string;
  nombre: number;
}

export default function AgentIAPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    todayCalls: 0,
    avgDuration: 0,
    urgentCalls: 0,
    rdvPris: 0,
    dispatches: 0,
    pendingFollowups: 0,
    positiveSentiment: 0,
    negativeSentiment: 0,
    callsByDay: [],
  });
  const [calls, setCalls] = useState<Call[]>([]);
  const [callsPerDay, setCallsPerDay] = useState<CallsPerDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadDashboard();
  }, [router]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les statistiques
      const statsResponse = await apiClient.callLogs.stats();
      if (statsResponse.success && statsResponse.data) {
        const statsData = statsResponse.data.stats;
        setStats(statsData);
        // Set callsByDay from the stats response
        if (statsData.callsByDay) {
          setCallsPerDay(statsData.callsByDay as CallsPerDay[]);
        }
      }

      // Charger les appels récents
      const callsResponse = await apiClient.callLogs.list();
      if (callsResponse.success && callsResponse.data) {
        setCalls((callsResponse.data.callLogs || []).slice(0, 10) as Call[]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(errorMessage);
      if (errorMessage.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getUrgenceBadgeColor = (urgence: string): string => {
    switch (urgence) {
      case 'CRITIQUE':
        return 'bg-red-900/30 text-red-300 border-red-700/30';
      case 'URGENT':
        return 'bg-orange-900/30 text-orange-300 border-orange-700/30';
      case 'STANDARD':
        return 'bg-blue-900/30 text-blue-300 border-blue-700/30';
      case 'INFO':
        return 'bg-green-900/30 text-green-300 border-green-700/30';
      default:
        return 'bg-gray-900/30 text-gray-300 border-gray-700/30';
    }
  };

  const getSentimentBadgeColor = (sentiment: string): string => {
    switch (sentiment) {
      case 'POSITIF':
        return 'bg-green-900/30 text-green-300 border-green-700/30';
      case 'NEUTRE':
        return 'bg-gray-900/30 text-gray-300 border-gray-700/30';
      case 'FRUSTRE':
        return 'bg-orange-900/30 text-orange-300 border-orange-700/30';
      case 'EN_DETRESSE':
        return 'bg-red-900/30 text-red-300 border-red-700/30';
      default:
        return 'bg-gray-900/30 text-gray-300 border-gray-700/30';
    }
  };

  const maxCalls = Math.max(...callsPerDay.map(d => d.nombre), 1);
  const chartHeight = 200;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Agent IA</h1>
          <p className="mt-2 text-sm text-gray-400">
            Tableau de bord des appels et interactions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/agent-ia/appels')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
          >
            <EyeIcon className="h-5 w-5" />
            Voir tous les appels
          </button>
          <button
            onClick={() => router.push('/agent-ia/configuration')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            <PhoneIcon className="h-5 w-5" />
            Déclencher un appel
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-400 hover:text-red-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Appels aujourd'hui</h3>
            <PhoneIcon className="h-6 w-6 text-blue-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.todayCalls}</p>
        </div>

        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Suivis en attente</h3>
            <ClockIcon className="h-6 w-6 text-orange-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.pendingFollowups}</p>
        </div>

        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">RDV pris</h3>
            <ArrowUpRightIcon className="h-6 w-6 text-green-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.rdvPris}</p>
        </div>

        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Sentiment positif</h3>
            <div className="h-6 w-6 rounded-full bg-green-400/20 border border-green-400/50" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.positiveSentiment}%</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-8">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white mb-6">Appels par jour (7 derniers jours)</h2>

          <div className="flex items-end justify-center gap-2" style={{ height: chartHeight }}>
            {callsPerDay.length > 0 ? (
              callsPerDay.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md transition-all hover:opacity-80 cursor-pointer group"
                    style={{
                      height: `${(day.nombre / maxCalls) * 100}%`,
                      minHeight: day.nombre > 0 ? '4px' : '2px',
                    }}
                    title={`${day.jour}: ${day.nombre} appels`}
                  >
                    <div className="invisible group-hover:visible bg-gray-900 text-white text-xs py-1 px-2 rounded absolute bottom-full mb-1 whitespace-nowrap">
                      {day.nombre}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center">{day.jour}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400">Aucune donnée disponible</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md overflow-hidden">
        <div className="p-6 border-b border-gray-700/30">
          <h2 className="text-xl font-bold text-white">Appels récents</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700/30">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Appelant</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Téléphone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Durée</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Urgence</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Sentiment</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Suivi</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {calls.length > 0 ? (
                calls.map((call) => (
                  <tr
                    key={call.id}
                    className="hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(call.dateAppel).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{call.appelant}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{call.telephone}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {formatDuration(call.duree)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full border text-xs font-medium ${getUrgenceBadgeColor(
                          call.urgence
                        )}`}
                      >
                        {call.urgence}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full border text-xs font-medium ${getSentimentBadgeColor(
                          call.sentiment
                        )}`}
                      >
                        {call.sentiment}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{call.suivi}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => router.push(`/agent-ia/appels/${call.id}`)}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-400">
                    Aucun appel pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
