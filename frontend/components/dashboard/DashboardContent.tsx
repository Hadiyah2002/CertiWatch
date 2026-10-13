'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, LayoutList, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';
import StatCard from './StatCard';
import ExpiryBarChart from './ExpiryBarChart';
import StatusDonutChart from './StatusDonutChart';

export default function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardStats>('/dashboard/stats')
      .then(setStats)
      .catch(() => setError('Could not load dashboard data. Is the backend running and seeded?'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of all certificates and compliance documents across branches.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Certificates" value={stats?.totals.total ?? 0} color="neutral" icon={LayoutList} />
        <StatCard label="Active" value={stats?.totals.active ?? 0} color="green" icon={CheckCircle2} />
        <StatCard label="Expiring Soon" value={stats?.totals.expiring_soon ?? 0} color="yellow" icon={Clock} />
        <StatCard label="Expired" value={stats?.totals.expired ?? 0} color="red" icon={XCircle} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ExpiryBarChart data={stats?.expiry_buckets ?? []} />
        <StatusDonutChart data={stats?.status_breakdown ?? []} />
      </div>
    </div>
  );
}
