'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useUnreadCount } from '@/lib/notifications';
import {
  Bell,
  LayoutDashboard,
  FileCheck2,
  FolderTree,
  Building2,
  BellRing,
  BarChart3,
  Users,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Certificates', href: '/certificates', icon: FileCheck2 },
  { label: 'Categories', href: '/categories', icon: FolderTree },
  { label: 'Branches', href: '/branches', icon: Building2 },
  { label: 'Alert Recipients', href: '/alert-recipients', icon: BellRing },
  { label: 'Manage Users', href: '/manage-users', icon: Users },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
];

/** Header (logo + product name), nav and footer — shared by the desktop
 * sidebar and the mobile drawer so the two can never drift apart. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const unreadCount = useUnreadCount();

  return (
    <>
      <div className="flex flex-nowrap items-center gap-3 px-6 py-5">
        <Image
          src="/logos/arki-logo.png"
          alt="Arki"
          width={96}
          height={64}
          className="h-auto shrink-0"
          priority
        />
        <span className="min-w-0 whitespace-nowrap text-lg font-semibold tracking-tight">CertiWatch</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4.5 w-4.5" size={18} />
              {label}
              {href === '/notifications' && unreadCount > 0 && (
                <span
                  className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-status-expired px-1.5 text-[11px] font-semibold text-white"
                  aria-label={`${unreadCount} unread`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-xs leading-snug text-white/50">
          Arki for Advanced Construction Chemicals Co.
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/30">
            Built by
          </span>
          <Image
            src="/logos/humadi-logo.png"
            alt="Humadi Software Development"
            width={130}
            height={52}
            className="shrink-0"
          />
        </div>
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-brand text-white">
      <SidebarContent />
    </aside>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

/** Slide-in drawer version of the sidebar, used below the md breakpoint. */
export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close whenever the route changes (covers back/forward navigation too,
  // not just clicks on the drawer's own links).
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Keep Tab focus inside the drawer while it's open.
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <div
      ref={drawerRef}
      className={clsx(
        'fixed inset-0 z-50 md:hidden',
        // Visible immediately on open (so focus can move in); hidden only
        // after the slide-out finishes on close.
        open ? 'visible' : 'invisible transition-[visibility] duration-200'
      )}
    >
      <div
        className={clsx(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="mobile-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        className={clsx(
          'absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col overflow-y-auto bg-brand text-white shadow-xl transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent onNavigate={onClose} />
      </aside>
      {/* Sits on the backdrop just right of the panel, so it never covers
          the logo + name row in the drawer header. */}
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        className={clsx(
          'absolute left-[16.5rem] top-3 rounded-lg bg-brand p-2.5 text-white shadow-lg transition-opacity duration-200 hover:bg-brand-light',
          open ? 'opacity-100' : 'opacity-0'
        )}
        aria-label="Close navigation menu"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
