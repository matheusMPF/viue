import { notFound, redirect } from 'next/navigation';

import { ComingSoonScreen } from '@/components/profile/coming-soon-screen';
import { ContentDetailScreen } from '@/components/catalog/content-detail-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { isProfileSlug, PROFILE_CONFIG } from '@/lib/profile/profiles';
import { getContentDetail } from '@/services/catalog/content-detail.service';

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ profile: string; id: string }>;
}) {
  const { profile, id } = await params;
  if (!isProfileSlug(profile)) notFound();

  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  if (!PROFILE_CONFIG[profile].available) return <ComingSoonScreen profile={profile} />;

  const content = await getContentDetail(id, user.id);
  if (!content) notFound();

  return <ContentDetailScreen initialContent={content} profile={profile} />;
}
