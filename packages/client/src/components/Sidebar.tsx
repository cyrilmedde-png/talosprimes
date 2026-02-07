'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  HomeIcon, 
  UsersIcon, 
  DocumentTextIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  BellIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth-store';
import { clearTokens } from '@/lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Notifications', href: '/notifications', icon: BellIcon },
  { name: 'Logs', href: '/logs', icon: ClipboardDocumentListIcon },
  { name: 'Paramètres', href: '/settings', icon: Cog6ToothIcon },
  { name: 'CMS Landing Page', href: '/dashboard/cms', icon: PencilSquareIcon },
  { name: 'Onboarding', href: '/onboarding', icon: UserPlusIcon },
  { name: 'Clients', href: '/clients', icon: UsersIcon },
  { name: 'Documents', href: '/dashboard/documents', icon: DocumentTextIcon },
];

export default function Sidebar({ onToggle }: { onToggle?: (collapsed: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleLogout = () => {
    clearTokens();
    clearAuth();
    router.push('/login');
  };

  const handleToggle = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    onToggle?.(collapsed);
  };

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-40 bg-gray-900 transform transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-56'}
      `}
      onMouseEnter={() => handleToggle(false)}
      onMouseLeave={() => handleToggle(true)}
    >
      <div className="flex-1 flex flex-col min-h-0 h-full">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          {/* Bouton TalosPrimes pour déconnexion */}
          <div className="flex items-center flex-shrink-0 px-4 mb-6">
            <button
              onClick={handleLogout}
              className={`
                text-2xl font-bold text-white hover:text-gray-300 transition-colors focus:outline-none
                ${isCollapsed ? 'text-center w-full' : ''}
              `}
              title="Déconnexion"
            >
              {isCollapsed ? 'TP' : 'TalosPrimes'}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${
                      isActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.name : ''}
                >
                  <item.icon
                    className={`
                      flex-shrink-0 h-6 w-6
                      ${isCollapsed ? '' : 'mr-3'}
                      ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
                    `}
                  />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

