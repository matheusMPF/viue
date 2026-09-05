import { describe, expect, it } from 'vitest';

import { findCurrentMatchCandidate, hasUnanimousMatch, isRoundComplete } from './match-consensus';

describe('findCurrentMatchCandidate', () => {
  const candidates = [
    { id: 'filme-1', voteCount: 2 },
    { id: 'filme-2', voteCount: 1 },
    { id: 'filme-3', voteCount: 0 },
  ];

  it('mantém todos no primeiro candidato que ainda aguarda votos', () => {
    expect(findCurrentMatchCandidate(candidates, 2)?.id).toBe('filme-2');
  });

  it('avança somente depois que todos votam no candidato atual', () => {
    expect(
      findCurrentMatchCandidate(
        candidates.map((candidate) =>
          candidate.id === 'filme-2' ? { ...candidate, voteCount: 2 } : candidate,
        ),
        2,
      )?.id,
    ).toBe('filme-3');
  });

  it('encerra a sequência quando todos votaram em todos os candidatos', () => {
    expect(
      findCurrentMatchCandidate(
        candidates.map((candidate) => ({ ...candidate, voteCount: 2 })),
        2,
      ),
    ).toBeNull();
  });
});

describe('hasUnanimousMatch', () => {
  it('encontra match com dois participantes', () => {
    expect(hasUnanimousMatch(['LIKE', 'LIKE'], 2)).toBe(true);
  });

  it('encontra match com três participantes', () => {
    expect(hasUnanimousMatch(['LIKE', 'LIKE', 'LIKE'], 3)).toBe(true);
  });

  it('não encontra match quando alguém passa', () => {
    expect(hasUnanimousMatch(['LIKE', 'PASS', 'LIKE'], 3)).toBe(false);
  });

  it('não encontra match antes de todos votarem', () => {
    expect(hasUnanimousMatch(['LIKE', 'LIKE'], 3)).toBe(false);
  });
});

describe('isRoundComplete', () => {
  it('mantém a sessão ativa até todos votarem em todos os candidatos', () => {
    expect(isRoundComplete(149, 50, 3)).toBe(false);
    expect(isRoundComplete(150, 50, 3)).toBe(true);
  });
});
