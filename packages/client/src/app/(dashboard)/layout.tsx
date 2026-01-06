'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [topBarVisible, setTopBarVisible] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-900">
      {/* Sidebar */}
      <Sidebar onToggle={setSidebarCollapsed} />

      {/* Main content */}
      <div 
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarCollapsed ? '4rem' : '16rem' }}
      >
        {/* Top bar */}
        <TopBar onVisibilityChange={setTopBarVisible} />

        {/* Page content */}
        <main 
          className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-900 transition-all duration-300"
          style={{ marginTop: topBarVisible ? '4rem' : '0' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800"></div>
          <div className="relative py-6">
            <div 
              className="mx-auto px-4 sm:px-6 md:px-8 transition-all duration-300"
              style={{ 
                maxWidth: sidebarCollapsed ? '100%' : 'calc(100% - 16rem)',
                paddingLeft: sidebarCollapsed ? '2rem' : '1rem',
                paddingRight: sidebarCollapsed ? '2rem' : '1rem',
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

