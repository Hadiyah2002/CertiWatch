'use client';

import { useCallback, useState } from 'react';
import { HelpCircle, Menu } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import HelpPanel from './HelpPanel';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';

interface TopbarProps {
  menuOpen: boolean;
  onMenuClick: () => void;
}

export default function Topbar({ menuOpen, onMenuClick }: TopbarProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  return (
    <header className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-3 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="-ml-1 shrink-0 rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
        aria-label="Open navigation menu"
        aria-expanded={menuOpen}
        aria-controls="mobile-sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <GlobalSearch />

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationBell />
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="shrink-0 rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:p-2"
          aria-label="Open Help & Guide"
          aria-expanded={helpOpen}
          aria-controls="help-panel"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        <UserMenu />
      </div>
      <HelpPanel open={helpOpen} onClose={closeHelp} />
    </header>
  );
}
