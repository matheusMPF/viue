'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';

import { MoviePosterCard } from '@/components/catalog/movie-poster-card';
import { Button } from '@/components/ui';
import { authFetch } from '@/lib/auth/auth-fetch';
import type { ProfileSlug } from '@/lib/profile/profiles';
import type { CatalogMovie } from '@/services/tmdb/tmdb.types';

type Genre = { id: number; name: string };
type CatalogKind = 'movies' | 'series';

type CatalogPayload = {
  items: CatalogMovie[];
  page: number;
  totalPages: number;
  totalResults: number;
};

/**
 * TMDB usa taxonomias de gênero diferentes para filmes e séries (ids e nomes
 * não coincidem, ex.: "Ação" nos filmes vira "Ação e aventura" nas séries).
 * Este mapa liga o id de gênero de filme (mostrado na UI) ao id equivalente
 * de série, usando os ids numéricos estáveis do TMDB (independentes de idioma).
 * Gêneros sem equivalente (Terror, Romance, Thriller, História, Música, Cinema TV)
 * ficam de fora de propósito: nesse caso a busca de séries não é filtrada por
 * gênero, ela simplesmente não retorna séries para esse filtro.
 */
const MOVIE_TO_SERIES_GENRE_ID = new Map<number, number>([
  [28, 10759], // Ação -> Ação e aventura
  [12, 10759], // Aventura -> Ação e aventura
  [16, 16], // Animação
  [35, 35], // Comédia
  [80, 80], // Crime
  [99, 99], // Documentário
  [18, 18], // Drama
  [10751, 10751], // Família
  [14, 10765], // Fantasia -> Ficção científica e fantasia
  [878, 10765], // Ficção científica -> Ficção científica e fantasia
  [9648, 9648], // Mistério
  [10752, 10768], // Guerra -> Guerra e política
  [37, 37], // Faroeste
]);

function createCatalogSection(payload: {
  items: CatalogMovie[];
  totalPages: number;
  totalResults: number;
}): CatalogPayload {
  return {
    items: payload.items,
    page: 1,
    totalPages: payload.totalPages,
    totalResults: payload.totalResults,
  };
}

function interleave(a: readonly CatalogMovie[], b: readonly CatalogMovie[]): CatalogMovie[] {
  const merged: CatalogMovie[] = [];
  const max = Math.max(a.length, b.length);
  for (let index = 0; index < max; index += 1) {
    if (a[index]) merged.push(a[index]);
    if (b[index]) merged.push(b[index]);
  }
  return merged;
}

export function DiscoverScreen({
  genres,
  initialMovies,
  initialMoviesTotalPages,
  initialMoviesTotalResults,
  initialSeries,
  initialSeriesTotalPages,
  initialSeriesTotalResults,
  profile,
}: {
  genres: Genre[];
  initialMovies: CatalogMovie[];
  initialMoviesTotalPages: number;
  initialMoviesTotalResults: number;
  initialSeries: CatalogMovie[];
  initialSeriesTotalPages: number;
  initialSeriesTotalResults: number;
  profile: ProfileSlug;
}) {
  const genresRef = useRef<HTMLDivElement>(null);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [movies, setMovies] = useState<CatalogPayload>(() =>
    createCatalogSection({
      items: initialMovies,
      totalPages: initialMoviesTotalPages,
      totalResults: initialMoviesTotalResults,
    }),
  );
  const [series, setSeries] = useState<CatalogPayload>(() =>
    createCatalogSection({
      items: initialSeries,
      totalPages: initialSeriesTotalPages,
      totalResults: initialSeriesTotalResults,
    }),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seriesGenre = selectedGenre ? (MOVIE_TO_SERIES_GENRE_ID.get(selectedGenre) ?? null) : null;
  const seriesGenreUnavailable = selectedGenre !== null && seriesGenre === null;

  async function fetchCatalog(
    kind: CatalogKind,
    {
      genreId,
      pageNumber,
      queryValue,
    }: { genreId: number | null; pageNumber: number; queryValue: string },
  ): Promise<CatalogPayload> {
    const params = new URLSearchParams({
      kind: queryValue ? 'search' : 'discover',
      limit: '30',
      page: String(pageNumber),
    });
    if (queryValue) params.set('query', queryValue);
    if (genreId && !queryValue) params.set('genre', String(genreId));

    const path = kind === 'movies' ? '/api/catalog/movies' : '/api/catalog/series';
    const response = await authFetch(`${path}?${params.toString()}`);
    const payload = (await response.json()) as
      { success: true; data: CatalogPayload } | { success: false; message?: string };

    if (!response.ok || !payload.success) {
      throw new Error(
        payload.success
          ? `Não foi possível carregar ${kind === 'movies' ? 'os filmes' : 'as séries'}.`
          : payload.message,
      );
    }
    return payload.data;
  }

  async function replaceCatalog(genreId: number | null, queryValue: string) {
    setError(null);
    setIsLoading(true);
    try {
      const nextSeriesGenre = genreId ? (MOVIE_TO_SERIES_GENRE_ID.get(genreId) ?? null) : null;
      const skipSeries = genreId !== null && nextSeriesGenre === null && !queryValue;
      const [movieData, seriesData] = await Promise.all([
        fetchCatalog('movies', { genreId, pageNumber: 1, queryValue }),
        skipSeries
          ? Promise.resolve({ items: [], page: 1, totalPages: 0, totalResults: 0 })
          : fetchCatalog('series', { genreId: nextSeriesGenre, pageNumber: 1, queryValue }),
      ]);
      setMovies(movieData);
      setSeries(seriesData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleGenreChange(genreId: number | null) {
    setSelectedGenre(genreId);
    setQuery('');
    setActiveQuery('');
    void replaceCatalog(genreId, '');
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    setActiveQuery(nextQuery);
    if (nextQuery) setSelectedGenre(null);
    void replaceCatalog(nextQuery ? null : selectedGenre, nextQuery);
  }

  async function handleLoadMore() {
    setError(null);
    setIsLoadingMore(true);
    try {
      const tasks: Promise<void>[] = [];
      if (movies.page < movies.totalPages) {
        tasks.push(
          fetchCatalog('movies', {
            genreId: selectedGenre,
            pageNumber: movies.page + 1,
            queryValue: activeQuery,
          }).then((data) =>
            setMovies((current) => ({
              ...current,
              items: [...current.items, ...data.items],
              page: data.page,
              totalPages: data.totalPages,
            })),
          ),
        );
      }
      if (series.page < series.totalPages) {
        tasks.push(
          fetchCatalog('series', {
            genreId: seriesGenre,
            pageNumber: series.page + 1,
            queryValue: activeQuery,
          }).then((data) =>
            setSeries((current) => ({
              ...current,
              items: [...current.items, ...data.items],
              page: data.page,
              totalPages: data.totalPages,
            })),
          ),
        );
      }
      await Promise.all(tasks);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Tente novamente.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  const selectedGenreName = genres.find((genre) => genre.id === selectedGenre)?.name;
  const items = useMemo(() => interleave(movies.items, series.items), [movies.items, series.items]);
  const seriesIds = useMemo(() => new Set(series.items.map((item) => item.id)), [series.items]);
  const totalResults = movies.totalResults + series.totalResults;
  const hasMore = movies.page < movies.totalPages || series.page < series.totalPages;

  function scrollGenres(direction: 'left' | 'right') {
    genresRef.current?.scrollBy({
      behavior: 'smooth',
      left: direction === 'left' ? -420 : 420,
    });
  }

  return (
    <div className="home-workspace">
      <main className="discover-page">
        <header className="catalog-header">
          <Link className="catalog-back" href={`/${profile}`}>
            <ArrowLeft aria-hidden="true" size={18} /> Voltar
          </Link>
          <Image alt="" height={42} priority src="/brand/viue-symbol.png" width={42} />
        </header>

        <section className="discover-heading">
          <div>
            <span className="home-kicker">Catálogo TMDb</span>
            <h1>Descobrir filmes e séries</h1>
            <p>
              Encontre um novo filme ou série, ou explore o catálogo pelo gênero que combina com
              você.
            </p>
          </div>
          <form className="discover-search" onSubmit={handleSearch} role="search">
            <Search aria-hidden="true" size={19} />
            <label className="sr-only" htmlFor="discover-search">
              Buscar filmes e séries
            </label>
            <input
              autoComplete="off"
              id="discover-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar filmes e séries"
              type="search"
              value={query}
            />
            <Button disabled={isLoading} size="sm" type="submit">
              Buscar
            </Button>
          </form>
        </section>

        <section className="discover-filters" aria-labelledby="genre-filter-title">
          <div className="discover-filter-label">
            <SlidersHorizontal aria-hidden="true" size={17} />
            <h2 id="genre-filter-title">Gêneros</h2>
          </div>
          <div className="discover-genre-carousel">
            <button
              aria-label="Ver gêneros anteriores"
              className="discover-genre-arrow is-left"
              onClick={() => scrollGenres('left')}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={19} />
            </button>
            <div className="discover-genre-list" ref={genresRef} role="list">
              <button
                aria-pressed={selectedGenre === null && !activeQuery}
                className={selectedGenre === null && !activeQuery ? 'is-active' : ''}
                disabled={isLoading}
                onClick={() => handleGenreChange(null)}
                type="button"
              >
                Todos
              </button>
              {genres.map((genre) => (
                <button
                  aria-pressed={selectedGenre === genre.id && !activeQuery}
                  className={selectedGenre === genre.id && !activeQuery ? 'is-active' : ''}
                  disabled={isLoading}
                  key={genre.id}
                  onClick={() => handleGenreChange(genre.id)}
                  type="button"
                >
                  {genre.name}
                </button>
              ))}
            </div>
            <button
              aria-label="Ver próximos gêneros"
              className="discover-genre-arrow is-right"
              onClick={() => scrollGenres('right')}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={19} />
            </button>
          </div>
        </section>

        <section className="discover-results" aria-live="polite">
          <div className="discover-results-heading">
            <div>
              <h2>
                {activeQuery
                  ? `Resultados para “${activeQuery}”`
                  : selectedGenreName || 'Todos os títulos'}
              </h2>
              <p>
                {totalResults.toLocaleString('pt-BR')} títulos encontrados
                {seriesGenreUnavailable ? ' (sem séries nesse gênero)' : ''}
              </p>
            </div>
            {isLoading ? (
              <span>
                <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> Carregando
              </span>
            ) : null}
          </div>

          {items.length > 0 ? (
            <div
              className={`catalog-movie-grid discover-grid ${isLoading ? 'is-loading' : ''}`}
              role="list"
            >
              {items.map((item) => (
                <MoviePosterCard
                  fallbackLabel={seriesIds.has(item.id) ? 'Série' : 'Filme'}
                  friendsWatched={0}
                  item={item}
                  key={`${item.id}-${item.tmdbId}`}
                  profile={profile}
                  saved={false}
                />
              ))}
            </div>
          ) : !isLoading ? (
            <p className="home-empty">Nenhum título encontrado.</p>
          ) : null}

          {error ? (
            <p className="home-empty is-error" role="alert">
              {error}
            </p>
          ) : null}
          {hasMore && items.length > 0 ? (
            <div className="catalog-load-more">
              <Button isLoading={isLoadingMore} onClick={handleLoadMore} size="lg" variant="ghost">
                Ver mais títulos
              </Button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
