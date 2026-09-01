import { redirect } from 'next/navigation';

import { DiscoverScreen } from '@/components/discover/discover-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import {
  getMovieCatalog,
  getMovieGenreOptions,
} from '@/services/catalog/movie-catalog.service';

export default async function DiscoverPage() {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const [catalog, genres] = await Promise.all([
    getMovieCatalog({ kind: 'discover', limit: 30, page: 1 }),
    getMovieGenreOptions(),
  ]);

  return (
    <DiscoverScreen
      genres={genres}
      initialItems={catalog.items}
      initialTotalPages={catalog.totalPages}
      initialTotalResults={catalog.totalResults}
    />
  );
}
