import { notFound, redirect } from 'next/navigation';

import { ComingSoonScreen } from '@/components/profile/coming-soon-screen';
import { MovieListingScreen } from '@/components/catalog/movie-listing-screen';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { isProfileSlug, PROFILE_CONFIG } from '@/lib/profile/profiles';
import { parseCatalogYear } from '@/services/catalog/catalog-period';
import { getMovieCatalog, type MovieCatalogKind } from '@/services/catalog/movie-catalog.service';

type TopRatedMoviesPageProps = {
  params: Promise<{ profile: string }>;
  searchParams: Promise<{
    query?: string;
    year?: string;
  }>;
};

export default async function TopRatedMoviesPage({
  params,
  searchParams,
}: TopRatedMoviesPageProps) {
  const { profile } = await params;
  if (!isProfileSlug(profile)) notFound();

  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) redirect('/renovar-sessao');

  if (!PROFILE_CONFIG[profile].available) return <ComingSoonScreen profile={profile} />;

  const { query = '', year } = await searchParams;
  const catalogYear = parseCatalogYear(year);
  const kind: MovieCatalogKind = query ? 'search' : catalogYear ? 'top-rated-year' : 'top-rated';
  const title = query
    ? `Resultados para "${query}"`
    : catalogYear
      ? `Melhores filmes de ${catalogYear}`
      : 'Filmes mais bem avaliados';
  const catalog = await getMovieCatalog({ kind, limit: 30, page: 1, query, year: catalogYear });

  return (
    <MovieListingScreen
      initialItems={catalog.items}
      kind={kind}
      profile={profile}
      query={query}
      title={title}
      totalPages={catalog.totalPages}
      totalResults={catalog.totalResults}
      year={catalogYear}
    />
  );
}
