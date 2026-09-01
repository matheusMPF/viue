import type { NextRequest } from 'next/server';

import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, successResponse } from '@/lib/auth/http';
import {
  getSeriesCatalog,
  type SeriesCatalogKind,
} from '@/services/catalog/series-catalog.service';

const catalogKinds = new Set<SeriesCatalogKind>(['top-rated', 'search']);

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser();

    const query = request.nextUrl.searchParams.get('query') ?? '';
    const kindParam = request.nextUrl.searchParams.get('kind') ?? 'top-rated';
    const kind = catalogKinds.has(kindParam as SeriesCatalogKind)
      ? (kindParam as SeriesCatalogKind)
      : 'top-rated';
    const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? '10');
    const limit = Number.isInteger(limitParam) ? limitParam : 10;
    const pageParam = Number(request.nextUrl.searchParams.get('page') ?? '1');
    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

    const catalog = await getSeriesCatalog({ kind, limit, page, query });
    return successResponse(catalog);
  } catch (error) {
    return errorResponse(error);
  }
}
