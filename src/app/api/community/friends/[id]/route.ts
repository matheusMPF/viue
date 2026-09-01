import { z } from 'zod';

import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { removeFriend, respondToFriendRequest } from '@/services/community/community.service';

const responseSchema = z.object({ status: z.enum(['ACCEPTED', 'REJECTED']) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    const [{ id }, input] = await Promise.all([params, parseBody(request, responseSchema)]);
    await respondToFriendRequest(user.id, id, input.status);
    return successResponse({ message: 'Solicitação atualizada.' });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;
    await removeFriend(user.id, id);
    return successResponse({ message: 'Amizade removida.' });
  } catch (error) {
    return errorResponse(error);
  }
}
