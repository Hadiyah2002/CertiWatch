'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import type { Branch, Certificate, CertificateCategory, PaginatedResponse } from '@/lib/types';
import DateField from '@/components/ui/DateField';

interface CertificateFormProps {
  mode: 'create' | 'edit';
  initial?: Certificate;
}

export default function CertificateForm({ mode, initial }: CertificateFormProps) {
  const router = useRouter();

  const [categories, setCategories] = useState<CertificateCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [name, setName] = useState(initial?.name ?? '');
  const [referenceNumber, setReferenceNumber] = useState(initial?.reference_number ?? '');
  const [categoryId, setCategoryId] = useState<string>(initial ? String(initial.category.id) : '');
  const [branchId, setBranchId] = useState<string>(initial ? String(initial.branch.id) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [issueDate, setIssueDate] = useState(initial?.issue_date ?? '');
  const [expiryDate, setExpiryDate] = useState(initial?.expiry_date ?? '');
  const [alertDaysBefore, setAlertDaysBefore] = useState<string>(
    initial ? String(initial.alert_days_before) : '30'
  );
  const [file, setFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Immediate client-side feedback as soon as both dates are filled in,
  // rather than waiting for a round trip to the backend to find out.
  useEffect(() => {
    if (issueDate && expiryDate && expiryDate <= issueDate) {
      setDateError('Expiry date must be after the issue date.');
    } else {
      setDateError(null);
    }
  }, [issueDate, expiryDate]);

  useEffect(() => {
    Promise.all([
      apiFetch<PaginatedResponse<CertificateCategory>>('/categories'),
      apiFetch<PaginatedResponse<Branch>>('/branches'),
    ])
      .then(([cats, brs]) => {
        setCategories(cats.results);
        setBranches(brs.results);
      })
      .catch(() => setError('Could not load form options (categories/branches).'))
      .finally(() => setOptionsLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('reference_number', referenceNumber);
    formData.append('category_id', categoryId);
    formData.append('branch_id', branchId);
    formData.append('description', description);
    formData.append('issue_date', issueDate);
    formData.append('expiry_date', expiryDate);
    formData.append('alert_days_before', alertDaysBefore);
    if (file) {
      formData.append('attached_file', file);
    }

    if (!issueDate || !expiryDate) {
      setError('Please choose both an issue date and an expiry date.');
      setSaving(false);
      return;
    }

    if (expiryDate <= issueDate) {
      setDateError('Expiry date must be after the issue date.');
      setSaving(false);
      return;
    }

    try {
      const cert =
        mode === 'create'
          ? await apiFetch<Certificate>('/certificates', { method: 'POST', body: formData })
          : await apiFetch<Certificate>(`/certificates/${initial!.id}`, { method: 'PATCH', body: formData });
      router.push(`/certificates/${cert.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong saving this certificate.');
    } finally {
      setSaving(false);
    }
  }

  if (optionsLoading) {
    return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Loading form...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Certificate Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Reference Number</label>
          <input
            type="text"
            required
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. government-issued registration/license number"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="" disabled>Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Branch</label>
          <select
            required
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="" disabled>Select a branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description / Purpose</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Issue Date</label>
          <div className="mt-1">
            <DateField value={issueDate} onChange={setIssueDate} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
          <div className="mt-1">
            <DateField value={expiryDate} onChange={setExpiryDate} required />
          </div>
          {dateError && <p className="mt-1 text-xs text-red-600">{dateError}</p>}
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
            Once expiry is within this many days, status switches to Expiring Soon and reminders
            start. Renewing this certificate lets you set a fresh value for the new cycle.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Document (PDF, JPG, JPEG, PNG)</label>
        {initial?.attached_file && !file && (
          <p className="mt-1 text-xs text-gray-500">
            Current file:{' '}
            <a href={initial.attached_file} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              view existing document
            </a>{' '}
            — choosing a new file below will replace it.
          </p>
        )}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:py-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !!dateError}
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-60 sm:py-2"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create Certificate' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
