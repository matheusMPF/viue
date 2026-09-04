import { notFound, redirect } from 'next/navigation';

import { ComingSoonScreen } from '@/components/profile/coming-soon-screen';
import { SeriesListingScreen } from '@/components/catalog/series-listing-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { isProfileSlug, PROFILE_CONFIG } from '@/lib/profile/profiles';
import { getSeriesCatalog } from '@/services/catalog/series-catalog.service';

export default async function TopRatedSeriesPage({
  params,
}: {
  params: Promise<{ profile: string }>;
}) {
  const { profile } = await params;
  if (!isProfileSlug(profile)) notFound();

  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  if (!PROFILE_CONFIG[profile].available) return <ComingSoonScreen profile={profile} />;

  const catalog = await getSeriesCatalog({ kind: 'top-rated', limit: 30, page: 1 });

  return (
    <SeriesListingScreen
      initialItems={catalog.items}
      profile={profile}
      title="Series mais aclamadas"
      totalPages={catalog.totalPages}
      totalResults={catalog.totalResults}
    />
  );
}
