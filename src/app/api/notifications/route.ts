import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { listNotifications } from '@/services/notifications/notification.service';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const result = await listNotifications(user.id);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
