'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { Certificate, PaginatedResponse } from '@/lib/types';
import CertificateTable from '@/components/certificates/CertificateTable';

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PaginatedResponse<Certificate>>('/certificates')
      .then((res) => setCertificates(res.results))
      .catch(() => setError('Could not load certificates.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Certificates</h1>
          <p className="mt-1 text-sm text-gray-500">
            All government certificates and compliance documents across branches.
          </p>
        </div>
        <Link
          href="/certificates/new"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light sm:w-auto sm:py-2"
        >
          <Plus className="h-4 w-4" />
          New Certificate
        </Link>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <CertificateTable certificates={certificates} emptyMessage="No certificates yet." />
        )}
      </div>
    </div>
  );
}
