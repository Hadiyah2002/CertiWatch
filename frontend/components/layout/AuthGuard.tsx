'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Status = 'checking' | 'authenticated' | 'unauthenticated';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    apiFetch('/auth/me')
      .then(() => {
        if (!cancelled) setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('unauthenticated');
          router.replace('/login');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">Loading CertiWatch...</div>
      </div>
    );
  }

  return <>{children}</>;
}
