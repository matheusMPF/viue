import { friendship_status, room_match_mode } from '@/generated/prisma/enums';
import { generateOpaqueToken } from '@/lib/auth/crypto';
import { AuthError } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';
import {
  notifyFriendRequestReceived,
  notifyRoomInvite,
} from '@/services/notifications/notification.service';
import { getAcceptedFriendIds } from '@/services/shared/friendships';
import { calculateRoomMatches } from './room-matches';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  avatar_url: true,
} as const;

function communityError(message: string, status = 400) {
  return new AuthError(status === 403 ? 'UNAUTHORIZED' : 'INVALID_REQUEST', message, status);
}

export async function getCommunityOverview(userId: string, search = '') {
  const friendships = await prisma.tb_friendship.findMany({
    where: { OR: [{ requester_id: userId }, { addressee_id: userId }] },
    include: {
      tb_user_tb_friendship_addressee_idTotb_user: { select: publicUserSelect },
      tb_user_tb_friendship_requester_idTotb_user: { select: publicUserSelect },
    },
    orderBy: { updated_at: 'desc' },
  });

  const friendIds = new Set<string>();
  const friends = friendships
    .filter((item) => item.status === friendship_status.ACCEPTED)
    .map((item) => {
      const friend =
        item.requester_id === userId
          ? item.tb_user_tb_friendship_addressee_idTotb_user
          : item.tb_user_tb_friendship_requester_idTotb_user;
      friendIds.add(friend.id);
      return { friendshipId: item.id, ...friend };
    });

  const incomingRequests = friendships
    .filter((item) => item.status === friendship_status.PENDING && item.addressee_id === userId)
    .map((item) => ({
      friendshipId: item.id,
      ...item.tb_user_tb_friendship_requester_idTotb_user,
    }));

  const pendingIds = new Set(
    friendships
      .filter((item) => item.status === friendship_status.PENDING)
      .flatMap((item) => [item.requester_id, item.addressee_id]),
  );

  const suggestions = search.trim()
    ? await prisma.tb_user.findMany({
        where: {
          id: { notIn: [userId, ...friendIds, ...pendingIds] },
          email_verified: true,
          status: 'ACTIVE',
          OR: [
            { name: { contains: search.trim(), mode: 'insensitive' } },
            { email: { contains: search.trim(), mode: 'insensitive' } },
          ],
        },
        select: publicUserSelect,
        take: 8,
        orderBy: { name: 'asc' },
      })
    : [];

  const rooms = await prisma.tb_room.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { owner_id: userId },
        { tb_room_participant: { some: { user_id: userId, active: true } } },
      ],
    },
    include: {
      tb_user: { select: publicUserSelect },
      tb_room_participant: { where: { active: true }, select: { user_id: true } },
    },
    orderBy: { updated_at: 'desc' },
  });

  return {
    friends,
    incomingRequests,
    suggestions,
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      matchMode: room.match_mode,
      owner: room.tb_user,
      participantCount: room.tb_room_participant.length,
      isOwner: room.owner_id === userId,
    })),
  };
}

export async function sendFriendRequest(userId: string, addresseeId: string) {
  if (userId === addresseeId) throw communityError('Você não pode adicionar a si mesmo.');

  const addressee = await prisma.tb_user.findFirst({
    where: { id: addresseeId, email_verified: true, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!addressee) throw communityError('Usuário não encontrado.', 404);

  const existing = await prisma.tb_friendship.findFirst({
    where: {
      OR: [
        { requester_id: userId, addressee_id: addresseeId },
        { requester_id: addresseeId, addressee_id: userId },
      ],
    },
  });
  if (existing?.status === friendship_status.ACCEPTED) {
    throw communityError('Vocês já são amigos.');
  }
  if (existing?.status === friendship_status.PENDING) {
    throw communityError('Já existe uma solicitação pendente.');
  }

  const friendship = existing
    ? await prisma.tb_friendship.update({
        where: { id: existing.id },
        data: {
          requester_id: userId,
          addressee_id: addresseeId,
          status: friendship_status.PENDING,
          updated_at: new Date(),
        },
      })
    : await prisma.tb_friendship.create({
        data: { requester_id: userId, addressee_id: addresseeId },
      });

  await notifyFriendRequestReceived(addresseeId, userId, friendship.id);
  return friendship;
}

export async function respondToFriendRequest(
  userId: string,
  friendshipId: string,
  status: 'ACCEPTED' | 'REJECTED',
) {
  const request = await prisma.tb_friendship.findFirst({
    where: {
      id: friendshipId,
      addressee_id: userId,
      status: friendship_status.PENDING,
    },
  });
  if (!request) throw communityError('Solicitação não encontrada.', 404);

  return prisma.tb_friendship.update({
    where: { id: friendshipId },
    data: { status, updated_at: new Date() },
  });
}

export async function removeFriend(userId: string, friendshipId: string) {
  const friendship = await prisma.tb_friendship.findFirst({
    where: {
      id: friendshipId,
      status: friendship_status.ACCEPTED,
      OR: [{ requester_id: userId }, { addressee_id: userId }],
    },
  });
  if (!friendship) throw communityError('Amizade não encontrada.', 404);
  await prisma.tb_friendship.delete({ where: { id: friendshipId } });
}

export async function createRoom(
  userId: string,
  input: {
    name: string;
    description?: string;
    friendIds: string[];
    matchMode: keyof typeof room_match_mode;
  },
) {
  const uniqueFriendIds = [...new Set(input.friendIds)].filter((id) => id !== userId);
  if (uniqueFriendIds.length > 0) {
    const accepted = await prisma.tb_friendship.findMany({
      where: {
        status: friendship_status.ACCEPTED,
        OR: [
          { requester_id: userId, addressee_id: { in: uniqueFriendIds } },
          { addressee_id: userId, requester_id: { in: uniqueFriendIds } },
        ],
      },
      select: { requester_id: true, addressee_id: true },
    });
    const acceptedIds = new Set(
      accepted.map((item) =>
        item.requester_id === userId ? item.addressee_id : item.requester_id,
      ),
    );
    if (uniqueFriendIds.some((id) => !acceptedIds.has(id))) {
      throw communityError('A sala só pode incluir amigos aceitos.');
    }
  }

  return prisma.tb_room.create({
    data: {
      owner_id: userId,
      name: input.name,
      description: input.description || null,
      match_mode: input.matchMode,
      tb_room_participant: {
        create: [userId, ...uniqueFriendIds].map((participantId) => ({
          user_id: participantId,
        })),
      },
    },
    select: { id: true },
  });
}

export async function getRoomDetail(userId: string, roomId: string) {
  const room = await prisma.tb_room.findFirst({
    where: {
      id: roomId,
      status: 'ACTIVE',
      OR: [
        { owner_id: userId },
        { tb_room_participant: { some: { user_id: userId, active: true } } },
      ],
    },
    include: {
      tb_user: { select: publicUserSelect },
      tb_room_participant: {
        where: { active: true },
        include: { tb_user: { select: publicUserSelect } },
        orderBy: { joined_at: 'asc' },
      },
    },
  });
  if (!room) throw communityError('Sala não encontrada ou sem acesso.', 404);

  const inviteCode = room.invite_code ?? (await ensureRoomInviteCode(room.id));

  const participantIds = room.tb_room_participant.map((item) => item.user_id);
  const friendIds = await getAcceptedFriendIds(userId);
  const candidateIds = friendIds.filter((id) => !participantIds.includes(id));
  const inviteCandidates =
    candidateIds.length > 0
      ? await prisma.tb_user.findMany({
          where: { id: { in: candidateIds } },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        })
      : [];

  const ratings = await prisma.tb_user_content.findMany({
    where: { user_id: { in: participantIds }, rating: { not: null } },
    include: { tb_content: true },
  });
  const minimumRatings =
    room.match_mode === room_match_mode.ALL_PARTICIPANTS
      ? participantIds.length
      : Math.min(2, participantIds.length);
  const matches = calculateRoomMatches(
    ratings.map((rating) => ({
      contentId: rating.content_id,
      title: rating.tb_content.title,
      type: rating.tb_content.type,
      posterUrl: rating.tb_content.poster_url,
      releaseYear: rating.tb_content.release_date?.getUTCFullYear().toString() ?? null,
      rating: Number(rating.rating),
    })),
    minimumRatings,
  );

  return {
    id: room.id,
    name: room.name,
    description: room.description,
    matchMode: room.match_mode,
    isOwner: room.owner_id === userId,
    owner: room.tb_user,
    participants: room.tb_room_participant.map((item) => item.tb_user),
    minimumRatings,
    matches,
    inviteCode,
    inviteCandidates,
  };
}

async function ensureRoomInviteCode(roomId: string): Promise<string> {
  const inviteCode = generateOpaqueToken();
  const room = await prisma.tb_room.update({
    where: { id: roomId },
    data: { invite_code: inviteCode },
    select: { invite_code: true },
  });
  return room.invite_code!;
}

async function assertRoomMember(userId: string, roomId: string) {
  const room = await prisma.tb_room.findFirst({
    where: {
      id: roomId,
      status: 'ACTIVE',
      OR: [
        { owner_id: userId },
        { tb_room_participant: { some: { user_id: userId, active: true } } },
      ],
    },
  });
  if (!room) throw communityError('Sala não encontrada ou sem acesso.', 404);
  return room;
}

export async function inviteFriendToRoom(userId: string, roomId: string, friendId: string) {
  const room = await assertRoomMember(userId, roomId);

  const friendIds = await getAcceptedFriendIds(userId);
  if (!friendIds.includes(friendId)) {
    throw communityError('Só é possível convidar amigos aceitos.');
  }

  await prisma.tb_room_participant.upsert({
    where: { room_id_user_id: { room_id: roomId, user_id: friendId } },
    create: { room_id: roomId, user_id: friendId },
    update: { active: true, left_at: null },
  });

  await notifyRoomInvite({ inviterId: userId, inviteeId: friendId, roomId, roomName: room.name });
}

export async function joinRoomByInviteCode(userId: string, code: string) {
  const room = await prisma.tb_room.findFirst({
    where: { invite_code: code, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!room) throw communityError('Convite inválido.', 404);

  await prisma.tb_room_participant.upsert({
    where: { room_id_user_id: { room_id: room.id, user_id: userId } },
    create: { room_id: room.id, user_id: userId },
    update: { active: true, left_at: null },
  });

  return { roomId: room.id };
}

export async function updateRoomMatchMode(
  userId: string,
  roomId: string,
  matchMode: keyof typeof room_match_mode,
) {
  const room = await prisma.tb_room.findFirst({ where: { id: roomId, owner_id: userId } });
  if (!room) throw communityError('Apenas o administrador pode configurar a sala.', 403);
  await prisma.tb_room.update({
    where: { id: roomId },
    data: { match_mode: matchMode, updated_at: new Date() },
  });
  return getRoomDetail(userId, roomId);
}
