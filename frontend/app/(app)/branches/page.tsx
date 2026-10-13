'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { Branch, PaginatedResponse } from '@/lib/types';
import Modal from '@/components/ui/Modal';

export default function BranchesPage() {
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    apiFetch<PaginatedResponse<Branch>>('/branches')
      .then((res) => setBranches(res.results))
      .catch(() => setError('Could not load branches.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing('new');
    setName('');
    setLocation('');
    setFormError(null);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setName(branch.name);
    setLocation(branch.location);
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        await apiFetch('/branches', {
          method: 'POST',
          body: JSON.stringify({ name, location }),
        });
      } else if (editing) {
        await apiFetch(`/branches/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, location }),
        });
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(branch: Branch) {
    if (!confirm(`Delete branch "${branch.name}"? This can't be undone.`)) return;
    setDeletingId(branch.id);
    try {
      await apiFetch(`/branches/${branch.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(
        err instanceof ApiError
          ? `Could not delete: ${err.message}`
          : 'Could not delete this branch.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Branches</h1>
          <p className="mt-1 text-sm text-gray-500">Manage company branches and locations.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light sm:w-auto sm:py-2"
        >
          <Plus className="h-4 w-4" />
          New Branch
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Loading...</div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
          <Building2 className="h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No branches yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              onClick={() => router.push(`/branches/${branch.id}`)}
              className="group relative cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(branch);
                    }}
                    className="rounded-lg p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 md:p-1.5"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(branch);
                    }}
                    disabled={deletingId === branch.id}
                    className="rounded-lg p-2.5 text-gray-400 hover:bg-red-50 hover:text-status-expired disabled:opacity-50 md:p-1.5"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="mt-4 break-words text-base font-semibold text-gray-900">{branch.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{branch.location || 'No location set'}</p>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-xs font-medium text-gray-400">Certificates</span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {branch.certificate_count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'New Branch' : 'Edit Branch'} onClose={() => setEditing(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Riyadh, Saudi Arabia"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-60 sm:py-2"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
