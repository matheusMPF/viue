import {
  content_type,
  room_match_round_status,
  room_match_session_status,
} from '@/generated/prisma/enums';
import { AuthError } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';
import { getMovieCatalog, getMovieGenreOptions } from '@/services/catalog/movie-catalog.service';
import { getSeriesCatalog, getSeriesGenreOptions } from '@/services/catalog/series-catalog.service';
import type {
  MatchCandidateView,
  MatchContentType,
  MatchFilters,
  MatchSessionView,
  MatchVoteDecision,
} from '@/types/community/match';
import { findCurrentMatchCandidate, hasUnanimousMatch, isRoundComplete } from './match-consensus';
import { rankMatchCandidates } from './match-ranking';
import { closeInactiveCommunityState } from './community-lifecycle.service';

const MAX_CANDIDATES = 50;
const CATALOG_PAGE_SIZE = 30;
const MAX_CATALOG_PAGES = 12;

const matchPersonSelect = {
  id: true,
  name: true,
  avatar_url: true,
} as const;

function matchError(message: string, status = 400) {
  return new AuthError(status === 403 ? 'UNAUTHORIZED' : 'INVALID_REQUEST', message, status);
}

function isPrismaCode(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

function normalizeFilters(value: unknown): MatchFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const filters = value as Record<string, unknown>;
  const number = (key: keyof MatchFilters) =>
    typeof filters[key] === 'number' ? (filters[key] as number) : undefined;
  return {
    genreId: number('genreId'),
    runtimeMax: number('runtimeMax'),
    runtimeMin: number('runtimeMin'),
    yearFrom: number('yearFrom'),
    yearTo: number('yearTo'),
  };
}

function toCandidateView(candidate: {
  id: string;
  position: number;
  tb_content: {
    id: string;
    title: string;
    description: string | null;
    poster_url: string | null;
    release_date: Date | null;
    external_rating: { toString(): string } | null;
    tb_content_genre: { tb_genre: { name: string } }[];
  };
}): MatchCandidateView {
  return {
    candidateId: candidate.id,
    contentId: candidate.tb_content.id,
    description: candidate.tb_content.description,
    genres: candidate.tb_content.tb_content_genre.map(({ tb_genre }) => tb_genre.name),
    posterUrl: candidate.tb_content.poster_url,
    position: candidate.position,
    rating: candidate.tb_content.external_rating?.toString() ?? null,
    releaseYear: candidate.tb_content.release_date?.getUTCFullYear().toString() ?? null,
    title: candidate.tb_content.title,
  };
}

async function assertActiveRoomMember(userId: string, roomId: string) {
  const room = await prisma.tb_room.findFirst({
    where: {
      id: roomId,
      status: 'ACTIVE',
      tb_room_participant: { some: { user_id: userId, active: true } },
    },
    select: { id: true },
  });
  if (!room) throw matchError('Sala não encontrada ou sem acesso.', 404);
}

async function loadCatalogPool(
  type: MatchContentType,
  filters: MatchFilters,
  excludedIds: ReadonlySet<string>,
) {
  const eligible = new Map<string, { id: string }>();

  for (let firstPage = 1; firstPage <= MAX_CATALOG_PAGES; firstPage += 3) {
    const pages = [firstPage, firstPage + 1, firstPage + 2];
    const results = await Promise.all(
      pages.map((page) =>
        type === content_type.MOVIE
          ? getMovieCatalog({
              ...filters,
              kind: 'discover',
              limit: CATALOG_PAGE_SIZE,
              page,
            })
          : getSeriesCatalog({
              ...filters,
              kind: 'discover',
              limit: CATALOG_PAGE_SIZE,
              page,
            }),
      ),
    );

    for (const item of results.flatMap((result) => result.items)) {
      if (!excludedIds.has(item.id)) eligible.set(item.id, item);
    }
    if (eligible.size >= MAX_CANDIDATES + 10) break;
  }

  return [...eligible.keys()];
}

async function populateRound({
  filters,
  participantIds,
  roundId,
  sessionId,
  type,
}: {
  filters: MatchFilters;
  participantIds: string[];
  roundId: string;
  sessionId: string;
  type: MatchContentType;
}) {
  const priorCandidates = await prisma.tb_room_match_candidate.findMany({
    where: { session_id: sessionId },
    select: { content_id: true },
  });
  const excludedIds = new Set(priorCandidates.map((candidate) => candidate.content_id));
  const catalogIds = await loadCatalogPool(type, filters, excludedIds);

  const [contents, interactions] = await Promise.all([
    prisma.tb_content.findMany({
      where: { id: { in: catalogIds }, status: 'ACTIVE', type },
      include: { tb_content_genre: { include: { tb_genre: true } } },
    }),
    prisma.tb_user_content.findMany({
      where: { user_id: { in: participantIds } },
      include: {
        tb_content: { include: { tb_content_genre: { include: { tb_genre: true } } } },
      },
    }),
  ]);

  const ranked = rankMatchCandidates({
    candidates: contents.map((content) => ({
      id: content.id,
      externalRating: content.external_rating ? Number(content.external_rating) : null,
      externalVotes: content.external_votes,
      genres: content.tb_content_genre.map(({ tb_genre }) => tb_genre.name),
    })),
    filters,
    interactions: interactions.map((interaction) => ({
      contentId: interaction.content_id,
      genres: interaction.tb_content.tb_content_genre.map(({ tb_genre }) => tb_genre.name),
      rating: interaction.rating ? Number(interaction.rating) : null,
      status: interaction.status,
      userId: interaction.user_id,
    })),
    participantIds,
    rankingContext: `${sessionId}:${roundId}`,
  }).slice(0, MAX_CANDIDATES);

  if (ranked.length === 0) {
    throw matchError('Não encontramos conteúdos elegíveis com esses filtros.');
  }

  await prisma.$transaction(async (tx) => {
    const round = await tx.tb_room_match_round.findFirst({
      where: { id: roundId, session_id: sessionId, candidate_count: 0 },
      select: { id: true },
    });
    if (!round) throw matchError('Esta rodada já foi preparada.');

    await tx.tb_room_match_candidate.createMany({
      data: ranked.map((candidate, index) => ({
        content_id: candidate.id,
        position: index + 1,
        round_id: roundId,
        score: candidate.score,
        score_details: candidate.scoreDetails,
        session_id: sessionId,
      })),
    });
    await tx.tb_room_match_round.update({
      where: { id: roundId },
      data: { candidate_count: ranked.length },
    });
    const sessionUpdate = await tx.tb_room_match_session.updateMany({
      where: {
        id: sessionId,
        status: {
          in: [room_match_session_status.WAITING, room_match_session_status.ACTIVE],
        },
      },
      data: { status: room_match_session_status.ACTIVE, updated_at: new Date() },
    });
    if (sessionUpdate.count === 0) throw matchError('Esta sessão foi encerrada.');
  });
}

async function getMatchSessionView(
  userId: string,
  roomId: string,
  sessionId?: string,
): Promise<MatchSessionView | null> {
  await closeInactiveCommunityState(roomId);
  await assertActiveRoomMember(userId, roomId);

  const session = await prisma.tb_room_match_session.findFirst({
    where: { room_id: roomId, ...(sessionId ? { id: sessionId } : {}) },
    include: {
      tb_matched_content: {
        include: {
          tb_content_genre: { include: { tb_genre: true } },
          tb_user_content: { where: { user_id: userId }, select: { id: true }, take: 1 },
        },
      },
      tb_owner: { select: matchPersonSelect },
      tb_room: {
        include: {
          tb_room_participant: {
            where: { active: true },
            select: { user_id: true },
          },
        },
      },
      tb_participant: {
        include: { tb_user: { select: matchPersonSelect } },
        orderBy: { joined_at: 'asc' },
      },
      tb_round: { orderBy: { number: 'desc' }, take: 1 },
    },
    orderBy: { created_at: 'desc' },
  });
  if (!session) return null;

  const participant = session.tb_participant.find((item) => item.user_id === userId);
  let status = session.status;
  if (
    (status === room_match_session_status.WAITING || status === room_match_session_status.ACTIVE) &&
    session.tb_room.tb_room_participant.filter(({ user_id }) =>
      session.tb_participant.some((item) => item.user_id === user_id),
    ).length !== session.tb_participant.length
  ) {
    await prisma.tb_room_match_session.updateMany({
      where: {
        id: session.id,
        status: {
          in: [room_match_session_status.WAITING, room_match_session_status.ACTIVE],
        },
      },
      data: {
        completed_at: new Date(),
        status: room_match_session_status.CANCELED,
        updated_at: new Date(),
      },
    });
    status = room_match_session_status.CANCELED;
  }

  const round = session.tb_round[0] ?? null;
  let myVoteCount = 0;
  let currentCandidateVoteCount = 0;
  let currentUserDecision: MatchVoteDecision | null = null;
  let hasVotedCurrentCandidate = false;
  let currentCandidate: Parameters<typeof toCandidateView>[0] | null = null;

  if (round && participant && status === room_match_session_status.ACTIVE) {
    const candidateProgress = await prisma.tb_room_match_candidate.findMany({
      where: { round_id: round.id },
      select: {
        id: true,
        tb_vote: { select: { decision: true, participant_id: true } },
      },
      orderBy: { position: 'asc' },
    });
    myVoteCount = candidateProgress.filter((candidate) =>
      candidate.tb_vote.some((vote) => vote.participant_id === participant.id),
    ).length;
    const currentProgress = findCurrentMatchCandidate(
      candidateProgress.map((candidate) => ({
        id: candidate.id,
        voteCount: candidate.tb_vote.length,
      })),
      session.tb_participant.length,
    );

    if (currentProgress) {
      const progress = candidateProgress.find((candidate) => candidate.id === currentProgress.id)!;
      currentCandidateVoteCount = progress.tb_vote.length;
      hasVotedCurrentCandidate = progress.tb_vote.some(
        (vote) => vote.participant_id === participant.id,
      );
      currentUserDecision =
        progress.tb_vote.find((vote) => vote.participant_id === participant.id)?.decision ?? null;
      currentCandidate = await prisma.tb_room_match_candidate.findUnique({
        where: { id: currentProgress.id },
        include: {
          tb_content: {
            include: { tb_content_genre: { include: { tb_genre: true } } },
          },
        },
      });
    }
  }
  const isExhausted = round?.status === room_match_round_status.EXHAUSTED;
  let filterOptions: { id: number; name: string }[] = [];
  if (
    round &&
    isExhausted &&
    status === room_match_session_status.ACTIVE &&
    session.owner_id === userId
  ) {
    try {
      filterOptions = await (session.type === content_type.MOVIE
        ? getMovieGenreOptions()
        : getSeriesGenreOptions());
    } catch {
      // Ano e duração continuam disponíveis mesmo se o catálogo estiver instável.
    }
  }
  const matchedContent = session.tb_matched_content
    ? {
        contentId: session.tb_matched_content.id,
        description: session.tb_matched_content.description,
        genres: session.tb_matched_content.tb_content_genre.map(({ tb_genre }) => tb_genre.name),
        posterUrl: session.tb_matched_content.poster_url,
        rating: session.tb_matched_content.external_rating?.toString() ?? null,
        releaseYear: session.tb_matched_content.release_date?.getUTCFullYear().toString() ?? null,
        title: session.tb_matched_content.title,
        isInMyLibrary: session.tb_matched_content.tb_user_content.length > 0,
      }
    : null;

  return {
    id: session.id,
    type: session.type,
    status,
    isParticipant: Boolean(participant),
    isOwner: session.owner_id === userId,
    owner: {
      id: session.tb_owner.id,
      name: session.tb_owner.name,
      avatarUrl: session.tb_owner.avatar_url,
    },
    participants: session.tb_participant.map(({ tb_user }) => ({
      id: tb_user.id,
      name: tb_user.name,
      avatarUrl: tb_user.avatar_url,
    })),
    participantCount: session.tb_participant.length,
    round: round
      ? {
          id: round.id,
          number: round.number,
          candidateCount: round.candidate_count,
          myVoteCount,
          currentCandidateVoteCount,
          currentUserDecision,
          hasVotedCurrentCandidate,
          isExhausted,
          filters: normalizeFilters(round.filters),
        }
      : null,
    currentCandidate: currentCandidate ? toCandidateView(currentCandidate) : null,
    matchedContent,
    filterOptions,
  };
}

export function getLatestMatchSession(userId: string, roomId: string) {
  return getMatchSessionView(userId, roomId);
}

export async function getMatchSession(userId: string, roomId: string, sessionId: string) {
  const session = await getMatchSessionView(userId, roomId, sessionId);
  if (session && !session.isParticipant) {
    throw matchError('Você não participa desta sessão.', 403);
  }
  return session;
}

export async function startMatchSession(userId: string, roomId: string, type: MatchContentType) {
  await closeInactiveCommunityState(roomId);

  let created: { sessionId: string; roundId: string; participantIds: string[] };
  try {
    created = await prisma.$transaction(
      async (tx) => {
        const room = await tx.tb_room.findFirst({
          where: {
            id: roomId,
            status: 'ACTIVE',
            tb_room_participant: { some: { user_id: userId, active: true } },
          },
          include: {
            tb_room_participant: { where: { active: true }, select: { user_id: true } },
          },
        });
        if (!room) throw matchError('Sala não encontrada ou sem acesso.', 404);
        if (room.tb_room_participant.length < 2) {
          throw matchError('O Match precisa de pelo menos 2 participantes.');
        }

        const active = await tx.tb_room_match_session.findFirst({
          where: {
            room_id: roomId,
            status: { in: [room_match_session_status.WAITING, room_match_session_status.ACTIVE] },
          },
          select: { id: true },
        });
        if (active) throw matchError('Já existe um Match em andamento nesta sala.');

        const session = await tx.tb_room_match_session.create({
          data: {
            owner_id: userId,
            room_id: roomId,
            type,
            tb_participant: {
              create: room.tb_room_participant.map(({ user_id }) => ({ user_id })),
            },
          },
          select: { id: true },
        });
        const round = await tx.tb_room_match_round.create({
          data: { filters: {}, number: 1, session_id: session.id },
          select: { id: true },
        });

        return {
          participantIds: room.tb_room_participant.map(({ user_id }) => user_id),
          roundId: round.id,
          sessionId: session.id,
        };
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (error) {
    if (isPrismaCode(error, 'P2002')) {
      throw matchError('Já existe um Match em andamento nesta sala.');
    }
    throw error;
  }

  try {
    await populateRound({ ...created, filters: {}, type });
  } catch (error) {
    await prisma.tb_room_match_session.update({
      where: { id: created.sessionId },
      data: {
        completed_at: new Date(),
        status: room_match_session_status.CANCELED,
        updated_at: new Date(),
      },
    });
    throw error;
  }
  return getMatchSession(userId, roomId, created.sessionId);
}

async function recordVoteTransaction(
  userId: string,
  roomId: string,
  sessionId: string,
  candidateId: string,
  decision: MatchVoteDecision,
) {
  await closeInactiveCommunityState(roomId);

  return prisma.$transaction(
    async (tx) => {
      const session = await tx.tb_room_match_session.findFirst({
        where: {
          id: sessionId,
          room_id: roomId,
          status: room_match_session_status.ACTIVE,
          tb_participant: { some: { user_id: userId } },
          tb_room: {
            status: 'ACTIVE',
            tb_room_participant: { some: { user_id: userId, active: true } },
          },
        },
        include: {
          tb_participant: { select: { id: true, user_id: true } },
          tb_round: { orderBy: { number: 'desc' }, take: 1 },
        },
      });
      if (!session) throw matchError('Sessão não encontrada, encerrada ou sem acesso.', 404);
      const participant = session.tb_participant.find((item) => item.user_id === userId)!;
      const round = session.tb_round[0];
      if (
        !round ||
        round.status !== room_match_round_status.ACTIVE ||
        round.candidate_count === 0
      ) {
        throw matchError('Não há uma rodada disponível para votação.');
      }

      const candidateProgress = await tx.tb_room_match_candidate.findMany({
        where: { round_id: round.id },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          content_id: true,
          position: true,
          tb_vote: { select: { decision: true, participant_id: true } },
        },
      });
      const currentProgress = findCurrentMatchCandidate(
        candidateProgress.map((candidate) => ({
          id: candidate.id,
          voteCount: candidate.tb_vote.length,
        })),
        session.tb_participant.length,
      );
      const currentCandidate = candidateProgress.find(
        (candidate) => candidate.id === currentProgress?.id,
      );
      if (!currentCandidate || currentCandidate.id !== candidateId) {
        throw matchError('Este conteúdo não é o candidato atual da votação.');
      }
      if (currentCandidate.tb_vote.some((vote) => vote.participant_id === participant.id)) {
        throw matchError('Seu voto já foi registrado. Aguarde os outros participantes.');
      }

      await tx.tb_room_match_vote.create({
        data: {
          candidate_id: candidateId,
          decision,
          participant_id: participant.id,
        },
      });

      await tx.tb_room_match_session.updateMany({
        where: { id: sessionId, status: room_match_session_status.ACTIVE },
        data: { updated_at: new Date() },
      });

      const candidateVotes = [...currentCandidate.tb_vote.map((vote) => vote.decision), decision];
      if (hasUnanimousMatch(candidateVotes, session.tb_participant.length)) {
        await tx.tb_room_match_session.updateMany({
          where: { id: sessionId, status: room_match_session_status.ACTIVE },
          data: {
            completed_at: new Date(),
            matched_content_id: currentCandidate.content_id,
            status: room_match_session_status.MATCHED,
            updated_at: new Date(),
          },
        });
        return;
      }

      const voteCountBeforeCurrent = candidateProgress
        .slice(0, currentCandidate.position - 1)
        .reduce((total, candidate) => total + candidate.tb_vote.length, 0);
      const totalVoteCount = voteCountBeforeCurrent + candidateVotes.length;
      if (isRoundComplete(totalVoteCount, round.candidate_count, session.tb_participant.length)) {
        await tx.tb_room_match_round.updateMany({
          where: { id: round.id, status: room_match_round_status.ACTIVE },
          data: { completed_at: new Date(), status: room_match_round_status.EXHAUSTED },
        });
      }
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function voteOnMatchCandidate(
  userId: string,
  roomId: string,
  sessionId: string,
  candidateId: string,
  decision: MatchVoteDecision,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await recordVoteTransaction(userId, roomId, sessionId, candidateId, decision);
      return getMatchSession(userId, roomId, sessionId);
    } catch (error) {
      if (isPrismaCode(error, 'P2034') && attempt < 2) continue;
      if (isPrismaCode(error, 'P2002')) throw matchError('Você já votou neste conteúdo.');
      throw error;
    }
  }
  throw matchError('Não foi possível registrar o voto. Tente novamente.');
}

export async function startNextMatchRound(
  userId: string,
  roomId: string,
  sessionId: string,
  filters: MatchFilters,
) {
  await closeInactiveCommunityState(roomId);

  let reservation: {
    participantIds: string[];
    roundId: string;
    number: number;
    type: MatchContentType;
  };
  try {
    reservation = await prisma.$transaction(
      async (tx) => {
        const session = await tx.tb_room_match_session.findFirst({
          where: {
            id: sessionId,
            owner_id: userId,
            room_id: roomId,
            status: room_match_session_status.ACTIVE,
            tb_room: {
              status: 'ACTIVE',
              tb_room_participant: { some: { user_id: userId, active: true } },
            },
          },
          include: {
            tb_participant: { select: { user_id: true } },
            tb_round: { orderBy: { number: 'desc' }, take: 1 },
          },
        });
        if (!session) throw matchError('Apenas o responsável pode criar uma nova rodada.', 403);
        const currentRound = session.tb_round[0];
        if (!currentRound || currentRound.status !== room_match_round_status.EXHAUSTED) {
          throw matchError('A rodada atual ainda não terminou.');
        }

        const number = currentRound.number + 1;
        const round = await tx.tb_room_match_round.create({
          data: { filters, number, session_id: sessionId },
          select: { id: true },
        });
        await tx.tb_room_match_session.update({
          where: { id: sessionId },
          data: { updated_at: new Date() },
        });
        return {
          number,
          participantIds: session.tb_participant.map(({ user_id }) => user_id),
          roundId: round.id,
          type: session.type,
        };
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (error) {
    if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
      throw matchError('Uma nova rodada já está sendo preparada.');
    }
    throw error;
  }

  try {
    await populateRound({ ...reservation, filters, sessionId });
  } catch (error) {
    await prisma.tb_room_match_round.deleteMany({
      where: { id: reservation.roundId, candidate_count: 0 },
    });
    throw error;
  }
  return getMatchSession(userId, roomId, sessionId);
}

export async function cancelMatchSession(userId: string, roomId: string, sessionId: string) {
  await closeInactiveCommunityState(roomId);

  const result = await prisma.tb_room_match_session.updateMany({
    where: {
      id: sessionId,
      owner_id: userId,
      room_id: roomId,
      status: { in: [room_match_session_status.WAITING, room_match_session_status.ACTIVE] },
      tb_room: {
        status: 'ACTIVE',
        tb_room_participant: { some: { user_id: userId, active: true } },
      },
    },
    data: {
      completed_at: new Date(),
      status: room_match_session_status.CANCELED,
      updated_at: new Date(),
    },
  });
  if (result.count === 0) throw matchError('Apenas o responsável pode encerrar esta sessão.', 403);
  return getMatchSession(userId, roomId, sessionId);
}
