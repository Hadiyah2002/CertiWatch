'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, Check, FileCheck2 } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch } from '@/lib/api';
import {
  NOTIFICATIONS_CHANGED_EVENT,
  daysLine,
  markAllNotificationsRead,
  markNotificationRead,
  timeAgo,
  useUnreadCount,
} from '@/lib/notifications';
import type { Notification, PaginatedResponse } from '@/lib/types';

const DROPDOWN_ITEM_LIMIT = 5;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  // Polled every 2 minutes (shared with the sidebar badge).
  const unreadCount = useUnreadCount();
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    apiFetch<PaginatedResponse<Notification>>('/notifications')
      .then((res) => setNotifications(res.results.slice(0, DROPDOWN_ITEM_LIMIT)))
      .catch(() => {
        // Fail quietly — a broken notification fetch shouldn't disrupt the rest of the app.
      })
      .finally(() => setLoading(false));
  }, []);

  // Refresh the preview on mount, whenever the polled unread count changes,
  // when the dropdown opens, and when notifications are changed elsewhere
  // (e.g. marked read on the Notifications page).
  useEffect(() => {
    load();
  }, [unreadCount, load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function markAsRead(notification: Notification) {
    setOpen(false);
    if (notification.is_read) return;
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
    try {
      await markNotificationRead(notification.id);
    } catch {
      load(); // resync with the server on failure
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      load();
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:p-2"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-expired px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-[4.5rem] z-50 rounded-lg border border-gray-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[420px]">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                <Check className="h-3 w-3" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto sm:max-h-[28rem]">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <FileCheck2 className="h-6 w-6 text-gray-300" />
                <p className="mt-2 text-sm text-gray-400">No notifications yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/certificates/${n.certificate.id}`}
                      onClick={() => markAsRead(n)}
                      className={clsx(
                        'block px-4 py-3 text-sm hover:bg-gray-50',
                        !n.is_read && 'bg-brand/5'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                        <div className={clsx('min-w-0 flex-1', n.is_read && 'pl-3.5')}>
                          <p className="truncate font-medium text-gray-900">{n.certificate.name}</p>
                          <p
                            className={clsx(
                              'mt-0.5 font-medium',
                              n.certificate.days_until_expiry <= 0 ? 'text-status-expired' : 'text-status-expiring'
                            )}
                          >
                            {daysLine(n.certificate.days_until_expiry)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            Ref {n.certificate.reference_number} · {n.certificate.branch_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 border-t border-gray-100 px-4 py-3 text-sm font-medium text-brand hover:bg-gray-50"
          >
            View all notifications
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
