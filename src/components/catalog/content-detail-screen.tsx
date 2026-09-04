'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
  Save,
  Star,
  Trash2,
  Tv,
  UsersRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button, Tabs } from '@/components/ui';
import { authFetch } from '@/lib/auth/auth-fetch';
import { useToast } from '@/hooks/use-toast';
import type { ProfileSlug } from '@/lib/profile/profiles';

type Content = {
  id: string;
  type: string;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseYear: string | null;
  rating: string | null;
  genres: string[];
  episodeRatingCount: number | null;
  friendRatings: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    rating: string | null;
  }>;
  library: { status: string; rating: string | null; streaming?: string | null } | null;
};

type Season = {
  id: string;
  seasonNumber: number;
  name: string | null;
  posterUrl: string | null;
  episodeCount: number | null;
};

type Episode = {
  id: string;
  episodeNumber: number;
  title: string;
  rating: string | null;
};

type EpisodeRatingResult = { average: number | null; ratedEpisodeCount: number };

function EpisodeRatingRow({
  episode,
  onRated,
}: {
  episode: Episode;
  onRated: (result: EpisodeRatingResult) => void;
}) {
  const [rating, setRating] = useState(episode.rating ?? '');
  const [savedRating, setSavedRating] = useState(episode.rating);
  const [isSaving, setIsSaving] = useState(false);
  const showToast = useToast();

  const normalizedRating = Number(rating.replace(',', '.'));
  const ratingIsValid =
    rating.trim().length > 0 &&
    Number.isFinite(normalizedRating) &&
    normalizedRating >= 0 &&
    normalizedRating <= 10;

  async function updateEpisodeRating(value: number | null) {
    setIsSaving(true);
    try {
      const response = await authFetch(`/api/catalog/episodes/${episode.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message);
      setSavedRating(value === null ? null : String(value));
      if (value === null) setRating('');
      onRated(payload.data as EpisodeRatingResult);
    } catch (error) {
      showToast({
        title: 'Não foi possível salvar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="episode-row">
      <span className="episode-row-title">
        <strong>{episode.episodeNumber}.</strong> {episode.title}
      </span>
      <div className="episode-row-rating">
        <div className="episode-rating-input">
          <input
            aria-label={`Nota do episódio ${episode.episodeNumber}`}
            inputMode="decimal"
            onChange={(event) => setRating(event.target.value.replace(/[^0-9.,]/g, ''))}
            placeholder="9,6"
            type="text"
            value={rating}
          />
          <span>/10</span>
        </div>
        <Button
          aria-label={`Salvar nota do episódio ${episode.episodeNumber}`}
          disabled={!ratingIsValid || isSaving}
          onClick={() => void updateEpisodeRating(normalizedRating)}
          size="icon"
          variant="outline"
        >
          <Save aria-hidden="true" size={16} />
        </Button>
        {savedRating !== null ? (
          <Button
            aria-label={`Remover nota do episódio ${episode.episodeNumber}`}
            disabled={isSaving}
            onClick={() => void updateEpisodeRating(null)}
            size="icon"
            variant="danger"
          >
            <Trash2 aria-hidden="true" size={16} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const streamingOptions = [
  { name: 'Netflix', logo: '/streamings/netflix.svg', light: false },
  { name: 'Prime Video', logo: '/streamings/prime-video.svg', light: false },
  { name: 'Disney+', logo: '/streamings/disney-plus.svg', light: false },
  { name: 'Max', logo: '/streamings/max.svg', light: true },
  { name: 'Globoplay', logo: '/streamings/globoplay.svg', light: false },
  { name: 'Paramount+', logo: '/streamings/paramount-plus.svg', light: false },
  { name: 'Apple TV+', logo: '/streamings/apple-tv.svg', light: true },
  { name: 'Crunchyroll', logo: '/streamings/crunchyroll.svg', light: false },
] as const;

const knownStreamingNames = new Set<string>(streamingOptions.map((option) => option.name));

export function ContentDetailScreen({
  initialContent,
  profile,
}: {
  initialContent: Content;
  profile: ProfileSlug;
}) {
  const router = useRouter();
  const savedStreaming = initialContent.library?.streaming ?? '';
  const [content, setContent] = useState(initialContent);
  const [rating, setRating] = useState(initialContent.library?.rating ?? '');
  const [streaming, setStreaming] = useState(
    savedStreaming && !knownStreamingNames.has(savedStreaming) ? 'Outro' : savedStreaming,
  );
  const [otherStreaming, setOtherStreaming] = useState(
    savedStreaming && !knownStreamingNames.has(savedStreaming) ? savedStreaming : '',
  );
  const [isSaving, setIsSaving] = useState(false);
  const showToast = useToast();

  async function updateLibrary(data: {
    status?: string;
    rating?: number | null;
    streaming?: string | null;
  }) {
    setIsSaving(true);
    try {
      const response = await authFetch(`/api/catalog/content/${content.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message);
      setContent(payload.data);
      showToast({
        title: 'Lista atualizada',
        description: 'Sua alteração foi salva.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Não foi possível salvar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveRating() {
    const value = Number(rating.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0 || value > 10) return;
    await updateLibrary({ rating: value });
  }

  async function clearRating() {
    await updateLibrary({ rating: null });
    setRating('');
  }

  const normalizedRating = Number(rating.replace(',', '.'));
  const ratingIsValid =
    rating.trim().length > 0 &&
    Number.isFinite(normalizedRating) &&
    normalizedRating >= 0 &&
    normalizedRating <= 10;

  const isSeries = content.type === 'SERIES';
  const isEpisodeMode = isSeries && (content.episodeRatingCount ?? 0) > 0;

  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState('');
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [episodesError, setEpisodesError] = useState<string | null>(null);
  const seasonTabsRef = useRef<HTMLDivElement>(null);

  function scrollSeasons(direction: 'left' | 'right') {
    seasonTabsRef.current
      ?.querySelector('[role="tablist"]')
      ?.scrollBy({ behavior: 'smooth', left: direction === 'left' ? -240 : 240 });
  }

  useEffect(() => {
    if (!isSeries) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await authFetch(`/api/catalog/content/${content.id}/seasons`);
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message);
        if (cancelled) return;
        setSeasons(payload.data);
        if (payload.data.length > 0) setActiveSeason(String(payload.data[0].seasonNumber));
      } catch (error) {
        if (!cancelled) {
          setSeasonsError(
            error instanceof Error ? error.message : 'Não foi possível carregar as temporadas.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [content.id, isSeries]);

  useEffect(() => {
    if (!isSeries || !activeSeason) return;
    let cancelled = false;

    (async () => {
      setEpisodesLoading(true);
      setEpisodesError(null);
      try {
        const response = await authFetch(
          `/api/catalog/content/${content.id}/seasons/${activeSeason}/episodes`,
        );
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message);
        if (cancelled) return;
        setEpisodes(payload.data);
      } catch (error) {
        if (!cancelled) {
          setEpisodesError(
            error instanceof Error ? error.message : 'Não foi possível carregar os episódios.',
          );
        }
      } finally {
        if (!cancelled) setEpisodesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [content.id, isSeries, activeSeason]);

  function handleEpisodeRated({ average, ratedEpisodeCount }: EpisodeRatingResult) {
    setContent((current) => ({
      ...current,
      episodeRatingCount: ratedEpisodeCount,
      library: current.library
        ? { ...current.library, rating: average !== null ? String(average) : null }
        : { status: 'WANT_TO_WATCH', rating: average !== null ? String(average) : null },
    }));
  }

  async function saveStreaming(value: string) {
    setStreaming(value);
    await updateLibrary({ streaming: value || null });
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(`/${profile}`);
  }

  return (
    <main className="content-detail-page">
      <header className="catalog-header">
        <button className="catalog-back" onClick={handleBack} type="button">
          <ArrowLeft aria-hidden="true" size={18} /> Voltar
        </button>
        <Image alt="" height={42} priority src="/brand/viue-symbol.png" width={42} />
      </header>
      <section className="content-detail-hero">
        {content.backdropUrl ? (
          <Image
            alt=""
            className="content-detail-backdrop"
            fill
            priority
            sizes="100vw"
            src={content.backdropUrl}
          />
        ) : null}
        <div className="content-detail-scrim" />
        <div className="content-detail-body">
          <div className="content-detail-poster">
            {content.posterUrl ? (
              <Image
                alt={`Poster de ${content.title}`}
                fill
                sizes="280px"
                src={content.posterUrl}
              />
            ) : null}
          </div>
          <div className="content-detail-copy">
            <span className="home-kicker">{content.type === 'SERIES' ? 'Série' : 'Filme'}</span>
            <h1>{content.title}</h1>
            <p className="content-detail-meta">
              {[content.releaseYear, ...content.genres].filter(Boolean).join(' - ')}
              {content.rating ? ` - Nota ${content.rating}` : ''}
            </p>
            <p className="content-detail-overview">
              {content.overview || 'Este título ainda não possui um resumo.'}
            </p>
            <div className="content-detail-actions">
              <Button
                disabled={isSaving && Boolean(content.library)}
                isLoading={isSaving && !content.library}
                leftIcon={content.library ? <Check size={18} /> : <Bookmark size={18} />}
                onClick={() => updateLibrary({ status: 'WANT_TO_WATCH' })}
              >
                {content.library ? 'Na sua lista' : 'Adicionar à minha lista'}
              </Button>
            </div>
            <div className="content-rating">
              <div className="content-control-heading">
                <div>
                  <span className="content-control-icon is-rating">
                    <Star aria-hidden="true" fill="currentColor" size={18} />
                  </span>
                  <div>
                    <label htmlFor="content-rating">Sua avaliação</label>
                    <p>
                      {isEpisodeMode
                        ? 'Calculada a partir dos episódios avaliados'
                        : 'Use uma nota de 0 a 10'}
                    </p>
                  </div>
                </div>
              </div>

              {isEpisodeMode ? (
                <p className="rating-derived">
                  <Star aria-hidden="true" fill="currentColor" size={16} />
                  Nota de {content.episodeRatingCount}{' '}
                  {content.episodeRatingCount === 1 ? 'episódio avaliado' : 'episódios avaliados'}
                  <strong>{content.library?.rating ?? '—'}</strong>
                </p>
              ) : (
                <>
                  <div className="rating-entry">
                    <div className="rating-input-shell">
                      <input
                        aria-describedby="content-rating-help"
                        aria-invalid={rating.length > 0 && !ratingIsValid}
                        id="content-rating"
                        inputMode="decimal"
                        onChange={(event) => setRating(event.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder="9,6"
                        type="text"
                        value={rating}
                      />
                      <span>/10</span>
                    </div>
                    <Button
                      aria-label="Salvar avaliação"
                      disabled={!ratingIsValid || isSaving}
                      leftIcon={<Save aria-hidden="true" size={17} />}
                      onClick={saveRating}
                    >
                      Salvar
                    </Button>
                    {content.library?.rating ? (
                      <Button
                        aria-label="Remover nota"
                        disabled={isSaving}
                        leftIcon={<Trash2 aria-hidden="true" size={17} />}
                        onClick={clearRating}
                        variant="danger"
                      >
                        Remover
                      </Button>
                    ) : null}
                  </div>
                  <p
                    className={rating.length > 0 && !ratingIsValid ? 'is-error' : ''}
                    id="content-rating-help"
                  >
                    {rating.length > 0 && !ratingIsValid
                      ? 'Digite uma nota válida entre 0 e 10.'
                      : 'Exemplos: 8,5 · 9.0 · 10'}
                  </p>
                </>
              )}
            </div>
            {isSeries ? (
              <section className="content-episodes" aria-labelledby="episodes-title">
                <div className="content-control-heading">
                  <div>
                    <span className="content-control-icon">
                      <Tv aria-hidden="true" size={18} />
                    </span>
                    <div>
                      <h2 id="episodes-title">Episódios</h2>
                      <p>Avalie episódio a episódio ou só a série, como preferir</p>
                    </div>
                  </div>
                </div>

                {seasonsError ? (
                  <p className="home-empty is-error" role="alert">
                    {seasonsError}
                  </p>
                ) : null}

                {!seasonsError && seasons === null ? (
                  <p className="home-empty" role="status">
                    <LoaderCircle aria-hidden="true" size={16} /> Carregando temporadas
                  </p>
                ) : null}

                {seasons && seasons.length === 0 ? (
                  <p className="home-empty" role="status">
                    Nenhuma temporada encontrada para este título.
                  </p>
                ) : null}

                {seasons && seasons.length > 0 ? (
                  <div className="season-tabs-carousel">
                    <button
                      aria-label="Temporada anterior"
                      className="season-tabs-arrow is-left"
                      onClick={() => scrollSeasons('left')}
                      type="button"
                    >
                      <ChevronLeft aria-hidden="true" size={18} />
                    </button>
                    <div className="content-episodes-tabs" ref={seasonTabsRef}>
                      <Tabs
                        ariaLabel="Temporadas"
                        items={seasons.map((season) => ({
                          value: String(season.seasonNumber),
                          label: season.name || `Temporada ${season.seasonNumber}`,
                        }))}
                        onValueChange={setActiveSeason}
                        value={activeSeason}
                      />
                    </div>
                    <button
                      aria-label="Próxima temporada"
                      className="season-tabs-arrow is-right"
                      onClick={() => scrollSeasons('right')}
                      type="button"
                    >
                      <ChevronRight aria-hidden="true" size={18} />
                    </button>
                  </div>
                ) : null}

                {episodesError ? (
                  <p className="home-empty is-error" role="alert">
                    {episodesError}
                  </p>
                ) : null}

                {episodesLoading ? (
                  <p className="home-empty" role="status">
                    <LoaderCircle aria-hidden="true" size={16} /> Carregando episódios
                  </p>
                ) : null}

                {!episodesLoading && episodes && episodes.length > 0 ? (
                  <div className="episode-list">
                    {episodes.map((episode) => (
                      <EpisodeRatingRow
                        episode={episode}
                        key={episode.id}
                        onRated={handleEpisodeRated}
                      />
                    ))}
                  </div>
                ) : null}

                {!episodesLoading && episodes && episodes.length === 0 ? (
                  <p className="home-empty" role="status">
                    Nenhum episódio encontrado para esta temporada.
                  </p>
                ) : null}
              </section>
            ) : null}
            <div className="content-streaming">
              <div className="content-control-heading">
                <div>
                  <span className="content-control-icon">
                    <Bookmark aria-hidden="true" size={18} />
                  </span>
                  <div>
                    <label id="content-streaming-label">Onde você pretende assistir?</label>
                    <p>Guarde a plataforma para encontrar depois</p>
                  </div>
                </div>
                {content.library?.streaming ? (
                  <span className="content-saved-state">
                    <Check size={14} /> Salvo
                  </span>
                ) : null}
              </div>
              <div
                aria-labelledby="content-streaming-label"
                className="streaming-grid"
                role="radiogroup"
              >
                {streamingOptions.map((option) => (
                  <button
                    aria-checked={streaming === option.name}
                    className={streaming === option.name ? 'is-selected' : ''}
                    disabled={isSaving}
                    key={option.name}
                    onClick={() => void saveStreaming(option.name)}
                    role="radio"
                    type="button"
                  >
                    <span className={`streaming-mark ${option.light ? 'is-light-logo' : ''}`}>
                      <Image alt="" height={24} src={option.logo} width={54} />
                    </span>
                    <span>{option.name}</span>
                    {streaming === option.name ? (
                      <Check aria-hidden="true" className="streaming-check" size={15} />
                    ) : null}
                  </button>
                ))}
                <button
                  aria-checked={streaming === 'Outro'}
                  className={streaming === 'Outro' ? 'is-selected' : ''}
                  disabled={isSaving}
                  onClick={() => setStreaming('Outro')}
                  role="radio"
                  type="button"
                >
                  <span className="streaming-mark is-other">
                    <Plus aria-hidden="true" size={20} />
                  </span>
                  <span>Outro</span>
                  {streaming === 'Outro' ? (
                    <Check aria-hidden="true" className="streaming-check" size={15} />
                  ) : null}
                </button>
              </div>
              {streaming === 'Outro' ? (
                <div className="content-other-streaming">
                  <input
                    aria-label="Nome de outro streaming"
                    onChange={(event) => setOtherStreaming(event.target.value)}
                    placeholder="Ex.: Apple TV+"
                    value={otherStreaming}
                  />
                  <Button
                    disabled={!otherStreaming.trim() || isSaving}
                    onClick={() => saveStreaming(otherStreaming.trim())}
                    size="sm"
                  >
                    Salvar
                  </Button>
                </div>
              ) : null}
            </div>
            {content.friendRatings.length > 0 ? (
              <section className="friend-ratings" aria-labelledby="friend-ratings-title">
                <div className="content-control-heading">
                  <div>
                    <span className="content-control-icon">
                      <UsersRound aria-hidden="true" size={18} />
                    </span>
                    <div>
                      <h2 id="friend-ratings-title">Notas dos seus amigos</h2>
                      <p>
                        {content.friendRatings.length}{' '}
                        {content.friendRatings.length === 1 ? 'amigo avaliou' : 'amigos avaliaram'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="friend-rating-list">
                  {content.friendRatings.map((friend) => {
                    const initials = friend.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase();
                    return (
                      <div className="friend-rating-item" key={friend.id}>
                        <span className="friend-rating-avatar">
                          {friend.avatarUrl ? (
                            <Image alt="" fill sizes="36px" src={friend.avatarUrl} />
                          ) : (
                            initials
                          )}
                        </span>
                        <span>{friend.name}</span>
                        <strong>
                          <Star aria-hidden="true" fill="currentColor" size={14} /> {friend.rating}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
