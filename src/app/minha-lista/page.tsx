import { redirect } from 'next/navigation';

import { LibraryScreen } from '@/components/library/library-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { getUserLibrary } from '@/services/catalog/content-detail.service';

export default async function LibraryPage() {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const items = await getUserLibrary(user.id);
  return <LibraryScreen initialItems={items} />;
}
