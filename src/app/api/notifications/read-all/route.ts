import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { markAllNotificationsRead } from '@/services/notifications/notification.service';

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    await markAllNotificationsRead(user.id);
    return successResponse({ message: 'Notificações marcadas como lidas.' });
  } catch (error) {
    return errorResponse(error);
  }
}
