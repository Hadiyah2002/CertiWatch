import Link from 'next/link';
import { FileCheck2 } from 'lucide-react';
import type { Certificate } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface CertificateTableProps {
  certificates: Certificate[];
  emptyMessage?: string;
  showCategoryColumn?: boolean;
  showBranchColumn?: boolean;
  /** Appended to each certificate's detail link, e.g. 'from=category&categoryId=3',
   * so the detail page can show a "back to where you came from" link instead of
   * always defaulting to the full certificates list. */
  linkQuery?: string;
}

export default function CertificateTable({
  certificates,
  emptyMessage = 'No certificates yet.',
  showCategoryColumn = true,
  showBranchColumn = true,
  linkQuery,
}: CertificateTableProps) {
  if (certificates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <FileCheck2 className="h-8 w-8 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">{emptyMessage}</p>
        <Link href="/certificates/new" className="mt-3 text-sm font-medium text-brand hover:underline">
          Add your first certificate
        </Link>
      </div>
    );
  }

  const hrefFor = (cert: Certificate) => `/certificates/${cert.id}${linkQuery ? `?${linkQuery}` : ''}`;

  return (
    <>
      {/* Below md: stacked cards instead of a table that would need sideways scrolling. */}
      <ul className="divide-y divide-gray-100 md:hidden">
        {certificates.map((cert) => (
          <li key={cert.id}>
            <Link href={hrefFor(cert)} className="block px-4 py-3 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words font-medium text-gray-900">{cert.name}</p>
                <StatusBadge status={cert.status} className="shrink-0" />
              </div>
              <p className="mt-0.5 break-all text-xs text-gray-500">Ref # {cert.reference_number}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {showCategoryColumn && (
                  <div className="min-w-0">
                    <dt className="text-gray-400">Category</dt>
                    <dd className="truncate text-gray-700">{cert.category.name}</dd>
                  </div>
                )}
                {showBranchColumn && (
                  <div className="min-w-0">
                    <dt className="text-gray-400">Branch</dt>
                    <dd className="truncate text-gray-700">{cert.branch.name}</dd>
                  </div>
                )}
                <div className="min-w-0">
                  <dt className="text-gray-400">Expiry Date</dt>
                  <dd className="text-gray-700">{formatDate(cert.expiry_date)}</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>

      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Reference #</th>
            {showCategoryColumn && <th className="px-5 py-3 font-medium">Category</th>}
            {showBranchColumn && <th className="px-5 py-3 font-medium">Branch</th>}
            <th className="px-5 py-3 font-medium">Expiry Date</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {certificates.map((cert) => (
            <tr key={cert.id} className="hover:bg-gray-50">
              <td className="px-5 py-3">
                <Link
                  href={hrefFor(cert)}
                  className="font-medium text-gray-900 hover:text-brand"
                >
                  {cert.name}
                </Link>
              </td>
              <td className="px-5 py-3 text-gray-600">{cert.reference_number}</td>
              {showCategoryColumn && <td className="px-5 py-3 text-gray-600">{cert.category.name}</td>}
              {showBranchColumn && <td className="px-5 py-3 text-gray-600">{cert.branch.name}</td>}
              <td className="px-5 py-3 text-gray-600">{formatDate(cert.expiry_date)}</td>
              <td className="px-5 py-3">
                <StatusBadge status={cert.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
