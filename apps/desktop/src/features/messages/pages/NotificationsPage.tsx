import React, { useEffect, useState } from 'react';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '@regieart/api';
import type { Notification } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './NotificationsPage.module.scss';

export function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNotifications({ limit: 50 }).then((res) => setNotifs(res.notifications)).finally(() => setLoading(false));
  }, []);

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleRead(id: string) {
    await markNotificationRead(id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }

  const unread = notifs.filter((n) => !n.isRead).length;

  return (
    <div className={p.page}>
      <div className={s.header}>
        <h1 className={p.pageTitle}>Notifications</h1>
        {unread > 0 && (
          <button className={p.btnSecondary} onClick={handleMarkAll}>Tout marquer comme lu</button>
        )}
      </div>
      {loading ? <div className={p.spinner} /> : (
        <div className={p.card}>
          {notifs.length === 0 ? (
            <div className={p.empty}><div className={p.emptyTitle}>Aucune notification</div></div>
          ) : notifs.map((n) => (
            <div key={n.id} className={`${s.row} ${!n.isRead ? s.unread : ''}`} onClick={() => !n.isRead && handleRead(n.id)}>
              {!n.isRead && <div className={s.dot} />}
              <div className={s.body}>
                <div className={s.title}>{n.title}</div>
                {n.body && <div className={s.text}>{n.body}</div>}
                <div className={s.time}>{new Date(n.createdAt).toLocaleString('fr-FR')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}