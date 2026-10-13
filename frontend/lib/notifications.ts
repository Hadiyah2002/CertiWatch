'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

/** Shared by the topbar bell, the sidebar badge and the Notifications page. */

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const NOTIFICATIONS_CHANGED_EVENT = 'certiwatch:notifications-changed';

// One poller for the whole app, however many components show the count.
let unreadCount = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(count: number) => void>();

function fetchUnreadCount() {
  apiFetch<{ count: number }>('/notifications/unread-count')
    .then((res) => {
      unreadCount = res.count;
      listeners.forEach((listener) => listener(unreadCount));
    })
    .catch(() => {
      // Fail quietly — a broken notification fetch shouldn't disrupt the rest of the app.
    });
}

/** Live unread-notification count, polled every 2 minutes and refreshed
 * immediately whenever notificationsChanged() is called. */
export function useUnreadCount() {
  const [count, setCount] = useState(unreadCount);

  useEffect(() => {
    listeners.add(setCount);
    if (listeners.size === 1) {
      fetchUnreadCount();
      pollTimer = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    } else {
      setCount(unreadCount);
    }
    return () => {
      listeners.delete(setCount);
      if (listeners.size === 0 && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
  }, []);

  return count;
}

/** Call after marking notifications read, so every badge and list refreshes. */
export function notificationsChanged() {
  fetchUnreadCount();
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export async function markNotificationRead(id: number) {
  await apiFetch(`/notifications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_read: true }),
  });
  notificationsChanged();
}

export async function markAllNotificationsRead() {
  await apiFetch('/notifications/mark-all-read', { method: 'POST' });
  notificationsChanged();
}

export function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** "Expiring in 4 days" / "Expires tomorrow" / "Expired today" / "Expired 3 days ago".
 * An expiry date of today counts as expired, matching the backend. */
export function daysLine(daysUntilExpiry: number): string {
  if (daysUntilExpiry > 1) return `Expiring in ${daysUntilExpiry} days`;
  if (daysUntilExpiry === 1) return 'Expiring tomorrow';
  if (daysUntilExpiry === 0) return 'Expired today';
  const ago = Math.abs(daysUntilExpiry);
  return `Expired ${ago} day${ago === 1 ? '' : 's'} ago`;
}

/** 'YYYY-MM-DD' -> 'dd-mm-yyyy'. */
export function formatDMY(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}
