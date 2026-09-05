import type { MatchFilters } from '@/types/community/match';

type LibraryStatus = 'WANT_TO_WATCH' | 'WATCHING' | 'COMPLETED' | 'DROPPED' | 'ON_HOLD';

export type MatchRankingCandidate = {
  id: string;
  externalRating: number | null;
  externalVotes: number | null;
  genres: string[];
};

export type MatchRankingInteraction = {
  contentId: string;
  genres: string[];
  rating: number | null;
  status: LibraryStatus;
  userId: string;
};

export type RankedMatchCandidate = MatchRankingCandidate & {
  score: number;
  scoreDetails: {
    genreNovelty: number;
    genreAffinity: number;
    globalQuality: number;
    preferenceFloor: number;
    preferenceMean: number;
    relevanceScore: number;
    sessionVariety: number;
    unwatchedRatio: number;
    watchlistRatio: number;
  };
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
}

function stableUnitInterval(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4_294_967_295;
}

function rerankForDiscovery(
  ranked: readonly RankedMatchCandidate[],
  participantIds: readonly string[],
  interactions: readonly MatchRankingInteraction[],
  rankingContext: string,
) {
  const historyByParticipant = new Map(participantIds.map((id) => [id, 0]));
  for (const interaction of interactions) {
    if (historyByParticipant.has(interaction.userId)) {
      historyByParticipant.set(
        interaction.userId,
        (historyByParticipant.get(interaction.userId) ?? 0) + 1,
      );
    }
  }
  const historyConfidence =
    [...historyByParticipant.values()].reduce((sum, count) => sum + Math.min(count / 10, 1), 0) /
    participantIds.length;
  const explorationWeight = 0.03 + (1 - historyConfidence) * 0.05;
  const context = `${[...participantIds].sort().join(':')}:${rankingContext}`;
  const remaining = [...ranked];
  const selected: RankedMatchCandidate[] = [];
  const genreExposure = new Map<string, number>();

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const genreNovelty =
        candidate.genres.length > 0
          ? candidate.genres.reduce(
              (sum, genre) => sum + 1 / (1 + (genreExposure.get(genre) ?? 0)),
              0,
            ) / candidate.genres.length
          : 0.5;
      const sessionVariety = stableUnitInterval(`${context}:${candidate.id}`);
      const discoveryScore = genreNovelty * 0.75 + sessionVariety * 0.25;
      const adjustedScore = candidate.score + explorationWeight * discoveryScore;

      if (
        adjustedScore > bestScore ||
        (adjustedScore === bestScore && candidate.id.localeCompare(remaining[bestIndex].id) < 0)
      ) {
        bestIndex = index;
        bestScore = adjustedScore;
      }
    }

    const [candidate] = remaining.splice(bestIndex, 1);
    const genreNovelty =
      candidate.genres.length > 0
        ? candidate.genres.reduce(
            (sum, genre) => sum + 1 / (1 + (genreExposure.get(genre) ?? 0)),
            0,
          ) / candidate.genres.length
        : 0.5;
    const sessionVariety = stableUnitInterval(`${context}:${candidate.id}`);
    selected.push({
      ...candidate,
      score: round(bestScore),
      scoreDetails: {
        ...candidate.scoreDetails,
        genreNovelty: round(genreNovelty),
        sessionVariety: round(sessionVariety),
      },
    });
    for (const genre of candidate.genres) {
      genreExposure.set(genre, (genreExposure.get(genre) ?? 0) + 1);
    }
  }

  return selected;
}

function round(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function interactionWeight(interaction: MatchRankingInteraction) {
  let weight = 0;
  if (interaction.status === 'COMPLETED') weight += 3;
  if (interaction.status === 'WATCHING') weight += 1;
  if (interaction.status === 'DROPPED') weight -= 2;
  if (interaction.rating !== null && interaction.rating >= 8) weight += 4;
  else if (interaction.rating !== null && interaction.rating >= 6) weight += 1;
  return weight;
}

function buildGenreAffinities(
  participantIds: readonly string[],
  interactions: readonly MatchRankingInteraction[],
) {
  const raw = new Map<string, Map<string, number>>(
    participantIds.map((userId) => [userId, new Map<string, number>()]),
  );

  for (const interaction of interactions) {
    const genres = raw.get(interaction.userId);
    if (!genres) continue;
    const weight = interactionWeight(interaction);
    for (const genre of interaction.genres) {
      genres.set(genre, (genres.get(genre) ?? 0) + weight);
    }
  }

  return new Map(
    [...raw].map(([userId, genres]) => {
      const maximum = Math.max(0, ...genres.values());
      return [
        userId,
        new Map(
          [...genres].map(([genre, value]) => [genre, maximum > 0 ? clamp(value / maximum) : 0.5]),
        ),
      ];
    }),
  );
}

function matchesFilters(candidate: MatchRankingCandidate, filters: MatchFilters) {
  // Ano e duração são aplicados pela API externa. O gênero também é validado
  // pelo provedor; aqui mantemos o filtro como parte do contrato de ranking.
  return !filters.genreId || candidate.genres.length > 0;
}

export function rankMatchCandidates({
  candidates,
  filters = {},
  interactions,
  participantIds,
  rankingContext,
}: {
  candidates: readonly MatchRankingCandidate[];
  filters?: MatchFilters;
  interactions: readonly MatchRankingInteraction[];
  participantIds: readonly string[];
  rankingContext?: string;
}): RankedMatchCandidate[] {
  if (participantIds.length === 0) return [];

  const affinities = buildGenreAffinities(participantIds, interactions);
  const candidateInteractions = new Map<string, Map<string, MatchRankingInteraction>>();
  for (const interaction of interactions) {
    if (!candidateInteractions.has(interaction.contentId)) {
      candidateInteractions.set(interaction.contentId, new Map());
    }
    candidateInteractions.get(interaction.contentId)!.set(interaction.userId, interaction);
  }

  const ranked = candidates
    .filter((candidate) => matchesFilters(candidate, filters))
    .map((candidate) => {
      const byUser = candidateInteractions.get(candidate.id);
      let unwatched = 0;
      let watchlisted = 0;
      let genreAffinityTotal = 0;
      const preferences: number[] = [];

      for (const userId of participantIds) {
        const interaction = byUser?.get(userId);
        const userAffinities = affinities.get(userId);
        const genreAffinity =
          candidate.genres.length > 0
            ? candidate.genres.reduce(
                (sum, genre) => sum + (userAffinities?.get(genre) ?? 0.5),
                0,
              ) / candidate.genres.length
            : 0.5;
        genreAffinityTotal += genreAffinity;

        if (!interaction || interaction.status === 'WANT_TO_WATCH') unwatched += 1;
        if (interaction?.status === 'WANT_TO_WATCH') watchlisted += 1;

        if (interaction?.rating !== null && interaction?.rating !== undefined) {
          preferences.push(clamp(interaction.rating / 10));
        } else if (interaction?.status === 'WANT_TO_WATCH') {
          preferences.push(0.95);
        } else {
          preferences.push(genreAffinity);
        }
      }

      const participantCount = participantIds.length;
      const unwatchedRatio = unwatched / participantCount;
      const watchlistRatio = watchlisted / participantCount;
      const genreAffinity = genreAffinityTotal / participantCount;
      const preferenceMean = preferences.reduce((sum, value) => sum + value, 0) / participantCount;
      const preferenceFloor = Math.min(...preferences);
      const voteConfidence = Math.min(
        1,
        Math.log10(Math.max(candidate.externalVotes ?? 0, 0) + 1) / 4,
      );
      const globalQuality = clamp(((candidate.externalRating ?? 5) / 10) * voteConfidence);
      const score =
        unwatchedRatio * 0.35 +
        watchlistRatio * 0.25 +
        preferenceMean * 0.14 +
        preferenceFloor * 0.1 +
        genreAffinity * 0.08 +
        globalQuality * 0.08;

      return {
        ...candidate,
        score: round(score),
        scoreDetails: {
          genreNovelty: 1,
          genreAffinity: round(genreAffinity),
          globalQuality: round(globalQuality),
          preferenceFloor: round(preferenceFloor),
          preferenceMean: round(preferenceMean),
          relevanceScore: round(score),
          sessionVariety: 0,
          unwatchedRatio: round(unwatchedRatio),
          watchlistRatio: round(watchlistRatio),
        },
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        (right.externalVotes ?? 0) - (left.externalVotes ?? 0) ||
        left.id.localeCompare(right.id),
    );

  return rankingContext
    ? rerankForDiscovery(ranked, participantIds, interactions, rankingContext)
    : ranked;
}
