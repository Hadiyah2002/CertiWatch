'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Certificate } from '@/lib/types';
import CertificateForm from '@/components/certificates/CertificateForm';

export default function EditCertificatePage() {
  const params = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Certificate>(`/certificates/${params.id}`)
      .then(setCertificate)
      .catch(() => setError('Could not load this certificate.'));
  }, [params.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Edit Certificate</h1>
        <p className="mt-1 text-sm text-gray-500">Update certificate details.</p>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {certificate ? (
        <CertificateForm mode="edit" initial={certificate} />
      ) : !error ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Loading...</div>
      ) : null}
    </div>
  );
}
