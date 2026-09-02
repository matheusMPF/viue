import { z } from 'zod';

import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { inviteFriendToRoom } from '@/services/community/community.service';

const inviteSchema = z.object({ friendId: z.uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    const [{ id }, input] = await Promise.all([params, parseBody(request, inviteSchema)]);
    await inviteFriendToRoom(user.id, id, input.friendId);
    return successResponse({ message: 'Convite enviado.' });
  } catch (error) {
    return errorResponse(error);
  }
}
