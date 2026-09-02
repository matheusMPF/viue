import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { updateEpisodeRating } from '@/services/catalog/series-episodes.service';

const updateSchema = z.object({
  rating: z.number().min(0).max(10).nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { episodeId } = await params;
    const data = await parseBody(request, updateSchema);
    const result = await updateEpisodeRating(user.id, episodeId, data.rating);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
