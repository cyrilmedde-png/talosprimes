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
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth-store';
import { clearTokens } from '@/lib/auth';

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type NavGroup = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  items: NavItem[];
  requiredModules: string[];
};

const standaloneItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Assistant IA', href: '/assistant', icon: SparklesIcon },
];

const allNavGroups: NavGroup[] = [
  {
    label: 'Facturation',
    icon: BanknotesIcon,
    requiredModules: ['facturation', 'devis', 'bons_commande', 'avoirs', 'proformas'],
    items: [
      { name: 'Factures', href: '/factures', icon: BanknotesIcon },
      { name: 'Devis', href: '/devis', icon: DocumentTextIcon },
      { name: 'Proformas', href: '/proforma', icon: DocumentCheckIcon },
      { name: 'Avoirs', href: '/avoir', icon: ReceiptRefundIcon },
      { name: 'Bons de commande', href: '/bons-commande', icon: DocumentDuplicateIcon },
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
      { name: 'Agent IA Comptable', href: '/comptabilite/ia', icon: SparklesIcon },
    ],
  },
  {
    label: 'Clientèle',
    icon: UsersIcon,
    requiredModules: ['clients', 'leads'],
    items: [
      { name: 'Clients', href: '/clients', icon: UsersIcon },
      { name: 'Onboarding', href: '/onboarding', icon: UserPlusIcon },
    ],
  },
  {
    label: 'Administration',
    icon: WrenchScrewdriverIcon,
    requiredModules: [],
    items: [
      { name: 'Paramètres', href: '/settings', icon: Cog6ToothIcon },
      { name: 'Logs', href: '/logs', icon: ClipboardDocumentListIcon },
      { name: 'Notifications', href: '/notifications', icon: BellIcon },
      { name: 'CMS Landing Page', href: '/dashboard/cms', icon: PencilSquareIcon },
    ],
  },
  {
    label: 'Agent IA',
    icon: PhoneIcon,
    requiredModules: ['agent_telephonique'],
    items: [
      { name: 'Dashboard', href: '/agent-ia', icon: SparklesIcon },
      { name: 'Appels', href: '/agent-ia/appels', icon: PhoneIcon },
      { name: 'SMS', href: '/agent-ia/sms', icon: ChatBubbleLeftIcon },
      { name: 'Questionnaires', href: '/agent-ia/questionnaires', icon: QuestionIcon },
      { name: 'Configuration', href: '/agent-ia/configuration', icon: SettingsIcon },
    ],
  },
];

export default function Sidebar({ onToggle }: { onToggle?: (collapsed: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { clearAuth, modulesActifs, isDemo } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter mobile (< 768px)
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fermer le menu mobile quand on change de page
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const DEMO_HIDDEN_PAGES = ['/settings', '/dashboard/cms', '/agent-ia/configuration'];

  const navGroups = useMemo(() => {
    return allNavGroups
      .filter((group) => {
        if (group.requiredModules.length === 0) return true;
        return group.requiredModules.some((mod) => modulesActifs.includes(mod));
      })
      .map((group) => {
        if (!isDemo) return group;
        return {
          ...group,
          items: group.items.filter((item) => !DEMO_HIDDEN_PAGES.includes(item.href)),
        };
      })
      .filter((group) => group.items.length > 0);
  }, [modulesActifs, isDemo]);

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
    group.items.some((item) => isItemActive(item.href));

  // Sur mobile, la sidebar est un drawer plein écran
  const sidebarExpanded = isMobile ? mobileOpen : !isCollapsed;

  const sidebarContent = (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
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

        {/* Badge démo */}
        {isDemo && sidebarExpanded && (
          <div className="mx-4 mb-3 px-2 py-1 bg-amber-500/20 border border-amber-500/40 rounded text-amber-400 text-xs text-center font-medium">
            MODE DÉMO
          </div>
        )}

        <nav className="flex-1 px-2 space-y-1">
          {standaloneItems.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-2 py-2.5 text-sm font-medium rounded-md
                  ${active ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                  ${!sidebarExpanded ? 'justify-center' : ''}
                `}
                title={!sidebarExpanded ? item.name : ''}
              >
                <item.icon
                  className={`flex-shrink-0 h-6 w-6 ${sidebarExpanded ? 'mr-3' : ''} ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}
                />
                {sidebarExpanded && <span>{item.name}</span>}
              </Link>
            );
          })}

          {sidebarExpanded && <div className="border-t border-gray-700 my-2" />}
          {!sidebarExpanded && <div className="my-2" />}

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
