import type { NextRequest } from 'next/server';

import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { getMovieCatalog, type MovieCatalogKind } from '@/services/catalog/movie-catalog.service';

const catalogKinds = new Set<MovieCatalogKind>([
  'discover',
  'top-rated',
  'top-rated-2026',
  'search',
]);

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser();

    const query = request.nextUrl.searchParams.get('query') ?? '';
    const kindParam = request.nextUrl.searchParams.get('kind') ?? 'top-rated';
    const kind = catalogKinds.has(kindParam as MovieCatalogKind)
      ? (kindParam as MovieCatalogKind)
      : 'top-rated';
    const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? '10');
    const limit = Number.isInteger(limitParam) ? limitParam : 10;
    const pageParam = Number(request.nextUrl.searchParams.get('page') ?? '1');
    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
    const genreParam = Number(request.nextUrl.searchParams.get('genre') ?? '');
    const genreId = Number.isInteger(genreParam) && genreParam > 0 ? genreParam : undefined;

    const catalog = await getMovieCatalog({ genreId, kind, limit, page, query });
    return successResponse(catalog);
  } catch (error) {
    return errorResponse(error);
  }
}
