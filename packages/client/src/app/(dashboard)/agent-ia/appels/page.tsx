'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  PhoneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// Interface alignée sur les champs Prisma retournés par l'API
interface CallLog {
  id: string;
  createdAt: string;
  callerName?: string | null;
  callerPhone?: string;
  caller_phone?: string;
  duration?: number;
  urgencyLevel?: string;
  urgency_level?: string;
  sentiment?: string;
  followUpRequired?: boolean;
  follow_up_required?: boolean;
  followUpDone?: boolean;
  follow_up_done?: boolean;
  direction?: string;
  status?: string;
  actionTaken?: string;
  action_taken?: string;
  callSid?: string;
  call_sid?: string;
  transcript?: string | null;
  conversationLog?: unknown;
  conversation_log?: unknown;
  notes?: string | null;
  callerEmail?: string | null;
  niche?: string | null;
  created_at?: string;
}

export default function AppelsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingFollowup, setUpdatingFollowup] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callingInProgress, setCallingInProgress] = useState(false);
  const [callData, setCallData] = useState({ to: '', reason: 'suivi_lead', reasonText: '' });

  const [filterUrgence, setFilterUrgence] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('');
  const [filterDirection, setFilterDirection] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

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

      const filters: Record<string, string> = {};
      if (filterUrgence) filters.urgencyLevel = filterUrgence;
      if (filterSentiment) filters.sentiment = filterSentiment;
      if (filterDirection) filters.direction = filterDirection;
      if (filterDateFrom) filters.dateFrom = filterDateFrom;
      if (filterDateTo) filters.dateTo = filterDateTo;

      const response = await apiClient.callLogs.list(filters);
      if (response.success && response.data) {
        const raw = response.data;
        const logs = (raw.callLogs || raw.calls || []) as CallLog[];
        setCalls(logs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(msg);
      if (msg.includes('Session expirée')) router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => loadCalls();

  const handleClearFilters = () => {
    setFilterUrgence('');
    setFilterStatus('');
    setFilterSentiment('');
    setFilterDirection('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleRowClick = async (call: CallLog) => {
    try {
      const response = await apiClient.callLogs.get(call.id);
      if (response.success && response.data) {
        const detail = (response.data.callLog || response.data) as CallLog;
        setSelectedCall(detail);
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
      const response = await apiClient.callLogs.update(selectedCall.id, { followUpDone: true });
      if (response.success) {
        setSelectedCall({ ...selectedCall, followUpDone: true, follow_up_done: true });
        setCalls(calls.map((c) => (c.id === selectedCall.id ? { ...c, followUpDone: true, follow_up_done: true } : c)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
    } finally {
      setUpdatingFollowup(false);
    }
  };

  const handleOutboundCall = async () => {
    const phone = callData.to.replace(/[^+0-9]/g, '');
    if (!phone) {
      setError('Numéro de téléphone requis');
      return;
    }
    const reason = callData.reason === 'autre' ? callData.reasonText : callData.reason;
    if (!reason) {
      setError('Raison de l\'appel requise');
      return;
    }
    try {
      setCallingInProgress(true);
      setError(null);
      await apiClient.twilioConfig.outboundCall({ to: phone, reason });
      setShowCallModal(false);
      setCallData({ to: '', reason: 'suivi_lead', reasonText: '' });
      await loadCalls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du lancement de l\'appel');
    } finally {
      setCallingInProgress(false);
    }
  };

  // Getters robustes (camelCase ou snake_case)
  const getDate = (c: CallLog) => c.createdAt || c.created_at || '';
  const getName = (c: CallLog) => c.callerName || '';
  const getPhone = (c: CallLog) => c.callerPhone || c.caller_phone || '';
  const getDuration = (c: CallLog) => c.duration ?? 0;
  const getUrgency = (c: CallLog) => c.urgencyLevel || c.urgency_level || '';
  const getSentiment = (c: CallLog) => c.sentiment || '';
  const getAction = (c: CallLog) => c.actionTaken || c.action_taken || '';
  const getFollowUp = (c: CallLog) => c.followUpRequired || c.follow_up_required || false;
  const getFollowUpDone = (c: CallLog) => c.followUpDone || c.follow_up_done || false;
  const getTranscript = (c: CallLog) => c.transcript || '';
  const getConversation = (c: CallLog) => {
    const log = c.conversationLog || c.conversation_log;
    return typeof log === 'string' ? log : log ? JSON.stringify(log, null, 2) : '';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '-';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
  };

  const getUrgenceBadgeColor = (urgence: string): string => {
    switch (urgence) {
      case 'CRITIQUE': return 'bg-red-900/30 text-red-300 border-red-700/30';
      case 'URGENT': return 'bg-orange-900/30 text-orange-300 border-orange-700/30';
      case 'STANDARD': return 'bg-blue-900/30 text-blue-300 border-blue-700/30';
      case 'INFO': return 'bg-green-900/30 text-green-300 border-green-700/30';
      default: return 'bg-gray-900/30 text-gray-300 border-gray-700/30';
    }
  };

  const getSentimentBadgeColor = (sentiment: string): string => {
    switch (sentiment) {
      case 'POSITIF': return 'bg-green-900/30 text-green-300 border-green-700/30';
      case 'NEUTRE': return 'bg-gray-900/30 text-gray-300 border-gray-700/30';
      case 'FRUSTRE': return 'bg-orange-900/30 text-orange-300 border-orange-700/30';
      case 'EN_DETRESSE': return 'bg-red-900/30 text-red-300 border-red-700/30';
      default: return 'bg-gray-900/30 text-gray-300 border-gray-700/30';
    }
  };

  const actionLabels: Record<string, string> = {
    INFO: 'Information',
    DEVIS: 'Devis',
    RDV: 'Rendez-vous',
    TRANSFERT: 'Transfert',
    DISPATCH: 'Dispatch',
  };

  // Filtrage suivi côté client
  const filteredCalls = calls.filter((c) => {
    if (filterStatus === 'avec_suivi' && !getFollowUp(c)) return false;
    if (filterStatus === 'sans_suivi' && getFollowUp(c)) return false;
    return true;
  });

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
            Historique complet des appels gérés par l&apos;Agent IA
          </p>
        </div>
        <button
          onClick={() => {
            setCallData({ to: '', reason: 'suivi_lead', reasonText: '' });
            setShowCallModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors"
        >
          <PhoneIcon className="h-5 w-5" />
          Nouvel appel
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
          <button onClick={() => setError(null)} className="float-right text-red-400 hover:text-red-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="mb-6 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
        <h3 className="text-lg font-semibold text-white mb-4">Filtrer</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Urgence</label>
            <select value={filterUrgence} onChange={(e) => setFilterUrgence(e.target.value)} className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="">Tous</option>
              <option value="CRITIQUE">Critique</option>
              <option value="URGENT">Urgent</option>
              <option value="STANDARD">Standard</option>
              <option value="INFO">Info</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Suivi</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="">Tous</option>
              <option value="avec_suivi">Avec suivi</option>
              <option value="sans_suivi">Sans suivi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sentiment</label>
            <select value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)} className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="">Tous</option>
              <option value="POSITIF">Positif</option>
              <option value="NEUTRE">Neutre</option>
              <option value="FRUSTRE">Frustré</option>
              <option value="EN_DETRESSE">En détresse</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Direction</label>
            <select value={filterDirection} onChange={(e) => setFilterDirection(e.target.value)} className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="">Tous</option>
              <option value="entrant">Entrant</option>
              <option value="sortant">Sortant</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Du</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Au</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={handleApplyFilters} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors">
            Appliquer les filtres
          </button>
          <button onClick={handleClearFilters} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors">
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md overflow-hidden">
        <div className="p-6 border-b border-gray-700/30">
          <h2 className="text-xl font-bold text-white">
            Tous les appels ({filteredCalls.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700/30">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Appelant</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Téléphone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Durée</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Action</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Urgence</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Sentiment</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Suivi</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {filteredCalls.length > 0 ? (
                filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-700/20 transition-colors cursor-pointer" onClick={() => handleRowClick(call)}>
                    <td className="px-6 py-4 text-sm text-gray-300">{formatDate(getDate(call))}</td>
                    <td className="px-6 py-4 text-sm text-white font-medium">{getName(call) || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 font-mono">{getPhone(call) || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{formatDuration(getDuration(call))}</td>
                    <td className="px-6 py-4 text-sm">
                      {getAction(call) ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300">
                          {actionLabels[getAction(call)] || getAction(call)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getUrgency(call) ? (
                        <span className={`px-3 py-1 rounded-full border text-xs font-medium ${getUrgenceBadgeColor(getUrgency(call))}`}>
                          {getUrgency(call)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getSentiment(call) ? (
                        <span className={`px-3 py-1 rounded-full border text-xs font-medium ${getSentimentBadgeColor(getSentiment(call))}`}>
                          {getSentiment(call)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getFollowUp(call) ? (
                        getFollowUpDone(call) ? (
                          <CheckIcon className="h-5 w-5 text-green-400" />
                        ) : (
                          <div className="h-5 w-5 border-2 border-yellow-500 rounded" title="Suivi requis" />
                        )
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRowClick(call); }}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                      >
                        <EyeIcon className="h-4 w-4" />
                        Voir
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    Aucun appel trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Appel Sortant IA */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-amber-400" />
                Nouvel appel sortant IA
              </h2>
              <button
                onClick={() => {
                  setShowCallModal(false);
                  setCallData({ to: '', reason: 'suivi_lead', reasonText: '' });
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Numéro de téléphone *
                </label>
                <input
                  type="tel"
                  value={callData.to}
                  onChange={(e) => setCallData({ ...callData, to: e.target.value })}
                  placeholder="+33612345678"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Raison de l&apos;appel *
                </label>
                <select
                  value={callData.reason}
                  onChange={(e) => setCallData({ ...callData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="suivi_lead">Suivi lead</option>
                  <option value="rappel">Rappel demandé</option>
                  <option value="relance_devis">Relance devis</option>
                  <option value="suivi_client">Suivi client</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              {callData.reason === 'autre' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Précisez *
                  </label>
                  <textarea
                    value={callData.reasonText}
                    onChange={(e) => setCallData({ ...callData, reasonText: e.target.value })}
                    rows={2}
                    placeholder="Décrivez la raison de l'appel..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
              <p className="text-sm text-gray-400">
                L&apos;agent IA va appeler ce numéro et mener la conversation selon la raison
                sélectionnée.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleOutboundCall}
                disabled={callingInProgress}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {callingInProgress ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Lancement...
                  </>
                ) : (
                  <>
                    <PhoneIcon className="h-5 w-5" />
                    Lancer l&apos;appel
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowCallModal(false);
                  setCallData({ to: '', reason: 'suivi_lead', reasonText: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700/50 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700/30 flex justify-between items-center sticky top-0 bg-gray-800">
              <h3 className="text-xl font-bold text-white">Détails de l&apos;appel</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-300">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Appelant</p>
                  <p className="text-white font-medium">{getName(selectedCall) || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Téléphone</p>
                  <p className="text-white font-medium font-mono">{getPhone(selectedCall)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Date</p>
                  <p className="text-white font-medium">{formatDate(getDate(selectedCall))}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Durée</p>
                  <p className="text-white font-medium">{formatDuration(getDuration(selectedCall))}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Action</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300">
                    {actionLabels[getAction(selectedCall)] || getAction(selectedCall) || '-'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Direction</p>
                  <p className="text-white font-medium capitalize">{selectedCall.direction || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Urgence</p>
                  {getUrgency(selectedCall) ? (
                    <span className={`px-3 py-1 rounded-full border text-xs font-medium inline-block ${getUrgenceBadgeColor(getUrgency(selectedCall))}`}>
                      {getUrgency(selectedCall)}
                    </span>
                  ) : <span className="text-gray-500">-</span>}
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Sentiment</p>
                  {getSentiment(selectedCall) ? (
                    <span className={`px-3 py-1 rounded-full border text-xs font-medium inline-block ${getSentimentBadgeColor(getSentiment(selectedCall))}`}>
                      {getSentiment(selectedCall)}
                    </span>
                  ) : <span className="text-gray-500">-</span>}
                </div>
              </div>

              {getTranscript(selectedCall) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Transcription</h4>
                  <div className="bg-gray-900/30 border border-gray-700/30 rounded p-4 max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{getTranscript(selectedCall)}</p>
                  </div>
                </div>
              )}

              {getConversation(selectedCall) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Journal de conversation</h4>
                  <div className="bg-gray-900/30 border border-gray-700/30 rounded p-4 max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{getConversation(selectedCall)}</p>
                  </div>
                </div>
              )}

              {selectedCall.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Notes</h4>
                  <div className="bg-gray-900/30 border border-gray-700/30 rounded p-4">
                    <p className="text-sm text-gray-300">{selectedCall.notes}</p>
                  </div>
                </div>
              )}

              {getFollowUp(selectedCall) && !getFollowUpDone(selectedCall) && (
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
