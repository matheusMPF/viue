import { content_type } from '@/generated/prisma/enums';
import { prisma } from '@/lib/db/client';
import {
  discoverTopRatedTmdbSeries,
  getTmdbImageUrl,
  getTmdbSeriesGenres,
  searchTmdbSeries,
} from '@/services/tmdb/tmdb.client';
import type { CatalogSeries, TmdbGenre, TmdbTvSummary } from '@/services/tmdb/tmdb.types';

const TMDB_TV_SOURCE = 'TMDB_TV';
const DEFAULT_SERIES_PER_REQUEST = 10;
const MAX_SERIES_PER_REQUEST = 30;

export type SeriesCatalogKind = 'top-rated' | 'search';

type SeriesCatalogOptions = {
  kind?: SeriesCatalogKind;
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

function getSeriesGenreNames(series: TmdbTvSummary, genresByTmdbId: Map<number, TmdbGenre>) {
  return series.genre_ids
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

function toCatalogSeries(
  series: TmdbTvSummary,
  contentId: string,
  genresByTmdbId: Map<number, TmdbGenre>,
): CatalogSeries {
  const releaseDate = parseTmdbDate(series.first_air_date);
  const rating = toRating(series.vote_average);

  return {
    id: contentId,
    tmdbId: series.id,
    title: series.name,
    originalTitle: series.original_name || null,
    overview: series.overview || null,
    posterUrl: getTmdbImageUrl(series.poster_path, 'w500'),
    backdropUrl: getTmdbImageUrl(series.backdrop_path, 'w780'),
    releaseDate: releaseDate ? releaseDate.toISOString().slice(0, 10) : null,
    releaseYear: getReleaseYear(releaseDate),
    rating: rating ? rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : null,
    voteCount: series.vote_count || null,
    genres: series.genre_ids
      .map((genreId) => genresByTmdbId.get(genreId)?.name)
      .filter((name): name is string => Boolean(name)),
  };
}

async function upsertSeries(series: TmdbTvSummary, genresByTmdbId: Map<number, TmdbGenre>) {
  const genreNames = getSeriesGenreNames(series, genresByTmdbId);

  return prisma.$transaction(async (tx) => {
    const content = await tx.tb_content.upsert({
      where: {
        external_id_external_source: {
          external_id: String(series.id),
          external_source: TMDB_TV_SOURCE,
        },
      },
      create: {
        external_id: String(series.id),
        external_source: TMDB_TV_SOURCE,
        type: content_type.SERIES,
        title: series.name,
        original_title: series.original_name || null,
        description: series.overview || null,
        poster_url: getTmdbImageUrl(series.poster_path, 'w500'),
        backdrop_url: getTmdbImageUrl(series.backdrop_path, 'w780'),
        release_date: parseTmdbDate(series.first_air_date),
        external_rating: toRating(series.vote_average),
        external_votes: series.vote_count || null,
      },
      update: {
        title: series.name,
        original_title: series.original_name || null,
        description: series.overview || null,
        poster_url: getTmdbImageUrl(series.poster_path, 'w500'),
        backdrop_url: getTmdbImageUrl(series.backdrop_path, 'w780'),
        release_date: parseTmdbDate(series.first_air_date),
        external_rating: toRating(series.vote_average),
        external_votes: series.vote_count || null,
        updated_at: new Date(),
      },
    });

    await tx.tb_series.upsert({
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

    return toCatalogSeries(series, content.id, genresByTmdbId);
  });
}

function getTmdbSeriesByKind(kind: SeriesCatalogKind, query: string, page: number) {
  if (kind === 'search' || query.trim()) return searchTmdbSeries(query, page);
  return discoverTopRatedTmdbSeries(page);
}

export async function getSeriesCatalog({
  kind = 'top-rated',
  limit = DEFAULT_SERIES_PER_REQUEST,
  page = 1,
  query = '',
}: SeriesCatalogOptions = {}) {
  const [genresResponse, seriesResponse] = await Promise.all([
    getTmdbSeriesGenres(),
    getTmdbSeriesByKind(kind, query, page),
  ]);
  const genresByTmdbId = new Map(genresResponse.genres.map((genre) => [genre.id, genre]));
  const boundedLimit = Math.min(Math.max(limit, 1), MAX_SERIES_PER_REQUEST);
  const series = seriesResponse.results
    .filter((item) => item.poster_path && item.name)
    .slice(0, boundedLimit);
  await ensureGenres(series.flatMap((item) => getSeriesGenreNames(item, genresByTmdbId)));
  const items = await Promise.all(series.map((item) => upsertSeries(item, genresByTmdbId)));

  return {
    items,
    page: seriesResponse.page,
    totalPages: seriesResponse.total_pages,
    totalResults: seriesResponse.total_results,
  };
}
