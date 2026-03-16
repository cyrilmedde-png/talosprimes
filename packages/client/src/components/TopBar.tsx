'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth-store';
import NotificationsDropdown from './NotificationsDropdown';

export default function TopBar({ 
  onVisibilityChange, 
  sidebarCollapsed 
}: { 
  onVisibilityChange?: (visible: boolean) => void;
  sidebarCollapsed?: boolean;
}) {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Ref pour le throttle afin d'éviter un setState à chaque pixel de mouvement
  const lastVisibleRef = useRef(isVisible);
  const throttleRef = useRef(false);

  const stableOnVisibilityChange = useCallback(
    (v: boolean) => onVisibilityChange?.(v),
    [onVisibilityChange]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (throttleRef.current) return;
      throttleRef.current = true;

      const shouldBeVisible = e.clientY < 50;
      // Ne mettre à jour le state que si la valeur change réellement
      if (shouldBeVisible !== lastVisibleRef.current) {
        lastVisibleRef.current = shouldBeVisible;
        setIsVisible(shouldBeVisible);
        stableOnVisibilityChange(shouldBeVisible);
      }

      setTimeout(() => { throttleRef.current = false; }, 100);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [stableOnVisibilityChange]);

  const menuWidth = sidebarCollapsed ? 'calc(100% - 8rem)' : 'calc(100% - 18rem)';
  const menuLeft = sidebarCollapsed ? '4rem' : '14rem';

  return (
    <div
      className={`
        fixed top-0 z-30 bg-gray-900/95 backdrop-blur-sm transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}
      `}
      style={{ 
        left: menuLeft,
        width: menuWidth,
        maxWidth: '1400px',
      }}
      onMouseEnter={() => {
        setIsVisible(true);
        onVisibilityChange?.(true);
      }}
      onMouseLeave={() => {
        setIsVisible(false);
        onVisibilityChange?.(false);
      }}
    >
      <div className="flex-1 px-4 flex justify-between items-center h-16">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0">
            <label htmlFor="search-field" className="sr-only">
              Rechercher
            </label>
            <div className="relative w-full text-gray-400 focus-within:text-gray-300">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-3">
                <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <input
                id="search-field"
                className="block w-full h-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm"
                placeholder="Rechercher..."
                type="search"
                name="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          {/* Notifications */}
          <NotificationsDropdown />

          {/* Rôle */}
          <div className="ml-3 relative">
            <div className="text-right">
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

