import { content_type } from '@/generated/prisma/enums';
import { prisma } from '@/lib/db/client';
import {
  discoverTmdbMovies,
  discoverTopRatedTmdbMovies,
  getTmdbImageUrl,
  getTmdbMovieGenres,
  searchTmdbMovies,
} from '@/services/tmdb/tmdb.client';
import type { CatalogMovie, TmdbGenre, TmdbMovieSummary } from '@/services/tmdb/tmdb.types';

const TMDB_SOURCE = 'TMDB';
const DEFAULT_MOVIES_PER_REQUEST = 10;
const MAX_MOVIES_PER_REQUEST = 30;

export type MovieCatalogKind = 'discover' | 'top-rated' | 'top-rated-2026' | 'search';

type MovieCatalogOptions = {
  kind?: MovieCatalogKind;
  genreId?: number;
  limit?: number;
  page?: number;
  query?: string;
};

function parseTmdbDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getReleaseYear(value: Date | string | null) {
  if (!value) return null;
  const date = typeof value === 'string' ? parseTmdbDate(value) : value;
  return date ? String(date.getUTCFullYear()) : null;
}

function toRating(value: number | null | undefined) {
  if (typeof value !== 'number' || value <= 0) return null;
  return Number(value.toFixed(1));
}

function getMovieGenreNames(movie: TmdbMovieSummary, genresByTmdbId: Map<number, TmdbGenre>) {
  return movie.genre_ids
    .map((genreId) => genresByTmdbId.get(genreId)?.name)
    .filter((name): name is string => Boolean(name));
}

async function ensureGenres(genreNames: readonly string[]) {
  const uniqueGenreNames = [...new Set(genreNames)];
  if (uniqueGenreNames.length === 0) return;

  await prisma.tb_genre.createMany({
    data: uniqueGenreNames.map((name) => ({ name })),
    skipDuplicates: true,
  });
}

function toCatalogMovie(
  movie: TmdbMovieSummary,
  contentId: string,
  genresByTmdbId: Map<number, TmdbGenre>,
): CatalogMovie {
  const releaseDate = parseTmdbDate(movie.release_date);
  const rating = toRating(movie.vote_average);

  return {
    id: contentId,
    tmdbId: movie.id,
    title: movie.title,
    originalTitle: movie.original_title || null,
    overview: movie.overview || null,
    posterUrl: getTmdbImageUrl(movie.poster_path, 'w500'),
    backdropUrl: getTmdbImageUrl(movie.backdrop_path, 'w780'),
    releaseDate: releaseDate ? releaseDate.toISOString().slice(0, 10) : null,
    releaseYear: getReleaseYear(releaseDate),
    rating: rating ? rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : null,
    voteCount: movie.vote_count || null,
    genres: movie.genre_ids
      .map((genreId) => genresByTmdbId.get(genreId)?.name)
      .filter((name): name is string => Boolean(name)),
  };
}

async function upsertMovie(movie: TmdbMovieSummary, genresByTmdbId: Map<number, TmdbGenre>) {
  const genreNames = getMovieGenreNames(movie, genresByTmdbId);

  return prisma.$transaction(async (tx) => {
    const content = await tx.tb_content.upsert({
      where: {
        external_id_external_source: {
          external_id: String(movie.id),
          external_source: TMDB_SOURCE,
        },
      },
      create: {
        external_id: String(movie.id),
        external_source: TMDB_SOURCE,
        type: content_type.MOVIE,
        title: movie.title,
        original_title: movie.original_title || null,
        description: movie.overview || null,
        poster_url: getTmdbImageUrl(movie.poster_path, 'w500'),
        backdrop_url: getTmdbImageUrl(movie.backdrop_path, 'w780'),
        release_date: parseTmdbDate(movie.release_date),
        external_rating: toRating(movie.vote_average),
        external_votes: movie.vote_count || null,
      },
      update: {
        title: movie.title,
        original_title: movie.original_title || null,
        description: movie.overview || null,
        poster_url: getTmdbImageUrl(movie.poster_path, 'w500'),
        backdrop_url: getTmdbImageUrl(movie.backdrop_path, 'w780'),
        release_date: parseTmdbDate(movie.release_date),
        external_rating: toRating(movie.vote_average),
        external_votes: movie.vote_count || null,
        updated_at: new Date(),
      },
    });

    await tx.tb_movie.upsert({
      where: { content_id: content.id },
      create: { content_id: content.id },
      update: { updated_at: new Date() },
    });

    await tx.tb_content_genre.deleteMany({ where: { content_id: content.id } });

    for (const name of genreNames) {
      const genre = await tx.tb_genre.findUnique({
        where: { name },
      });
      if (!genre) continue;

      await tx.tb_content_genre.create({
        data: {
          content_id: content.id,
          genre_id: genre.id,
        },
      });
    }

    return toCatalogMovie(movie, content.id, genresByTmdbId);
  });
}

function getTmdbMoviesByKind(
  kind: MovieCatalogKind,
  query: string,
  page: number,
  genreId?: number,
) {
  if (kind === 'search' || query.trim()) return searchTmdbMovies(query, page);
  if (kind === 'discover') return discoverTmdbMovies(page, genreId);
  if (kind === 'top-rated-2026') return discoverTopRatedTmdbMovies(page, 2026);
  return discoverTopRatedTmdbMovies(page);
}

async function getTmdbMovieBatch(
  kind: MovieCatalogKind,
  query: string,
  page: number,
  limit: number,
  genreId?: number,
) {
  const startIndex = (page - 1) * limit;
  const firstTmdbPage = Math.floor(startIndex / 20) + 1;
  const offset = startIndex % 20;
  const tmdbPageCount = Math.min(
    Math.ceil((offset + limit) / 20),
    Math.max(500 - firstTmdbPage + 1, 0),
  );
  const responses = await Promise.all(
    Array.from({ length: tmdbPageCount }, (_, index) =>
      getTmdbMoviesByKind(kind, query, firstTmdbPage + index, genreId),
    ),
  );
  const totalResults = responses[0]?.total_results ?? 0;

  return {
    results: responses.flatMap((response) => response.results).slice(offset, offset + limit),
    totalPages: Math.min(Math.ceil(totalResults / limit), Math.ceil((500 * 20) / limit)),
    totalResults,
  };
}

export async function getMovieGenreOptions() {
  const response = await getTmdbMovieGenres();
  return response.genres.map((genre) => ({ id: genre.id, name: genre.name }));
}

export async function getMovieCatalog({
  kind = 'top-rated',
  genreId,
  limit = DEFAULT_MOVIES_PER_REQUEST,
  page = 1,
  query = '',
}: MovieCatalogOptions = {}) {
  const boundedLimit = Math.min(Math.max(limit, 1), MAX_MOVIES_PER_REQUEST);
  const [genresResponse, moviesResponse] = await Promise.all([
    getTmdbMovieGenres(),
    getTmdbMovieBatch(kind, query, page, boundedLimit, genreId),
  ]);
  const genresByTmdbId = new Map(genresResponse.genres.map((genre) => [genre.id, genre]));
  const movies = moviesResponse.results.filter((movie) => movie.title).slice(0, boundedLimit);
  await ensureGenres(movies.flatMap((movie) => getMovieGenreNames(movie, genresByTmdbId)));
  const items = await Promise.all(movies.map((movie) => upsertMovie(movie, genresByTmdbId)));

  return {
    items,
    page,
    totalPages: moviesResponse.totalPages,
    totalResults: moviesResponse.totalResults,
  };
}
