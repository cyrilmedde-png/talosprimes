'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  EyeIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface Call {
  id: string;
  dateAppel: string;
  appelant: string;
  telephone: string;
  duree: number;
  urgence: 'CRITIQUE' | 'URGENT' | 'STANDARD' | 'INFO';
  sentiment: 'POSITIF' | 'NEUTRE' | 'FRUSTRE' | 'EN_DETRESSE';
  suivi: boolean;
  direction: 'entrant' | 'sortant';
}

interface CallDetail extends Call {
  transcription?: string;
  conversation?: string;
  notes?: string;
}

export default function AppelsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallDetail | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingFollowup, setUpdatingFollowup] = useState(false);

  // Filter states
  const [filterUrgence, setFilterUrgence] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSentiment, setFilterSentiment] = useState<string>('');
  const [filterDirection, setFilterDirection] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadCalls();
  }, [router]);

  const loadCalls = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: Record<string, any> = {};
      if (filterUrgence) filters.urgence = filterUrgence;
      if (filterStatus) filters.suivi = filterStatus === 'avec_suivi';
      if (filterSentiment) filters.sentiment = filterSentiment;
      if (filterDirection) filters.direction = filterDirection;
      if (filterDateFrom) filters.dateFrom = filterDateFrom;
      if (filterDateTo) filters.dateTo = filterDateTo;

      const response = await apiClient.callLogs.list(filters);
      if (response.success && response.data) {
        setCalls((response.data.callLogs || []) as Call[]);
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

  const handleApplyFilters = () => {
    loadCalls();
  };

  const handleClearFilters = () => {
    setFilterUrgence('');
    setFilterStatus('');
    setFilterSentiment('');
    setFilterDirection('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleRowClick = async (call: Call) => {
    try {
      const response = await apiClient.callLogs.get(call.id);
      if (response.success && response.data) {
        setSelectedCall(response.data as CallDetail);
        setShowModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    }
  };

  const handleMarkFollowupDone = async () => {
    if (!selectedCall) return;

    try {
      setUpdatingFollowup(true);
      const response = await apiClient.callLogs.update(selectedCall.id, {
        followUpDone: true,
      });

      if (response.success) {
        setSelectedCall({ ...selectedCall, suivi: true });
        // Update the calls list
        setCalls(
          calls.map((c) => (c.id === selectedCall.id ? { ...c, suivi: true } : c))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
    } finally {
      setUpdatingFollowup(false);
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

  if (loading && calls.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement des appels...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Journal des appels</h1>
          <p className="mt-2 text-sm text-gray-400">
            Historique complet des appels gérés par l'Agent IA
          </p>
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

      {/* Filter Bar */}
      <div className="mb-6 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
        <h3 className="text-lg font-semibold text-white mb-4">Filtrer</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Urgence
            </label>
            <select
              value={filterUrgence}
              onChange={(e) => setFilterUrgence(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tous</option>
              <option value="CRITIQUE">Critique</option>
              <option value="URGENT">Urgent</option>
              <option value="STANDARD">Standard</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Statut
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tous</option>
              <option value="avec_suivi">Avec suivi</option>
              <option value="sans_suivi">Sans suivi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sentiment
            </label>
            <select
              value={filterSentiment}
              onChange={(e) => setFilterSentiment(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tous</option>
              <option value="POSITIF">Positif</option>
              <option value="NEUTRE">Neutre</option>
              <option value="FRUSTRE">Frustré</option>
              <option value="EN_DETRESSE">En détresse</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Direction
            </label>
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tous</option>
              <option value="entrant">Entrant</option>
              <option value="sortant">Sortant</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Du
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Au
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Appliquer les filtres
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md overflow-hidden">
        <div className="p-6 border-b border-gray-700/30">
          <h2 className="text-xl font-bold text-white">
            Tous les appels ({calls.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700/30">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Appelant
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Téléphone
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Urgence
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Sentiment
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Suivi
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {calls.length > 0 ? (
                calls.map((call) => (
                  <tr
                    key={call.id}
                    className="hover:bg-gray-700/20 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(call)}
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
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {call.appelant}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {call.telephone}
                    </td>
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
                    <td className="px-6 py-4 text-sm">
                      {call.suivi ? (
                        <CheckIcon className="h-5 w-5 text-green-400" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-600 rounded" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(call);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                      >
                        <EyeIcon className="h-4 w-4" />
                        Détails
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-400">
                    Aucun appel trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700/50 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700/30 flex justify-between items-center sticky top-0 bg-gray-800">
              <h3 className="text-xl font-bold text-white">
                Détails de l'appel
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Call Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Appelant</p>
                  <p className="text-white font-medium">{selectedCall.appelant}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Téléphone</p>
                  <p className="text-white font-medium">{selectedCall.telephone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Date</p>
                  <p className="text-white font-medium">
                    {new Date(selectedCall.dateAppel).toLocaleDateString(
                      'fr-FR',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Durée</p>
                  <p className="text-white font-medium">
                    {formatDuration(selectedCall.duree)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Urgence</p>
                  <span
                    className={`px-3 py-1 rounded-full border text-xs font-medium inline-block ${getUrgenceBadgeColor(
                      selectedCall.urgence
                    )}`}
                  >
                    {selectedCall.urgence}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Sentiment</p>
                  <span
                    className={`px-3 py-1 rounded-full border text-xs font-medium inline-block ${getSentimentBadgeColor(
                      selectedCall.sentiment
                    )}`}
                  >
                    {selectedCall.sentiment}
                  </span>
                </div>
              </div>

              {/* Transcription */}
              {selectedCall.transcription && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">
                    Transcription
                  </h4>
                  <div className="bg-gray-900/30 border border-gray-700/30 rounded p-4 max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {selectedCall.transcription}
                    </p>
                  </div>
                </div>
              )}

              {/* Conversation */}
              {selectedCall.conversation && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">
                    Journal de conversation
                  </h4>
                  <div className="bg-gray-900/30 border border-gray-700/30 rounded p-4 max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {selectedCall.conversation}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCall.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">
                    Notes
                  </h4>
                  <div className="bg-gray-900/30 border border-gray-700/30 rounded p-4">
                    <p className="text-sm text-gray-300">{selectedCall.notes}</p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {!selectedCall.suivi && (
                <button
                  onClick={handleMarkFollowupDone}
                  disabled={updatingFollowup}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-md font-medium transition-colors"
                >
                  {updatingFollowup ? 'Mise à jour...' : 'Marquer suivi fait'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
