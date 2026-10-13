'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { AlertTriangle, BellOff, BellRing, CheckCheck, Clock, ExternalLink, Loader2, Search, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  NOTIFICATIONS_CHANGED_EVENT,
  daysLine,
  formatDMY,
  markAllNotificationsRead,
  markNotificationRead,
  timeAgo,
} from '@/lib/notifications';
import type { Notification, NotificationSummary, PaginatedResponse } from '@/lib/types';
import StatCard from '@/components/dashboard/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';

type Filter = 'all' | 'unread' | 'expiring_soon' | 'expired';

const TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
];

const EMPTY_MESSAGES: Record<Filter, string> = {
  all: "You're all caught up — there are no notifications yet.",
  unread: "You're all caught up — no unread notifications.",
  expiring_soon: 'No notifications for certificates that are expiring soon.',
  expired: 'No notifications for expired certificates.',
};

const SEARCH_DEBOUNCE_MS = 300;

function buildQuery(filter: Filter, search: string, page: number) {
  const params = new URLSearchParams();
  if (filter === 'unread') params.set('is_read', 'false');
  if (filter === 'expiring_soon' || filter === 'expired') params.set('status', filter);
  if (search) params.set('q', search);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/notifications${qs ? `?${qs}` : ''}`;
}

/** Splits notifications (already newest-first) into Today / Yesterday / Earlier. */
function groupByDate(notifications: Notification[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ];
  for (const n of notifications) {
    const created = new Date(n.created_at);
    if (created >= startOfToday) groups[0].items.push(n);
    else if (created >= startOfYesterday) groups[1].items.push(n);
    else groups[2].items.push(n);
  }
  return groups.filter((g) => g.items.length > 0);
}

function NotificationCard({
  notification,
  onOpen,
  onMarkRead,
}: {
  notification: Notification;
  onOpen: (n: Notification) => void;
  onMarkRead: (n: Notification) => void;
}) {
  const cert = notification.certificate;
  const unread = !notification.is_read;
  const overdue = cert.days_until_expiry <= 0;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => onOpen(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(notification);
      }}
      aria-label={`${cert.name}: ${daysLine(cert.days_until_expiry)}${unread ? ' (unread)' : ''}`}
      className={clsx(
        'cursor-pointer rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand sm:p-5',
        unread ? 'border-brand/20 bg-brand/5' : 'border-gray-200 bg-white'
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={clsx('mt-2 h-2 w-2 shrink-0 rounded-full', unread ? 'bg-brand' : 'bg-transparent')}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <StatusBadge status={cert.status} />
            <span className="text-xs text-gray-400">{timeAgo(notification.created_at)}</span>
          </div>

          <h3 className="mt-2 break-words text-base font-semibold text-gray-900">{cert.name}</h3>
          <p
            className={clsx(
              'mt-1 text-sm font-medium',
              overdue ? 'text-status-expired' : 'text-status-expiring'
            )}
          >
            {daysLine(cert.days_until_expiry)}
          </p>

          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-xs text-gray-400">Reference #</dt>
              <dd className="break-all text-gray-700">{cert.reference_number}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-gray-400">Expiry Date</dt>
              <dd className="text-gray-700">{formatDMY(cert.expiry_date)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-gray-400">Branch</dt>
              <dd className="truncate text-gray-700">{cert.branch_name}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/certificates/${cert.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (unread) onMarkRead(notification);
              }}
              className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 md:min-h-0 md:py-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              View certificate
            </Link>
            {unread && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(notification);
                }}
                className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-brand/30 bg-white px-3 py-2 text-sm font-medium text-brand hover:bg-brand/5 md:min-h-0 md:py-1.5"
              >
                <CheckCheck className="h-4 w-4" />
                Mark as read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 rounded-full bg-gray-200" />
        <div className="h-3 w-12 rounded bg-gray-100" />
      </div>
      <div className="mt-3 h-5 w-2/3 rounded bg-gray-200" />
      <div className="mt-2 h-4 w-1/3 rounded bg-gray-100" />
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="h-8 rounded bg-gray-100" />
        <div className="h-8 rounded bg-gray-100" />
        <div className="h-8 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadSummary = useCallback(() => {
    apiFetch<NotificationSummary>('/notifications/summary')
      .then(setSummary)
      .catch(() => {
        // Summary cards just keep their last values if this fails.
      });
  }, []);

  useEffect(() => {
    loadSummary();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, loadSummary);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, loadSummary);
  }, [loadSummary]);

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // First page, reloaded whenever the filter or search changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<PaginatedResponse<Notification>>(buildQuery(filter, search, 1))
      .then((res) => {
        if (cancelled) return;
        setNotifications(res.results);
        setTotalCount(res.count);
        setHasMore(!!res.next);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load notifications.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, search]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await apiFetch<PaginatedResponse<Notification>>(buildQuery(filter, search, page + 1));
      setNotifications((prev) => [...prev, ...res.results]);
      setHasMore(!!res.next);
      setPage(page + 1);
    } catch {
      setError('Could not load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleMarkRead(notification: Notification) {
    if (notification.is_read) return;
    // On the Unread tab a read item drops out of the list (and the total).
    if (filter === 'unread') setTotalCount((prev) => Math.max(0, prev - 1));
    setNotifications((prev) =>
      filter === 'unread'
        ? prev.filter((n) => n.id !== notification.id)
        : prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
    );
    try {
      await markNotificationRead(notification.id);
    } catch {
      setError('Could not mark that notification as read.');
    }
  }

  function handleOpen(notification: Notification) {
    if (!notification.is_read) {
      markNotificationRead(notification.id).catch(() => {
        // Opening the certificate matters more than the read flag.
      });
    }
    router.push(`/certificates/${notification.certificate.id}`);
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      if (filter === 'unread') {
        setNotifications([]);
        setTotalCount(0);
        setHasMore(false);
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch {
      setError('Could not mark all notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  }

  const groups = groupByDate(notifications);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Alerts for certificates that are expiring soon or have expired.
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={markingAll || (summary?.unread ?? 0) === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-60 sm:w-auto sm:py-2"
        >
          <CheckCheck className="h-4 w-4" />
          {markingAll ? 'Marking...' : 'Mark all as read'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            { value: 'unread', label: 'Unread', count: summary?.unread, color: 'neutral', icon: BellRing },
            { value: 'expiring_soon', label: 'Expiring Soon', count: summary?.expiring_soon, color: 'yellow', icon: Clock },
            { value: 'expired', label: 'Expired', count: summary?.expired, color: 'red', icon: XCircle },
          ] as const
        ).map((card) => (
          <button
            key={card.value}
            type="button"
            onClick={() => setFilter(card.value)}
            aria-pressed={filter === card.value}
            className={clsx(
              'rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              filter === card.value && 'ring-2 ring-brand'
            )}
          >
            <StatCard label={card.label} value={card.count ?? 0} color={card.color} icon={card.icon} />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="group" aria-label="Filter notifications" className="flex w-max gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={filter === tab.value}
                onClick={() => setFilter(tab.value)}
                className={clsx(
                  'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors md:py-1.5',
                  filter === tab.value ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name or reference #"
            aria-label="Search notifications by certificate name or reference number"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          {search ? <AlertTriangle className="h-8 w-8 text-gray-300" /> : <BellOff className="h-8 w-8 text-gray-300" />}
          <p className="mt-3 text-sm text-gray-500">
            {search ? `No notifications match "${search}".` : EMPTY_MESSAGES[filter]}
          </p>
          {(filter !== 'all' || search) && (
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setSearchInput('');
              }}
              className="mt-3 text-sm font-medium text-brand hover:underline"
            >
              Show all notifications
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.label}</h2>
              <div className="space-y-3">
                {group.items.map((n) => (
                  <NotificationCard key={n.id} notification={n} onOpen={handleOpen} onMarkRead={handleMarkRead} />
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400">
              Showing {notifications.length} of {totalCount}
            </p>
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 sm:py-2"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
