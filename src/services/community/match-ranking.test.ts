import { describe, expect, it } from 'vitest';

import {
  rankMatchCandidates,
  type MatchRankingCandidate,
  type MatchRankingInteraction,
} from './match-ranking';

const participants = ['ana', 'bia', 'caio'];

function candidate(id: string, genres = ['Drama']): MatchRankingCandidate {
  return { id, externalRating: 8, externalVotes: 1_000, genres };
}

function interaction(
  userId: string,
  contentId: string,
  overrides: Partial<MatchRankingInteraction> = {},
): MatchRankingInteraction {
  return {
    contentId,
    genres: ['Drama'],
    rating: null,
    status: 'WANT_TO_WATCH',
    userId,
    ...overrides,
  };
}

describe('rankMatchCandidates', () => {
  it('prioriza o título que ninguém assistiu', () => {
    const ranked = rankMatchCandidates({
      candidates: [candidate('novo'), candidate('visto')],
      interactions: participants.map((userId) =>
        interaction(userId, 'visto', { rating: 8, status: 'COMPLETED' }),
      ),
      participantIds: participants,
    });

    expect(ranked.map((item) => item.id)).toEqual(['novo', 'visto']);
    expect(ranked[0].scoreDetails.unwatchedRatio).toBe(1);
  });

  it('trata presença nas listas do grupo como sinal forte', () => {
    const ranked = rankMatchCandidates({
      candidates: [candidate('listas'), candidate('generico')],
      interactions: [interaction('ana', 'listas'), interaction('bia', 'listas')],
      participantIds: participants,
    });

    expect(ranked[0].id).toBe('listas');
    expect(ranked[0].scoreDetails.watchlistRatio).toBeCloseTo(2 / 3);
  });

  it('penaliza baixa afinidade de um participante para buscar consenso', () => {
    const ranked = rankMatchCandidates({
      candidates: [candidate('consenso'), candidate('rejeitado')],
      interactions: [
        interaction('ana', 'consenso', { rating: 8, status: 'COMPLETED' }),
        interaction('bia', 'consenso', { rating: 8, status: 'COMPLETED' }),
        interaction('caio', 'consenso', { rating: 8, status: 'COMPLETED' }),
        interaction('ana', 'rejeitado', { rating: 10, status: 'COMPLETED' }),
        interaction('bia', 'rejeitado', { rating: 10, status: 'COMPLETED' }),
        interaction('caio', 'rejeitado', { rating: 1, status: 'COMPLETED' }),
      ],
      participantIds: participants,
    });

    expect(ranked[0].id).toBe('consenso');
    expect(ranked[0].scoreDetails.preferenceFloor).toBe(0.8);
  });

  it('é determinístico em empates', () => {
    const ranked = rankMatchCandidates({
      candidates: [candidate('b'), candidate('a')],
      interactions: [],
      participantIds: participants,
    });

    expect(ranked.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('mantém a exploração estável dentro da mesma sessão', () => {
    const input = {
      candidates: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => candidate(id)),
      interactions: [],
      participantIds: participants,
      rankingContext: 'sessao-1',
    };

    const first = rankMatchCandidates(input).map((item) => item.id);
    const second = rankMatchCandidates(input).map((item) => item.id);

    expect(second).toEqual(first);
  });

  it('varia a descoberta entre sessões quando a relevância é equivalente', () => {
    const input = {
      candidates: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => candidate(id)),
      interactions: [],
      participantIds: participants,
    };

    const first = rankMatchCandidates({ ...input, rankingContext: 'sessao-1' }).map(
      (item) => item.id,
    );
    const second = rankMatchCandidates({ ...input, rankingContext: 'sessao-2' }).map(
      (item) => item.id,
    );

    expect(second).not.toEqual(first);
  });

  it('varia o primeiro candidato entre sessões sem perder estabilidade na mesma sessão', () => {
    const input = {
      candidates: ['a', 'b', 'c', 'd', 'e'].map((id) => candidate(id)),
      interactions: [],
      participantIds: participants,
    };
    const firstCandidates = Array.from(
      { length: 12 },
      (_, index) => rankMatchCandidates({ ...input, rankingContext: `sessao-${index}` }).at(0)?.id,
    );
    const repeatedSession = rankMatchCandidates({
      ...input,
      rankingContext: 'sessao-0',
    }).at(0)?.id;

    expect(new Set(firstCandidates).size).toBeGreaterThan(1);
    expect(repeatedSession).toBe(firstCandidates[0]);
  });

  it('intercala gêneros sem superar um sinal forte da lista do grupo', () => {
    const ranked = rankMatchCandidates({
      candidates: [
        candidate('preferido', ['Drama']),
        candidate('drama-2', ['Drama']),
        candidate('comedia', ['Comédia']),
      ],
      interactions: participants.map((userId) => interaction(userId, 'preferido')),
      participantIds: participants,
      rankingContext: 'sessao-diversa',
    });

    expect(ranked[0].id).toBe('preferido');
    expect(ranked[1].genres).toContain('Comédia');
  });
});
