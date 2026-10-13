'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, FileCheck2, FolderTree, Loader2, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { SearchResults } from '@/lib/types';

const DEBOUNCE_MS = 300;

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const latestRequestId = useRef(0);

  // Debounced search — waits 300ms after typing stops, and ignores any
  // response that isn't for the most recently issued request (guards
  // against a slow earlier request overwriting a faster later one).
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const requestId = ++latestRequestId.current;

    const timer = setTimeout(() => {
      apiFetch<SearchResults>(`/search?q=${encodeURIComponent(trimmed)}`)
        .then((data) => {
          if (requestId === latestRequestId.current) setResults(data);
        })
        .catch(() => {
          if (requestId === latestRequestId.current) {
            setResults({ certificates: [], branches: [], categories: [] });
          }
        })
        .finally(() => {
          if (requestId === latestRequestId.current) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function goTo(path: string) {
    setOpen(false);
    setQuery('');
    setResults(null);
    router.push(path);
  }

  const trimmedQuery = query.trim();
  const showDropdown = open && trimmedQuery.length > 0;
  const hasAnyResults =
    !!results && (results.certificates.length > 0 || results.branches.length > 0 || results.categories.length > 0);

  return (
    <div className="relative w-full min-w-0 max-w-md flex-1" ref={containerRef}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search certificates, branches, categories..."
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />

      {showDropdown && (
        <div className="fixed inset-x-4 top-[4.5rem] z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg sm:absolute sm:inset-x-0 sm:top-auto sm:mt-2 sm:max-h-96">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : !hasAnyResults ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No results found for &ldquo;{trimmedQuery}&rdquo;
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results!.certificates.length > 0 && (
                <div className="py-2">
                  <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Certificates
                  </p>
                  {results!.certificates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => goTo(`/certificates/${c.id}`)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <FileCheck2 className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="min-w-0 flex-1 truncate text-gray-900">{c.name}</span>
                      <span className="shrink-0 text-xs text-gray-400">{c.reference_number}</span>
                    </button>
                  ))}
                </div>
              )}

              {results!.branches.length > 0 && (
                <div className="py-2">
                  <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Branches
                  </p>
                  {results!.branches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => goTo(`/branches/${b.id}`)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate">{b.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {results!.categories.length > 0 && (
                <div className="py-2">
                  <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Categories
                  </p>
                  {results!.categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => goTo(`/categories/${cat.id}`)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                    >
                      <FolderTree className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
