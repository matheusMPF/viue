import { content_type } from '@/generated/prisma/enums';
import { AuthError } from '@/lib/auth/errors';
import { prisma } from '@/lib/db/client';
import {
  getTmdbImageUrl,
  getTmdbSeasonEpisodes,
  getTmdbSeriesDetails,
} from '@/services/tmdb/tmdb.client';
import { updateUserContent } from './content-detail.service';

const TMDB_TV_SOURCE = 'TMDB_TV';

function parseTmdbDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toRating(value: number | null | undefined) {
  if (typeof value !== 'number' || value <= 0) return null;
  return Number(value.toFixed(1));
}

async function getSeriesTmdbId(contentId: string) {
  const content = await prisma.tb_content.findFirst({
    where: { id: contentId, type: content_type.SERIES, external_source: TMDB_TV_SOURCE },
    select: { external_id: true },
  });
  return content ? Number(content.external_id) : null;
}

function mapSeason(season: {
  id: string;
  season_number: number;
  name: string | null;
  poster_url: string | null;
  episode_count: number | null;
}) {
  return {
    id: season.id,
    seasonNumber: season.season_number,
    name: season.name,
    posterUrl: season.poster_url,
    episodeCount: season.episode_count,
  };
}

export async function getSeriesSeasons(contentId: string) {
  const existing = await prisma.tb_season.findMany({
    where: { series_id: contentId },
    orderBy: { season_number: 'asc' },
  });
  if (existing.length > 0) return existing.map(mapSeason);

  const tmdbId = await getSeriesTmdbId(contentId);
  if (!tmdbId) return [];

  const details = await getTmdbSeriesDetails(tmdbId);
  const seasons = details.seasons.filter((season) => season.season_number > 0);

  await prisma.$transaction(async (tx) => {
    await tx.tb_series.upsert({
      where: { content_id: contentId },
      create: {
        content_id: contentId,
        number_of_seasons: details.number_of_seasons,
        number_of_episodes: details.number_of_episodes,
      },
      update: {
        number_of_seasons: details.number_of_seasons,
        number_of_episodes: details.number_of_episodes,
        updated_at: new Date(),
      },
    });

    for (const season of seasons) {
      await tx.tb_season.upsert({
        where: {
          series_id_season_number: { series_id: contentId, season_number: season.season_number },
        },
        create: {
          series_id: contentId,
          season_number: season.season_number,
          name: season.name || null,
          overview: season.overview || null,
          poster_url: getTmdbImageUrl(season.poster_path, 'w500'),
          release_date: parseTmdbDate(season.air_date),
          episode_count: season.episode_count,
        },
        update: {
          name: season.name || null,
          overview: season.overview || null,
          poster_url: getTmdbImageUrl(season.poster_path, 'w500'),
          release_date: parseTmdbDate(season.air_date),
          episode_count: season.episode_count,
          updated_at: new Date(),
        },
      });
    }
  });

  const created = await prisma.tb_season.findMany({
    where: { series_id: contentId },
    orderBy: { season_number: 'asc' },
  });
  return created.map(mapSeason);
}

export async function getSeasonEpisodes(contentId: string, seasonNumber: number, userId: string) {
  const season = await prisma.tb_season.findUnique({
    where: { series_id_season_number: { series_id: contentId, season_number: seasonNumber } },
  });
  if (!season) return null;

  let episodes = await prisma.tb_episode.findMany({
    where: { season_id: season.id },
    orderBy: { episode_number: 'asc' },
  });

  if (episodes.length === 0) {
    const tmdbId = await getSeriesTmdbId(contentId);
    if (tmdbId) {
      const detail = await getTmdbSeasonEpisodes(tmdbId, seasonNumber);

      await prisma.$transaction(async (tx) => {
        for (const episode of detail.episodes) {
          await tx.tb_episode.upsert({
            where: {
              season_id_episode_number: {
                season_id: season.id,
                episode_number: episode.episode_number,
              },
            },
            create: {
              season_id: season.id,
              external_id: String(episode.id),
              episode_number: episode.episode_number,
              title: episode.name || `Episódio ${episode.episode_number}`,
              description: episode.overview || null,
              still_url: getTmdbImageUrl(episode.still_path, 'w500'),
              release_date: parseTmdbDate(episode.air_date),
              duration_minutes: episode.runtime,
              external_rating: toRating(episode.vote_average),
              external_votes: episode.vote_count || null,
            },
            update: {
              title: episode.name || `Episódio ${episode.episode_number}`,
              description: episode.overview || null,
              still_url: getTmdbImageUrl(episode.still_path, 'w500'),
              release_date: parseTmdbDate(episode.air_date),
              duration_minutes: episode.runtime,
              external_rating: toRating(episode.vote_average),
              external_votes: episode.vote_count || null,
              updated_at: new Date(),
            },
          });
        }
      });

      episodes = await prisma.tb_episode.findMany({
        where: { season_id: season.id },
        orderBy: { episode_number: 'asc' },
      });
    }
  }

  const userRatings = await prisma.tb_user_episode.findMany({
    where: { user_id: userId, episode_id: { in: episodes.map((episode) => episode.id) } },
  });
  const ratingByEpisodeId = new Map(userRatings.map((item) => [item.episode_id, item]));

  return episodes.map((episode) => ({
    id: episode.id,
    episodeNumber: episode.episode_number,
    title: episode.title,
    rating: ratingByEpisodeId.get(episode.id)?.rating?.toString() ?? null,
  }));
}

export async function updateEpisodeRating(
  userId: string,
  episodeId: string,
  rating: number | null,
) {
  const episode = await prisma.tb_episode.findUnique({
    where: { id: episodeId },
    include: { tb_season: { select: { series_id: true } } },
  });
  if (!episode) throw new AuthError('INVALID_REQUEST', 'Episódio não encontrado.', 404);

  await prisma.tb_user_episode.upsert({
    where: { user_id_episode_id: { user_id: userId, episode_id: episodeId } },
    create: {
      user_id: userId,
      episode_id: episodeId,
      rating,
      watched: rating !== null,
      watched_at: rating !== null ? new Date() : null,
    },
    update: {
      rating,
      watched: rating !== null,
      watched_at: rating !== null ? new Date() : null,
      updated_at: new Date(),
    },
  });

  const seriesContentId = episode.tb_season.series_id;
  const ratedEpisodes = await prisma.tb_user_episode.findMany({
    where: {
      user_id: userId,
      rating: { not: null },
      tb_episode: { tb_season: { series_id: seriesContentId } },
    },
    select: { rating: true },
  });

  const average =
    ratedEpisodes.length > 0
      ? Math.round(
          (ratedEpisodes.reduce((sum, item) => sum + Number(item.rating), 0) /
            ratedEpisodes.length) *
            10,
        ) / 10
      : null;

  await updateUserContent(userId, seriesContentId, { rating: average });

  return { average, ratedEpisodeCount: ratedEpisodes.length };
}
