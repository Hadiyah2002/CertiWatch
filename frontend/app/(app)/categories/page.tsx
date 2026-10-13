'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { CertificateCategory, PaginatedResponse } from '@/lib/types';
import Modal from '@/components/ui/Modal';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CertificateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<CertificateCategory | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    apiFetch<PaginatedResponse<CertificateCategory>>('/categories')
      .then((res) => setCategories(res.results))
      .catch(() => setError('Could not load categories.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing('new');
    setName('');
    setDescription('');
    setFormError(null);
  }

  function openEdit(category: CertificateCategory) {
    setEditing(category);
    setName(category.name);
    setDescription(category.description);
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        await apiFetch('/categories', {
          method: 'POST',
          body: JSON.stringify({ name, description }),
        });
      } else if (editing) {
        await apiFetch(`/categories/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, description }),
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

  async function handleDelete(category: CertificateCategory) {
    if (!confirm(`Delete category "${category.name}"? This can't be undone.`)) return;
    setDeletingId(category.id);
    try {
      await apiFetch(`/categories/${category.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(
        err instanceof ApiError
          ? `Could not delete: ${err.message}`
          : 'Could not delete this category.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">Organize certificates into categories.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light sm:w-auto sm:py-2"
        >
          <Plus className="h-4 w-4" />
          New Category
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <FolderTree className="h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No categories yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Certificates</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/categories/${category.id}`}
                        className="font-medium text-gray-900 hover:text-brand hover:underline"
                      >
                        {category.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{category.description || '\u2014'}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/categories/${category.id}`}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        {category.certificate_count}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          disabled={deletingId === category.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-status-expired disabled:opacity-50"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Category' : 'Edit Category'} onClose={() => setEditing(null)}>
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
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
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
