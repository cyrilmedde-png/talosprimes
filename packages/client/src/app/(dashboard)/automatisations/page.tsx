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
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
// apiClient n'a pas encore de section automations —
// les donnees viendront du catalogue statique + futur endpoint

// ============================================
// Types
// ============================================

interface Automation {
  id: string;
  nom: string;
  description: string;
  categorie: string;
  icon: string;
  setupPrice: number;
  monthlyPrice: number;
  complexityLevel: number;
  status: 'actif' | 'inactif' | 'en_attente' | 'erreur';
  workflowCount: number;
  lastExecution?: string;
  executionsToday: number;
  successRate: number;
}

interface AutomationStats {
  totalAutomations: number;
  actives: number;
  executionsToday: number;
  tauxReussite: number;
  erreurs24h: number;
}

type TabType = 'catalogue' | 'mes-automatisations' | 'logs';

// ============================================
// Constantes
// ============================================

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
  erreur: { label: 'Erreur', color: 'text-red-400 bg-red-900/30', icon: ExclamationTriangleIcon },
};

const COMPLEXITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Simple', color: 'text-green-400' },
  2: { label: 'Intermediaire', color: 'text-amber-400' },
  3: { label: 'Avance', color: 'text-red-400' },
};

// ============================================
// Catalogue statique (les automatisations disponibles)
// ============================================

const CATALOGUE: Automation[] = [
  {
    id: 'auto-email',
    nom: 'Gestion Email Automatisee',
    description: 'Campagnes email, newsletters, sequences de bienvenue, relances automatiques et segmentation avancee des contacts.',
    categorie: 'email',
    icon: 'email',
    setupPrice: 799,
    monthlyPrice: 59,
    complexityLevel: 1,
    status: 'inactif',
    workflowCount: 6,
    executionsToday: 0,
    successRate: 0,
  },
  {
    id: 'auto-social',
    nom: 'Connexion Reseaux Sociaux',
    description: 'Publication automatique sur Facebook, Instagram et TikTok. Planification, generation de contenu IA et analytics.',
    categorie: 'marketing',
    icon: 'marketing',
    setupPrice: 1290,
    monthlyPrice: 99,
    complexityLevel: 2,
    status: 'inactif',
    workflowCount: 8,
    executionsToday: 0,
    successRate: 0,
  },
  {
    id: 'auto-telephonie',
    nom: 'Agent Telephonique IA',
    description: 'Standard telephonique intelligent, prise de RDV automatique, qualification des appels et transcription vocale.',
    categorie: 'telephonie',
    icon: 'telephonie',
    setupPrice: 1990,
    monthlyPrice: 149,
    complexityLevel: 3,
    status: 'inactif',
    workflowCount: 12,
    executionsToday: 0,
    successRate: 0,
  },
  {
    id: 'auto-facturation',
    nom: 'Facturation Automatique',
    description: 'Generation de factures, relances impayees, envoi automatique par email, suivi des paiements et export comptable.',
    categorie: 'facturation',
    icon: 'facturation',
    setupPrice: 899,
    monthlyPrice: 69,
    complexityLevel: 1,
    status: 'inactif',
    workflowCount: 7,
    executionsToday: 0,
    successRate: 0,
  },
  {
    id: 'auto-crm',
    nom: 'CRM & Suivi Clients',
    description: 'Automatisation du suivi client, notifications de relance, scoring des leads, onboarding automatise et rapports.',
    categorie: 'crm',
    icon: 'crm',
    setupPrice: 990,
    monthlyPrice: 79,
    complexityLevel: 2,
    status: 'inactif',
    workflowCount: 9,
    executionsToday: 0,
    successRate: 0,
  },
  {
    id: 'auto-sms',
    nom: 'Campagnes SMS',
    description: 'Envoi de SMS en masse, notifications automatiques, confirmations RDV et campagnes promotionnelles.',
    categorie: 'sms',
    icon: 'sms',
    setupPrice: 599,
    monthlyPrice: 49,
    complexityLevel: 1,
    status: 'inactif',
    workflowCount: 4,
    executionsToday: 0,
    successRate: 0,
  },
  {
    id: 'auto-compta',
    nom: 'Comptabilite Automatisee',
    description: 'Ecritures automatiques, rapprochement bancaire, declarations TVA, export FEC et conformite legale.',
    categorie: 'comptabilite',
    icon: 'comptabilite',
    setupPrice: 1490,
    monthlyPrice: 119,
    complexityLevel: 3,
    status: 'inactif',
    workflowCount: 10,
    executionsToday: 0,
    successRate: 0,
  },
  {
    id: 'auto-stock',
    nom: 'Gestion de Stock Intelligente',
    description: 'Alertes de stock bas, reapprovisionnement automatique, suivi multi-sites et inventaires planifies.',
    categorie: 'stock',
    icon: 'stock',
    setupPrice: 890,
    monthlyPrice: 69,
    complexityLevel: 2,
    status: 'inactif',
    workflowCount: 6,
    executionsToday: 0,
    successRate: 0,
  },
];

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

// ============================================
// Composant principal
// ============================================

export default function AutomatisationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('catalogue');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('all');
  const [automations] = useState<Automation[]>(CATALOGUE);
  const [stats, setStats] = useState<AutomationStats>({
    totalAutomations: CATALOGUE.length,
    actives: 0,
    executionsToday: 0,
    tauxReussite: 0,
    erreurs24h: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);

  // TODO: Charger les données reelles depuis l'API quand l'endpoint sera pret
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Futur endpoint: /api/automations/status
      // Pour l'instant, on utilise le catalogue statique
      const actives = CATALOGUE.filter(a => a.status === 'actif');
      setStats(prev => ({
        ...prev,
        totalAutomations: CATALOGUE.length,
        actives: actives.length,
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrage
  const filteredAutomations = automations.filter(a => {
    const matchSearch = a.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategorie = selectedCategorie === 'all' || a.categorie === selectedCategorie;
    return matchSearch && matchCategorie;
  });

  const activeAutomations = automations.filter(a => a.status === 'actif');
  const categories = ['all', ...Array.from(new Set(automations.map(a => a.categorie)))];

  const tabs: Array<{ key: TabType; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; count?: number }> = [
    { key: 'catalogue', label: 'Catalogue', icon: CubeIcon, count: automations.length },
    { key: 'mes-automatisations', label: 'Mes Automatisations', icon: BoltIcon, count: activeAutomations.length },
    { key: 'logs', label: 'Historique', icon: ClockIcon },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BoltIcon className="h-8 w-8 text-amber-400" />
          Automatisations
        </h1>
        <p className="text-gray-400 mt-1">
          Catalogue d&apos;automatisations et suivi de vos workflows actifs.
        </p>
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.totalAutomations}</p>
          <div className="w-8 h-1 rounded mt-2 bg-gray-500"></div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Actives</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats.actives}</p>
          <div className="w-8 h-1 rounded mt-2 bg-green-500"></div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Executions (24h)</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{stats.executionsToday}</p>
          <div className="w-8 h-1 rounded mt-2 bg-blue-500"></div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Taux de reussite</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.tauxReussite}%</p>
          <div className="w-8 h-1 rounded mt-2 bg-amber-500"></div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Erreurs (24h)</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{stats.erreurs24h}</p>
          <div className="w-8 h-1 rounded mt-2 bg-red-500"></div>
        </div>
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
          {/* Tab: Catalogue */}
          {activeTab === 'catalogue' && (
            <CatalogueTab
              automations={filteredAutomations}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategorie={selectedCategorie}
              onCategorieChange={setSelectedCategorie}
              categories={categories}
              onSelect={setSelectedAutomation}
            />
          )}

          {/* Tab: Mes Automatisations */}
          {activeTab === 'mes-automatisations' && (
            <MesAutomatisationsTab
              automations={activeAutomations}
              onSelect={setSelectedAutomation}
            />
          )}

          {/* Tab: Logs */}
          {activeTab === 'logs' && (
            <LogsTab />
          )}
        </>
      )}

      {/* Modal Detail */}
      {selectedAutomation && (
        <AutomationDetailModal
          automation={selectedAutomation}
          onClose={() => setSelectedAutomation(null)}
        />
      )}
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
}: {
  automations: Automation[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  selectedCategorie: string;
  onCategorieChange: (v: string) => void;
  categories: string[];
  onSelect: (a: Automation) => void;
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
              onClick={() => onSelect(auto)}
              className="bg-gray-800 rounded-xl border border-gray-700 hover:border-amber-500/50 transition-all duration-200 cursor-pointer group"
            >
              {/* Header carte */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg border ${catColor}`}>
                    <CatIcon className="h-6 w-6" />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
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
                <span className={`text-xs font-medium ${complexity.color}`}>
                  {complexity.label}
                </span>
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
                  <p className="text-gray-400 text-sm">{auto.workflowCount} workflows</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-gray-400 text-xs">Executions (24h)</p>
                  <p className="text-white font-mono font-semibold">{auto.executionsToday}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-gray-400 text-xs">Taux de reussite</p>
                  <p className={`font-mono font-semibold ${auto.successRate >= 95 ? 'text-green-400' : auto.successRate >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                    {auto.successRate}%
                  </p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-gray-400 text-xs">Derniere execution</p>
                  <p className="text-gray-300 text-sm">{formatDate(auto.lastExecution)}</p>
                </div>
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
// Tab: Logs
// ============================================

function LogsTab() {
  const [logs] = useState<Array<{
    id: string;
    automation: string;
    event: string;
    status: 'succes' | 'erreur' | 'en_attente';
    date: string;
    duration: string;
  }>>([]);

  return (
    <div>
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-5 border-b border-gray-700">
          <h3 className="text-white font-semibold">Historique des executions</h3>
          <p className="text-gray-400 text-sm mt-1">Journaux des derniers workflows executes.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="px-5 py-3">Automatisation</th>
                <th className="px-5 py-3">Evenement</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Duree</th>
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
                    <td className="px-5 py-3 text-white text-sm">{log.automation}</td>
                    <td className="px-5 py-3 text-gray-300 text-sm">{log.event}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.status === 'succes' ? 'text-green-400 bg-green-900/30' :
                        log.status === 'erreur' ? 'text-red-400 bg-red-900/30' :
                        'text-yellow-400 bg-yellow-900/30'
                      }`}>
                        {log.status === 'succes' ? 'Succes' : log.status === 'erreur' ? 'Erreur' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-sm font-mono">{log.duration}</td>
                    <td className="px-5 py-3 text-gray-400 text-sm">{formatDate(log.date)}</td>
                  </tr>
                ))
              )}
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
}: {
  automation: Automation;
  onClose: () => void;
}) {
  const CatIcon = CATEGORIE_ICONS[automation.categorie] || BoltIcon;
  const catColor = CATEGORIE_COLORS[automation.categorie] || CATEGORIE_COLORS.general;
  const complexity = COMPLEXITY_LABELS[automation.complexityLevel] || COMPLEXITY_LABELS[1];
  const statusConfig = STATUS_CONFIG[automation.status] || STATUS_CONFIG.inactif;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg shadow-2xl"
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
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-gray-300">{automation.description}</p>

          {/* Pricing */}
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900/50 rounded-lg p-3 text-center border border-gray-700/50">
              <p className="text-2xl font-bold text-white">{automation.workflowCount}</p>
              <p className="text-gray-400 text-xs">Workflows</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center border border-gray-700/50">
              <p className="text-2xl font-bold text-white">{automation.executionsToday}</p>
              <p className="text-gray-400 text-xs">Executions/24h</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center border border-gray-700/50">
              <p className={`text-2xl font-bold ${automation.successRate >= 95 ? 'text-green-400' : automation.successRate >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                {automation.successRate}%
              </p>
              <p className="text-gray-400 text-xs">Reussite</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Statut actuel</span>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${statusConfig.color}`}>
              <statusConfig.icon className="h-4 w-4" />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex gap-3">
          {automation.status === 'actif' ? (
            <>
              <button className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                <Cog6ToothIcon className="h-4 w-4" />
                Configurer
              </button>
              <button className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                <EyeIcon className="h-4 w-4" />
                Voir les logs
              </button>
            </>
          ) : (
            <button className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2">
              <PlayIcon className="h-4 w-4" />
              Demander l&apos;activation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
