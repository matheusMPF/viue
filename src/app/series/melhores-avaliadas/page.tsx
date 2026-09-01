import { redirect } from 'next/navigation';

import { SeriesListingScreen } from '@/components/catalog/series-listing-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { getSeriesCatalog } from '@/services/catalog/series-catalog.service';

export default async function TopRatedSeriesPage() {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const catalog = await getSeriesCatalog({ kind: 'top-rated', limit: 30, page: 1 });

  return (
    <SeriesListingScreen
      initialItems={catalog.items}
      title="Series mais aclamadas"
      totalPages={catalog.totalPages}
      totalResults={catalog.totalResults}
    />
  );
}
