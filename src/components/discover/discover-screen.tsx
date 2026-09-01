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
import { useRef, useState, type FormEvent } from 'react';

import { MoviePosterCard } from '@/components/catalog/movie-poster-card';
import { AppNavigation } from '@/components/layout/app-navigation';
import { Button } from '@/components/ui';
import { authFetch } from '@/lib/auth/auth-fetch';
import type { CatalogMovie } from '@/services/tmdb/tmdb.types';

type Genre = { id: number; name: string };

type CatalogPayload = {
  items: CatalogMovie[];
  page: number;
  totalPages: number;
  totalResults: number;
};

export function DiscoverScreen({
  genres,
  initialItems,
  initialTotalPages,
  initialTotalResults,
}: {
  genres: Genre[];
  initialItems: CatalogMovie[];
  initialTotalPages: number;
  initialTotalResults: number;
}) {
  const genresRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(initialItems);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalResults, setTotalResults] = useState(initialTotalResults);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMovies({
    genreId,
    pageNumber,
    queryValue,
  }: {
    genreId: number | null;
    pageNumber: number;
    queryValue: string;
  }) {
    const params = new URLSearchParams({
      kind: queryValue ? 'search' : 'discover',
      limit: '30',
      page: String(pageNumber),
    });
    if (queryValue) params.set('query', queryValue);
    if (genreId && !queryValue) params.set('genre', String(genreId));

    const response = await authFetch(`/api/catalog/movies?${params.toString()}`);
    const payload = (await response.json()) as
      { success: true; data: CatalogPayload } | { success: false; message?: string };

    if (!response.ok || !payload.success) {
      throw new Error(payload.success ? 'Não foi possível carregar os filmes.' : payload.message);
    }
    return payload.data;
  }

  async function replaceCatalog(genreId: number | null, queryValue: string) {
    setError(null);
    setIsLoading(true);
    try {
      const data = await fetchMovies({ genreId, pageNumber: 1, queryValue });
      setItems(data.items);
      setPage(1);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
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
    const nextPage = page + 1;
    setError(null);
    setIsLoadingMore(true);
    try {
      const data = await fetchMovies({
        genreId: selectedGenre,
        pageNumber: nextPage,
        queryValue: activeQuery,
      });
      setItems((current) => [...current, ...data.items]);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Tente novamente.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  const selectedGenreName = genres.find((genre) => genre.id === selectedGenre)?.name;

  function scrollGenres(direction: 'left' | 'right') {
    genresRef.current?.scrollBy({
      behavior: 'smooth',
      left: direction === 'left' ? -420 : 420,
    });
  }

  return (
    <div className="home-app">
      <AppNavigation />
      <div className="home-workspace">
        <main className="discover-page">
          <header className="catalog-header">
            <Link className="catalog-back" href="/">
              <ArrowLeft aria-hidden="true" size={18} /> Voltar
            </Link>
            <Image alt="" height={42} priority src="/brand/viue-symbol.png" width={42} />
          </header>

          <section className="discover-heading">
            <div>
              <span className="home-kicker">Catálogo TMDb</span>
              <h1>Descobrir filmes</h1>
              <p>Encontre um novo título ou explore o catálogo pelo gênero que combina com você.</p>
            </div>
            <form className="discover-search" onSubmit={handleSearch} role="search">
              <Search aria-hidden="true" size={19} />
              <label className="sr-only" htmlFor="discover-search">
                Buscar um filme
              </label>
              <input
                autoComplete="off"
                id="discover-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar um filme"
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
                    : selectedGenreName || 'Todos os filmes'}
                </h2>
                <p>{totalResults.toLocaleString('pt-BR')} títulos encontrados</p>
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
                    friendsWatched={0}
                    item={item}
                    key={`${item.id}-${item.tmdbId}`}
                    saved={false}
                  />
                ))}
              </div>
            ) : !isLoading ? (
              <p className="home-empty">Nenhum filme encontrado.</p>
            ) : null}

            {error ? (
              <p className="home-empty is-error" role="alert">
                {error}
              </p>
            ) : null}
            {page < totalPages && items.length > 0 ? (
              <div className="catalog-load-more">
                <Button
                  isLoading={isLoadingMore}
                  onClick={handleLoadMore}
                  size="lg"
                  variant="ghost"
                >
                  Ver mais filmes
                </Button>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
