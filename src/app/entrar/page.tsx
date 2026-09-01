import { redirect } from 'next/navigation';

import { AuthScreen } from '@/components/auth/auth-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';

export default async function LoginPage() {
  const user = await getAuthenticatedUser().catch(() => null);
  if (user) redirect('/');

  return <AuthScreen />;
}
