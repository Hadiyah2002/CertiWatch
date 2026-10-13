'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Building2, CheckCircle2, Clock, FolderTree, LayoutList, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type {
  BranchOrCategoryBreakdown,
  ExpiredListResponse,
  ExpiringByMonthResponse,
  ReportsSummary,
} from '@/lib/types';
import StatCard from '@/components/dashboard/StatCard';
import CertificateTable from '@/components/certificates/CertificateTable';
import ExportButtons from '@/components/reports/ExportButtons';
import MonthlyExpiryChart from '@/components/reports/MonthlyExpiryChart';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 3 + i);
const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function BreakdownTable({ title, rows }: { title: string; rows: BranchOrCategoryBreakdown[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-5 py-3 font-medium">{title}</th>
            <th className="px-5 py-3 font-medium">Total</th>
            <th className="px-5 py-3 font-medium">Active</th>
            <th className="px-5 py-3 font-medium">Expiring Soon</th>
            <th className="px-5 py-3 font-medium">Expired</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-5 py-3 font-medium text-gray-900">{row.name}</td>
              <td className="px-5 py-3 text-gray-600">{row.total}</td>
              <td className="px-5 py-3 text-status-active">{row.active}</td>
              <td className="px-5 py-3 text-status-expiring">{row.expiring_soon}</td>
              <td className="px-5 py-3 text-status-expired">{row.expired}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">No data.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [branchData, setBranchData] = useState<BranchOrCategoryBreakdown[]>([]);
  const [categoryData, setCategoryData] = useState<BranchOrCategoryBreakdown[]>([]);

  const [expiredYear, setExpiredYear] = useState(CURRENT_YEAR);
  const [expiredMonth, setExpiredMonth] = useState<number | null>(null);
  const [expiredData, setExpiredData] = useState<ExpiredListResponse | null>(null);
  const [expiredLoading, setExpiredLoading] = useState(true);

  const [chartYear, setChartYear] = useState(CURRENT_YEAR);
  const [chartData, setChartData] = useState<ExpiringByMonthResponse | null>(null);
  const [chartLoading, setChartLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<ReportsSummary>('/reports/summary'),
      apiFetch<BranchOrCategoryBreakdown[]>('/reports/by-branch'),
      apiFetch<BranchOrCategoryBreakdown[]>('/reports/by-category'),
    ])
      .then(([s, b, c]) => {
        setSummary(s);
        setBranchData(b);
        setCategoryData(c);
      })
      .catch(() => setError('Could not load report data.'));
  }, []);

  useEffect(() => {
    setExpiredLoading(true);
    const query = expiredMonth ? `?year=${expiredYear}&month=${expiredMonth}` : `?year=${expiredYear}`;
    apiFetch<ExpiredListResponse>(`/reports/expired-list${query}`)
      .then(setExpiredData)
      .catch(() => setError('Could not load the expired-certificates report.'))
      .finally(() => setExpiredLoading(false));
  }, [expiredYear, expiredMonth]);

  useEffect(() => {
    setChartLoading(true);
    apiFetch<ExpiringByMonthResponse>(`/reports/expiring-by-month?year=${chartYear}`)
      .then(setChartData)
      .catch(() => setError('Could not load the monthly expiry chart.'))
      .finally(() => setChartLoading(false));
  }, [chartYear]);

  const expiredListPath = expiredMonth
    ? `/reports/expired-list?year=${expiredYear}&month=${expiredMonth}`
    : `/reports/expired-list?year=${expiredYear}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Analytics and exportable reports across all certificates.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Summary cards */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Overview</h2>
          <ExportButtons path="/reports/summary" filenamePrefix="summary" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Certificates" value={summary?.total ?? 0} color="neutral" icon={LayoutList} />
          <StatCard label="Active" value={summary?.active ?? 0} color="green" icon={CheckCircle2} />
          <StatCard label="Expiring Soon" value={summary?.expiring_soon ?? 0} color="yellow" icon={Clock} />
          <StatCard label="Expired" value={summary?.expired ?? 0} color="red" icon={XCircle} />
        </div>
      </div>

      {/* Certificates Expired report */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Certificates Expired</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Based on each certificate's current expiry date, for the selected period.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={expiredMonth ?? ''}
              onChange={(e) => setExpiredMonth(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All Months</option>
              {MONTH_OPTIONS.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              value={expiredYear}
              onChange={(e) => setExpiredYear(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ExportButtons path={expiredListPath} filenamePrefix={`expired-${expiredYear}${expiredMonth ? `-${expiredMonth}` : ''}`} />
          </div>
        </div>
        {expiredLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <>
            <p className="px-5 pt-4 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{expiredData?.count ?? 0}</span> certificate
              {expiredData?.count === 1 ? '' : 's'} expiring in <span className="font-medium">{expiredData?.period}</span>
            </p>
            <div className="mt-3 overflow-hidden">
              <CertificateTable
                certificates={expiredData?.certificates ?? []}
                emptyMessage={`No certificates expiring in ${expiredData?.period ?? 'this period'}.`}
              />
            </div>
          </>
        )}
      </div>

      {/* Monthly expiry chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-brand/10 p-1.5 text-brand">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Certificates Expiring by Month</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={chartYear}
              onChange={(e) => setChartYear(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ExportButtons path={`/reports/expiring-by-month?year=${chartYear}`} filenamePrefix={`expiring-by-month-${chartYear}`} />
          </div>
        </div>
        <div className="mt-4">
          {chartLoading ? (
            <div className="flex h-72 items-center justify-center text-sm text-gray-400">Loading...</div>
          ) : (
            <MonthlyExpiryChart data={chartData?.months ?? []} />
          )}
        </div>
      </div>

      {/* Branch-wise breakdown */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-brand/10 p-1.5 text-brand">
              <Building2 className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Branch-wise Breakdown</h2>
          </div>
          <ExportButtons path="/reports/by-branch" filenamePrefix="by-branch" />
        </div>
        <BreakdownTable title="Branch" rows={branchData} />
      </div>

      {/* Category-wise breakdown */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-brand/10 p-1.5 text-brand">
              <FolderTree className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Category-wise Breakdown</h2>
          </div>
          <ExportButtons path="/reports/by-category" filenamePrefix="by-category" />
        </div>
        <BreakdownTable title="Category" rows={categoryData} />
      </div>
    </div>
  );
}
