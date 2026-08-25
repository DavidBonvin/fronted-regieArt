import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  listEvents, getDaySheetMaster,
  listConversations, listNotifications,
  getMyOrganizations,
} from '@regieart/api';
import type { Event, DaySheetMasterResponse, Conversation, Notification, Organization } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './DashboardPage.module.scss';

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  CONCERT:           { icon: '🎤', label: 'Concierto',  color: '#4A827E' },
  REHEARSAL:         { icon: '🎸', label: 'Ensayo',     color: '#7E7B4A' },
  AUDITION:          { icon: '🎼', label: 'Audición',   color: '#6E4A7E' },
  TOUR_DATE:         { icon: '🚌', label: 'Gira',       color: '#4A6E7E' },
  RECORDING_SESSION: { icon: '🎙️', label: 'Grabación',  color: '#7E4F4A' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Borrador',   color: '#8A96A8', bg: 'rgba(138,150,168,0.12)' },
  CONFIRMED: { label: 'Confirmado', color: '#4A827E', bg: 'rgba(74,130,126,0.12)' },
  CANCELLED: { label: 'Cancelado',  color: '#E05A5A', bg: 'rgba(224,90,90,0.12)' },
  COMPLETED: { label: 'Completado', color: '#6B8AC4', bg: 'rgba(107,138,196,0.12)' },
};

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [org, setOrg] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [daysheet, setDaysheet] = useState<DaySheetMasterResponse | null>(null);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30).toISOString();

    Promise.allSettled([
      getMyOrganizations(),
      listConversations(),
      listNotifications({ limit: 10 }),
    ]).then(async ([orgsRes, convosRes, notifsRes]) => {
      const orgs = orgsRes.status === 'fulfilled' ? orgsRes.value : [];
      const convosData = convosRes.status === 'fulfilled' ? convosRes.value : [];
      const notifsData = notifsRes.status === 'fulfilled' ? notifsRes.value : { notifications: [] };

      const firstError = [orgsRes, convosRes, notifsRes].find(r => r.status === 'rejected');
      if (firstError && firstError.status === 'rejected') {
        const status = (firstError.reason as { response?: { status?: number } })?.response?.status;
        if (status === 401) { navigate('/login'); return; }
      }

      const firstOrg = orgs[0] ?? null;
      setOrg(firstOrg);
      setConvos((Array.isArray(convosData) ? convosData : []).filter(c => c?.userId).slice(0, 5));
      setNotifs((notifsData.notifications ?? []).filter((n) => !n.isRead).slice(0, 5));

      try {
        const eventsData = await listEvents({
          orgId: firstOrg?.id,
          from,
          to,
          limit: 10,
        });
        setEvents(eventsData.events);
        if (eventsData.events[0]) {
          getDaySheetMaster(eventsData.events[0].id).then(setDaysheet).catch(() => {});
        }
      } catch { /* show empty */ }
    }).finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className={p.spinner} />;

  const unreadNotifs = notifs.length;
  const unreadMessages = convos.filter((c) => c.unreadCount > 0).length;

  return (
    <div className={p.page}>
      <div className={p.pageHeader}>
        <h1 className={p.pageTitle}>{t('dashboard.title')}</h1>
        <p className={p.pageSubtitle}>
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {org && ` · ${org.name}`}
        </p>
      </div>

      <div className={`${p.grid4} ${s.statsRow}`}>
        <div className={p.statCard}>
          <div className={p.statLabel}>{t('dashboard.next_event')}</div>
          <div className={p.statValue}>{events.length}</div>
          <div className={p.statSub}>Próximos 30 días</div>
        </div>
        <div className={p.statCard}>
          <div className={p.statLabel}>{t('dashboard.unread_messages')}</div>
          <div className={p.statValue}>{unreadMessages}</div>
          <div className={p.statSub}>{t('dashboard.conversations')}</div>
        </div>
        <div className={p.statCard}>
          <div className={p.statLabel}>{t('dashboard.notifications')}</div>
          <div className={p.statValue}>{unreadNotifs}</div>
          <div className={p.statSub}>{t('dashboard.unread')}</div>
        </div>
        <div className={p.statCard}>
          <div className={p.statLabel}>{t('dashboard.org')}</div>
          <div className={s.orgStatName}>{org?.name ?? '—'}</div>
          <div className={p.statSub}>{t('dashboard.active')}</div>
        </div>
      </div>

      {/* Accesos rápidos — visible solo en mobile via CSS */}
      <div className={s.quickActionsSection}>
        <div className={s.quickSectionLabel}>Accesos rápidos</div>
        <div className={s.quickActionsGrid}>
          <Link to="/timeline" className={s.quickActionTile}>
            <span className={s.quickActionIcon}>📅</span>
            <span>Agenda</span>
          </Link>
          <Link to="/finance" className={s.quickActionTile}>
            <span className={s.quickActionIcon}>💰</span>
            <span>Finanzas</span>
          </Link>
          <Link to="/backline" className={s.quickActionTile}>
            <span className={s.quickActionIcon}>🎸</span>
            <span>Backline</span>
          </Link>
          <Link to="/convoy" className={s.quickActionTile}>
            <span className={s.quickActionIcon}>🚌</span>
            <span>Convoy</span>
          </Link>
        </div>
      </div>

      <div className={s.mainGrid}>
        <div className={s.leftCol}>
          <div className={p.card}>
            <div className={s.cardHeader}>
              <span className={s.cardLabel}>Próximos eventos</span>
            </div>

            {events.length === 0 ? (
              <div className={p.empty}>
                <div className={p.emptyTitle}>{t('dashboard.no_events')}</div>
                <div className={p.emptyBody}>{t('dashboard.no_events_hint')}</div>
              </div>
            ) : (
              events.map((ev, i) => {
                const tm = TYPE_META[ev.type] ?? { icon: '📅', label: ev.type, color: '#4A827E' };
                const sm = STATUS_META[ev.status] ?? STATUS_META.DRAFT;
                const isFirst = i === 0;
                return (
                  <Link
                    key={ev.id}
                    to={`/events/${ev.id}`}
                    className={s.richEventRow}
                    style={{ borderLeftColor: tm.color }}
                  >
                    <span className={s.richEventIcon}>{tm.icon}</span>
                    <div className={s.richEventContent}>
                      <div className={s.richEventBadges}>
                        <span
                          className={s.richTypeBadge}
                          style={{ background: tm.color + '26', color: tm.color }}
                        >
                          {tm.label}
                        </span>
                        <span
                          className={s.richStatusBadge}
                          style={{ background: sm.bg, color: sm.color }}
                        >
                          {sm.label}
                        </span>
                      </div>
                      <div className={s.richEventTitle}>{ev.title}</div>
                      <div className={s.richEventMeta}>
                        🗓{' '}
                        {new Date(ev.startTime).toLocaleDateString('es-AR', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' · '}
                        {new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {ev.description && (
                        <div className={s.richEventDesc}>{ev.description}</div>
                      )}
                      {isFirst && daysheet?.schedule && daysheet.schedule.length > 0 && (
                        <div className={s.scheduleInline}>
                          {daysheet.schedule.slice(0, 4).map((item) => (
                            <div key={item.id} className={s.scheduleInlineRow}>
                              <span className={s.scheduleInlineTime}>
                                {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={s.scheduleInlineLabel}>{item.title}</span>
                              {item.isCompleted && <span className={s.scheduleInlineDone}>✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={s.richEventArrow}>›</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className={s.rightCol}>
          <div className={p.card}>
            <div className={s.cardHeader}>
              <span className={s.cardLabel}>{t('nav.messages')}</span>
              <Link to="/messages" className={s.viewLink}>{t('common.view_all')} →</Link>
            </div>
            {convos.length === 0 ? (
              <div className={s.rightEmpty}>{t('common.no_results')}</div>
            ) : (
              convos.map((c) => (
                <div
                  key={c.userId}
                  className={s.convoRow}
                  onClick={() => navigate(`/messages/direct/${c.userId}`)}
                >
                  <div className={s.convoAvatar}>
                    {(c.user?.displayName ?? c.userId ?? '').slice(0, 2).toUpperCase()}
                  </div>
                  <div className={s.convoInfo}>
                    <div className={s.convoName}>{c.user?.displayName ?? c.userId ?? '—'}</div>
                    {c.lastMessage && (
                      <div className={s.convoPreview}>{c.lastMessage.content}</div>
                    )}
                  </div>
                  {c.unreadCount > 0 && (
                    <span className={s.unreadBadge}>{c.unreadCount}</span>
                  )}
                </div>
              ))
            )}
          </div>

          {notifs.length > 0 && (
            <div className={`${p.card} ${s.notifsCard}`}>
              <div className={s.cardHeader}>
                <span className={s.cardLabel}>{t('messages.notifications_tab')}</span>
                <Link to="/notifications" className={s.viewLink}>{t('common.view_all')} →</Link>
              </div>
              {notifs.map((n) => (
                <div key={n.id} className={s.notifRow}>
                  <div className={s.notifDot} />
                  <div className={s.notifContent}>
                    <div className={s.notifTitle}>{n.title}</div>
                    {n.body && <div className={s.notifBody}>{n.body}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}