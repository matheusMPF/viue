import { describe, expect, it } from 'vitest';

import { calculateRoomMatches, type RoomRating } from './room-matches';

function rating(contentId: string, value: number, title = contentId): RoomRating {
  return {
    contentId,
    title,
    type: 'MOVIE',
    posterUrl: null,
    releaseYear: '2026',
    rating: value,
  };
}

describe('calculateRoomMatches', () => {
  it('calcula a média das avaliações elegíveis', () => {
    const matches = calculateRoomMatches([rating('filme', 10), rating('filme', 8)], 2);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ average: '9.0', ratingCount: 2 });
  });

  it('exige avaliações de todos no modo padrão', () => {
    const matches = calculateRoomMatches(
      [
        rating('incompleto', 10),
        rating('completo', 9),
        rating('completo', 8),
        rating('completo', 7),
      ],
      3,
    );

    expect(matches.map((item) => item.id)).toEqual(['completo']);
    expect(matches[0].average).toBe('8.0');
  });

  it('permite um título avaliado por duas pessoas no modo alternativo', () => {
    const matches = calculateRoomMatches(
      [rating('dupla', 9.6), rating('dupla', 8.4), rating('sozinho', 10)],
      2,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ id: 'dupla', average: '9.0' });
  });
});
