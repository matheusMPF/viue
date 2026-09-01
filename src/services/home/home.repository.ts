import { prisma } from '@/lib/db';

export type HomeSocialContext = {
  friendCount: number;
  pendingFriendRequestCount: number;
  watchedByTitle: Record<string, number>;
};

export async function getHomeSocialContext(userId: string): Promise<HomeSocialContext> {
  const [friendships, pendingFriendRequestCount] = await Promise.all([
    prisma.tb_friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requester_id: userId }, { addressee_id: userId }],
      },
      select: {
        requester_id: true,
        addressee_id: true,
      },
    }),
    prisma.tb_friendship.count({
      where: { addressee_id: userId, status: 'PENDING' },
    }),
  ]);

  const friendIds = friendships.map((friendship) =>
    friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id,
  );

  if (friendIds.length === 0) {
    return { friendCount: 0, pendingFriendRequestCount, watchedByTitle: {} };
  }

  const completedContent = await prisma.tb_user_content.groupBy({
    by: ['content_id'],
    where: {
      user_id: { in: friendIds },
      status: 'COMPLETED',
    },
    _count: { user_id: true },
  });

  const content = await prisma.tb_content.findMany({
    where: { id: { in: completedContent.map((item) => item.content_id) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(content.map((item) => [item.id, item.title]));
  const watchedByTitle = Object.fromEntries(
    completedContent.flatMap((item) => {
      const title = titleById.get(item.content_id);
      return title ? ([[title, item._count.user_id]] as const) : [];
    }),
  );

  return { friendCount: friendIds.length, pendingFriendRequestCount, watchedByTitle };
}
