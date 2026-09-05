import { room_match_session_status } from '@/generated/prisma/enums';
import { prisma } from '@/lib/db';
import { getMatchSessionIdleCutoff } from './community-lifecycle';

export async function closeInactiveCommunityState(roomId?: string) {
  const now = new Date();
  const roomScope = roomId ? { id: roomId } : {};
  const sessionRoomScope = roomId ? { room_id: roomId } : {};

  return prisma.$transaction(async (tx) => {
    const closedRooms = await tx.tb_room.updateMany({
      where: {
        ...roomScope,
        status: 'ACTIVE',
        tb_room_participant: { none: { active: true } },
      },
      data: { status: 'CLOSED', updated_at: now },
    });

    const canceledSessions = await tx.tb_room_match_session.updateMany({
      where: {
        ...sessionRoomScope,
        status: {
          in: [room_match_session_status.WAITING, room_match_session_status.ACTIVE],
        },
        OR: [
          { updated_at: { lte: getMatchSessionIdleCutoff(now) } },
          { tb_room: { status: 'CLOSED' } },
          { tb_room: { tb_room_participant: { none: { active: true } } } },
        ],
      },
      data: {
        completed_at: now,
        status: room_match_session_status.CANCELED,
        updated_at: now,
      },
    });

    return { canceledSessions: canceledSessions.count, closedRooms: closedRooms.count };
  });
}
