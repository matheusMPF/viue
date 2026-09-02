import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AuthScreen } from '@/components/auth/auth-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getAuthenticatedUser().catch(() => null);
  if (user) {
    const { next } = await searchParams;
    redirect(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
  }

  return (
    <Suspense>
      <AuthScreen />
    </Suspense>
  );
}
