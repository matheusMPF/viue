'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { AUTH_SESSION_EXPIRED_EVENT } from '@/lib/auth/auth-fetch';

export function AuthSessionManager() {
  const router = useRouter();

  useEffect(() => {
    function handleSessionExpired() {
      router.replace('/entrar');
      router.refresh();
    }

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [router]);

  return null;
}
