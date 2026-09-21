import { describe, expect, it } from 'vitest';

import type { CatalogMovie } from '@/services/tmdb/tmdb.types';

import { interleaveCatalogItems, mergeUniqueCatalogItems } from './discover-catalog';

function catalogItem(id: string, tmdbId: number): CatalogMovie {
  return {
    backdropUrl: null,
    genres: [],
    id,
    originalTitle: null,
    overview: null,
    posterUrl: null,
    rating: null,
    releaseDate: null,
    releaseYear: null,
    title: id,
    tmdbId,
    voteCount: null,
  };
}

describe('discoverCatalog', () => {
  it('remove repeticoes ao anexar uma nova pagina', () => {
    const first = catalogItem('filme-1', 1);
    const repeated = catalogItem('filme-2', 2);
    const next = catalogItem('filme-3', 3);

    expect(mergeUniqueCatalogItems([first, repeated], [repeated, next])).toEqual([
      first,
      repeated,
      next,
    ]);
  });

  it('intercala filmes e series mantendo apenas uma ocorrencia por conteudo', () => {
    const movie = catalogItem('filme-1', 1);
    const repeated = catalogItem('repetido', 2);
    const series = catalogItem('serie-1', 3);

    expect(interleaveCatalogItems([movie, repeated], [series, repeated])).toEqual([
      movie,
      series,
      repeated,
    ]);
  });
});
