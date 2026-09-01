'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

import { MoviePosterCard } from '@/components/catalog/movie-poster-card';
import { AppNavigation } from '@/components/layout/app-navigation';
import { Button } from '@/components/ui';
import { authFetch } from '@/lib/auth/auth-fetch';
import type { CatalogSeries } from '@/services/tmdb/tmdb.types';

type SeriesListingScreenProps = {
  initialItems: CatalogSeries[];
  title: string;
  totalPages: number;
  totalResults: number;
};

function getCatalogError(error: unknown) {
  return error instanceof Error ? error.message : 'Nao foi possivel carregar mais series.';
}

export function SeriesListingScreen({
  initialItems,
  title,
  totalPages,
  totalResults,
}: SeriesListingScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [savedTitles, setSavedTitles] = useState<string[]>([]);
  const cappedTotalPages = Math.min(totalPages || 1, 500);
  const canLoadMore = page < cappedTotalPages;

  function toggleSaved(titleValue: string) {
    setSavedTitles((current) =>
      current.includes(titleValue)
        ? current.filter((item) => item !== titleValue)
        : [...current, titleValue],
    );
  }

  async function handleLoadMore() {
    const nextPage = page + 1;
    setError(null);
    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams({
        kind: 'top-rated',
        limit: '30',
        page: String(nextPage),
      });

      const response = await authFetch(`/api/catalog/series?${params.toString()}`);
      const payload = (await response.json()) as
        | { success: true; data: { items: CatalogSeries[]; page: number } }
        | { success: false; message?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? 'Falha ao carregar catalogo.' : payload.message);
      }

      setItems((current) => [...current, ...payload.data.items]);
      setPage(payload.data.page);
    } catch (requestError) {
      setError(getCatalogError(requestError));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="home-app">
      <AppNavigation />
      <div className="home-workspace">
        <main className="catalog-page">
          <header className="catalog-header">
            <Link className="catalog-back" href="/">
              <ArrowLeft aria-hidden="true" size={18} /> Voltar
            </Link>
            <Image alt="" height={42} priority src="/brand/viue-symbol.png" width={42} />
          </header>

          <section className="catalog-hero" aria-labelledby="catalog-title">
            <span className="home-kicker">Catalogo TMDb</span>
            <h1 id="catalog-title">{title}</h1>
            <p>
              {totalResults.toLocaleString('pt-BR')} series encontradas pela curadoria de notas.
            </p>
          </section>

          <section className="catalog-grid-section" aria-label={title}>
            <div className="catalog-movie-grid" role="list">
              {items.map((item) => (
                <MoviePosterCard
                  friendsWatched={0}
                  item={item}
                  key={`${item.id}-${item.tmdbId}`}
                  onToggleSaved={toggleSaved}
                  saved={savedTitles.includes(item.title)}
                />
              ))}
            </div>

            {error ? (
              <p className="home-empty is-error" role="alert">
                {error}
              </p>
            ) : null}

            {canLoadMore ? (
              <div className="catalog-load-more">
                <Button
                  disabled={isLoadingMore}
                  isLoading={isLoadingMore}
                  onClick={handleLoadMore}
                  size="lg"
                  variant="ghost"
                >
                  Ver mais
                </Button>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
