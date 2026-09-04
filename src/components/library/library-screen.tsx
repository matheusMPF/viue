'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Film, Play, Star, Tv, UsersRound } from 'lucide-react';

import { Tabs } from '@/components/ui';
import type { ProfileSlug } from '@/lib/profile/profiles';

type LibraryItem = {
  id: string;
  title: string;
  type: 'MOVIE' | 'SERIES';
  posterUrl: string | null;
  releaseYear: string | null;
  rating: string | null;
  genres: string[];
  userRating: string | null;
  streaming: string | null;
  friendRatingCount: number;
  friendRatingAverage: string | null;
};

const streamingLogos: Record<string, string> = {
  Netflix: '/streamings/netflix.svg',
  'Prime Video': '/streamings/prime-video.svg',
  'Disney+': '/streamings/disney-plus.svg',
  Max: '/streamings/max.svg',
  Globoplay: '/streamings/globoplay.svg',
  'Paramount+': '/streamings/paramount-plus.svg',
  'Apple TV+': '/streamings/apple-tv.svg',
  Crunchyroll: '/streamings/crunchyroll.svg',
};

function LibraryCard({ item, profile }: { item: LibraryItem; profile: ProfileSlug }) {
  const streamingLogo = item.streaming ? streamingLogos[item.streaming] : null;

  return (
    <article className="library-card" role="listitem">
      <Link href={`/${profile}/titulo/${item.id}`} aria-label={`Ver detalhes de ${item.title}`}>
        <div className="library-card-poster">
          {item.posterUrl ? (
            <Image
              alt={`Poster de ${item.title}`}
              fill
              sizes="(max-width: 640px) 46vw, (max-width: 1000px) 30vw, 190px"
              src={item.posterUrl}
            />
          ) : (
            <span>{item.title}</span>
          )}
          {item.streaming ? (
            <span className="library-streaming" title={`Assistir na ${item.streaming}`}>
              {streamingLogo ? (
                <Image alt="" height={18} src={streamingLogo} width={38} />
              ) : (
                <Play aria-hidden="true" size={14} />
              )}
              <span>{item.streaming}</span>
            </span>
          ) : null}
        </div>
        <div className="library-card-copy">
          <h2>{item.title}</h2>
          <p>{[item.genres[0], item.releaseYear].filter(Boolean).join(' - ')}</p>
          <div className="library-ratings">
            {item.userRating ? (
              <span className="is-personal">
                <Star aria-hidden="true" fill="currentColor" size={14} /> Sua nota {item.userRating}
              </span>
            ) : null}
            {item.friendRatingCount > 0 ? (
              <span>
                <UsersRound aria-hidden="true" size={14} /> {item.friendRatingCount}{' '}
                {item.friendRatingCount === 1 ? 'amigo avaliou' : 'amigos avaliaram'}
                {item.friendRatingAverage ? ` · média ${item.friendRatingAverage}` : ''}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

function LibraryGrid({
  emptyMessage,
  items,
  profile,
}: {
  emptyMessage: string;
  items: LibraryItem[];
  profile: ProfileSlug;
}) {
  return items.length > 0 ? (
    <div className="library-grid" role="list">
      {items.map((item) => (
        <LibraryCard item={item} key={item.id} profile={profile} />
      ))}
    </div>
  ) : (
    <div className="library-empty">
      <Film aria-hidden="true" size={28} />
      <p>{emptyMessage}</p>
      <Link href={`/${profile}`}>Explorar catálogo</Link>
    </div>
  );
}

export function LibraryScreen({
  initialItems,
  profile,
}: {
  initialItems: LibraryItem[];
  profile: ProfileSlug;
}) {
  const movies = initialItems.filter((item) => item.type === 'MOVIE');
  const series = initialItems.filter((item) => item.type === 'SERIES');

  return (
    <div className="home-workspace">
      <main className="library-page">
        <header className="catalog-header">
          <Link className="catalog-back" href={`/${profile}`}>
            <ArrowLeft aria-hidden="true" size={18} /> Voltar
          </Link>
          <Image alt="" height={42} priority src="/brand/viue-symbol.png" width={42} />
        </header>
        <section className="library-heading">
          <span className="home-kicker">Seu espaço</span>
          <h1>Minha lista</h1>
          <p>Os títulos que você guardou e onde pretende assistir.</p>
        </section>
        <section className="library-content" aria-label="Conteúdo salvo">
          <Tabs
            ariaLabel="Filtrar minha lista"
            items={[
              {
                content: (
                  <LibraryGrid
                    emptyMessage="Você ainda não adicionou nenhum filme."
                    items={movies}
                    profile={profile}
                  />
                ),
                icon: <Film aria-hidden="true" size={17} />,
                label: `Filmes (${movies.length})`,
                value: 'movies',
              },
              {
                content: (
                  <LibraryGrid
                    emptyMessage="Você ainda não adicionou nenhuma série."
                    items={series}
                    profile={profile}
                  />
                ),
                icon: <Tv aria-hidden="true" size={17} />,
                label: `Séries (${series.length})`,
                value: 'series',
              },
            ]}
          />
        </section>
      </main>
    </div>
  );
}
