import clsx from 'clsx';
import type { CertificateStatus } from '@/lib/types';

const STATUS_STYLES: Record<CertificateStatus, string> = {
  active: 'bg-green-50 text-status-active border-green-200',
  expiring_soon: 'bg-amber-50 text-status-expiring border-amber-200',
  expired: 'bg-red-50 text-status-expired border-red-200',
};

const STATUS_LABELS: Record<CertificateStatus, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
};

interface StatusBadgeProps {
  status: CertificateStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
