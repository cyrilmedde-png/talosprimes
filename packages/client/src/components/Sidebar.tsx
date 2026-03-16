'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  BellIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  SparklesIcon,
  BanknotesIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  DocumentCheckIcon,
  ReceiptRefundIcon,
  ChevronDownIcon,
  WrenchScrewdriverIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  CalculatorIcon,
  DocumentCheckIcon as QuestionIcon,
  Cog6ToothIcon as SettingsIcon,
  Bars3Icon,
  XMarkIcon,
  LockClosedIcon,
  AcademicCapIcon,
  CalendarIcon,
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  BookOpenIcon,
  ArrowPathIcon,
  CurrencyEuroIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  GiftIcon,
  TicketIcon,
  TagIcon,
  CubeIcon,
  TruckIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  StarIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth-store';
import { clearTokens } from '@/lib/auth';

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type SubGroup = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  requiredModules: string[];
  items: NavItem[];
};

type NavGroup = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  items: NavItem[];
  requiredModules: string[];
  subGroups?: SubGroup[];
};

const allNavGroups: NavGroup[] = [
  // ─── Administration (Dashboard + Assistant IA + Admin) ───
  {
    label: 'Administration',
    icon: HomeIcon,
    requiredModules: [],
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'Assistant IA', href: '/assistant', icon: SparklesIcon },
      { name: 'Paramètres', href: '/settings', icon: Cog6ToothIcon },
      { name: 'Plans & Modules', href: '/plans', icon: BanknotesIcon },
      { name: 'Logs', href: '/logs', icon: ClipboardDocumentListIcon },
      { name: 'Notifications', href: '/notifications', icon: BellIcon },
      { name: 'CMS Landing Page', href: '/cms', icon: PencilSquareIcon },
    ],
  },

  // ─── Commercial ───────────────────────────────────
  {
    label: 'Clientèle',
    icon: UsersIcon,
    requiredModules: ['clients', 'leads'],
    items: [
      { name: 'Leads', href: '/leads', icon: UserPlusIcon },
      { name: 'Clients', href: '/clients', icon: UsersIcon },
      { name: 'Onboarding', href: '/onboarding', icon: UserPlusIcon },
    ],
  },
  {
    label: 'Partenaires',
    icon: BuildingOffice2Icon,
    requiredModules: ['partenaire'],
    items: [
      { name: 'Dashboard', href: '/partenaires', icon: ChartBarIcon },
      { name: 'Liste Partenaires', href: '/partenaires/liste', icon: BuildingOffice2Icon },
      { name: 'Commissions', href: '/partenaires/commissions', icon: GiftIcon },
    ],
  },
  {
    label: 'Revenus',
    icon: CurrencyEuroIcon,
    requiredModules: ['partenaire'],
    items: [
      { name: 'Dashboard MRR', href: '/revenus', icon: ChartBarIcon },
      { name: 'Commissions', href: '/revenus/commissions', icon: CurrencyEuroIcon },
    ],
  },

  // ─── Facturation & Finance ────────────────────────
  {
    label: 'Facturation',
    icon: BanknotesIcon,
    requiredModules: ['facturation', 'devis', 'bons_commande', 'avoirs', 'proformas', 'articles'],
    items: [
      { name: 'Factures', href: '/factures', icon: BanknotesIcon },
      { name: 'Devis', href: '/devis', icon: DocumentTextIcon },
      { name: 'Proformas', href: '/proforma', icon: DocumentCheckIcon },
      { name: 'Avoirs', href: '/avoir', icon: ReceiptRefundIcon },
      { name: 'Bons de commande', href: '/bons-commande', icon: DocumentDuplicateIcon },
      { name: 'Articles', href: '/articles', icon: TagIcon },
    ],
  },
  {
    label: 'Comptabilité',
    icon: CalculatorIcon,
    requiredModules: ['comptabilite'],
    items: [
      { name: 'Tableau de bord', href: '/comptabilite', icon: CalculatorIcon },
      { name: 'Écritures', href: '/comptabilite/ecritures', icon: DocumentTextIcon },
      { name: 'Grand Livre', href: '/comptabilite/grand-livre', icon: ClipboardDocumentListIcon },
      { name: 'Balance', href: '/comptabilite/balance', icon: BanknotesIcon },
      { name: 'Bilan', href: '/comptabilite/bilan', icon: DocumentCheckIcon },
      { name: 'Compte de Résultat', href: '/comptabilite/compte-resultat', icon: DocumentDuplicateIcon },
      { name: 'TVA', href: '/comptabilite/tva', icon: ReceiptRefundIcon },
      { name: 'Rapprochement', href: '/comptabilite/rapprochement', icon: ArrowPathIcon },
      { name: 'Agent IA Comptable', href: '/comptabilite/ia', icon: SparklesIcon },
      { name: 'Clôture', href: '/comptabilite/cloture', icon: LockClosedIcon },
      { name: 'Prévisionnel', href: '/previsionnel', icon: ChartBarIcon },
      { name: '── Conformité ──', href: '/conformite', icon: ShieldCheckIcon },
      { name: 'FEC', href: '/conformite/fec', icon: DocumentTextIcon },
      { name: 'Factur-X', href: '/conformite/facturx', icon: DocumentCheckIcon },
      { name: 'E-Reporting', href: '/conformite/e-reporting', icon: ChartBarIcon },
      { name: 'EDI-TVA', href: '/conformite/edi-tva', icon: CurrencyEuroIcon },
      { name: 'DAS2', href: '/conformite/das2', icon: BanknotesIcon },
      { name: 'Piste d\'Audit', href: '/conformite/piste-audit', icon: ArrowPathIcon },
      { name: 'Archivage Légal', href: '/conformite/archives', icon: LockClosedIcon },
      { name: 'Vérif. Sirene', href: '/conformite/sirene', icon: BuildingOffice2Icon },
      { name: 'Périodes', href: '/conformite/periodes', icon: CalendarIcon },
    ],
  },

  // ─── Gestion (sous-onglets) ─────────────────────
  {
    label: 'Gestion',
    icon: RectangleStackIcon,
    requiredModules: ['gestion_equipe', 'gestion_projet', 'gestion_rh', 'btp', 'gestion_stock'],
    items: [],
    subGroups: [
      {
        label: 'Gestion d\'Équipe',
        icon: UsersIcon,
        requiredModules: ['gestion_equipe'],
        items: [
          { name: 'Dashboard', href: '/equipe', icon: UsersIcon },
          { name: 'Membres', href: '/equipe/membres', icon: UserPlusIcon },
          { name: 'Absences', href: '/equipe/absences', icon: ClipboardDocumentListIcon },
          { name: 'Pointage', href: '/equipe/pointage', icon: DocumentCheckIcon },
        ],
      },
      {
        label: 'Gestion de Projet',
        icon: ClipboardDocumentListIcon,
        requiredModules: ['gestion_projet'],
        items: [
          { name: 'Dashboard', href: '/projets', icon: ClipboardDocumentListIcon },
          { name: 'Mes Projets', href: '/projets/liste', icon: DocumentTextIcon },
          { name: 'Tâches', href: '/projets/taches', icon: DocumentCheckIcon },
        ],
      },
      {
        label: 'Ressources Humaines',
        icon: AcademicCapIcon,
        requiredModules: ['gestion_rh'],
        items: [
          { name: 'Dashboard', href: '/rh', icon: HomeIcon },
          { name: 'Contrats', href: '/rh/contrats', icon: DocumentTextIcon },
          { name: 'Paie', href: '/rh/paie', icon: BanknotesIcon },
          { name: 'Congés', href: '/rh/conges', icon: CalendarIcon },
          { name: 'Documents', href: '/rh/documents', icon: DocumentDuplicateIcon },
          { name: 'Entretiens', href: '/rh/entretiens', icon: ChatBubbleLeftIcon },
          { name: 'Formations', href: '/rh/formations', icon: AcademicCapIcon },
          { name: 'Évaluations', href: '/rh/evaluations', icon: CheckCircleIcon },
        ],
      },
      {
        label: 'BTP',
        icon: WrenchScrewdriverIcon,
        requiredModules: ['btp'],
        items: [
          { name: 'Dashboard', href: '/btp', icon: WrenchScrewdriverIcon },
          { name: 'Chantiers', href: '/btp/chantiers', icon: DocumentTextIcon },
          { name: 'Situations', href: '/btp/situations', icon: DocumentDuplicateIcon },
        ],
      },
      {
        label: 'Gestion de Stock',
        icon: CubeIcon,
        requiredModules: ['gestion_stock'],
        items: [
          { name: 'Dashboard Stock', href: '/gestion-stock', icon: ChartBarIcon },
          { name: 'Entrepôts', href: '/gestion-stock/sites', icon: BuildingOffice2Icon },
          { name: 'Niveaux', href: '/gestion-stock/niveaux', icon: ClipboardDocumentListIcon },
          { name: 'Mouvements', href: '/gestion-stock/mouvements', icon: ArrowPathIcon },
          { name: 'Transferts', href: '/gestion-stock/transferts', icon: TruckIcon },
          { name: 'Inventaires', href: '/gestion-stock/inventaires', icon: DocumentCheckIcon },
          { name: 'Alertes', href: '/gestion-stock/alertes', icon: BellIcon },
        ],
      },
    ],
  },

  // ─── Communication & Marketing ────────────────────
  {
    label: 'Agent IA',
    icon: PhoneIcon,
    requiredModules: ['agent_telephonique'],
    items: [
      { name: 'Dashboard', href: '/agent-ia', icon: SparklesIcon },
      { name: 'Appels', href: '/agent-ia/appels', icon: PhoneIcon },
      { name: 'SMS', href: '/agent-ia/sms', icon: ChatBubbleLeftIcon },
      { name: 'Calendrier', href: '/agent-ia/calendrier', icon: CalendarDaysIcon },
      { name: 'Conversations', href: '/agent-ia/conversations', icon: ChatBubbleBottomCenterTextIcon },
      { name: 'Questionnaires', href: '/agent-ia/questionnaires', icon: QuestionIcon },
      { name: 'Avis clients', href: '/agent-ia/avis', icon: StarIcon },
      { name: 'Base Connaissances', href: '/agent-ia/base-connaissances', icon: BookOpenIcon },
      { name: 'Configuration', href: '/agent-ia/configuration', icon: SettingsIcon },
    ],
  },
  {
    label: 'Marketing Digital',
    icon: MegaphoneIcon,
    requiredModules: ['marketing_digital'],
    items: [
      { name: 'Dashboard', href: '/marketing', icon: ChartBarIcon },
      { name: 'Publications', href: '/marketing/publications', icon: MegaphoneIcon },
      { name: 'Calendrier', href: '/marketing/calendrier', icon: CalendarIcon },
      { name: 'Configuration', href: '/marketing/configuration', icon: Cog6ToothIcon },
    ],
  },
  {
    label: 'Newsletter',
    icon: EnvelopeIcon,
    requiredModules: ['newsletter'],
    items: [
      { name: 'Dashboard', href: '/newsletters', icon: HomeIcon },
      { name: 'Campagnes', href: '/newsletters/campaigns', icon: PaperAirplaneIcon },
      { name: 'Contacts', href: '/newsletters/contacts', icon: UserGroupIcon },
      { name: 'Templates', href: '/newsletters/templates', icon: RectangleStackIcon },
      { name: 'SMS', href: '/newsletters/sms', icon: ChatBubbleLeftIcon },
      { name: 'Analytics', href: '/newsletters/analytics', icon: ChartBarIcon },
    ],
  },

  // ─── Support ──────────────────────────────────────
  {
    label: 'Support',
    icon: TicketIcon,
    requiredModules: ['ticketing'],
    items: [
      { name: 'Tickets', href: '/tickets', icon: TicketIcon },
    ],
  },
];

export default function Sidebar({ onToggle }: { onToggle?: (collapsed: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { clearAuth, modulesActifs, isClientUser } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter mobile (< 768px) avec debounce pour éviter les re-renders excessifs
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout>;
    const checkMobile = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (!mobile) {
          setMobileOpen(false);
        }
      }, 150);
    };
    // Appel initial sans debounce
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Fermer le menu mobile quand on change de page
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navGroups = useMemo(() => {
    // Items réservés à l'admin (pas visibles pour les clients finaux)
    const adminOnlyItems = ['/plans'];

    return allNavGroups
      .filter((group) => {
        if (group.requiredModules.length === 0) return true;
        return group.requiredModules.some((mod) => modulesActifs.includes(mod));
      })
      .map((group) => {
        const filtered = {
          ...group,
          items: isClientUser
            ? group.items.filter((item) => !adminOnlyItems.includes(item.href))
            : group.items,
        };
        // Filtrer les subGroups selon les modules actifs
        if (filtered.subGroups) {
          filtered.subGroups = filtered.subGroups.filter((sg) =>
            sg.requiredModules.some((mod) => modulesActifs.includes(mod))
          );
        }
        return filtered;
      })
      .filter((group) => group.items.length > 0 || (group.subGroups && group.subGroups.length > 0));
  }, [modulesActifs, isClientUser]);

  const handleLogout = () => {
    clearTokens();
    clearAuth();
    router.push('/login');
  };

  const handleToggle = (collapsed: boolean) => {
    if (isMobile) return; // Sur mobile, pas de hover toggle
    setIsCollapsed(collapsed);
    onToggle?.(collapsed);
    if (collapsed) {
      setOpenGroups({});
    }
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isItemActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + '/');

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isItemActive(item.href)) ||
    (group.subGroups?.some((sg) => sg.items.some((item) => isItemActive(item.href))) ?? false);

  const isSubGroupActive = (sg: SubGroup) =>
    sg.items.some((item) => isItemActive(item.href));

  // Sur mobile, la sidebar est un drawer plein écran
  const sidebarExpanded = isMobile ? mobileOpen : !isCollapsed;

  const sidebarContent = (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto sidebar-scroll">
        {/* Logo / Déconnexion */}
        <div className="flex items-center flex-shrink-0 px-4 mb-6 justify-between">
          <button
            onClick={handleLogout}
            className="text-2xl font-bold text-white hover:text-gray-300 transition-colors focus:outline-none"
            title="Déconnexion"
          >
            {sidebarExpanded ? 'TalosPrimes' : 'TP'}
          </button>
          {/* Bouton fermer sur mobile */}
          {isMobile && mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navGroups.map((group) => {
            const groupActive = isGroupActive(group);
            const isOpen = openGroups[group.label] || false;

            return (
              <div key={group.label}>
                <button
                  onClick={() => {
                    if (sidebarExpanded) {
                      toggleGroup(group.label);
                    }
                  }}
                  className={`
                    w-full group flex items-center px-2 py-2.5 text-sm font-medium rounded-md
                    ${groupActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                    ${!sidebarExpanded ? 'justify-center' : ''}
                  `}
                  title={!sidebarExpanded ? group.label : ''}
                >
                  <group.icon
                    className={`flex-shrink-0 h-6 w-6 ${sidebarExpanded ? 'mr-3' : ''} ${groupActive ? 'text-amber-400' : 'text-gray-400 group-hover:text-gray-300'}`}
                  />
                  {sidebarExpanded && (
                    <>
                      <span className="flex-1 text-left">{group.label}</span>
                      <ChevronDownIcon
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                </button>

                {sidebarExpanded && isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {/* Items directs */}
                    {group.items.map((item) => {
                      const active = isItemActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`
                            group flex items-center pl-4 pr-2 py-2 text-sm rounded-md border-l-2
                            ${active
                              ? 'border-amber-400 bg-gray-800/60 text-white'
                              : 'border-transparent text-gray-400 hover:bg-gray-700/50 hover:text-white hover:border-gray-500'}
                          `}
                        >
                          <item.icon
                            className={`flex-shrink-0 h-5 w-5 mr-2.5 ${active ? 'text-amber-400' : 'text-gray-500 group-hover:text-gray-300'}`}
                          />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}

                    {/* Sous-onglets (ex: Gestion) */}
                    {group.subGroups?.map((sg) => {
                      const sgActive = isSubGroupActive(sg);
                      const sgOpen = openGroups[`${group.label}/${sg.label}`] || false;
                      return (
                        <div key={sg.label}>
                          <button
                            onClick={() => toggleGroup(`${group.label}/${sg.label}`)}
                            className={`
                              w-full group flex items-center pl-4 pr-2 py-2 text-sm font-medium rounded-md border-l-2
                              ${sgActive
                                ? 'border-amber-400 bg-gray-800/60 text-white'
                                : 'border-transparent text-gray-400 hover:bg-gray-700/50 hover:text-white hover:border-gray-500'}
                            `}
                          >
                            <sg.icon
                              className={`flex-shrink-0 h-5 w-5 mr-2.5 ${sgActive ? 'text-amber-400' : 'text-gray-500 group-hover:text-gray-300'}`}
                            />
                            <span className="flex-1 text-left">{sg.label}</span>
                            <ChevronDownIcon
                              className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${sgOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {sgOpen && (
                            <div className="ml-4 mt-0.5 space-y-0.5">
                              {sg.items.map((item) => {
                                const active = isItemActive(item.href);
                                return (
                                  <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`
                                      group flex items-center pl-4 pr-2 py-1.5 text-xs rounded-md border-l-2
                                      ${active
                                        ? 'border-amber-400 bg-gray-800/40 text-white'
                                        : 'border-transparent text-gray-500 hover:bg-gray-700/40 hover:text-white hover:border-gray-600'}
                                    `}
                                  >
                                    <item.icon
                                      className={`flex-shrink-0 h-4 w-4 mr-2 ${active ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-400'}`}
                                    />
                                    <span>{item.name}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Bouton hamburger mobile — toujours visible en haut à gauche */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-gray-800 border border-gray-700 text-white shadow-lg hover:bg-gray-700 focus:outline-none"
          aria-label="Ouvrir le menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      )}

      {/* Overlay mobile */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          ${isMobile
            ? `fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `fixed inset-y-0 left-0 z-40 bg-gray-900 transform transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-60'}`
          }
        `}
        onMouseEnter={() => !isMobile && handleToggle(false)}
        onMouseLeave={() => !isMobile && handleToggle(true)}
      >
        {sidebarContent}
      </div>
    </>
  );
}
