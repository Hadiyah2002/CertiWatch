'use client';

import { useCallback, useState } from 'react';
import AuthGuard from './AuthGuard';
import Sidebar, { MobileSidebar } from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <MobileSidebar open={mobileNavOpen} onClose={closeMobileNav} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar menuOpen={mobileNavOpen} onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
