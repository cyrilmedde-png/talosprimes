'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, BellIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth-store';

export default function TopBar() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`
      sticky top-0 z-10 flex-shrink-0 bg-gray-900 shadow-lg transition-all duration-300
      ${isCollapsed ? 'h-0 overflow-hidden' : 'h-16'}
    `}>
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
          <button
            type="button"
            className="bg-gray-800 p-1 rounded-full text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
          >
            <span className="sr-only">Voir les notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Profil */}
          <div className="ml-3 relative">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.email}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Bouton pour replier */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-4 p-1 rounded-md text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
          >
            <ChevronUpIcon className={`h-5 w-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

