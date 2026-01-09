'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, Log, LogStats } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

type WorkflowType = 'all' | 'leads' | 'clients';
type LogStatus = 'all' | 'erreur' | 'succes' | 'en_attente';

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<WorkflowType>('all');
  const [statusFilter, setStatusFilter] = useState<LogStatus>('all');
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorsAndWarnings, setErrorsAndWarnings] = useState<Log[]>([]);

  // Recharger les notifications quand on visite la page logs (pour réinitialiser la bulle)
  useEffect(() => {
    // Déclencher un événement personnalisé pour recharger les notifications
    window.dispatchEvent(new CustomEvent('reload-notifications'));
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.logs.stats(activeTab === 'all' ? undefined : activeTab);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des statistiques:', err);
    }
  }, [activeTab]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: {
        workflow?: WorkflowType;
        statutExecution?: 'en_attente' | 'succes' | 'erreur';
        limit?: number;
      } = {
        workflow: activeTab,
        limit: 100,
      };

      if (statusFilter !== 'all') {
        params.statutExecution = statusFilter;
      }

      const response = await apiClient.logs.list(params);
      if (response.success && response.data) {
        setLogs(response.data.logs);
      } else {
        setError(response.error || 'Erreur lors de la récupération des logs.');
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des logs:', err);
      setError('Impossible de charger les logs.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter]);

  const fetchErrorsAndWarnings = useCallback(async () => {
    try {
      const response = await apiClient.logs.list({
        workflow: activeTab === 'all' ? undefined : activeTab,
        statutExecution: 'erreur',
        limit: 50,
      });
      if (response.success && response.data) {
        setErrorsAndWarnings(response.data.logs);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des erreurs:', err);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchStats();
    fetchErrorsAndWarnings();
  }, [fetchStats, fetchErrorsAndWarnings]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'erreur':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'succes':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'en_attente':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'erreur':
        return 'bg-red-900/20 border-red-700/50 text-red-200';
      case 'succes':
        return 'bg-green-900/20 border-green-700/50 text-green-200';
      case 'en_attente':
        return 'bg-yellow-900/20 border-yellow-700/50 text-yellow-200';
      default:
        return 'bg-gray-800/50 border-gray-700/50 text-gray-300';
    }
  };

  const getWorkflowLabel = (workflow?: string) => {
    switch (workflow) {
      case 'leads':
        return 'Leads';
      case 'clients':
        return 'Clients';
      default:
        return 'Autre';
    }
  };

  const getWorkflowBadgeColor = (workflow?: string) => {
    switch (workflow) {
      case 'leads':
        return 'bg-blue-900/30 border-blue-700/50 text-blue-200';
      case 'clients':
        return 'bg-purple-900/30 border-purple-700/50 text-purple-200';
      default:
        return 'bg-gray-800/50 border-gray-700/50 text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Logs des Workflows</h1>
        <p className="text-gray-400 mb-6">Surveillance et suivi des exécutions n8n</p>

        {error && (
          <div className="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Erreur:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* Statistiques globales */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
              <div className="text-sm text-green-400 mb-1">Succès</div>
              <div className="text-2xl font-bold text-green-300">{stats.succeeded}</div>
            </div>
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <div className="text-sm text-red-400 mb-1">Erreurs</div>
              <div className="text-2xl font-bold text-red-300">{stats.errors}</div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
              <div className="text-sm text-yellow-400 mb-1">En attente</div>
              <div className="text-2xl font-bold text-yellow-300">{stats.enAttente}</div>
            </div>
          </div>
        )}

        {/* Alertes Erreurs et Warnings en premier */}
        {errorsAndWarnings.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              Erreurs et Warnings ({errorsAndWarnings.length})
            </h2>
            <div className="space-y-3">
              {errorsAndWarnings.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className={`bg-red-900/20 border-l-4 border-red-500 rounded-lg p-4 ${getStatusColor(log.statutExecution)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(log.statutExecution)}
                        <span className="font-semibold text-red-200">Erreur</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getWorkflowBadgeColor(log.workflow)}`}>
                          {getWorkflowLabel(log.workflow)}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{log.typeEvenement}</p>
                      <p className="text-xs text-gray-400 mb-2">
                        Entité: {log.entiteType} {log.entityEmail ? `(${log.entityEmail})` : `(${log.entiteId.slice(0, 8)}...)`}
                      </p>
                      {log.messageErreur && (
                        <p className="text-xs text-red-300/80 mb-2">{log.messageErreur}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errorsAndWarnings.length > 5 && (
              <p className="text-sm text-gray-400 mt-2">
                ... et {errorsAndWarnings.length - 5} autre(s) erreur(s) - voir dans les onglets ci-dessous
              </p>
            )}
          </div>
        )}

        {/* Onglets par workflow */}
        <div className="mb-4">
          <div className="flex space-x-4 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'leads'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Leads
              {(stats?.byWorkflow?.leads?.errors ?? 0) > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                  {stats?.byWorkflow?.leads?.errors ?? 0}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'clients'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Clients
              {(stats?.byWorkflow?.clients?.errors ?? 0) > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                  {stats?.byWorkflow?.clients?.errors ?? 0}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filtres par statut */}
        <div className="mb-4 flex space-x-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setStatusFilter('erreur')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'erreur' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Erreurs
          </button>
          <button
            onClick={() => setStatusFilter('succes')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'succes' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Succès
          </button>
          <button
            onClick={() => setStatusFilter('en_attente')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'en_attente' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            En attente
          </button>
        </div>

        {/* Liste des logs */}
        {loading ? (
          <p className="text-gray-400">Chargement des logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-400">Aucun log à afficher.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${getStatusColor(log.statutExecution)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(log.statutExecution)}
                      <span className="font-semibold capitalize">{log.statutExecution.replace('_', ' ')}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getWorkflowBadgeColor(log.workflow)}`}>
                        {getWorkflowLabel(log.workflow)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">{log.typeEvenement}</p>
                    <p className="text-xs text-gray-400 mb-2">
                      Entité: {log.entiteType} {log.entityEmail ? `(${log.entityEmail})` : `(${log.entiteId.slice(0, 8)}...)`}
                    </p>
                    {log.messageErreur && (
                      <p className="text-xs text-red-300/80 mb-2 bg-red-900/30 p-2 rounded">
                        {log.messageErreur}
                      </p>
                    )}
                    {log.workflowN8nDeclenche && (
                      <p className="text-xs text-blue-400 mb-2">
                        Workflow n8n: {log.workflowN8nId || 'N/A'}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

