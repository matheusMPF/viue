import { z } from 'zod';

import { room_match_mode } from '@/generated/prisma/enums';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { createRoom } from '@/services/community/community.service';

const roomSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).optional(),
  friendIds: z.array(z.uuid()).max(30).default([]),
  matchMode: z.nativeEnum(room_match_mode).default(room_match_mode.ALL_PARTICIPANTS),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const input = await parseBody(request, roomSchema);
    return successResponse(await createRoom(user.id, input), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
