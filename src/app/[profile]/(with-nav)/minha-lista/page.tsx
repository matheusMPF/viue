import { notFound, redirect } from 'next/navigation';

import { ComingSoonScreen } from '@/components/profile/coming-soon-screen';
import { LibraryScreen } from '@/components/library/library-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { isProfileSlug, PROFILE_CONFIG } from '@/lib/profile/profiles';
import { getUserLibrary } from '@/services/catalog/content-detail.service';

export default async function LibraryPage({ params }: { params: Promise<{ profile: string }> }) {
  const { profile } = await params;
  if (!isProfileSlug(profile)) notFound();

  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  if (!PROFILE_CONFIG[profile].available) return <ComingSoonScreen profile={profile} />;

  const items = await getUserLibrary(user.id);
  return <LibraryScreen initialItems={items} profile={profile} />;
}
