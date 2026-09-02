import { notification_type } from '@/generated/prisma/enums';
import { AuthError } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';
import { getAcceptedFriendIds } from '@/services/shared/friendships';

function notificationError(message: string, status = 400) {
  return new AuthError(status === 403 ? 'UNAUTHORIZED' : 'INVALID_REQUEST', message, status);
}

const actorSelect = { id: true, name: true, avatar_url: true } as const;

function mapNotification(notification: {
  id: string;
  type: notification_type;
  title: string;
  message: string;
  action_url: string | null;
  read_at: Date | null;
  created_at: Date;
  tb_user_tb_notification_actor_idTotb_user: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.action_url,
    read: notification.read_at !== null,
    createdAt: notification.created_at.toISOString(),
    actor: notification.tb_user_tb_notification_actor_idTotb_user
      ? {
          id: notification.tb_user_tb_notification_actor_idTotb_user.id,
          name: notification.tb_user_tb_notification_actor_idTotb_user.name,
          avatarUrl: notification.tb_user_tb_notification_actor_idTotb_user.avatar_url,
        }
      : null,
  };
}

async function createNotification(input: {
  userId: string;
  type: notification_type;
  title: string;
  message: string;
  actorId?: string;
  contentId?: string;
  friendshipId?: string;
  roomId?: string;
  actionUrl?: string;
}) {
  if (input.actorId && input.actorId === input.userId) return null;

  return prisma.tb_notification.create({
    data: {
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      actor_id: input.actorId,
      content_id: input.contentId,
      friendship_id: input.friendshipId,
      room_id: input.roomId,
      action_url: input.actionUrl,
    },
  });
}

export async function notifyAccountCreated(userId: string) {
  return createNotification({
    userId,
    type: notification_type.ACCOUNT_CREATED,
    title: 'Bem-vindo(a) à Viuê!',
    message: 'Sua conta foi criada. Comece registrando o que você já assistiu.',
  });
}

export async function notifyFriendRequestReceived(
  addresseeId: string,
  requesterId: string,
  friendshipId: string,
) {
  const requester = await prisma.tb_user.findUnique({
    where: { id: requesterId },
    select: { name: true },
  });
  if (!requester) return null;

  return createNotification({
    userId: addresseeId,
    type: notification_type.FRIEND_REQUEST_RECEIVED,
    title: 'Novo pedido de amizade',
    message: `${requester.name} quer ser seu amigo.`,
    actorId: requesterId,
    friendshipId,
    actionUrl: '/comunidade',
  });
}

export async function notifyRoomInvite({
  inviterId,
  inviteeId,
  roomId,
  roomName,
}: {
  inviterId: string;
  inviteeId: string;
  roomId: string;
  roomName: string;
}) {
  const inviter = await prisma.tb_user.findUnique({
    where: { id: inviterId },
    select: { name: true },
  });
  if (!inviter) return null;

  return createNotification({
    userId: inviteeId,
    type: notification_type.ROOM_INVITE_RECEIVED,
    title: 'Convite para sala',
    message: `${inviter.name} te chamou pra sala "${roomName}".`,
    actorId: inviterId,
    roomId,
    actionUrl: `/comunidade/salas/${roomId}`,
  });
}

export async function notifyFriendContentRated({
  raterId,
  contentId,
}: {
  raterId: string;
  contentId: string;
}) {
  const friendIds = await getAcceptedFriendIds(raterId);
  if (friendIds.length === 0) return;

  const [rater, content, recipients] = await Promise.all([
    prisma.tb_user.findUnique({ where: { id: raterId }, select: { name: true } }),
    prisma.tb_content.findUnique({ where: { id: contentId }, select: { title: true } }),
    prisma.tb_user_content.findMany({
      where: { user_id: { in: friendIds }, content_id: contentId },
      select: { user_id: true },
    }),
  ]);
  if (!rater || !content || recipients.length === 0) return;

  await Promise.all(
    recipients.map((recipient) =>
      createNotification({
        userId: recipient.user_id,
        type: notification_type.FRIEND_CONTENT_RATED,
        title: 'Um amigo avaliou um título da sua lista',
        message: `${rater.name} avaliou ${content.title}, que está na sua lista.`,
        actorId: raterId,
        contentId,
        actionUrl: `/titulo/${contentId}`,
      }),
    ),
  );
}

export async function listNotifications(userId: string, limit = 20) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.tb_notification.findMany({
      where: { user_id: userId },
      include: { tb_user_tb_notification_actor_idTotb_user: { select: actorSelect } },
      orderBy: { created_at: 'desc' },
      take: limit,
    }),
    prisma.tb_notification.count({ where: { user_id: userId, read_at: null } }),
  ]);

  return { notifications: notifications.map(mapNotification), unreadCount };
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.tb_notification.count({ where: { user_id: userId, read_at: null } });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.tb_notification.findFirst({
    where: { id: notificationId, user_id: userId },
  });
  if (!notification) throw notificationError('Notificação não encontrada.', 404);
  if (notification.read_at) return notification;

  return prisma.tb_notification.update({
    where: { id: notificationId },
    data: { read_at: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.tb_notification.updateMany({
    where: { user_id: userId, read_at: null },
    data: { read_at: new Date() },
  });
}
