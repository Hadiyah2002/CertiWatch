'use client';

import { FormEvent, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { Certificate } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import DateField from '@/components/ui/DateField';

function formatDMY(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface RenewCertificateModalProps {
  certificate: Certificate;
  onClose: () => void;
  onRenewed: (certificate: Certificate) => void;
}

export default function RenewCertificateModal({ certificate, onClose, onRenewed }: RenewCertificateModalProps) {
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [alertDaysBefore, setAlertDaysBefore] = useState<string>(String(certificate.alert_days_before));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('certificate', String(certificate.id));
    formData.append('new_expiry_date', newExpiryDate);
    formData.append('alert_days_before', alertDaysBefore);
    if (file) {
      formData.append('new_attached_file', file);
    }

    try {
      await apiFetch('/renewals', { method: 'POST', body: formData });
      // Renewal record creation also bumps the certificate's expiry_date
      // and recalculates status server-side — refetch to get the result.
      const updated = await apiFetch<Certificate>(`/certificates/${certificate.id}`);
      onRenewed(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not renew this certificate.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Renew: ${certificate.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          Current expiry date: <span className="font-medium text-gray-700">{formatDMY(certificate.expiry_date)}</span>. This
          creates a renewal history entry and updates the certificate's expiry date.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700">New Expiry Date</label>
          <div className="mt-1">
            <DateField value={newExpiryDate} onChange={setNewExpiryDate} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Alert me before expiry (days)</label>
          <input
            type="number"
            min={0}
            required
            value={alertDaysBefore}
            onChange={(e) => setAlertDaysBefore(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <p className="mt-1 text-xs text-gray-400">
            Sets the threshold for this new cycle — pre-filled with the current value ({certificate.alert_days_before} days), editable.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            New Document (optional — replaces the current file)
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
          />
          <p className="mt-1 text-xs text-gray-400">
            The current document (if any) is automatically kept in the renewal history.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-60 sm:py-2"
          >
            {saving ? 'Renewing...' : 'Renew Certificate'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
