'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [topBarVisible, setTopBarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
