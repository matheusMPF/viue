import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { getSeasonEpisodes } from '@/services/catalog/series-episodes.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; number: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { id, number } = await params;
    const seasonNumber = Number(number);
    if (!Number.isInteger(seasonNumber)) return successResponse(null, 404);

    const episodes = await getSeasonEpisodes(id, seasonNumber, user.id);
    if (!episodes) return successResponse(null, 404);
    return successResponse(episodes);
  } catch (error) {
    return errorResponse(error);
  }
}
