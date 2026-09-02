import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { getSeriesSeasons } from '@/services/catalog/series-episodes.service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthenticatedUser();
    const { id } = await params;
    const seasons = await getSeriesSeasons(id);
    return successResponse(seasons);
  } catch (error) {
    return errorResponse(error);
  }
}
