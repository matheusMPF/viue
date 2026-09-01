import { redirect } from 'next/navigation';

import { MovieListingScreen } from '@/components/catalog/movie-listing-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { getMovieCatalog, type MovieCatalogKind } from '@/services/catalog/movie-catalog.service';

type TopRatedMoviesPageProps = {
  searchParams: Promise<{
    query?: string;
    year?: string;
  }>;
};

export default async function TopRatedMoviesPage({ searchParams }: TopRatedMoviesPageProps) {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  const { query = '', year } = await searchParams;
  const kind: MovieCatalogKind = query
    ? 'search'
    : year === '2026'
      ? 'top-rated-2026'
      : 'top-rated';
  const title = query
    ? `Resultados para "${query}"`
    : year === '2026'
      ? 'Melhores filmes de 2026'
      : 'Filmes mais bem avaliados';
  const catalog = await getMovieCatalog({ kind, limit: 30, page: 1, query });

  return (
    <MovieListingScreen
      initialItems={catalog.items}
      kind={kind}
      query={query}
      title={title}
      totalPages={catalog.totalPages}
      totalResults={catalog.totalResults}
    />
  );
}
