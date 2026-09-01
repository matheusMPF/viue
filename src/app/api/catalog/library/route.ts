import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { getUserLibrary } from '@/services/catalog/content-detail.service';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    return successResponse(await getUserLibrary(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
