'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { Branch, Certificate, PaginatedResponse } from '@/lib/types';
import CertificateTable from '@/components/certificates/CertificateTable';

export default function BranchDetailPage() {
  const params = useParams<{ id: string }>();

  const [branch, setBranch] = useState<Branch | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<Branch>(`/branches/${params.id}`),
      apiFetch<PaginatedResponse<Certificate>>(`/certificates?branch=${params.id}`),
    ])
      .then(([br, certs]) => {
        setBranch(br);
        setCertificates(certs.results);
      })
      .catch(() => setError('Could not load this branch.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <div className="space-y-6">
      <Link href="/branches" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back to Branches
      </Link>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Loading...</div>
      ) : branch ? (
        <>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{branch.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {branch.location || 'No location set'} · {branch.certificate_count} certificate
              {branch.certificate_count === 1 ? '' : 's'}
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <CertificateTable
              certificates={certificates}
              emptyMessage={`No certificates at "${branch.name}" yet.`}
              showBranchColumn={false}
              linkQuery={`from=branch&branchId=${params.id}`}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
