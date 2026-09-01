import { redirect } from 'next/navigation';

import { SessionRenewal } from '@/components/auth/session-renewal';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';

export default async function RenewSessionPage() {
  const user = await getAuthenticatedUser().catch(() => null);
  if (user) redirect('/');

  return <SessionRenewal />;
}
