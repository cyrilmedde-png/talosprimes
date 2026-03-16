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

const MODULE_KEYS = Object.keys(MODULE_CONFIG);

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
// Helper : extraction robuste des logs
// ──────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractLogs(response: any): Log[] {
  // Cas 1 : { success, data: { logs: [...] } }
  if (response?.data?.logs && Array.isArray(response.data.logs)) {
    return response.data.logs;
  }
  // Cas 2 : { success, data: [...] } (tableau direct)
  if (response?.data && Array.isArray(response.data)) {
    return response.data;
  }
  // Cas 3 : { logs: [...] } (pas de wrapper success/data)
  if (response?.logs && Array.isArray(response.logs)) {
    return response.logs;
  }
  // Cas 4 : tableau direct
  if (Array.isArray(response)) {
    return response;
  }
  console.warn('[Logs] Format de réponse inattendu:', JSON.stringify(response).slice(0, 500));
  return [];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

// Onglet : 'all' pour tout, un module_key, ou 'succes'
type TabKey = 'all' | typeof MODULE_KEYS[number] | 'succes';

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

function ErrorAlertSection({ logs }: { logs: Log[] }) {
  const errorsAndWarnings = logs.filter(
    (l) => l.statutExecution === 'erreur' || l.statutExecution === 'en_attente'
  );

  if (errorsAndWarnings.length === 0) return null;

  // Grouper par module
  const groups: Record<string, Log[]> = {};
  for (const log of errorsAndWarnings) {
    const mod = classifyLog(log);
    if (!groups[mod]) groups[mod] = [];
    groups[mod].push(log);
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
        Erreurs et Alertes ({errorsAndWarnings.length})
      </h2>
      <div className="space-y-4">
        {Object.entries(groups)
          .sort((a, b) => b[1].length - a[1].length)
          .map(([moduleKey, moduleLogs]) => (
            <ModuleGroup
              key={moduleKey}
              moduleKey={moduleKey}
              logs={moduleLogs}
              defaultOpen={true}
            />
          ))}
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
  const successCount = logs.filter((l) => l.statutExecution === 'succes').length;

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
          {successCount > 0 && (
            <span className="px-2 py-0.5 bg-green-600/60 text-green-100 text-xs rounded-full font-medium">
              {successCount} succès
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {/* Erreurs d'abord, puis en_attente, puis succès */}
          {[...logs]
            .sort((a, b) => {
              const order: Record<string, number> = { erreur: 0, en_attente: 1, succes: 2 };
              return (order[a.statutExecution] ?? 3) - (order[b.statutExecution] ?? 3);
            })
            .map((log) => (
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
  const [activeTab, setActiveTab] = useState<TabKey>('all');
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
        workflow?: string;
        statutExecution?: 'en_attente' | 'succes' | 'erreur';
        limit?: number;
      } = { limit: 200 };

      if (activeTab === 'succes') {
        // Onglet Succès : filtre par statut
        params.statutExecution = 'succes';
      } else if (activeTab !== 'all' && MODULE_CONFIG[activeTab]) {
        // Onglet module spécifique : filtre par workflow
        params.workflow = activeTab;
      }
      // 'all' → pas de filtre

      const response = await apiClient.logs.list(params);
      const extractedLogs = extractLogs(response);
      setLogs(extractedLogs);

      if (extractedLogs.length === 0 && response.success === false) {
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

  // ── Erreurs et warnings de la vue courante ──
  const errorsAndWarnings = useMemo(
    () => logs.filter((l) => l.statutExecution === 'erreur' || l.statutExecution === 'en_attente'),
    [logs]
  );

  // ── Group logs by module (pour vue "Tous") ──
  const groupedLogs = useMemo(() => {
    const groups: Record<string, Log[]> = {};
    for (const log of logs) {
      const mod = classifyLog(log);
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(log);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [logs]);

  // ── Onglets dynamiques : modules qui ont des logs ──
  const activeModules = useMemo(() => {
    if (!stats?.byWorkflow) return [];
    return MODULE_KEYS.filter((key) => {
      const wf = stats.byWorkflow[key];
      return wf && wf.total > 0;
    });
  }, [stats]);

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

        {/* ── Onglets : Tous | Leads | Clients | ... | Succès ── */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-0 border-b border-gray-700">
            {/* Onglet Tous */}
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Tous
              {stats && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full font-medium bg-gray-600 text-white">
                  {stats.total}
                </span>
              )}
            </button>

            {/* Onglets par module (uniquement ceux qui ont des logs) */}
            {activeModules.map((key) => {
              const cfg = MODULE_CONFIG[key];
              const wf = stats?.byWorkflow[key];
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {cfg.label}
                  {wf && wf.errors > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-medium">
                      {wf.errors}
                    </span>
                  )}
                  {wf && wf.errors === 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-gray-600 text-white text-xs rounded-full font-medium">
                      {wf.total}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Onglet Succès */}
            <button
              onClick={() => setActiveTab('succes')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'succes'
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <CheckCircleIcon className="h-4 w-4" />
              Succès
              {stats && stats.succeeded > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-medium">
                  {stats.succeeded}
                </span>
              )}
            </button>
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
            {stats && stats.total > 0 ? (
              /* Stats montrent des logs mais la liste est vide = problème n8n */
              <>
                <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                <p className="text-yellow-300 text-lg font-medium">Problème de chargement des logs</p>
                <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
                  Les statistiques affichent {stats.total} log(s) mais le détail ne se charge pas.
                  {error && <span className="block mt-2 text-red-400">{error}</span>}
                </p>
                <p className="text-gray-500 text-xs mt-3 max-w-lg mx-auto">
                  Vérifiez dans n8n que le workflow <strong>logs-list</strong> est bien importé (version corrigée) et actif.
                  Le workflow doit utiliser les colonnes : id, tenant_id, type_evenement, entite_type, entite_id, payload,
                  workflow_n8n_declenche, workflow_n8n_id, statut_execution, message_erreur, created_at.
                </p>
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
        ) : (
          <div>
            {/* Erreurs & Warnings en haut (sauf dans l'onglet Succès) */}
            {activeTab !== 'succes' && errorsAndWarnings.length > 0 && (
              <ErrorAlertSection logs={logs} />
            )}

            {/* Liste des logs */}
            {activeTab === 'all' ? (
              /* Vue "Tous" : groupés par module */
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-300">Tous les logs</h2>
                {groupedLogs.map(([moduleKey, moduleLogs]) => (
                  <ModuleGroup
                    key={moduleKey}
                    moduleKey={moduleKey}
                    logs={moduleLogs}
                    defaultOpen={false}
                  />
                ))}
              </div>
            ) : activeTab === 'succes' ? (
              /* Vue Succès : groupés par module */
              <div className="space-y-4">
                {groupedLogs.map(([moduleKey, moduleLogs]) => (
                  <ModuleGroup
                    key={moduleKey}
                    moduleKey={moduleKey}
                    logs={moduleLogs}
                    defaultOpen={false}
                  />
                ))}
              </div>
            ) : (
              /* Vue module spécifique : liste plate avec erreurs en premier */
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-300">
                  Logs — {getModuleLabel(activeTab)}
                </h2>
                {[...logs]
                  .sort((a, b) => {
                    const order: Record<string, number> = { erreur: 0, en_attente: 1, succes: 2 };
                    return (order[a.statutExecution] ?? 3) - (order[b.statutExecution] ?? 3);
                  })
                  .map((log) => (
                    <LogCard key={log.id} log={log} />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
