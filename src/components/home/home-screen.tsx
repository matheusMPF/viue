'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  LoaderCircle,
  Search,
  Star,
  UsersRound,
} from 'lucide-react';
import type { FocusEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { UserMenu } from '@/components/account/user-menu';
import { MoviePosterCard } from '@/components/catalog/movie-poster-card';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Badge, Button } from '@/components/ui';
import { authFetch } from '@/lib/auth/auth-fetch';
import type { ProfileSlug } from '@/lib/profile/profiles';
import type { HomeSocialContext } from '@/services/home/home.repository';
import type { CatalogMovie, CatalogSeries } from '@/services/tmdb/tmdb.types';
import type { PublicUser } from '@/types/auth';

type MovieCatalogKind = 'top-rated' | 'top-rated-2026' | 'search';
type SeriesCatalogKind = 'top-rated' | 'search';

type MovieCatalogState = {
  error: string | null;
  isLoading: boolean;
  items: CatalogMovie[] | CatalogSeries[];
};

type CatalogSuggestion = CatalogMovie | CatalogSeries;

type CatalogItem = {
  title: string;
  meta: string;
  score: string;
  art: 'violet' | 'cyan' | 'coral' | 'gold';
};

const friendHighlights: readonly CatalogItem[] = [
  { title: 'Horizonte 32', meta: 'Serie - Ficcao', score: '9,1', art: 'cyan' },
  {
    title: 'Depois do silencio',
    meta: 'Filme - Drama',
    score: '8,7',
    art: 'violet',
  },
  {
    title: 'Arquivo Aurora',
    meta: 'Serie - Misterio',
    score: '8,9',
    art: 'gold',
  },
  {
    title: 'O ultimo verao',
    meta: 'Filme - Romance',
    score: '8,5',
    art: 'coral',
  },
];

function createCatalogState(items: CatalogMovie[] | CatalogSeries[]): MovieCatalogState {
  return {
    error: null,
    isLoading: false,
    items,
  };
}

function getCatalogError(error: unknown) {
  return error instanceof Error ? error.message : 'Nao foi possivel buscar o catalogo.';
}

function getMovieSuggestionMeta(item: CatalogSuggestion) {
  return [item.releaseYear, item.genres[0], item.rating ? `Nota ${item.rating}` : null]
    .filter(Boolean)
    .join(' - ');
}

function TitleCard({
  friendsWatched,
  item,
  saved,
  onToggleSaved,
}: {
  friendsWatched: number;
  item: CatalogItem;
  saved: boolean;
  onToggleSaved: (title: string) => void;
}) {
  return (
    <article className="title-card">
      <div className={`title-cover is-${item.art}`}>
        <span>{item.title}</span>
        <button
          aria-label={`${saved ? 'Remover' : 'Salvar'} ${item.title}`}
          aria-pressed={saved}
          onClick={() => onToggleSaved(item.title)}
          title={saved ? 'Remover da lista' : 'Salvar na lista'}
          type="button"
        >
          <Bookmark aria-hidden="true" fill={saved ? 'currentColor' : 'none'} size={17} />
        </button>
      </div>
      <div className="title-card-copy">
        <h3>{item.title}</h3>
        <p>{item.meta}</p>
        <div>
          <span className="title-score">
            <Star aria-hidden="true" fill="currentColor" size={14} /> {item.score}
          </span>
          {friendsWatched > 0 ? (
            <span>
              <UsersRound aria-hidden="true" size={14} /> {friendsWatched}{' '}
              {friendsWatched === 1 ? 'amigo assistiu' : 'amigos assistiram'}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CatalogSection({
  eyebrow,
  id,
  items,
  savedTitles,
  title,
  watchedByTitle,
  onToggleSaved,
}: {
  eyebrow: string;
  id: string;
  items: readonly CatalogItem[];
  savedTitles: readonly string[];
  title: string;
  watchedByTitle: Record<string, number>;
  onToggleSaved: (title: string) => void;
}) {
  return (
    <section className="home-section" id={id} aria-labelledby={`${id}-title`}>
      <div className="home-section-heading">
        <div>
          <span className="home-kicker">{eyebrow}</span>
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        <a href={`#${id}`}>
          Ver todos <ChevronRight aria-hidden="true" size={17} />
        </a>
      </div>
      <div className="title-grid">
        {items.map((item) => (
          <TitleCard
            friendsWatched={watchedByTitle[item.title] ?? 0}
            item={item}
            key={`${id}-${item.title}`}
            onToggleSaved={onToggleSaved}
            saved={savedTitles.includes(item.title)}
          />
        ))}
      </div>
    </section>
  );
}

function CatalogCarouselSection({
  error,
  href,
  id,
  isLoading,
  items,
  profile,
  savedTitles,
  title,
  watchedByTitle,
  onToggleSaved,
}: {
  error: string | null;
  href: string;
  id: string;
  isLoading: boolean;
  items: readonly (CatalogMovie | CatalogSeries)[];
  profile: ProfileSlug;
  savedTitles: readonly string[];
  title: string;
  watchedByTitle: Record<string, number>;
  onToggleSaved: (title: string) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  function scrollMovies(direction: 'left' | 'right') {
    rowRef.current?.scrollBy({
      behavior: 'smooth',
      left: direction === 'left' ? -720 : 720,
    });
  }

  return (
    <section className="home-section" id={id} aria-labelledby={`${id}-title`}>
      <div className="home-section-heading">
        <div>
          <span className="home-kicker">Catalogo TMDb</span>
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        {isLoading ? (
          <span className="home-loading">
            <LoaderCircle aria-hidden="true" size={16} /> Buscando
          </span>
        ) : (
          <Link className="home-section-link" href={href}>
            Ver todos <ChevronRight aria-hidden="true" size={17} />
          </Link>
        )}
      </div>

      {items.length > 0 ? (
        <div className="title-carousel">
          <button
            aria-label={`Voltar ${title}`}
            className="title-carousel-arrow is-left"
            onClick={() => scrollMovies('left')}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={22} />
          </button>
          <div className="title-row" ref={rowRef} role="list">
            {items.map((item) => (
              <MoviePosterCard
                friendsWatched={watchedByTitle[item.title] ?? 0}
                item={item}
                key={item.id}
                onToggleSaved={onToggleSaved}
                profile={profile}
                saved={savedTitles.includes(item.title)}
              />
            ))}
          </div>
          <button
            aria-label={`Avancar ${title}`}
            className="title-carousel-arrow is-right"
            onClick={() => scrollMovies('right')}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={22} />
          </button>
        </div>
      ) : (
        <p className="home-empty" role="status">
          Nenhum titulo encontrado.
        </p>
      )}

      {error ? (
        <p className="home-empty is-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function HomeScreen({
  initialMovies,
  initialMovies2026,
  initialSeries,
  profile,
  user,
  socialContext,
}: {
  initialMovies: CatalogMovie[];
  initialMovies2026: CatalogMovie[];
  initialSeries: CatalogSeries[];
  profile: ProfileSlug;
  user: PublicUser;
  socialContext: HomeSocialContext;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [movieCatalog, setMovieCatalog] = useState<MovieCatalogState>(() =>
    createCatalogState(initialMovies),
  );
  const [movieCatalog2026] = useState<MovieCatalogState>(() =>
    createCatalogState(initialMovies2026),
  );
  const [seriesCatalog] = useState<MovieCatalogState>(() => createCatalogState(initialSeries));
  const [searchSeriesCatalog, setSearchSeriesCatalog] = useState<MovieCatalogState>(() =>
    createCatalogState([]),
  );
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [savedTitles, setSavedTitles] = useState<string[]>([]);
  const normalizedQuery = useMemo(() => query.trim().toLocaleLowerCase('pt-BR'), [query]);
  const activeMovieKind: MovieCatalogKind = normalizedQuery ? 'search' : 'top-rated';
  const filterItems = (items: readonly CatalogItem[]) =>
    normalizedQuery
      ? items.filter((item) => item.title.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
      : items;
  const filteredFriendHighlights = filterItems(friendHighlights);
  const socialHighlights = filteredFriendHighlights.filter(
    (item) => (socialContext.watchedByTitle[item.title] ?? 0) > 0,
  );
  const searchSuggestions = useMemo(() => {
    if (!normalizedQuery) return [];

    return [...movieCatalog.items, ...searchSeriesCatalog.items]
      .filter((item) => item.title.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
      .slice(0, 5);
  }, [movieCatalog.items, normalizedQuery, searchSeriesCatalog.items]);
  const seriesSuggestionIds = useMemo(
    () => new Set(searchSeriesCatalog.items.map((item) => item.id)),
    [searchSeriesCatalog.items],
  );
  const searchCatalogItems = normalizedQuery
    ? [...movieCatalog.items, ...searchSeriesCatalog.items]
    : movieCatalog.items;
  const isSearchListOpen = isSearchFocused && Boolean(normalizedQuery);
  const hasSearchResults =
    movieCatalog.items.length +
      movieCatalog2026.items.length +
      seriesCatalog.items.length +
      (socialContext.friendCount > 0 ? socialHighlights.length : 0) >
    0;
  const firstName = user.name.trim().split(/\s+/)[0];

  async function loadMovieCatalog({
    kind,
    limit,
    page,
    queryValue = '',
  }: {
    kind: MovieCatalogKind;
    limit: number;
    page: number;
    queryValue?: string;
  }) {
    const params = new URLSearchParams({
      kind,
      limit: String(limit),
      page: String(page),
    });
    if (queryValue.trim()) params.set('query', queryValue.trim());

    const response = await authFetch(`/api/catalog/movies?${params.toString()}`);
    const payload = (await response.json()) as
      | {
          success: true;
          data: {
            items: CatalogMovie[];
            page: number;
            totalPages: number;
            totalResults: number;
          };
        }
      | { success: false; message?: string };

    if (!response.ok || !payload.success) {
      throw new Error(payload.success ? 'Falha ao buscar catalogo.' : payload.message);
    }

    return payload.data;
  }

  async function loadSeriesCatalog({
    kind,
    limit,
    page,
    queryValue = '',
  }: {
    kind: SeriesCatalogKind;
    limit: number;
    page: number;
    queryValue?: string;
  }) {
    const params = new URLSearchParams({
      kind,
      limit: String(limit),
      page: String(page),
    });
    if (queryValue.trim()) params.set('query', queryValue.trim());

    const response = await authFetch(`/api/catalog/series?${params.toString()}`);
    const payload = (await response.json()) as
      | {
          success: true;
          data: {
            items: CatalogSeries[];
            page: number;
            totalPages: number;
            totalResults: number;
          };
        }
      | { success: false; message?: string };

    if (!response.ok || !payload.success) {
      throw new Error(payload.success ? 'Falha ao buscar catalogo.' : payload.message);
    }

    return payload.data;
  }

  useEffect(() => {
    void authFetch('/api/catalog/library')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) {
          setSavedTitles(payload.data.map((item: CatalogMovie) => item.title));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setMovieCatalog((current) => ({ ...current, error: null, isLoading: true }));
      setSearchSeriesCatalog((current) => ({ ...current, error: null, isLoading: true }));

      try {
        const [movieData, seriesData] = await Promise.all([
          loadMovieCatalog({
            kind: activeMovieKind,
            limit: 10,
            page: 1,
            queryValue: query,
          }),
          loadSeriesCatalog({
            kind: normalizedQuery ? 'search' : 'top-rated',
            limit: 10,
            page: 1,
            queryValue: query,
          }),
        ]);
        if (controller.signal.aborted) return;
        setMovieCatalog({
          error: null,
          isLoading: false,
          items: movieData.items,
        });
        setSearchSeriesCatalog({
          error: null,
          isLoading: false,
          items: seriesData.items,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setMovieCatalog((current) => ({
          ...current,
          error: getCatalogError(error),
          isLoading: false,
        }));
        setSearchSeriesCatalog((current) => ({
          ...current,
          error: getCatalogError(error),
          isLoading: false,
        }));
      }
    }, 420);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [activeMovieKind, normalizedQuery, query]);

  function toggleSaved(title: string) {
    setSavedTitles((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title],
    );
  }

  function handleSearchBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsSearchFocused(false);
    }
  }

  function handleSelectSuggestion(item: CatalogSuggestion) {
    setQuery(item.title);
    setIsSearchFocused(false);
    window.requestAnimationFrame(() => {
      document.querySelector('#filmes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className="home-workspace" id="inicio">
      <header className="home-header">
        <a className="home-mobile-brand" href="#inicio" aria-label="Viue - inicio">
          <Image alt="" height={40} priority src="/brand/viue-symbol.png" width={40} />
        </a>
        <div className="home-search-shell" onBlur={handleSearchBlur}>
          <label className="home-search" htmlFor="home-search-input">
            <Search aria-hidden="true" size={19} />
            <span className="sr-only">Buscar filmes e series</span>
            <input
              aria-autocomplete="list"
              aria-controls="home-search-suggestions"
              aria-expanded={isSearchListOpen}
              autoComplete="off"
              id="home-search-input"
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Buscar filmes e series"
              role="combobox"
              type="search"
              value={query}
            />
          </label>

          {isSearchListOpen ? (
            <div
              aria-label="Sugestoes de filmes e series"
              className="home-search-suggestions"
              id="home-search-suggestions"
              role="listbox"
            >
              {movieCatalog.isLoading ? (
                <div className="home-search-status" role="status">
                  <LoaderCircle aria-hidden="true" size={15} /> Buscando filmes e series
                </div>
              ) : null}

              {!movieCatalog.isLoading && searchSuggestions.length > 0
                ? searchSuggestions.map((item) => (
                    <button
                      aria-selected="false"
                      className="home-search-option"
                      key={`suggestion-${item.id}`}
                      onClick={() => handleSelectSuggestion(item)}
                      role="option"
                      type="button"
                    >
                      <span className="home-search-poster" aria-hidden="true">
                        {item.posterUrl ? (
                          <Image alt="" fill sizes="44px" src={item.posterUrl} />
                        ) : (
                          item.title.slice(0, 1)
                        )}
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {seriesSuggestionIds.has(item.id) ? 'Serie' : 'Filme'}
                          {getMovieSuggestionMeta(item) ? ` - ${getMovieSuggestionMeta(item)}` : ''}
                        </small>
                      </span>
                    </button>
                  ))
                : null}

              {!movieCatalog.isLoading && searchSuggestions.length === 0 ? (
                <p className="home-search-status" role="status">
                  Nenhum filme ou serie encontrado.
                </p>
              ) : null}

              <Link
                className="home-search-all"
                href={`/${profile}/filmes/melhores-avaliados?query=${encodeURIComponent(query.trim())}`}
                onClick={() => setIsSearchFocused(false)}
              >
                Ver todos os resultados para &quot;{query.trim()}&quot;
              </Link>
            </div>
          ) : null}
        </div>
        <NotificationBell unreadCount={socialContext.unreadNotificationCount} />
        <UserMenu user={user} />
      </header>

      <main className="home-content">
        <section className="home-welcome" aria-labelledby="home-title">
          <div>
            <span className="home-kicker">Seu diario de entretenimento</span>
            <h1 id="home-title">Ola, {firstName}. O que vamos descobrir hoje?</h1>
          </div>
        </section>

        <section className="home-feature" aria-labelledby="feature-title">
          <Image
            alt="Amigos escolhendo juntos o que assistir"
            className="home-feature-image"
            fill
            priority
            sizes="(max-width: 760px) 100vw, (max-width: 1200px) 80vw, 1050px"
            src="/images/home-community-night.png"
          />
          <div className="home-feature-scrim" />
          <div className="home-feature-copy">
            <Badge className="home-feature-badge" variant="info">
              Sessao em comunidade
            </Badge>
            <h2 id="feature-title">A melhor escolha comeca com a turma.</h2>
            <p>Compare listas, encontre o match da noite e transforme opiniao em conversa.</p>
            <div className="home-feature-actions">
              <Button
                leftIcon={<UsersRound aria-hidden="true" size={18} />}
                onClick={() => router.push('/comunidade')}
                size="lg"
              >
                Criar sala
              </Button>
              <Button
                leftIcon={<Compass aria-hidden="true" size={18} />}
                onClick={() => document.querySelector('#filmes')?.scrollIntoView()}
                size="lg"
                variant="secondary"
              >
                Explorar
              </Button>
            </div>
          </div>
        </section>

        {hasSearchResults ? (
          <>
            <CatalogCarouselSection
              error={movieCatalog.error}
              href={
                normalizedQuery
                  ? `/${profile}/filmes/melhores-avaliados?query=${encodeURIComponent(query.trim())}`
                  : `/${profile}/filmes/melhores-avaliados`
              }
              id="filmes"
              isLoading={movieCatalog.isLoading}
              items={searchCatalogItems}
              onToggleSaved={toggleSaved}
              profile={profile}
              savedTitles={savedTitles}
              title={
                normalizedQuery ? `Resultados para "${query.trim()}"` : 'Filmes mais bem avaliados'
              }
              watchedByTitle={socialContext.watchedByTitle}
            />

            <CatalogCarouselSection
              error={movieCatalog2026.error}
              href={`/${profile}/filmes/melhores-avaliados?year=2026`}
              id="filmes-2026"
              isLoading={movieCatalog2026.isLoading}
              items={movieCatalog2026.items}
              onToggleSaved={toggleSaved}
              profile={profile}
              savedTitles={savedTitles}
              title="Melhores filmes de 2026"
              watchedByTitle={socialContext.watchedByTitle}
            />

            <CatalogCarouselSection
              error={seriesCatalog.error}
              href={`/${profile}/series/melhores-avaliadas`}
              id="series"
              isLoading={seriesCatalog.isLoading}
              items={seriesCatalog.items}
              onToggleSaved={toggleSaved}
              profile={profile}
              savedTitles={savedTitles}
              title="Series mais aclamadas"
              watchedByTitle={socialContext.watchedByTitle}
            />

            {socialContext.friendCount > 0 && socialHighlights.length > 0 ? (
              <CatalogSection
                eyebrow="O que esta circulando"
                id="comunidade"
                items={socialHighlights}
                onToggleSaved={toggleSaved}
                savedTitles={savedTitles}
                title="Em alta entre amigos"
                watchedByTitle={socialContext.watchedByTitle}
              />
            ) : null}
          </>
        ) : (
          <p className="home-empty" role="status">
            Nenhum filme encontrado para &quot;{query}&quot;.
          </p>
        )}
      </main>
    </div>
  );
}
