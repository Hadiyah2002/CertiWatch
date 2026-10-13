'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Plus, Trash2, UserCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch, ApiError } from '@/lib/api';
import type { User } from '@/lib/types';

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    Promise.all([apiFetch<User[]>('/auth/users'), apiFetch<User>('/auth/me')])
      .then(([userList, me]) => {
        setUsers(userList);
        setCurrentUser(me);
      })
      .catch(() => setError('Could not load users.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await apiFetch('/auth/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setName('');
      setEmail('');
      setPassword('');
      load();
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        // Surface field-level validation messages (e.g. weak password, duplicate email)
        const fieldErrors = Object.values(err.data as Record<string, string[]>)
          .flat()
          .join(' ');
        setFormError(fieldErrors || err.message);
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Could not add this user.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(user: User) {
    if (!confirm(`Deactivate ${user.name} (${user.email})? They won't be able to log in anymore.`)) return;
    setDeactivatingId(user.id);
    try {
      await apiFetch(`/auth/users/${user.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? `Could not deactivate: ${err.message}` : 'Could not deactivate this user.');
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleActivate(user: User) {
    setActivatingId(user.id);
    try {
      await apiFetch(`/auth/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: true }),
      });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? `Could not activate: ${err.message}` : 'Could not activate this user.');
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Manage Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Anyone logged in can add or deactivate accounts here — there are no separate
          permission levels. This is the only way a new person gets access to CertiWatch;
          there's no public sign-up.
        </p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((user) => {
              const isSelf = currentUser?.id === user.id;
              return (
                <div key={user.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 max-w-full items-center gap-3">
                    <div
                      className={clsx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
                        user.is_active ? 'bg-brand' : 'bg-gray-300'
                      )}
                    >
                      {user.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join('') || <UserCircle2 className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="min-w-0 truncate text-sm font-medium text-gray-900">{user.name}</p>
                        {isSelf && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                            You
                          </span>
                        )}
                        {!user.is_active && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-status-expired">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  {user.is_active && !isSelf && (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(user)}
                      disabled={deactivatingId === user.id}
                      className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg p-2.5 text-gray-400 hover:bg-red-50 hover:text-status-expired disabled:opacity-50 md:p-1.5"
                      aria-label={`Deactivate ${user.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  {!user.is_active && !isSelf && (
                    <button
                      type="button"
                      onClick={() => handleActivate(user)}
                      disabled={activatingId === user.id}
                      className="ml-auto flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/5 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50 md:min-h-0"
                      aria-label={`Activate ${user.name}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {activatingId === user.id ? 'Activating...' : 'Activate'}
                    </button>
                  )}
                </div>
              );
            })}
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:w-56"
          />
          <input
            type="password"
            required
            placeholder="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-60 sm:py-2"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </form>
        {formError && <p className="px-4 pb-4 text-sm text-red-600">{formError}</p>}
      </div>
    </div>
  );
}
