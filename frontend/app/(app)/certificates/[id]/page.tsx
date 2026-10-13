'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { Certificate } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import RenewCertificateModal from '@/components/certificates/RenewCertificateModal';

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 break-words text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function CertificateDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showRenew, setShowRenew] = useState(false);

  function load() {
    apiFetch<Certificate>(`/certificates/${params.id}`)
      .then(setCertificate)
      .catch(() => setError('Could not load this certificate.'));
  }

  useEffect(load, [params.id]);

  // Preserves where the user came from — a category's or branch's
  // filtered certificate list — instead of always defaulting to the
  // full certificates list, which would otherwise lose that context
  // the moment you click into a certificate from a filtered view.
  const from = searchParams.get('from');
  const categoryId = searchParams.get('categoryId');
  const branchId = searchParams.get('branchId');

  let backHref = '/certificates';
  let backLabel = 'Back to Certificates';
  if (from === 'category' && categoryId) {
    backHref = `/categories/${categoryId}`;
    backLabel = certificate ? `Back to ${certificate.category.name}` : 'Back to Category';
  } else if (from === 'branch' && branchId) {
    backHref = `/branches/${branchId}`;
    backLabel = certificate ? `Back to ${certificate.branch.name}` : 'Back to Branch';
  }

  async function handleDelete() {
    if (!certificate) return;
    if (!confirm(`Delete "${certificate.name}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/certificates/${certificate.id}`, { method: 'DELETE' });
      router.push(backHref);
    } catch (err) {
      alert(err instanceof ApiError ? `Could not delete: ${err.message}` : 'Could not delete this certificate.');
      setDeleting(false);
    }
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!certificate) {
    return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Link href={backHref} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 break-words text-xl font-semibold text-gray-900">{certificate.name}</h1>
            <StatusBadge status={certificate.status} />
          </div>
          <p className="mt-1 break-words text-sm text-gray-500">
            Ref #{certificate.reference_number} · {certificate.category.name} · {certificate.branch.name}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setShowRenew(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-none sm:py-2"
          >
            <RefreshCw className="h-4 w-4" />
            Renew
          </button>
          <Link
            href={`/certificates/${certificate.id}/edit`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-none sm:py-2"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-status-expired hover:bg-red-50 disabled:opacity-50 sm:flex-none sm:py-2"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Reference Number" value={certificate.reference_number} />
            <Field label="Category" value={certificate.category.name} />
            <Field label="Branch" value={certificate.branch.name} />
            <Field label="Issue Date" value={formatDate(certificate.issue_date)} />
            <Field label="Expiry Date" value={formatDate(certificate.expiry_date)} />
            <Field label="Alert Threshold" value={`Expiring Soon & reminders start ${certificate.alert_days_before} days before expiry`} />
            <Field
              label="Days Until Expiry"
              value={certificate.days_until_expiry >= 0 ? `${certificate.days_until_expiry} days` : `${Math.abs(certificate.days_until_expiry)} days overdue`}
            />
          </dl>
          {certificate.description && (
            <div className="mt-5 border-t border-gray-100 pt-5">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Description / Purpose</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{certificate.description}</dd>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700">Document</h3>
          {certificate.attached_file ? (
            <a
              href={certificate.attached_file}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 shrink-0 text-brand" />
              <span className="truncate text-sm font-medium text-brand">View / download document</span>
            </a>
          ) : (
            <p className="mt-3 text-sm text-gray-400">No document uploaded.</p>
          )}
        </div>
      </div>

      {showRenew && (
        <RenewCertificateModal
          certificate={certificate}
          onClose={() => setShowRenew(false)}
          onRenewed={(updated) => {
            setCertificate(updated);
            setShowRenew(false);
          }}
        />
      )}
    </div>
  );
}

export default function CertificateDetailPage() {
  return (
    <Suspense fallback={<div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Loading...</div>}>
      <CertificateDetailContent />
    </Suspense>
  );
}
