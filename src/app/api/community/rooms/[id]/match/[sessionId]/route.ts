import { z } from 'zod';

import { room_match_vote_decision } from '@/generated/prisma/enums';
import { getAuthenticatedUser } from '@/lib/auth/authenticated-user';
import { errorResponse, parseBody, successResponse } from '@/lib/auth/http';
import {
  cancelMatchSession,
  getMatchSession,
  startNextMatchRound,
  voteOnMatchCandidate,
} from '@/services/community/match.service';

const currentYear = new Date().getUTCFullYear();
const optionalPositiveInteger = z.number().int().positive().optional();
const filtersSchema = z
  .object({
    genreId: optionalPositiveInteger,
    runtimeMax: z.number().int().min(20).max(600).optional(),
    runtimeMin: z.number().int().min(1).max(600).optional(),
    yearFrom: z
      .number()
      .int()
      .min(1900)
      .max(currentYear + 5)
      .optional(),
    yearTo: z
      .number()
      .int()
      .min(1900)
      .max(currentYear + 5)
      .optional(),
  })
  .refine((filters) => !filters.yearFrom || !filters.yearTo || filters.yearFrom <= filters.yearTo, {
    message: 'O ano inicial deve ser menor ou igual ao ano final.',
  })
  .refine(
    (filters) =>
      !filters.runtimeMin || !filters.runtimeMax || filters.runtimeMin <= filters.runtimeMax,
    { message: 'A duração mínima deve ser menor ou igual à máxima.' },
  );

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('vote'),
    candidateId: z.uuid(),
    decision: z.nativeEnum(room_match_vote_decision),
  }),
  z.object({ action: z.literal('next-round'), filters: filtersSchema }),
  z.object({ action: z.literal('cancel') }),
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { id, sessionId } = await params;
    return successResponse(await getMatchSession(user.id, id, sessionId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const [{ id, sessionId }, input] = await Promise.all([
      params,
      parseBody(request, actionSchema),
    ]);

    if (input.action === 'vote') {
      return successResponse(
        await voteOnMatchCandidate(user.id, id, sessionId, input.candidateId, input.decision),
      );
    }
    if (input.action === 'next-round') {
      return successResponse(await startNextMatchRound(user.id, id, sessionId, input.filters));
    }
    return successResponse(await cancelMatchSession(user.id, id, sessionId));
  } catch (error) {
    return errorResponse(error);
  }
}
