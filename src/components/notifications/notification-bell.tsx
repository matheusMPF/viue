'use client';

import { useRouter } from 'next/navigation';
import { Bell, PartyPopper, Star, UserPlus, UsersRound } from 'lucide-react';
import type { FocusEvent } from 'react';
import { useState } from 'react';

import { authFetch } from '@/lib/auth/auth-fetch';

type NotificationType =
  | 'ACCOUNT_CREATED'
  | 'FRIEND_REQUEST_RECEIVED'
  | 'FRIEND_CONTENT_RATED'
  | 'ROOM_INVITE_RECEIVED';

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
};

const iconByType: Record<NotificationType, typeof Bell> = {
  ACCOUNT_CREATED: PartyPopper,
  FRIEND_REQUEST_RECEIVED: UserPlus,
  FRIEND_CONTENT_RATED: Star,
  ROOM_INVITE_RECEIVED: UsersRound,
};

function formatRelativeTime(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays}d`;
}

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(unreadCount);

  async function loadNotifications() {
    setIsLoading(true);
    try {
      const response = await authFetch('/api/notifications');
      const payload = (await response.json()) as
        | { success: true; data: { notifications: NotificationItem[]; unreadCount: number } }
        | { success: false };
      if (response.ok && payload.success) {
        setNotifications(payload.data.notifications);
        setUnread(payload.data.unreadCount);
      }
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }

  function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !hasLoaded) void loadNotifications();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  }

  async function handleMarkAllRead() {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnread(0);
    await authFetch('/api/notifications/read-all', { method: 'POST' }).catch(() => undefined);
  }

  async function handleSelectNotification(notification: NotificationItem) {
    if (!notification.read) {
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
      );
      setUnread((current) => Math.max(0, current - 1));
      await authFetch(`/api/notifications/${notification.id}`, { method: 'PATCH' }).catch(
        () => undefined,
      );
    }
    setIsOpen(false);
    if (notification.actionUrl) router.push(notification.actionUrl);
  }

  return (
    <div className="notification-bell" onBlur={handleBlur}>
      <button
        aria-expanded={isOpen}
        aria-label={unread > 0 ? `${unread} notificações não lidas` : 'Notificações'}
        className="home-icon-button"
        onClick={handleToggle}
        title="Notificações"
        type="button"
      >
        <Bell aria-hidden="true" size={20} />
        {unread > 0 ? (
          <span className="home-notification-badge" aria-hidden="true">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="notification-panel" role="menu" aria-label="Notificações">
          <div className="notification-panel-header">
            <span>Notificações</span>
            {unread > 0 ? (
              <button onClick={() => void handleMarkAllRead()} type="button">
                Marcar todas como lidas
              </button>
            ) : null}
          </div>

          <div className="notification-panel-list">
            {isLoading ? (
              <p className="notification-panel-status" role="status">
                Carregando notificações
              </p>
            ) : null}

            {!isLoading && notifications.length === 0 ? (
              <p className="notification-panel-status" role="status">
                Você não tem notificações.
              </p>
            ) : null}

            {!isLoading
              ? notifications.map((notification) => {
                  const Icon = iconByType[notification.type];
                  return (
                    <button
                      className={notification.read ? 'is-read' : undefined}
                      key={notification.id}
                      onClick={() => void handleSelectNotification(notification)}
                      role="menuitem"
                      type="button"
                    >
                      <span className="notification-item-icon" aria-hidden="true">
                        <Icon size={16} />
                      </span>
                      <span className="notification-item-copy">
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                        <time>{formatRelativeTime(notification.createdAt)}</time>
                      </span>
                      {!notification.read ? (
                        <span className="notification-item-dot" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
