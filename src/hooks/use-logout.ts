'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authFetch } from '@/lib/auth/auth-fetch';
import { useToast } from '@/hooks/use-toast';

export function useLogout() {
  const router = useRouter();
  const showToast = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
      router.replace('/entrar');
      router.refresh();
    } catch {
      showToast({
        description: 'Tente novamente em alguns instantes.',
        title: 'Não foi possível sair',
        variant: 'error',
      });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return { isLoggingOut, logout };
}
