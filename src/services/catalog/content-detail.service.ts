import { content_type, library_status } from '@/generated/prisma/enums';
import { prisma } from '@/lib/db/client';

async function getFriendIds(userId: string) {
  const friendships = await prisma.tb_friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requester_id: userId }, { addressee_id: userId }],
    },
    select: { requester_id: true, addressee_id: true },
  });

  return friendships.map((friendship) =>
    friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id,
  );
}

export async function getContentDetail(contentId: string, userId: string) {
  const [content, friendIds] = await Promise.all([
    prisma.tb_content.findUnique({
      where: { id: contentId },
      include: {
        tb_content_genre: { include: { tb_genre: true } },
        tb_movie: true,
        tb_series: true,
        tb_user_content: {
          where: { user_id: userId },
          take: 1,
          include: { tb_user_content_streaming: { include: { tb_streaming_service: true } } },
        },
      },
    }),
    getFriendIds(userId),
  ]);

  if (!content) return null;

  const friendRatings =
    friendIds.length > 0
      ? await prisma.tb_user_content.findMany({
          where: { content_id: contentId, user_id: { in: friendIds }, rating: { not: null } },
          include: { tb_user: { select: { id: true, name: true, avatar_url: true } } },
          orderBy: { updated_at: 'desc' },
        })
      : [];

  return {
    id: content.id,
    type: content.type === content_type.SERIES ? 'SERIES' : 'MOVIE',
    title: content.title,
    originalTitle: content.original_title,
    overview: content.description,
    posterUrl: content.poster_url,
    backdropUrl: content.backdrop_url,
    releaseYear: content.release_date?.getUTCFullYear().toString() ?? null,
    rating: content.external_rating?.toString() ?? null,
    genres: content.tb_content_genre.map(({ tb_genre }) => tb_genre.name),
    friendRatings: friendRatings.map((item) => ({
      id: item.tb_user.id,
      name: item.tb_user.name,
      avatarUrl: item.tb_user.avatar_url,
      rating: item.rating?.toString() ?? null,
    })),
    library: content.tb_user_content[0]
      ? {
          status: content.tb_user_content[0].status,
          rating: content.tb_user_content[0].rating?.toString() ?? null,
          streaming:
            content.tb_user_content[0].tb_user_content_streaming[0]?.tb_streaming_service.name ??
            null,
        }
      : null,
  };
}

export async function updateUserContent(
  userId: string,
  contentId: string,
  data: { status?: library_status; rating?: number | null; streaming?: string | null },
) {
  const userContent = await prisma.tb_user_content.upsert({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
    create: {
      user_id: userId,
      content_id: contentId,
      status: data.status ?? library_status.WANT_TO_WATCH,
      rating: data.rating,
    },
    update: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.rating !== undefined ? { rating: data.rating } : {}),
      updated_at: new Date(),
    },
  });
  if (data.streaming !== undefined) {
    await prisma.tb_user_content_streaming.deleteMany({
      where: { user_content_id: userContent.id },
    });
    if (data.streaming) {
      const service = await prisma.tb_streaming_service.upsert({
        where: { name: data.streaming },
        create: { name: data.streaming },
        update: {},
      });
      await prisma.tb_user_content_streaming.create({
        data: { user_content_id: userContent.id, streaming_service_id: service.id },
      });
    }
  }
  return userContent;
}

export async function getUserLibrary(userId: string) {
  const [items, friendIds] = await Promise.all([
    prisma.tb_user_content.findMany({
      where: { user_id: userId },
      include: {
        tb_content: { include: { tb_content_genre: { include: { tb_genre: true } } } },
        tb_user_content_streaming: { include: { tb_streaming_service: true } },
      },
      orderBy: { updated_at: 'desc' },
    }),
    getFriendIds(userId),
  ]);

  const friendRatingGroups =
    items.length > 0 && friendIds.length > 0
      ? await prisma.tb_user_content.groupBy({
          by: ['content_id'],
          where: {
            content_id: { in: items.map((item) => item.content_id) },
            user_id: { in: friendIds },
            rating: { not: null },
          },
          _count: { rating: true },
          _avg: { rating: true },
        })
      : [];
  const friendRatingsByContentId = new Map(
    friendRatingGroups.map((group) => [group.content_id, group]),
  );

  return items.map((item) => {
    const friendRating = friendRatingsByContentId.get(item.content_id);
    return {
      id: item.tb_content.id,
      title: item.tb_content.title,
      type: item.tb_content.type,
      posterUrl: item.tb_content.poster_url,
      backdropUrl: item.tb_content.backdrop_url,
      releaseYear: item.tb_content.release_date?.getUTCFullYear().toString() ?? null,
      rating: item.tb_content.external_rating?.toString() ?? null,
      genres: item.tb_content.tb_content_genre.map(({ tb_genre }) => tb_genre.name),
      originalTitle: item.tb_content.original_title,
      overview: item.tb_content.description,
      releaseDate: item.tb_content.release_date?.toISOString().slice(0, 10) ?? null,
      voteCount: item.tb_content.external_votes,
      status: item.status,
      userRating: item.rating?.toString() ?? null,
      streaming: item.tb_user_content_streaming[0]?.tb_streaming_service.name ?? null,
      friendRatingCount: friendRating?._count.rating ?? 0,
      friendRatingAverage: friendRating?._avg.rating?.toString() ?? null,
    };
  });
}
