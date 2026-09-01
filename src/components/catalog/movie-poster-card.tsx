'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Star, UsersRound } from 'lucide-react';

import type { CatalogMovie } from '@/services/tmdb/tmdb.types';

export function MoviePosterCard({
  friendsWatched,
  item,
  saved,
  onToggleSaved,
}: {
  friendsWatched: number;
  item: CatalogMovie;
  saved: boolean;
  onToggleSaved?: (title: string) => void;
}) {
  const meta = [item.genres[0], item.releaseYear].filter(Boolean).join(' - ') || 'Filme';

  return (
    <article className="title-card" role="listitem">
      <Link
        className="title-card-link"
        href={`/titulo/${item.id}`}
        aria-label={`Ver detalhes de ${item.title}`}
      >
        <div className="title-cover title-cover-image">
          {item.posterUrl ? (
            <Image
              alt={`Poster de ${item.title}`}
              fill
              sizes="(max-width: 700px) 46vw, (max-width: 1000px) 24vw, 180px"
              src={item.posterUrl}
            />
          ) : (
            <span>{item.title}</span>
          )}
          {onToggleSaved ? (
            <button
              aria-label={`${saved ? 'Remover' : 'Salvar'} ${item.title}`}
              aria-pressed={saved}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleSaved(item.title);
              }}
              title={saved ? 'Remover da lista' : 'Salvar na lista'}
              type="button"
            >
              <Bookmark aria-hidden="true" fill={saved ? 'currentColor' : 'none'} size={17} />
            </button>
          ) : null}
        </div>
        <div className="title-card-copy">
          <h3>{item.title}</h3>
          <p>{meta}</p>
          <div>
            {item.rating ? (
              <span className="title-score">
                <Star aria-hidden="true" fill="currentColor" size={14} /> {item.rating}
              </span>
            ) : null}
            {friendsWatched > 0 ? (
              <span>
                <UsersRound aria-hidden="true" size={14} /> {friendsWatched}{' '}
                {friendsWatched === 1 ? 'amigo assistiu' : 'amigos assistiram'}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
