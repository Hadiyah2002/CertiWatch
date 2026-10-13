'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Mail, Plus, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { EmailRecipient, PaginatedResponse } from '@/lib/types';
import Toggle from '@/components/ui/Toggle';

function EmailRecipientsSection() {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    apiFetch<PaginatedResponse<EmailRecipient>>('/email-recipients')
      .then((res) => setRecipients(res.results))
      .catch(() => setError('Could not load email recipients.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await apiFetch('/email-recipients', {
        method: 'POST',
        body: JSON.stringify({ name, email }),
      });
      setName('');
      setEmail('');
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not add this recipient.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(recipient: EmailRecipient, is_active: boolean) {
    setRecipients((prev) => prev.map((r) => (r.id === recipient.id ? { ...r, is_active } : r)));
    try {
      await apiFetch(`/email-recipients/${recipient.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      });
    } catch {
      load(); // revert on failure by refetching the real state
    }
  }

  async function handleDelete(recipient: EmailRecipient) {
    if (!confirm(`Remove ${recipient.name} (${recipient.email}) from email alerts?`)) return;
    try {
      await apiFetch(`/email-recipients/${recipient.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? `Could not remove: ${err.message}` : 'Could not remove this recipient.');
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
        <div className="rounded-lg bg-brand/10 p-1.5 text-brand">
          <Mail className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Email Recipients</h2>
      </div>

      {error && <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {recipients.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">No email recipients yet.</p>
          )}
          {recipients.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
              <div className="min-w-0 max-w-full">
                <p className="truncate text-sm font-medium text-gray-900">{r.name}</p>
                <p className="truncate text-sm text-gray-500">{r.email}</p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <Toggle
                  checked={r.is_active}
                  onChange={(checked) => handleToggle(r, checked)}
                  label={`Toggle alerts for ${r.name}`}
                />
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  className="rounded-lg p-2.5 text-gray-400 hover:bg-red-50 hover:text-status-expired md:p-1.5"
                  aria-label={`Remove ${r.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-2 border-t border-gray-100 p-4 sm:flex-row sm:items-start">
        <input
          type="text"
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:w-40"
        />
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-60 sm:py-2"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
      {formError && <p className="px-4 pb-4 text-sm text-red-600">{formError}</p>}
    </div>
  );
}

export default function AlertRecipientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Alert Recipients</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage who receives expiry reminders. This is the only place recipients are configured —
          there's no per-certificate assignment anymore. Toggle someone off to pause their alerts
          without removing them.
        </p>
      </div>

      <div className="max-w-2xl">
        <EmailRecipientsSection />
      </div>
    </div>
  );
}
