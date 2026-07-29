import type { Notification } from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import type { ApiRes } from '../client/types';

export async function listNotifications(params?: {
  isRead?: boolean;
  page?: number;
  limit?: number;
}): Promise<{
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}> {
  const res = await getHttpClient()
    .get('notifications', {
      searchParams: (params ?? {}) as Record<string, string | number | boolean>,
    })
    .json<
      ApiRes<{
        notifications: Notification[];
        total: number;
        unreadCount: number;
        page: number;
        limit: number;
      }>
    >();
  return res.data;
}

export async function markNotificationRead(notifId: string): Promise<Notification> {
  const res = await getHttpClient()
    .patch(`notifications/${notifId}/read`)
    .json<ApiRes<Notification>>();
  return res.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await getHttpClient().patch('notifications/read-all');
}

export async function deleteNotification(notifId: string): Promise<void> {
  await getHttpClient().delete(`notifications/${notifId}`);
}
