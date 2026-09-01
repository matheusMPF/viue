'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { refreshAuthSession } from '@/lib/auth/auth-fetch';

export function SessionRenewal() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function renewSession() {
      const result = await refreshAuthSession();
      if (cancelled) return;
      router.replace(result === 'refreshed' ? '/' : '/entrar');
      router.refresh();
    }

    void renewSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="session-renewal" aria-busy="true" aria-live="polite">
      <Image alt="" height={64} priority src="/brand/viue-symbol.png" width={64} />
      <span className="session-renewal-spinner" aria-hidden="true" />
      <p>Restaurando sua sessão...</p>
    </main>
  );
}
