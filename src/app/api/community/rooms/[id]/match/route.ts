import { z } from 'zod';

import { content_type } from '@/generated/prisma/enums';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { getLatestMatchSession, startMatchSession } from '@/services/community/match.service';

const startSchema = z.object({ type: z.nativeEnum(content_type) });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;
    return successResponse(await getLatestMatchSession(user.id, id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    const [{ id }, input] = await Promise.all([params, parseBody(request, startSchema)]);
    return successResponse(await startMatchSession(user.id, id, input.type), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
