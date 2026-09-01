import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import { getContentDetail, updateUserContent } from '@/services/catalog/content-detail.service';
import { library_status } from '@/generated/prisma/enums';

const updateSchema = z.object({
  status: z.nativeEnum(library_status).optional(),
  rating: z.number().min(0).max(10).nullable().optional(),
  streaming: z.string().trim().max(100).nullable().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;
    const content = await getContentDetail(id, user.id);
    if (!content) return successResponse(null, 404);
    return successResponse(content);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;
    const data = await parseBody(request, updateSchema);
    const content = await getContentDetail(id, user.id);
    if (!content) return successResponse(null, 404);
    await updateUserContent(user.id, id, data);
    return successResponse(await getContentDetail(id, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
