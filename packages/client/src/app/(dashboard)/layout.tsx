'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [topBarVisible, setTopBarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const setModulesActifs = useAuthStore((s) => s.setModulesActifs);
  const setUser = useAuthStore((s) => s.setUser);
  const setIsClientUser = useAuthStore((s) => s.setIsClientUser);

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout>;
    const checkMobile = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setIsMobile(window.innerWidth < 768), 150);
    };
    // Appel initial sans debounce
    setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Charger les modules actifs au démarrage du layout (persiste après refresh)
  useEffect(() => {
    if (!isAuthenticated()) {
      setIsLoading(false);
      return;
    }
    getCurrentUser().then(({ user, modulesActifs, isClientUser }) => {
      if (user) setUser(user);
      if (modulesActifs) setModulesActifs(modulesActifs);
      setIsClientUser(isClientUser);
    }).catch(() => { /* token expiré, le middleware redirigera */ })
    .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-900">
      <Sidebar onToggle={setSidebarCollapsed} />

      <div
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? '4rem' : '14rem') }}
      >
        {!isMobile && (
          <TopBar onVisibilityChange={setTopBarVisible} sidebarCollapsed={sidebarCollapsed} />
        )}

        <main
          className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-900 transition-all duration-300"
          style={{ marginTop: (!isMobile && topBarVisible) ? '4rem' : '0' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800"></div>
          <div className={`relative ${isMobile ? 'pt-14 pb-6' : 'py-6'}`}>
            <div
              className="mx-auto transition-all duration-300 w-full"
              style={{
                maxWidth: isMobile ? '100%' : '1200px',
                paddingLeft: isMobile ? '1rem' : (sidebarCollapsed ? '2rem' : '4rem'),
                paddingRight: isMobile ? '1rem' : '2rem',
              }}
            >
              {isLoading ? (
                <div className="animate-pulse space-y-6">
                  <div className="h-8 bg-gray-800 rounded w-1/3"></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-28 bg-gray-800 rounded-lg"></div>
                    <div className="h-28 bg-gray-800 rounded-lg"></div>
                    <div className="h-28 bg-gray-800 rounded-lg"></div>
                  </div>
                  <div className="h-64 bg-gray-800 rounded-lg"></div>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
