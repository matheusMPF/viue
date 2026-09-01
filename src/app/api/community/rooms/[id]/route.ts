import { z } from 'zod';

import { room_match_mode } from '@/generated/prisma/enums';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { getRoomDetail, updateRoomMatchMode } from '@/services/community/community.service';

const updateSchema = z.object({ matchMode: z.nativeEnum(room_match_mode) });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;
    return successResponse(await getRoomDetail(user.id, id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    const [{ id }, input] = await Promise.all([params, parseBody(request, updateSchema)]);
    return successResponse(await updateRoomMatchMode(user.id, id, input.matchMode));
  } catch (error) {
    return errorResponse(error);
  }
}
