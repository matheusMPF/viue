import { redirect } from 'next/navigation';

import { DiscoverScreen } from '@/components/discover/discover-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import {
  getMovieCatalog,
  getMovieGenreOptions,
} from '@/services/catalog/movie-catalog.service';
import { getSeriesCatalog } from '@/services/catalog/series-catalog.service';

export default async function DiscoverPage() {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const [movieCatalog, genres, seriesCatalog] = await Promise.all([
    getMovieCatalog({ kind: 'discover', limit: 30, page: 1 }),
    getMovieGenreOptions(),
    getSeriesCatalog({ kind: 'discover', limit: 30, page: 1 }),
  ]);

  return (
    <DiscoverScreen
      genres={genres}
      initialMovies={movieCatalog.items}
      initialMoviesTotalPages={movieCatalog.totalPages}
      initialMoviesTotalResults={movieCatalog.totalResults}
      initialSeries={seriesCatalog.items}
      initialSeriesTotalPages={seriesCatalog.totalPages}
      initialSeriesTotalResults={seriesCatalog.totalResults}
    />
  );
}
