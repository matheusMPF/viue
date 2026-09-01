import { z } from 'zod';

import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { sendFriendRequest } from '@/services/community/community.service';

const requestSchema = z.object({ addresseeId: z.uuid() });

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const input = await parseBody(request, requestSchema);
    await sendFriendRequest(user.id, input.addresseeId);
    return successResponse({ message: 'Solicitação enviada.' }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
