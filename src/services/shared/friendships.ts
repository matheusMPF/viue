import { prisma } from '@/lib/db';

export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
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
