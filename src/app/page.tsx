import { redirect } from 'next/navigation';

import { HomeScreen } from '@/components/home/home-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { getMovieCatalog } from '@/services/catalog/movie-catalog.service';
import { getSeriesCatalog } from '@/services/catalog/series-catalog.service';
import { getHomeSocialContext } from '@/services/home/home.repository';

export default async function HomePage() {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const [socialContext, initialMovieCatalog, initialMovieCatalog2026, initialSeriesCatalog] =
    await Promise.all([
      getHomeSocialContext(user.id),
      getMovieCatalog({ kind: 'top-rated' }).catch(() => ({
        items: [],
        page: 1,
        totalPages: 0,
        totalResults: 0,
      })),
      getMovieCatalog({ kind: 'top-rated-2026' }).catch(() => ({
        items: [],
        page: 1,
        totalPages: 0,
        totalResults: 0,
      })),
      getSeriesCatalog({ kind: 'top-rated' }).catch(() => ({
        items: [],
        page: 1,
        totalPages: 0,
        totalResults: 0,
      })),
    ]);

  return (
    <HomeScreen
      initialMovies={initialMovieCatalog.items}
      initialMovies2026={initialMovieCatalog2026.items}
      initialSeries={initialSeriesCatalog.items}
      socialContext={socialContext}
      user={user}
    />
  );
}
