import { redirect } from 'next/navigation';

import { AccountScreen } from '@/components/account/account-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { authService } from '@/services/auth';

export default async function AccountPage() {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const profile = await authService.getProfile(user.id);
  return (
    <AccountScreen
      initialProfile={{
        id: profile.id,
        name: profile.name,
        email: profile.email,
        birthDate: profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : null,
        createdAt: profile.createdAt.toISOString(),
      }}
    />
  );
}
