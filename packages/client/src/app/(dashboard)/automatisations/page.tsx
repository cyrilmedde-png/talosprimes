'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BoltIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  MegaphoneIcon,
  PhoneIcon,
  ShieldCheckIcon,
  CubeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserGroupIcon,
  SignalIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth-store';
import { authenticatedFetch } from '@/lib/api-client';

// ============================================
// Types stricts — zero any
// ============================================

type AutomationComplexity = 'simple' | 'intermediaire' | 'avance';
type AutomationStatus = 'actif' | 'inactif' | 'en_attente' | 'suspendue' | 'erreur';
type PurchaseStatus = 'en_attente' | 'active' | 'suspendue' | 'annulee';
type TabType = 'dashboard' | 'catalogue' | 'mes-automatisations' | 'configuration' | 'logs' | 'admin';

/** Donnees de l'API — camelCase (transformKeys dans n8n.service.ts) */
interface CatalogItem {
  id: string;
  code: string;
  nom: string;
  description: string;
  categorie: string;
  icon: string;
  setupPrice: number | string;
  monthlyPrice: number | string;
  complexity: AutomationComplexity;
  workflowCount: number;
  workflowTemplates?: string[];
  features: string[];
  isActive: boolean;
  ordre: number;
}

interface PurchaseItem {
  id: string;
  tenantId: string;
  automationId: string;
  status: PurchaseStatus;
  n8nFolderId: string | null;
  n8nFolderName: string | null;
  n8nWorkflowIds: string[];
  setupPricePaid: number | string;
  monthlyPrice: number | string;
  activatedAt: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  code: string;
  nom: string;
  description: string;
  categorie: string;
  icon: string;
  complexity: AutomationComplexity;
  workflowCount: number;
  features: string[];
}

interface TenantItem {
  id: string;
  nomEntreprise: string;
}

interface EventLogItem {
  id: string;
  typeEvenement: string;
  entiteType: string | null;
  entiteId: string | null;
  statutExecution: string;
  messageErreur: string | null;
  workflowN8nId: string | null;
  createdAt: string;
}

/** Donnees normalisees pour l'affichage */
interface Automation {
  id: string;
  code: string;
  nom: string;
  description: string;
  categorie: string;
  icon: string;
  setupPrice: number;
  monthlyPrice: number;
  complexity: AutomationComplexity;
  complexityLevel: number;
  status: AutomationStatus;
  workflowCount: number;
  workflowTemplates: string[];
  features: string[];
  isActive: boolean;
  ordre: number;
  // Enrichi par les purchases
  n8nFolderId?: string;
  n8nFolderName?: string;
  n8nWorkflowIds?: string[];
  activatedAt?: string;
  purchaseConfig?: Record<string, unknown>;
}

interface AutomationStats {
  totalAutomations: number;
  actives: number;
  executionsToday: number;
  tauxReussite: number;
  erreurs24h: number;
}

interface N8nStatus {
  success: boolean;
  message: string;
}

interface CatalogFormData {
  code: string;
  nom: string;
  description: string;
  categorie: string;
  icon: string;
  setupPrice: number;
  monthlyPrice: number;
  complexity: AutomationComplexity;
  workflowCount: number;
  features: string[];
  workflowTemplates: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Constantes
// ============================================

const CATEGORIES = ['email', 'sms', 'marketing', 'telephonie', 'comptabilite', 'stock', 'crm', 'facturation'] as const;

const CATEGORIE_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  email: EnvelopeIcon,
  sms: ChatBubbleLeftIcon,
  marketing: MegaphoneIcon,
  telephonie: PhoneIcon,
  comptabilite: ShieldCheckIcon,
  stock: CubeIcon,
  crm: ChartBarIcon,
  facturation: DocumentTextIcon,
  general: BoltIcon,
};

const CATEGORIE_COLORS: Record<string, string> = {
  email: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  sms: 'bg-green-500/20 text-green-400 border-green-500/30',
  marketing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  telephonie: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  comptabilite: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  stock: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  crm: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  facturation: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const CATEGORIE_LABELS: Record<string, string> = {
  email: 'Email & Newsletter',
  sms: 'SMS',
  marketing: 'Marketing Digital',
  telephonie: 'Telephonie IA',
  comptabilite: 'Comptabilite',
  stock: 'Gestion de Stock',
  crm: 'CRM & Clients',
  facturation: 'Facturation',
  general: 'General',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  actif: { label: 'Actif', color: 'text-green-400 bg-green-900/30', icon: CheckCircleIcon },
  inactif: { label: 'Inactif', color: 'text-gray-400 bg-gray-900/30', icon: PauseIcon },
  en_attente: { label: 'En attente', color: 'text-yellow-400 bg-yellow-900/30', icon: ClockIcon },
  suspendue: { label: 'Suspendue', color: 'text-orange-400 bg-orange-900/30', icon: PauseIcon },
  erreur: { label: 'Erreur', color: 'text-red-400 bg-red-900/30', icon: ExclamationTriangleIcon },
};

const COMPLEXITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Simple', color: 'text-green-400' },
  2: { label: 'Intermediaire', color: 'text-amber-400' },
  3: { label: 'Avance', color: 'text-red-400' },
};

const COMPLEXITY_MAP: Record<AutomationComplexity, number> = {
  simple: 1,
  intermediaire: 2,
  avance: 3,
};

// ============================================
// Helpers
// ============================================

function fmtPrix(v: number): string {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function catalogToAutomation(item: CatalogItem, purchase?: PurchaseItem): Automation {
  let status: AutomationStatus = 'inactif';
  if (purchase) {
    const statusMap: Record<PurchaseStatus, AutomationStatus> = {
      active: 'actif',
      en_attente: 'en_attente',
      suspendue: 'suspendue',
      annulee: 'inactif',
    };
    status = statusMap[purchase.status] || 'inactif';
  }

  return {
    id: item.id,
    code: item.code,
    nom: item.nom,
    description: item.description,
    categorie: item.categorie,
    icon: item.icon,
    setupPrice: Number(item.setupPrice) || 0,
    monthlyPrice: Number(item.monthlyPrice) || 0,
    complexity: item.complexity,
    complexityLevel: COMPLEXITY_MAP[item.complexity] || 1,
    status,
    workflowCount: item.workflowCount || 0,
    workflowTemplates: item.workflowTemplates || [],
    features: Array.isArray(item.features) ? item.features : [],
    isActive: item.isActive,
    ordre: item.ordre,
    n8nFolderId: purchase?.n8nFolderId || undefined,
    n8nFolderName: purchase?.n8nFolderName || undefined,
    n8nWorkflowIds: purchase?.n8nWorkflowIds || undefined,
    activatedAt: purchase?.activatedAt || undefined,
    purchaseConfig: purchase?.config || undefined,
  };
}

const EMPTY_FORM: CatalogFormData = {
  code: '',
  nom: '',
  description: '',
  categorie: 'email',
  icon: 'email',
  setupPrice: 0,
  monthlyPrice: 0,
  complexity: 'simple',
  workflowCount: 0,
  features: [],
  workflowTemplates: [],
};

// ============================================
// Composant principal
// ============================================

export default function AutomatisationsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('all');
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [stats, setStats] = useState<AutomationStats>({
    totalAutomations: 0,
    actives: 0,
    executionsToday: 0,
    tauxReussite: 0,
    erreurs24h: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  // Admin state
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activateTarget, setActivateTarget] = useState<Automation | null>(null);
  const [n8nStatus, setN8nStatus] = useState<N8nStatus | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogRes, purchasesRes, statsRes] = await Promise.all([
        authenticatedFetch<ApiResponse<{ catalog: CatalogItem[] }>>('/api/automations/catalog'),
        authenticatedFetch<ApiResponse<{ purchases: PurchaseItem[] }>>('/api/automations/purchases'),
        authenticatedFetch<ApiResponse<{ stats: AutomationStats }>>('/api/automations/stats'),
      ]);

      if (catalogRes.success && catalogRes.data) {
        const catalog = catalogRes.data.catalog || [];
        const purchases = purchasesRes.success && purchasesRes.data
          ? purchasesRes.data.purchases || []
          : [];

        const purchaseMap = new Map<string, PurchaseItem>();
        for (const p of purchases) {
          purchaseMap.set(p.automationId, p);
        }

        const list = catalog.map(item => catalogToAutomation(item, purchaseMap.get(item.id)));
        setAutomations(list);
      }

      if (statsRes.success && statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }

      // Admin : verifier le statut n8n
      if (isAdmin) {
        try {
          const n8nRes = await authenticatedFetch<ApiResponse<N8nStatus>>('/api/automations/n8n/status');
          if (n8nRes.success && n8nRes.data) {
            setN8nStatus(n8nRes.data);
          }
        } catch {
          setN8nStatus({ success: false, message: 'Impossible de verifier' });
        }
      }
    } catch (err) {
      console.error('[Automatisations] Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Demander l'activation (client)
  const handleRequestActivation = useCallback(async (automationId: string) => {
    setRequestLoading(true);
    setRequestMessage(null);
    try {
      const res = await authenticatedFetch<ApiResponse<null>>('/api/automations/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationId }),
      });
      if (res.success) {
        const resData = res.data as { message?: string; delai?: string } | undefined;
        setRequestMessage(resData?.message || 'Demande envoyee ! Vous serez recontacte sous 24 a 72h.');
        fetchData();
      } else {
        setRequestMessage(res.error || 'Erreur lors de l\'envoi');
      }
    } catch {
      setRequestMessage('Erreur de connexion');
    } finally {
      setRequestLoading(false);
    }
  }, [fetchData]);

  // Filtrage
  const filteredAutomations = automations.filter(a => {
    const matchSearch = a.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategorie = selectedCategorie === 'all' || a.categorie === selectedCategorie;
    // Admin voit tout, client voit seulement les actifs du catalogue
    const matchActive = isAdmin || a.isActive;
    return matchSearch && matchCategorie && matchActive;
  });

  const activeAutomations = automations.filter(a => a.status === 'actif');
  const categories = ['all', ...Array.from(new Set(automations.map(a => a.categorie)))];

  const tabs: Array<{ key: TabType; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; count?: number; adminOnly?: boolean }> = [
    { key: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
    { key: 'catalogue', label: 'Catalogue', icon: CubeIcon, count: automations.length },
    { key: 'mes-automatisations', label: 'Mes Automatisations', icon: BoltIcon, count: activeAutomations.length },
    ...(activeAutomations.length > 0 ? [{ key: 'configuration' as TabType, label: 'Configuration', icon: Cog6ToothIcon }] : []),
    { key: 'logs', label: 'Historique', icon: ClockIcon },
    ...(isSuperAdmin ? [{ key: 'admin' as TabType, label: 'Administration', icon: Cog6ToothIcon, adminOnly: true }] : []),
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BoltIcon className="h-8 w-8 text-amber-400" />
            Automatisations
          </h1>
          <p className="text-gray-400 mt-1">
            {isAdmin
              ? 'Gestion du catalogue, activation clients et monitoring n8n.'
              : 'Catalogue d\'automatisations et suivi de vos workflows actifs.'}
          </p>
        </div>

        {/* Super admin : statut n8n + bouton ajouter */}
        {isSuperAdmin && (
          <div className="flex items-center gap-3">
            {n8nStatus && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                n8nStatus.success
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-red-900/30 text-red-400'
              }`}>
                <SignalIcon className="h-3.5 w-3.5" />
                n8n {n8nStatus.success ? 'connecte' : 'deconnecte'}
              </div>
            )}
            <button
              onClick={() => { setEditingAutomation(null); setShowCatalogForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              Nouvelle automatisation
            </button>
          </div>
        )}
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.totalAutomations, color: 'bg-gray-500', textColor: 'text-white' },
          { label: 'Actives', value: stats.actives, color: 'bg-green-500', textColor: 'text-green-400' },
          { label: 'Executions (24h)', value: stats.executionsToday, color: 'bg-blue-500', textColor: 'text-blue-400' },
          { label: 'Taux de reussite', value: `${stats.tauxReussite}%`, color: 'bg-amber-500', textColor: 'text-amber-400' },
          { label: 'Erreurs (24h)', value: stats.erreurs24h, color: 'bg-red-500', textColor: 'text-red-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.textColor} mt-1`}>{kpi.value}</p>
            <div className={`w-8 h-1 rounded mt-2 ${kpi.color}`} />
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="mb-6 border-b border-gray-700/30">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
          <span className="ml-3 text-gray-400">Chargement...</span>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardTab
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              n8nStatus={n8nStatus}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'catalogue' && (
            <CatalogueTab
              automations={filteredAutomations}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategorie={selectedCategorie}
              onCategorieChange={setSelectedCategorie}
              categories={categories}
              onSelect={setSelectedAutomation}
              isAdmin={isSuperAdmin}
              onEdit={(a) => { setEditingAutomation(a); setShowCatalogForm(true); }}
              onActivateForClient={(a) => { if (isSuperAdmin) { setActivateTarget(a); setShowActivateModal(true); } }}
            />
          )}

          {activeTab === 'mes-automatisations' && (
            <MesAutomatisationsTab
              automations={activeAutomations}
              onSelect={setSelectedAutomation}
            />
          )}

          {activeTab === 'configuration' && (
            <ConfigurationTab automations={activeAutomations} />
          )}

          {activeTab === 'logs' && (
            <LogsTab isAdmin={isAdmin} />
          )}

          {activeTab === 'admin' && isSuperAdmin && (
            <AdminTab
              automations={automations}
              onRefresh={fetchData}
            />
          )}
        </>
      )}

      {/* Modal Detail */}
      {selectedAutomation && (
        <AutomationDetailModal
          automation={selectedAutomation}
          onClose={() => { setSelectedAutomation(null); setRequestMessage(null); }}
          isAdmin={isSuperAdmin}
          onRequestActivation={handleRequestActivation}
          requestLoading={requestLoading}
          requestMessage={requestMessage}
          onActivateForClient={(a) => { if (isSuperAdmin) { setSelectedAutomation(null); setActivateTarget(a); setShowActivateModal(true); } }}
          onDeactivate={async (a) => {
            try {
              await authenticatedFetch<ApiResponse<null>>('/api/automations/deactivate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId: user?.tenantId, automationId: a.id }),
              });
              setSelectedAutomation(null);
              fetchData();
            } catch { /* handled */ }
          }}
        />
      )}

      {/* Modal Formulaire Catalogue (admin) */}
      {isSuperAdmin && showCatalogForm && (
        <CatalogFormModal
          automation={editingAutomation}
          onClose={() => { setShowCatalogForm(false); setEditingAutomation(null); }}
          onSaved={() => { setShowCatalogForm(false); setEditingAutomation(null); fetchData(); }}
        />
      )}

      {/* Modal Activation Client (super_admin uniquement) */}
      {isSuperAdmin && showActivateModal && activateTarget && (
        <ActivateForClientModal
          automation={activateTarget}
          onClose={() => { setShowActivateModal(false); setActivateTarget(null); }}
          onActivated={() => { setShowActivateModal(false); setActivateTarget(null); fetchData(); }}
        />
      )}
    </div>
  );
}

// ============================================
// Tab: Dashboard
// ============================================

interface PendingRequest {
  id: string;
  tenantId: string;
  automationId: string;
  createdAt: string;
  automationNom: string;
  automationCode: string;
  categorie: string;
  complexity: string;
  setupPrice: number;
  monthlyPrice: number;
  clientName: string;
}

interface DashboardData {
  revenus: { mensuel: number; setupTotal: number; potentielMensuel: number; potentielSetup: number };
  compteurs: { catalogue: number; actives: number; enAttente: number; suspendues: number; annulees: number; totalAchats: number; clientsActifs: number; clientsTotal: number; tauxAdoption: number };
  demandesEnAttente: PendingRequest[];
  parCategorie: Array<{ categorie: string; nbActives: number; revenuMensuel: number }>;
  parComplexite: Array<{ complexity: string; nbActives: number; revenuMensuel: number }>;
  topAutomations: Array<{ nom: string; code: string; categorie: string; complexity: string; monthlyPrice: number; setupPricePaid: number; clientName: string }>;
  topClients: Array<{ id: string; nomEntreprise: string; nbAutomations: number; revenuMensuel: number }>;
}

function DashboardTab({
  isAdmin,
  isSuperAdmin,
  n8nStatus,
  onNavigate,
}: {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  n8nStatus: N8nStatus | null;
  onNavigate: (tab: TabType) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authenticatedFetch<ApiResponse<{ dashboard: DashboardData }>>('/api/automations/dashboard')
      .then(res => {
        if (res.success && res.data?.dashboard) setData(res.data.dashboard);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fallback pendant le chargement ou si pas de data
  const revenus = data?.revenus || { mensuel: 0, setupTotal: 0, potentielMensuel: 0, potentielSetup: 0 };
  const c = data?.compteurs || { catalogue: 0, actives: 0, enAttente: 0, suspendues: 0, annulees: 0, totalAchats: 0, clientsActifs: 0, clientsTotal: 0, tauxAdoption: 0 };
  const parCategorie = data?.parCategorie || [];
  const parComplexite = data?.parComplexite || [];
  const topAutomations = data?.topAutomations || [];
  const topClients = data?.topClients || [];
  const demandesEnAttente = data?.demandesEnAttente || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
        <span className="ml-3 text-gray-400">Chargement du dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className={`grid grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {isSuperAdmin ? (
          <>
            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-5 border border-green-500/20">
              <p className="text-green-400/70 text-xs uppercase tracking-wider font-medium">Revenus mensuels</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{fmtPrix(revenus.mensuel)} €</p>
              <p className="text-green-400/50 text-xs mt-1">{c.actives} automatisation{c.actives > 1 ? 's' : ''} active{c.actives > 1 ? 's' : ''}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 rounded-xl p-5 border border-amber-500/20">
              <p className="text-amber-400/70 text-xs uppercase tracking-wider font-medium">Revenus setup cumules</p>
              <p className="text-3xl font-bold text-amber-400 mt-2">{fmtPrix(revenus.setupTotal)} €</p>
              <p className="text-amber-400/50 text-xs mt-1">Installations uniques</p>
            </div>
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-5 border border-blue-500/20">
              <p className="text-blue-400/70 text-xs uppercase tracking-wider font-medium">Clients actifs</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">{c.clientsActifs}</p>
              <p className="text-blue-400/50 text-xs mt-1">sur {c.clientsTotal} client{c.clientsTotal > 1 ? 's' : ''} total</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-xl p-5 border border-purple-500/20">
              <p className="text-purple-400/70 text-xs uppercase tracking-wider font-medium">Taux d&apos;adoption</p>
              <p className="text-3xl font-bold text-purple-400 mt-2">{c.tauxAdoption}%</p>
              <p className="text-purple-400/50 text-xs mt-1">{c.actives}/{c.catalogue} du catalogue</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-5 border border-green-500/20">
              <p className="text-green-400/70 text-xs uppercase tracking-wider font-medium">Mes automatisations</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{c.actives}</p>
              <p className="text-green-400/50 text-xs mt-1">active{c.actives > 1 ? 's' : ''} sur {c.catalogue} disponibles</p>
            </div>
            <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 rounded-xl p-5 border border-amber-500/20">
              <p className="text-amber-400/70 text-xs uppercase tracking-wider font-medium">Abonnement mensuel</p>
              <p className="text-3xl font-bold text-amber-400 mt-2">{fmtPrix(revenus.mensuel)} €/mois</p>
              <p className="text-amber-400/50 text-xs mt-1">Cout total de vos automatisations</p>
            </div>
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-5 border border-blue-500/20">
              <p className="text-blue-400/70 text-xs uppercase tracking-wider font-medium">En attente</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">{c.enAttente}</p>
              <p className="text-blue-400/50 text-xs mt-1">demande{c.enAttente > 1 ? 's' : ''} d&apos;activation</p>
            </div>
          </>
        )}
      </div>

      {/* Demandes en attente (super_admin) */}
      {isSuperAdmin && demandesEnAttente.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 rounded-xl p-5 border border-yellow-500/30">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-yellow-400" />
            Demandes en attente
            <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">{demandesEnAttente.length}</span>
          </h3>
          <div className="space-y-3">
            {demandesEnAttente.map((d) => {
              const CatIcon = CATEGORIE_ICONS[d.categorie] || BoltIcon;
              return (
                <div key={d.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <CatIcon className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-white text-sm font-medium">{d.automationNom}</p>
                      <p className="text-gray-400 text-xs">{d.clientName} &middot; {d.complexity} &middot; {formatDate(d.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-amber-400 font-medium text-sm">{fmtPrix(Number(d.setupPrice))} € + {fmtPrix(Number(d.monthlyPrice))} €/m</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const res = await authenticatedFetch<ApiResponse<null>>('/api/automations/deactivate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ tenantId: d.tenantId, automationId: d.automationId, action: 'annuler' }),
                            });
                            if (res.success) {
                              setData(prev => prev ? {
                                ...prev,
                                demandesEnAttente: prev.demandesEnAttente.filter(x => x.id !== d.id),
                                compteurs: { ...prev.compteurs, enAttente: Math.max(0, prev.compteurs.enAttente - 1) }
                              } : prev);
                            } else {
                              alert(res.error || 'Erreur lors de l\'annulation');
                            }
                          } catch {
                            alert('Erreur de connexion');
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-xs underline"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => onNavigate('admin')}
                        className="text-yellow-400 hover:text-yellow-300 text-xs underline"
                      >
                        Activer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Statut global + raccourcis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Statut en temps reel */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <SignalIcon className="h-4 w-4 text-gray-400" />
            Statut en temps reel
          </h3>
          <div className="space-y-3">
            {isSuperAdmin && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">n8n</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  n8nStatus?.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                }`}>
                  {n8nStatus?.success ? 'Connecte' : 'Deconnecte'}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Actives</span>
              <span className="text-green-400 font-medium text-sm">{c.actives}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">En attente</span>
              <span className="text-yellow-400 font-medium text-sm">{c.enAttente}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Suspendues</span>
              <span className="text-orange-400 font-medium text-sm">{c.suspendues}</span>
            </div>
            {isSuperAdmin && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Clients actifs</span>
                  <span className="text-blue-400 font-medium text-sm">{c.clientsActifs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Total achats</span>
                  <span className="text-gray-300 font-medium text-sm">{c.totalAchats}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Repartition par categorie */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <CubeIcon className="h-4 w-4 text-gray-400" />
            Par categorie
          </h3>
          {parCategorie.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune automatisation active</p>
          ) : (
            <div className="space-y-3">
              {parCategorie.map((row) => {
                const cat = row.categorie;
                const CatIcon = CATEGORIE_ICONS[cat] || BoltIcon;
                return (
                  <div key={cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CatIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">{CATEGORIE_LABELS[cat] || cat}</span>
                      <span className="text-gray-500 text-xs">({row.nbActives})</span>
                    </div>
                    <span className="text-amber-400 font-medium text-sm">{fmtPrix(Number(row.revenuMensuel))} €/m</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Acces rapides */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <BoltIcon className="h-4 w-4 text-gray-400" />
            Acces rapides
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => onNavigate('catalogue')}
              className="w-full text-left px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3 group"
            >
              <CubeIcon className="h-5 w-5 text-gray-400 group-hover:text-amber-400 transition-colors" />
              <div>
                <p className="text-white text-sm font-medium">Catalogue</p>
                <p className="text-gray-500 text-xs">{c.catalogue} automatisations disponibles</p>
              </div>
            </button>
            <button
              onClick={() => onNavigate('mes-automatisations')}
              className="w-full text-left px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3 group"
            >
              <BoltIcon className="h-5 w-5 text-gray-400 group-hover:text-green-400 transition-colors" />
              <div>
                <p className="text-white text-sm font-medium">Mes automatisations</p>
                <p className="text-gray-500 text-xs">{c.actives} active{c.actives > 1 ? 's' : ''}</p>
              </div>
            </button>
            <button
              onClick={() => onNavigate('logs')}
              className="w-full text-left px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3 group"
            >
              <ClockIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
              <div>
                <p className="text-white text-sm font-medium">Historique</p>
                <p className="text-gray-500 text-xs">Logs et executions</p>
              </div>
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className="w-full text-left px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3 group"
              >
                <Cog6ToothIcon className="h-5 w-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                <div>
                  <p className="text-white text-sm font-medium">Administration</p>
                  <p className="text-gray-500 text-xs">Gestion catalogue et clients</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top automatisations + Complexite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 par revenu */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-white font-semibold text-sm mb-4">Top automatisations (revenu mensuel)</h3>
          {topAutomations.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune automatisation active</p>
          ) : (
            <div className="space-y-3">
              {topAutomations.map((a, i) => {
                const CatIcon = CATEGORIE_ICONS[a.categorie] || BoltIcon;
                return (
                  <div key={`${a.code}-${i}`} className="flex items-center gap-3">
                    <span className="text-gray-500 text-xs font-mono w-4">{i + 1}.</span>
                    <CatIcon className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-300 text-sm truncate block">{a.nom}</span>
                      <span className="text-gray-500 text-xs">{a.clientName}</span>
                    </div>
                    <span className="text-amber-400 font-medium text-sm">{fmtPrix(Number(a.monthlyPrice))} €/m</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Repartition par complexite */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-white font-semibold text-sm mb-4">Repartition par complexite</h3>
          <div className="space-y-4">
            {(['simple', 'intermediaire', 'avance'] as AutomationComplexity[]).map(comp => {
              const row = parComplexite.find(r => r.complexity === comp);
              const count = row ? Number(row.nbActives) : 0;
              const total = c.actives || 1;
              const pct = Math.round((count / total) * 100);
              const config = COMPLEXITY_LABELS[COMPLEXITY_MAP[comp]];
              return (
                <div key={comp}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-gray-400 text-xs">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        comp === 'simple' ? 'bg-green-500' : comp === 'intermediaire' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top clients */}
          {isAdmin && topClients.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Top clients</p>
              <div className="space-y-2">
                {topClients.map((client, i) => (
                  <div key={client.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs font-mono">{i + 1}.</span>
                      <span className="text-gray-300 text-sm">{client.nomEntreprise}</span>
                      <span className="text-gray-500 text-xs">({client.nbAutomations})</span>
                    </div>
                    <span className="text-green-400 font-medium text-sm">{fmtPrix(Number(client.revenuMensuel))} €/m</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenu potentiel si tout le catalogue est active */}
          {isAdmin && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Revenu potentiel (catalogue complet)</p>
              <p className="text-2xl font-bold text-green-400">
                {fmtPrix(revenus.potentielMensuel)} €/mois
              </p>
              <p className="text-gray-500 text-xs mt-1">
                + {fmtPrix(revenus.potentielSetup)} € en setup
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Tab: Catalogue
// ============================================

function CatalogueTab({
  automations,
  searchQuery,
  onSearchChange,
  selectedCategorie,
  onCategorieChange,
  categories,
  onSelect,
  isAdmin,
  onEdit,
  onActivateForClient,
}: {
  automations: Automation[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  selectedCategorie: string;
  onCategorieChange: (v: string) => void;
  categories: string[];
  onSelect: (a: Automation) => void;
  isAdmin: boolean;
  onEdit: (a: Automation) => void;
  onActivateForClient: (a: Automation) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Barre de recherche + filtre */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une automatisation..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={selectedCategorie}
            onChange={(e) => onCategorieChange(e.target.value)}
            className="pl-9 pr-8 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
          >
            <option value="all">Toutes les categories</option>
            {categories.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{CATEGORIE_LABELS[c] || c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grille catalogue */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {automations.map((auto) => {
          const CatIcon = CATEGORIE_ICONS[auto.categorie] || BoltIcon;
          const catColor = CATEGORIE_COLORS[auto.categorie] || CATEGORIE_COLORS.general;
          const complexity = COMPLEXITY_LABELS[auto.complexityLevel] || COMPLEXITY_LABELS[1];
          const statusConfig = STATUS_CONFIG[auto.status] || STATUS_CONFIG.inactif;

          return (
            <div
              key={auto.id}
              className={`bg-gray-800 rounded-xl border hover:border-amber-500/50 transition-all duration-200 group ${
                !auto.isActive ? 'border-red-500/30 opacity-60' : 'border-gray-700'
              }`}
            >
              {/* Header carte */}
              <div className="p-5 pb-3 cursor-pointer" onClick={() => onSelect(auto)}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg border ${catColor}`}>
                    <CatIcon className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    {!auto.isActive && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-red-400 bg-red-900/30">
                        Desactive
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
                <h3 className="text-white font-semibold text-lg group-hover:text-amber-400 transition-colors">
                  {auto.nom}
                </h3>
                <p className="text-gray-400 text-sm mt-1.5 line-clamp-2">{auto.description}</p>
              </div>

              {/* Footer carte */}
              <div className="px-5 py-3 border-t border-gray-700/50 flex items-center justify-between">
                <div>
                  <span className="text-amber-400 font-bold text-lg">{fmtPrix(auto.setupPrice)}&euro;</span>
                  <span className="text-gray-500 text-xs ml-1">setup</span>
                  <span className="text-gray-600 mx-2">+</span>
                  <span className="text-white font-semibold">{fmtPrix(auto.monthlyPrice)}&euro;</span>
                  <span className="text-gray-500 text-xs">/mois</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${complexity.color}`}>
                    {complexity.label}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(auto); }}
                        className="p-1 text-gray-400 hover:text-amber-400 transition-colors"
                        title="Modifier"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onActivateForClient(auto); }}
                        className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                        title="Activer pour un client"
                      >
                        <PlayIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {automations.length === 0 && (
        <div className="text-center py-16">
          <CubeIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucune automatisation trouvee.</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Tab: Mes Automatisations
// ============================================

function MesAutomatisationsTab({
  automations,
  onSelect,
}: {
  automations: Automation[];
  onSelect: (a: Automation) => void;
}) {
  if (automations.length === 0) {
    return (
      <div className="text-center py-20">
        <BoltIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-white text-lg font-semibold mb-2">Aucune automatisation active</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Parcourez le catalogue pour activer vos premieres automatisations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {automations.map((auto) => {
        const CatIcon = CATEGORIE_ICONS[auto.categorie] || BoltIcon;
        const catColor = CATEGORIE_COLORS[auto.categorie] || CATEGORIE_COLORS.general;
        const statusConfig = STATUS_CONFIG[auto.status] || STATUS_CONFIG.actif;

        return (
          <div
            key={auto.id}
            onClick={() => onSelect(auto)}
            className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-amber-500/50 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg border ${catColor}`}>
                  <CatIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{auto.nom}</h3>
                  <p className="text-gray-400 text-sm">
                    {auto.workflowCount} workflows
                    {auto.n8nFolderId && (
                      <span className="text-gray-500 ml-2">· Dossier n8n: {auto.n8nFolderName}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {auto.activatedAt && (
                  <div className="text-right hidden md:block">
                    <p className="text-gray-400 text-xs">Active le</p>
                    <p className="text-gray-300 text-sm">{formatDate(auto.activatedAt)}</p>
                  </div>
                )}
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusConfig.color}`}>
                  <statusConfig.icon className="h-3.5 w-3.5" />
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// ============================================
// Tab: Configuration
// ============================================

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'number';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

const EMAIL_CONFIG_FIELDS: ConfigField[] = [
  { key: 'provider', label: 'Fournisseur email', type: 'select', options: ['gmail', 'outlook', 'imap_smtp'], required: true },
  { key: 'email', label: 'Adresse email', type: 'email', placeholder: 'contact@votredomaine.com', required: true },
  { key: 'imapHost', label: 'Serveur IMAP', type: 'text', placeholder: 'imap.votrefournisseur.com' },
  { key: 'imapPort', label: 'Port IMAP', type: 'number', placeholder: '993' },
  { key: 'smtpHost', label: 'Serveur SMTP', type: 'text', placeholder: 'smtp.votrefournisseur.com' },
  { key: 'smtpPort', label: 'Port SMTP', type: 'number', placeholder: '587' },
  { key: 'password', label: 'Mot de passe', type: 'password', placeholder: 'Mot de passe du compte email' },
  { key: 'fromName', label: 'Nom expediteur', type: 'text', placeholder: 'Mon Entreprise' },
  { key: 'signature', label: 'Signature email', type: 'text', placeholder: 'Cordialement, ...' },
];

const CONFIG_FIELDS_BY_CATEGORY: Record<string, ConfigField[]> = {
  email: EMAIL_CONFIG_FIELDS,
  sms: [
    { key: 'provider', label: 'Fournisseur SMS', type: 'select', options: ['twilio', 'vonage', 'ovh'], required: true },
    { key: 'phoneNumber', label: 'Numero expediteur', type: 'text', placeholder: '+33 6 ...', required: true },
    { key: 'apiKey', label: 'Cle API', type: 'password', placeholder: 'Votre cle API', required: true },
  ],
  marketing: [
    { key: 'facebookPageId', label: 'Page Facebook ID', type: 'text' },
    { key: 'instagramAccountId', label: 'Compte Instagram ID', type: 'text' },
    { key: 'tiktokAccountId', label: 'Compte TikTok ID', type: 'text' },
  ],
  telephonie: [
    { key: 'provider', label: 'Fournisseur', type: 'select', options: ['twilio', 'vonage'], required: true },
    { key: 'phoneNumber', label: 'Numero principal', type: 'text', required: true },
    { key: 'apiKey', label: 'Cle API', type: 'password', required: true },
  ],
  facturation: [
    { key: 'stripeKey', label: 'Cle Stripe', type: 'password' },
    { key: 'defaultCurrency', label: 'Devise', type: 'select', options: ['EUR', 'USD', 'GBP'] },
    { key: 'invoicePrefix', label: 'Prefixe facture', type: 'text', placeholder: 'FAC-' },
  ],
  crm: [
    { key: 'provider', label: 'CRM', type: 'select', options: ['interne', 'hubspot', 'pipedrive'] },
    { key: 'apiKey', label: 'Cle API CRM', type: 'password' },
    { key: 'autoAssign', label: 'Attribution auto', type: 'select', options: ['oui', 'non'] },
  ],
  comptabilite: [
    { key: 'logiciel', label: 'Logiciel comptable', type: 'select', options: ['interne', 'sage', 'cegid', 'quadratus'] },
    { key: 'exportFormat', label: 'Format export', type: 'select', options: ['FEC', 'CSV', 'PDF'] },
  ],
  stock: [
    { key: 'alerteSeuilBas', label: 'Seuil alerte stock bas', type: 'number', placeholder: '10' },
    { key: 'multiSites', label: 'Multi-sites', type: 'select', options: ['oui', 'non'] },
  ],
};

function ConfigurationTab({ automations }: { automations: Automation[] }) {
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(automations[0] || null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [originalConfig, setOriginalConfig] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<Array<{ champModifie: string; ancienneValeur: string; nouvelleValeur: string; userEmail: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAutomation) return;
    setLoading(true);
    setMessage(null);
    authenticatedFetch<ApiResponse<{ config: Record<string, string>; logs: Array<{ champModifie: string; ancienneValeur: string; nouvelleValeur: string; userEmail: string; createdAt: string }> }>>('/api/automations/config/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ automationId: selectedAutomation.id }),
    })
      .then(res => {
        if (res.success && res.data) {
          const c = res.data.config || {};
          const stringConfig: Record<string, string> = {};
          for (const [k, v] of Object.entries(c)) {
            stringConfig[k] = String(v ?? '');
          }
          setConfig(stringConfig);
          setOriginalConfig(stringConfig);
          setLogs(res.data.logs || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedAutomation]);

  const handleSave = async () => {
    if (!selectedAutomation) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await authenticatedFetch<ApiResponse<{ message: string; changes: Array<{ champ: string }> }>>('/api/automations/config/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationId: selectedAutomation.id, config }),
      });
      if (res.success && res.data) {
        setMessage(res.data.message);
        setOriginalConfig({ ...config });
      } else {
        setMessage(res.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setMessage('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);
  const fields = CONFIG_FIELDS_BY_CATEGORY[selectedAutomation?.categorie || ''] || EMAIL_CONFIG_FIELDS;

  return (
    <div className="space-y-6">
      {/* Selecteur d'automatisation */}
      {automations.length > 1 && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Automatisation a configurer</label>
          <select
            value={selectedAutomation?.id || ''}
            onChange={(e) => setSelectedAutomation(automations.find(a => a.id === e.target.value) || null)}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm border border-gray-600"
          >
            {automations.map(a => (
              <option key={a.id} value={a.id}>{a.nom} ({a.categorie})</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-400 text-sm">Chargement...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulaire de config */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-white font-semibold text-sm mb-1">
              Configuration — {selectedAutomation?.nom}
            </h3>
            <p className="text-gray-500 text-xs mb-6">Toute modification est tracee et notifiee a l&apos;administrateur.</p>

            <div className="space-y-4">
              {fields.map(field => (
                <div key={field.key}>
                  <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={config[field.key] || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm border border-gray-600 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Choisir --</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={config[field.key] || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm border border-gray-600 focus:border-amber-500 focus:outline-none placeholder-gray-500"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Message + bouton sauvegarder */}
            {message && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('Erreur') ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                {message}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <p className="text-gray-500 text-xs">
                {hasChanges ? 'Modifications non sauvegardees' : 'Aucune modification'}
              </p>
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {saving && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          {/* Historique des modifications */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              Historique modifications
            </h3>
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucune modification</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="border-l-2 border-gray-600 pl-3 py-1">
                    <p className="text-white text-xs font-medium">{log.champModifie || 'Configuration'}</p>
                    {log.ancienneValeur && (
                      <p className="text-red-400/70 text-xs line-through">{log.ancienneValeur}</p>
                    )}
                    {log.nouvelleValeur && (
                      <p className="text-green-400/70 text-xs">{log.nouvelleValeur}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">{log.userEmail} &middot; {formatDate(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Tab: Logs (charge depuis l'API)
// ============================================

function LogsTab({ isAdmin }: { isAdmin: boolean }) {
  const [logs, setLogs] = useState<EventLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Admin : selection de tenant
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  useEffect(() => {
    if (isAdmin) {
      authenticatedFetch<ApiResponse<{ tenants: TenantItem[] }>>('/api/automations/tenants')
        .then(res => {
          if (res.success && res.data) {
            setTenants(res.data.tenants || []);
          }
        })
        .catch(() => { /* silently ignore */ });
    }
  }, [isAdmin]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isAdmin && selectedTenantId
        ? `/api/automations/logs/${selectedTenantId}?limit=${pageSize}&offset=${page * pageSize}`
        : `/api/automations/logs?limit=${pageSize}&offset=${page * pageSize}`;

      const res = await authenticatedFetch<ApiResponse<{ logs: EventLogItem[]; total: number }>>(endpoint);
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedTenantId, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      {/* Admin : selection de tenant */}
      {isAdmin && (
        <div className="mb-4 flex items-center gap-3">
          <UserGroupIcon className="h-5 w-5 text-gray-400" />
          <select
            value={selectedTenantId}
            onChange={(e) => { setSelectedTenantId(e.target.value); setPage(0); }}
            className="bg-gray-800 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">Tous les tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.nomEntreprise}</option>
            ))}
          </select>
          <button onClick={fetchLogs} className="p-2 text-gray-400 hover:text-white transition-colors">
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-5 border-b border-gray-700">
          <h3 className="text-white font-semibold">Historique des executions</h3>
          <p className="text-gray-400 text-sm mt-1">
            {total} evenement{total > 1 ? 's' : ''} enregistre{total > 1 ? 's' : ''}.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-700">
                  <th className="px-5 py-3">Evenement</th>
                  <th className="px-5 py-3">Entite</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Workflow</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                      <ClockIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      Aucun log d&apos;execution pour le moment.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3 text-white text-sm font-mono">{log.typeEvenement}</td>
                      <td className="px-5 py-3 text-gray-300 text-sm">
                        {log.entiteType ? `${log.entiteType}${log.entiteId ? ` #${log.entiteId.slice(0, 8)}` : ''}` : '-'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.statutExecution === 'succes' ? 'text-green-400 bg-green-900/30' :
                          log.statutExecution === 'erreur' ? 'text-red-400 bg-red-900/30' :
                          'text-yellow-400 bg-yellow-900/30'
                        }`}>
                          {log.statutExecution === 'succes' ? 'Succes' : log.statutExecution === 'erreur' ? 'Erreur' : 'En attente'}
                        </span>
                        {log.messageErreur && (
                          <p className="text-red-400/70 text-xs mt-1 max-w-xs truncate" title={log.messageErreur}>
                            {log.messageErreur}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-sm font-mono">
                        {log.workflowN8nId || '-'}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-sm">{formatDate(log.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div className="p-4 border-t border-gray-700 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Page {page + 1} / {Math.ceil(total / pageSize)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm disabled:opacity-40"
              >
                Precedent
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * pageSize >= total}
                className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Tab: Administration (admin only)
// ============================================

function AdminTab({
  automations,
  onRefresh,
}: {
  automations: Automation[];
  onRefresh: () => void;
}) {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenantPurchases, setTenantPurchases] = useState<PurchaseItem[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    authenticatedFetch<ApiResponse<{ tenants: TenantItem[] }>>('/api/automations/tenants')
      .then(res => {
        if (res.success && res.data) setTenants(res.data.tenants || []);
      })
      .catch(() => { /* silently ignore */ });
  }, []);

  useEffect(() => {
    if (!selectedTenantId) { setTenantPurchases([]); return; }
    setLoadingPurchases(true);
    authenticatedFetch<ApiResponse<{ purchases: PurchaseItem[] }>>(`/api/automations/purchases/${selectedTenantId}`)
      .then(res => {
        if (res.success && res.data) setTenantPurchases(res.data.purchases || []);
      })
      .catch(() => setTenantPurchases([]))
      .finally(() => setLoadingPurchases(false));
  }, [selectedTenantId]);

  const handleActivate = async (automationId: string) => {
    if (!selectedTenantId) return;
    setActionLoading(automationId);
    try {
      const res = await authenticatedFetch<ApiResponse<{ folderId: string; folderName: string; workflowIds: string[] }>>('/api/automations/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenantId, automationId }),
      });
      if (res.success) {
        // Rafraichir les achats du tenant
        const purchasesRes = await authenticatedFetch<ApiResponse<{ purchases: PurchaseItem[] }>>(`/api/automations/purchases/${selectedTenantId}`);
        if (purchasesRes.success && purchasesRes.data) setTenantPurchases(purchasesRes.data.purchases || []);
        onRefresh();
      }
    } catch { /* handled */ }
    setActionLoading(null);
  };

  const handleDeactivate = async (automationId: string) => {
    if (!selectedTenantId) return;
    setActionLoading(automationId);
    try {
      await authenticatedFetch<ApiResponse<null>>('/api/automations/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenantId, automationId }),
      });
      const purchasesRes = await authenticatedFetch<ApiResponse<{ purchases: PurchaseItem[] }>>(`/api/automations/purchases/${selectedTenantId}`);
      if (purchasesRes.success && purchasesRes.data) setTenantPurchases(purchasesRes.data.purchases || []);
      onRefresh();
    } catch { /* handled */ }
    setActionLoading(null);
  };

  const handleDeleteCatalog = async (automationId: string) => {
    if (!confirm('Confirmer la desactivation de cette automatisation du catalogue ?')) return;
    setActionLoading(automationId);
    try {
      await authenticatedFetch<ApiResponse<null>>(`/api/automations/catalog/${automationId}`, {
        method: 'DELETE',
      });
      onRefresh();
    } catch { /* handled */ }
    setActionLoading(null);
  };

  const purchaseMap = new Map<string, PurchaseItem>();
  for (const p of tenantPurchases) {
    purchaseMap.set(p.automationId, p);
  }

  return (
    <div className="space-y-8">
      {/* Section 1 : Gestion par client */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-amber-400" />
          Gestion par client
        </h3>

        <div className="mb-4">
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">Selectionner un client...</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.nomEntreprise}</option>
            ))}
          </select>
        </div>

        {selectedTenantId && (
          loadingPurchases ? (
            <div className="flex items-center gap-2 py-4 text-gray-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              Chargement...
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm mb-3">
                {tenantPurchases.length} automatisation{tenantPurchases.length > 1 ? 's' : ''} configuree{tenantPurchases.length > 1 ? 's' : ''}
                {tenantPurchases.filter(p => p.status === 'active').length > 0 && (
                  <span className="text-green-400 ml-1">
                    ({tenantPurchases.filter(p => p.status === 'active').length} active{tenantPurchases.filter(p => p.status === 'active').length > 1 ? 's' : ''})
                  </span>
                )}
              </p>

              {/* Catalogue complet avec statut par tenant */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {automations.filter(a => a.isActive).map(auto => {
                  const purchase = purchaseMap.get(auto.id);
                  const isActive = purchase?.status === 'active';
                  const isPending = purchase?.status === 'en_attente';
                  const isSuspended = purchase?.status === 'suspendue';
                  const isLoading = actionLoading === auto.id;

                  return (
                    <div key={auto.id} className={`p-4 rounded-lg border ${
                      isActive ? 'border-green-500/30 bg-green-900/10' :
                      isPending ? 'border-yellow-500/30 bg-yellow-900/10' :
                      isSuspended ? 'border-orange-500/30 bg-orange-900/10' :
                      'border-gray-700 bg-gray-900/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium text-sm">{auto.nom}</h4>
                          <p className="text-gray-400 text-xs mt-0.5">
                            {auto.workflowCount} workflows · {auto.complexity}
                          </p>
                          {purchase?.n8nFolderName && (
                            <p className="text-gray-500 text-xs mt-0.5">
                              n8n: {purchase.n8nFolderName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <button
                              onClick={() => handleDeactivate(auto.id)}
                              disabled={isLoading}
                              className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 rounded text-xs font-medium transition-colors disabled:opacity-40"
                            >
                              {isLoading ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : 'Suspendre'}
                            </button>
                          )}
                          {!isActive && (
                            <button
                              onClick={() => handleActivate(auto.id)}
                              disabled={isLoading}
                              className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-1"
                            >
                              {isLoading ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : (
                                <>
                                  <PlayIcon className="h-3 w-3" />
                                  Activer
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* Section 2 : Gestion du catalogue */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          <CubeIcon className="h-5 w-5 text-amber-400" />
          Catalogue ({automations.length} automatisations)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Categorie</th>
                <th className="px-4 py-3">Prix setup</th>
                <th className="px-4 py-3">Prix/mois</th>
                <th className="px-4 py-3">Workflows</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {automations.map(auto => (
                <tr key={auto.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-white text-sm font-medium">{auto.nom}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm font-mono">{auto.code}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${CATEGORIE_COLORS[auto.categorie] || CATEGORIE_COLORS.general}`}>
                      {CATEGORIE_LABELS[auto.categorie] || auto.categorie}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-amber-400 text-sm">{fmtPrix(auto.setupPrice)}&euro;</td>
                  <td className="px-4 py-3 text-white text-sm">{fmtPrix(auto.monthlyPrice)}&euro;</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{auto.workflowCount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      auto.isActive ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'
                    }`}>
                      {auto.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeleteCatalog(auto.id)}
                      disabled={actionLoading === auto.id}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Desactiver du catalogue"
                    >
                      {actionLoading === auto.id
                        ? <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        : <TrashIcon className="h-4 w-4" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Modal Detail
// ============================================

function AutomationDetailModal({
  automation,
  onClose,
  isAdmin,
  onRequestActivation,
  requestLoading,
  requestMessage,
  onActivateForClient,
  onDeactivate,
}: {
  automation: Automation;
  onClose: () => void;
  isAdmin: boolean;
  onRequestActivation: (id: string) => void;
  requestLoading: boolean;
  requestMessage: string | null;
  onActivateForClient: (a: Automation) => void;
  onDeactivate: (a: Automation) => void;
}) {
  const CatIcon = CATEGORIE_ICONS[automation.categorie] || BoltIcon;
  const catColor = CATEGORIE_COLORS[automation.categorie] || CATEGORIE_COLORS.general;
  const complexity = COMPLEXITY_LABELS[automation.complexityLevel] || COMPLEXITY_LABELS[1];
  const statusConfig = STATUS_CONFIG[automation.status] || STATUS_CONFIG.inactif;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl border ${catColor}`}>
                <CatIcon className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{automation.nom}</h2>
                <span className={`text-xs font-medium ${complexity.color}`}>
                  Complexite : {complexity.label}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-gray-300">{automation.description}</p>

          {/* Features */}
          {automation.features.length > 0 && (
            <div>
              <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-2">Fonctionnalites incluses</h4>
              <div className="flex flex-wrap gap-2">
                {automation.features.map((f, i) => (
                  <span key={i} className="px-2.5 py-1 bg-gray-700/50 border border-gray-600/50 rounded-full text-gray-300 text-xs">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pricing (visible uniquement pour les clients) */}
          {!isAdmin && (
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
              <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-3">Tarification</h4>
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-3xl font-bold text-amber-400">{fmtPrix(automation.setupPrice)}&euro;</span>
                  <span className="text-gray-400 text-sm ml-1">setup unique</span>
                </div>
                <span className="text-gray-600 text-xl">+</span>
                <div>
                  <span className="text-2xl font-bold text-white">{fmtPrix(automation.monthlyPrice)}&euro;</span>
                  <span className="text-gray-400 text-sm">/mois</span>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                La mensualite inclut : serveur, API (OpenAI, etc.), maintenance et support.
              </p>
            </div>
          )}

          {/* Info admin */}
          {isAdmin && (
            <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
              <h4 className="text-amber-400 text-xs uppercase tracking-wide mb-2">Administration</h4>
              <div className="space-y-1 text-sm text-gray-300">
                <p>Code : <span className="font-mono text-amber-400">{automation.code}</span></p>
                <p>{automation.workflowCount} workflows n8n · Complexite {automation.complexity}</p>
                <p>Prix : {fmtPrix(automation.setupPrice)}&euro; setup + {fmtPrix(automation.monthlyPrice)}&euro;/mois</p>
                {automation.n8nFolderId && (
                  <p>Dossier n8n : {automation.n8nFolderName} ({automation.n8nFolderId})</p>
                )}
                {automation.n8nWorkflowIds && automation.n8nWorkflowIds.length > 0 && (
                  <p>Workflow IDs : {automation.n8nWorkflowIds.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900/50 rounded-lg p-3 text-center border border-gray-700/50">
              <p className="text-2xl font-bold text-white">{automation.workflowCount}</p>
              <p className="text-gray-400 text-xs">Workflows</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center border border-gray-700/50">
              <p className="text-2xl font-bold text-white">{automation.features.length}</p>
              <p className="text-gray-400 text-xs">Features</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center border border-gray-700/50">
              <span className={`text-2xl font-bold ${statusConfig.color.split(' ')[0]}`}>
                <statusConfig.icon className="h-6 w-6 mx-auto" />
              </span>
              <p className="text-gray-400 text-xs mt-1">{statusConfig.label}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 space-y-3">
          {isAdmin ? (
            <div className="flex gap-3">
              <button
                onClick={() => onActivateForClient(automation)}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                <PlayIcon className="h-4 w-4" />
                Activer pour un client
              </button>
              {automation.status === 'actif' && (
                <button
                  onClick={() => onDeactivate(automation)}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <PauseIcon className="h-4 w-4" />
                  Suspendre
                </button>
              )}
            </div>
          ) : automation.status === 'actif' ? (
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 bg-green-600/20 text-green-400 rounded-lg text-sm flex items-center justify-center gap-2 cursor-default">
                <CheckCircleIcon className="h-4 w-4" />
                Active
              </button>
            </div>
          ) : automation.status === 'en_attente' ? (
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 bg-yellow-600/20 text-yellow-400 rounded-lg text-sm flex items-center justify-center gap-2 cursor-default">
                <ClockIcon className="h-4 w-4" />
                Demande en cours
              </button>
            </div>
          ) : (
            <button
              onClick={() => onRequestActivation(automation.id)}
              disabled={requestLoading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {requestLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
              {requestLoading ? 'Envoi en cours...' : 'Demander l\'activation'}
            </button>
          )}

          {requestMessage && (
            <p className={`text-sm text-center ${requestMessage.includes('Erreur') ? 'text-red-400' : 'text-green-400'}`}>
              {requestMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Modal : Formulaire Catalogue (ajout/edition)
// ============================================

function CatalogFormModal({
  automation,
  onClose,
  onSaved,
}: {
  automation: Automation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!automation;
  const [form, setForm] = useState<CatalogFormData>(() => {
    if (automation) {
      return {
        code: automation.code,
        nom: automation.nom,
        description: automation.description,
        categorie: automation.categorie,
        icon: automation.icon,
        setupPrice: automation.setupPrice,
        monthlyPrice: automation.monthlyPrice,
        complexity: automation.complexity,
        workflowCount: automation.workflowCount,
        features: automation.features,
        workflowTemplates: automation.workflowTemplates,
      };
    }
    return { ...EMPTY_FORM };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFeature, setNewFeature] = useState('');

  const updateField = <K extends keyof CatalogFormData>(key: K, value: CatalogFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (trimmed && !form.features.includes(trimmed)) {
      updateField('features', [...form.features, trimmed]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    updateField('features', form.features.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.code || !form.nom || !form.description || !form.categorie) {
      setError('Tous les champs obligatoires doivent etre remplis');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEdit && automation) {
        const res = await authenticatedFetch<ApiResponse<null>>(`/api/automations/catalog/${automation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.success) { setError(res.error || 'Erreur modification'); return; }
      } else {
        const res = await authenticatedFetch<ApiResponse<null>>('/api/automations/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.success) { setError(res.error || 'Erreur creation'); return; }
      }
      onSaved();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Modifier l\'automatisation' : 'Nouvelle automatisation'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Code *</label>
              <input
                value={form.code}
                onChange={(e) => updateField('code', e.target.value)}
                disabled={isEdit}
                placeholder="auto-email"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
              />
            </div>

            {/* Categorie */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Categorie *</label>
              <select
                value={form.categorie}
                onChange={(e) => { updateField('categorie', e.target.value); updateField('icon', e.target.value); }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORIE_LABELS[c] || c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nom */}
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Nom *</label>
            <input
              value={form.nom}
              onChange={(e) => updateField('nom', e.target.value)}
              placeholder="Gestion Email Automatisee"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              placeholder="Description detaillee de l'automatisation..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Prix setup */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Prix setup (&euro;)</label>
              <input
                type="number"
                value={form.setupPrice}
                onChange={(e) => updateField('setupPrice', Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Prix mensuel */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Prix/mois (&euro;)</label>
              <input
                type="number"
                value={form.monthlyPrice}
                onChange={(e) => updateField('monthlyPrice', Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Complexite */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Complexite</label>
              <select
                value={form.complexity}
                onChange={(e) => updateField('complexity', e.target.value as AutomationComplexity)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="simple">Simple</option>
                <option value="intermediaire">Intermediaire</option>
                <option value="avance">Avance</option>
              </select>
            </div>
          </div>

          {/* Nombre de workflows */}
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Nombre de workflows n8n</label>
            <input
              type="number"
              value={form.workflowCount}
              onChange={(e) => updateField('workflowCount', Number(e.target.value))}
              className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Features */}
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide block mb-2">Fonctionnalites</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.features.map((f, i) => (
                <span key={i} className="px-2.5 py-1 bg-gray-700 rounded-full text-gray-300 text-xs flex items-center gap-1.5">
                  {f}
                  <button onClick={() => removeFeature(i)} className="text-gray-500 hover:text-red-400">
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                placeholder="Ajouter une fonctionnalite..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                onClick={addFeature}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckCircleIcon className="h-4 w-4" />}
            {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Creer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Modal : Activer pour un client (admin)
// ============================================

function ActivateForClientModal({
  automation,
  onClose,
  onActivated,
}: {
  automation: Automation;
  onClose: () => void;
  onActivated: () => void;
}) {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    authenticatedFetch<ApiResponse<{ tenants: TenantItem[] }>>('/api/automations/tenants')
      .then(res => {
        if (res.success && res.data) setTenants(res.data.tenants || []);
      })
      .catch(() => { /* silently ignore */ });
  }, []);

  const handleActivate = async () => {
    if (!selectedTenantId) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await authenticatedFetch<ApiResponse<{ folderId: string; folderName: string; workflowIds: string[] }>>('/api/automations/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          automationId: automation.id,
        }),
      });

      if (res.success) {
        const data = res.data;
        setResult({
          success: true,
          message: `Automatisation activee ! ${data?.workflowIds?.length || 0} workflow(s) cree(s)${data?.folderName ? ` dans "${data.folderName}"` : ''}.`,
        });
        setTimeout(() => onActivated(), 2000);
      } else {
        setResult({ success: false, message: res.error || 'Erreur activation' });
      }
    } catch {
      setResult({ success: false, message: 'Erreur de connexion a n8n' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PlayIcon className="h-5 w-5 text-green-400" />
            Activer pour un client
          </h2>
          <p className="text-gray-400 text-sm mt-1">{automation.nom}</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-300 text-sm">
            Cette action va creer automatiquement les workflows n8n ({automation.workflowCount})
            dans un dossier dedie au client selectionne.
          </p>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Client *</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">Selectionner un client...</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.nomEntreprise}</option>
              ))}
            </select>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50 text-sm text-gray-400">
            <p><strong className="text-white">n8n creera automatiquement :</strong></p>
            <p className="mt-1">· Un dossier [Client] NomEntreprise</p>
            <p>· {automation.workflowCount} workflow(s) preconfigures</p>
            <p>· Les connexions au serveur du client</p>
          </div>

          {result && (
            <div className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
              result.success
                ? 'bg-green-900/30 border border-green-500/30 text-green-400'
                : 'bg-red-900/30 border border-red-500/30 text-red-400'
            }`}>
              {result.success ? <CheckCircleIcon className="h-5 w-5 flex-shrink-0" /> : <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />}
              {result.message}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleActivate}
            disabled={!selectedTenantId || loading}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlayIcon className="h-4 w-4" />}
            {loading ? 'Activation via n8n...' : 'Activer'}
          </button>
        </div>
      </div>
    </div>
  );
}
