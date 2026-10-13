'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, UserCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { User } from '@/lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<User>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the request fails, still send them to login — there's
      // nothing useful to do with a failed logout except try again there.
    } finally {
      router.push('/login');
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-100 sm:ml-2 sm:py-1.5 sm:pl-1.5 sm:pr-3"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
          {user ? initials(user.name || user.email) : '..'}
        </div>
        <span className="hidden max-w-[12rem] truncate text-sm font-medium text-gray-700 sm:inline">
          {user ? user.name || user.email : 'Loading...'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 md:py-2"
          >
            <UserCircle className="h-4 w-4 text-gray-400" />
            View Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-status-expired hover:bg-red-50 disabled:opacity-50 md:py-2"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      )}
    </div>
  );
}
