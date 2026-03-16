'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, Log, LogStats } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// ──────────────────────────────────────────
// Modules & classification
// ──────────────────────────────────────────

const MODULE_CONFIG: Record<string, { label: string; color: string; badgeColor: string; events: string[] }> = {
  leads: {
    label: 'Leads',
    color: 'border-blue-500',
    badgeColor: 'bg-blue-900/30 border-blue-700/50 text-blue-200',
    events: [
      'lead_create', 'lead_created', 'lead_update', 'lead_updated',
      'lead_delete', 'lead_deleted', 'lead_questionnaire', 'lead_entretien',
      'lead_confirmation', 'lead_inscription', 'leads_list', 'lead_get',
      'lead_update_status', 'lead_status_updated',
    ],
  },
  clients: {
    label: 'Clients',
    color: 'border-purple-500',
    badgeColor: 'bg-purple-900/30 border-purple-700/50 text-purple-200',
    events: [
      'client.created', 'client.updated', 'client.deleted', 'client.onboarding',
      'client_create', 'client_update', 'client_delete', 'client_create_from_lead',
      'clients_list', 'client_get',
    ],
  },
  facturation: {
    label: 'Facturation',
    color: 'border-emerald-500',
    badgeColor: 'bg-emerald-900/30 border-emerald-700/50 text-emerald-200',
    events: [
      'invoice_create', 'invoice_send', 'invoice_paid', 'invoice_overdue',
      'invoice_get', 'invoice_update', 'invoice_delete', 'invoice_generate_pdf',
      'invoices_list', 'devis_list', 'devis_get', 'devis_create', 'devis_send',
      'devis_accept', 'devis_convert_to_invoice', 'devis_convert_to_bdc',
      'devis_update', 'devis_delete', 'bdc_list', 'bdc_get', 'bdc_create',
      'bdc_update', 'bdc_validate', 'bdc_convert_to_invoice', 'bdc_delete',
      'avoir_list', 'avoir_get', 'avoir_create', 'avoir_validate', 'avoir_delete',
      'invoice_convert_to_avoir', 'proforma_list', 'proforma_get', 'proforma_create',
      'proforma_send', 'proforma_accept', 'proforma_convert_to_invoice', 'proforma_delete',
    ],
  },
  abonnements: {
    label: 'Abonnements',
    color: 'border-amber-500',
    badgeColor: 'bg-amber-900/30 border-amber-700/50 text-amber-200',
    events: [
      'subscription_renewal', 'subscription_cancelled', 'subscription_suspended',
      'subscription_upgrade', 'stripe_checkout_completed',
    ],
  },
  marketing: {
    label: 'Marketing',
    color: 'border-pink-500',
    badgeColor: 'bg-pink-900/30 border-pink-700/50 text-pink-200',
    events: [
      'marketing_post_create', 'marketing_post_publish', 'marketing_stats',
    ],
  },
  auth: {
    label: 'Authentification',
    color: 'border-cyan-500',
    badgeColor: 'bg-cyan-900/30 border-cyan-700/50 text-cyan-200',
    events: [
      'password_reset_request', 'auth_login', 'auth_register',
    ],
  },
  articles: {
    label: 'Articles / Stock',
    color: 'border-orange-500',
    badgeColor: 'bg-orange-900/30 border-orange-700/50 text-orange-200',
    events: [
      'article_codes_list', 'article_code_create', 'article_code_update', 'article_code_delete',
    ],
  },
  telephonie: {
    label: 'Téléphonie',
    color: 'border-teal-500',
    badgeColor: 'bg-teal-900/30 border-teal-700/50 text-teal-200',
    events: [
      'call_log_list', 'call_log_get', 'call_log_stats', 'call_log_create',
      'call_log_update', 'call_log_delete', 'twilio_config_get', 'twilio_config_update',
      'twilio_test_call', 'twilio_outbound_call', 'sms_list', 'sms_stats', 'sms_send',
    ],
  },
};

function classifyLog(log: Log): string {
  const evt = log.typeEvenement;
  for (const [key, cfg] of Object.entries(MODULE_CONFIG)) {
    if (cfg.events.includes(evt)) return key;
  }
  return 'autre';
}

function getModuleLabel(key: string): string {
  return MODULE_CONFIG[key]?.label || 'Autre';
}

function getModuleBadgeColor(key: string): string {
  return MODULE_CONFIG[key]?.badgeColor || 'bg-gray-800/50 border-gray-700/50 text-gray-300';
}

function getModuleBorderColor(key: string): string {
  return MODULE_CONFIG[key]?.color || 'border-gray-500';
}

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

type MainTab = 'erreurs' | 'tous' | 'succes';

// ──────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'erreur':
      return <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />;
    case 'succes':
      return <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />;
    case 'en_attente':
      return <ClockIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />;
    default:
      return <InformationCircleIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />;
  }
}

function LogCard({ log }: { log: Log }) {
  const module = classifyLog(log);
  const statusColors: Record<string, string> = {
    erreur: 'bg-red-900/20 border-red-700/50',
    succes: 'bg-green-900/20 border-green-700/50',
    en_attente: 'bg-yellow-900/20 border-yellow-700/50',
  };
  const bgColor = statusColors[log.statutExecution] || 'bg-gray-800/50 border-gray-700/50';

  return (
    <div className={`${bgColor} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <StatusIcon status={log.statutExecution} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm capitalize">
              {log.statutExecution.replace('_', ' ')}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getModuleBadgeColor(module)}`}>
              {getModuleLabel(module)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-200 mb-1">{log.typeEvenement}</p>
          <p className="text-xs text-gray-400 mb-1">
            Entité: {log.entiteType}{' '}
            {log.entityEmail
              ? `(${log.entityEmail})`
              : log.entiteId
              ? `(${log.entiteId.slice(0, 8)}...)`
              : ''}
          </p>
          {log.messageErreur && (
            <p className="text-xs text-red-300/80 bg-red-900/30 p-2 rounded mb-1">
              {log.messageErreur}
            </p>
          )}
          {log.workflowN8nDeclenche && log.workflowN8nId && (
            <p className="text-xs text-blue-400 mb-1">Workflow n8n: {log.workflowN8nId}</p>
          )}
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: fr })}
          </p>
        </div>
      </div>
    </div>
  );
}

function ModuleGroup({
  moduleKey,
  logs,
  defaultOpen,
}: {
  moduleKey: string;
  logs: Log[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const errorCount = logs.filter((l) => l.statutExecution === 'erreur').length;
  const pendingCount = logs.filter((l) => l.statutExecution === 'en_attente').length;

  return (
    <div className={`border-l-4 ${getModuleBorderColor(moduleKey)} rounded-lg bg-gray-800/30 overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          )}
          <span className="font-semibold text-white">{getModuleLabel(moduleKey)}</span>
          <span className="text-sm text-gray-400">({logs.length} log{logs.length > 1 ? 's' : ''})</span>
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-medium">
              {errorCount} erreur{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full font-medium">
              {pendingCount} en attente
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {logs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('erreurs');
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recharger les notifications quand on visite la page logs
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('reload-notifications'));
  }, []);

  // ── Fetch stats (global, une seule fois) ──
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.logs.stats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des statistiques:', err);
    }
  }, []);

  // ── Fetch logs selon l'onglet actif ──
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: {
        statutExecution?: 'en_attente' | 'succes' | 'erreur';
        limit?: number;
      } = { limit: 200 };

      if (activeTab === 'erreurs') {
        params.statutExecution = 'erreur';
      } else if (activeTab === 'succes') {
        params.statutExecution = 'succes';
      }
      // 'tous' → pas de filtre statut

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
  }, [activeTab]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Group logs by module ──
  const groupedLogs = useMemo(() => {
    const groups: Record<string, Log[]> = {};
    for (const log of logs) {
      const mod = classifyLog(log);
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(log);
    }
    // Trier les modules : ceux avec le plus de logs en premier
    const sorted = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    return sorted;
  }, [logs]);

  // ── Tabs config ──
  const tabs: { key: MainTab; label: string; countKey?: string }[] = [
    { key: 'erreurs', label: 'Erreurs & Alertes' },
    { key: 'tous', label: 'Tous les logs' },
    { key: 'succes', label: 'Succès' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Logs des Workflows</h1>
        <p className="text-gray-400 mb-6">Surveillance et suivi des exécutions n8n</p>

        {error && (
          <div
            className="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <strong className="font-bold">Erreur:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* ── Statistiques globales ── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <div className="text-sm text-red-400 mb-1">Erreurs</div>
              <div className="text-2xl font-bold text-red-300">{stats.errors}</div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
              <div className="text-sm text-yellow-400 mb-1">En attente</div>
              <div className="text-2xl font-bold text-yellow-300">{stats.enAttente}</div>
            </div>
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
              <div className="text-sm text-green-400 mb-1">Succès</div>
              <div className="text-2xl font-bold text-green-300">{stats.succeeded}</div>
            </div>
          </div>
        )}

        {/* ── Résumé par module (toujours visible) ── */}
        {stats?.byWorkflow && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {Object.entries(stats.byWorkflow)
              .filter(([, v]) => v.total > 0)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([key, value]) => (
                <div
                  key={key}
                  className={`border-l-4 ${getModuleBorderColor(key)} bg-gray-800/40 rounded-lg p-3`}
                >
                  <div className="text-xs text-gray-400 mb-1">{getModuleLabel(key)}</div>
                  <div className="text-lg font-bold">{value.total}</div>
                  {value.errors > 0 && (
                    <div className="text-xs text-red-400">{value.errors} erreur{value.errors > 1 ? 's' : ''}</div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ── Onglets principaux ── */}
        <div className="mb-6">
          <div className="flex space-x-1 border-b border-gray-700">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              let count: number | undefined;
              if (stats) {
                if (tab.key === 'erreurs') count = stats.errors + stats.enAttente;
                else if (tab.key === 'succes') count = stats.succeeded;
                else count = stats.total;
              }
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                    isActive
                      ? tab.key === 'erreurs'
                        ? 'border-red-500 text-red-400'
                        : tab.key === 'succes'
                        ? 'border-green-500 text-green-400'
                        : 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab.key === 'erreurs' && <ExclamationTriangleIcon className="h-4 w-4" />}
                  {tab.key === 'succes' && <CheckCircleIcon className="h-4 w-4" />}
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        tab.key === 'erreurs'
                          ? 'bg-red-600 text-white'
                          : tab.key === 'succes'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Contenu ── */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            <span className="ml-3 text-gray-400">Chargement des logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            {activeTab === 'erreurs' ? (
              <>
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-300 text-lg font-medium">Aucune erreur ni alerte</p>
                <p className="text-gray-500 text-sm mt-1">Tous les workflows fonctionnent correctement.</p>
              </>
            ) : activeTab === 'succes' ? (
              <>
                <InformationCircleIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Aucun log de succès à afficher.</p>
              </>
            ) : (
              <>
                <InformationCircleIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Aucun log à afficher.</p>
              </>
            )}
          </div>
        ) : activeTab === 'tous' ? (
          /* Tous : liste plate triée par date */
          <div className="space-y-3">
            {logs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        ) : (
          /* Erreurs & Succès : groupés par module */
          <div className="space-y-4">
            {groupedLogs.map(([moduleKey, moduleLogs]) => (
              <ModuleGroup
                key={moduleKey}
                moduleKey={moduleKey}
                logs={moduleLogs}
                defaultOpen={activeTab === 'erreurs'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
