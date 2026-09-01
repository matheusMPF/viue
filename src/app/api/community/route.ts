import { NextRequest } from 'next/server';

import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { getCommunityOverview } from '@/services/community/community.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const search = request.nextUrl.searchParams.get('search') ?? '';
    return successResponse(await getCommunityOverview(user.id, search));
  } catch (error) {
    return errorResponse(error);
  }
}
