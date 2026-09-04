import { redirect } from 'next/navigation';

import { SessionRenewal } from '@/components/auth/session-renewal';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { DEFAULT_PROFILE_SLUG } from '@/lib/profile/profiles';

export default async function RenewSessionPage() {
  const user = await getAuthenticatedUser().catch(() => null);
  if (user) redirect(`/${DEFAULT_PROFILE_SLUG}`);

  return <SessionRenewal />;
}
