import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, successResponse } from '@/lib/auth/http';
import { markNotificationRead } from '@/services/notifications/notification.service';

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;
    await markNotificationRead(user.id, id);
    return successResponse({ message: 'Notificação marcada como lida.' });
  } catch (error) {
    return errorResponse(error);
  }
}
