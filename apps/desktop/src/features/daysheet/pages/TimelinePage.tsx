import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listEvents, getDaySheetMaster, getMyOrganizations } from '@regieart/api';
import type { Event, DaySheetMasterResponse } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './TimelinePage.module.scss';

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

type RightTab = 'schedule' | 'notes' | 'roster';

export function TimelinePage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DaySheetMasterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<RightTab>('schedule');
  const [activeNoteTab, setActiveNoteTab] = useState(0);

  useEffect(() => {
    const now = new Date();
    const from = now.toISOString().slice(0, 10);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60).toISOString().slice(0, 10);

    getMyOrganizations()
      .then((orgs) => listEvents({ orgId: orgs[0]?.id, from, to, limit: 20 }))
      .catch(() => listEvents({ from, to, limit: 20 }))
      .then((res) => {
        setEvents(res.events);
        if (res.events[0]) selectEvent(res.events[0].id);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectEvent(id: string) {
    setSelectedId(id);
    setDetail(null);
    setLoadingDetail(true);
    setActiveTab('schedule');
    getDaySheetMaster(id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }

  const now = new Date();

  function fmtTime(iso: string) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const ev = detail?.event ?? events.find((e) => e.id === selectedId) ?? null;
  const typeMeta = ev ? (TYPE_META[ev.type] ?? { icon: '📅', label: ev.type, color: '#4A827E' }) : null;
  const statusMeta = ev ? (STATUS_META[ev.status] ?? STATUS_META.DRAFT) : null;

  const noteTabs = ev ? [
    { label: 'Setlist',    content: ev.setlistNotes },
    { label: 'DaySheet',   content: ev.daysheetNotes },
    { label: 'Itinerario', content: ev.itineraryNotes },
  ] : [];

  return (
    <div className={p.pageWide}>
      <div className={s.layout}>
                <div className={s.eventList}>
          <div className={s.eventListTitle}>{t('nav.timeline')}</div>

          {loading ? (
            <div className={p.spinner} style={{ marginTop: 24 }} />
          ) : events.length === 0 ? (
            <div className={s.emptyList}>Sin eventos próximos</div>
          ) : (
            events.map((item) => {
              const tm = TYPE_META[item.type] ?? { icon: '📅', label: item.type, color: '#4A827E' };
              const sm = STATUS_META[item.status] ?? STATUS_META.DRAFT;
              const isActive = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  className={`${s.eventItem} ${isActive ? s.active : ''}`}
                  style={isActive ? { borderLeftColor: tm.color } : {}}
                  onClick={() => selectEvent(item.id)}
                >
                  <div className={s.eventItemRow}>
                    <span className={s.eventItemIcon}>{tm.icon}</span>
                    <div className={s.eventItemMeta}>
                      <div className={s.eventName}>{item.title}</div>
                      <div className={s.eventDate}>
                        {new Date(item.startTime).toLocaleDateString('es-AR', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                        {' · '}
                        {fmtTime(item.startTime)}
                      </div>
                    </div>
                  </div>
                  <div className={s.eventItemBadges}>
                    <span
                      className={s.typePill}
                      style={{ background: tm.color + '26', color: tm.color }}
                    >
                      {tm.label}
                    </span>
                    <span
                      className={s.statusPill}
                      style={{ background: sm.bg, color: sm.color }}
                    >
                      {sm.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

                <div className={s.detailArea}>
          {!selectedId ? (
            <div className={p.empty}>
              <div className={p.emptyTitle}>Seleccioná un evento</div>
            </div>
          ) : loadingDetail ? (
            <div className={p.spinner} />
          ) : !ev ? (
            <div className={p.empty}><div className={p.emptyTitle}>No se pudo cargar</div></div>
          ) : (
            <>
              <div
                className={s.eventHeader}
                style={{ borderLeftColor: typeMeta?.color ?? '#4A827E' }}
              >
                <div className={s.eventHeaderTop}>
                  <span className={s.eventHeaderIcon}>{typeMeta?.icon}</span>
                  <div className={s.eventHeaderContent}>
                    <div className={s.eventHeaderBadges}>
                      <span
                        className={s.typePill}
                        style={{ background: (typeMeta?.color ?? '#4A827E') + '26', color: typeMeta?.color }}
                      >
                        {typeMeta?.label}
                      </span>
                      <span
                        className={s.statusPill}
                        style={{ background: statusMeta?.bg, color: statusMeta?.color }}
                      >
                        {statusMeta?.label}
                      </span>
                      {ev.isPublic && <span className={s.publicPill}>🌐 Público</span>}
                    </div>
                    <h2 className={s.eventHeaderTitle}>{ev.title}</h2>
                    <div className={s.eventHeaderMeta}>
                      <span>🗓 {fmtDateTime(ev.startTime)}</span>
                      {ev.endTime && <span> — {fmtDateTime(ev.endTime)}</span>}
                      {detail?.venue && <span> · 📍 {detail.venue.name}, {detail.venue.city}</span>}
                    </div>
                    {ev.description && (
                      <p className={s.eventHeaderDesc}>{ev.description}</p>
                    )}
                  </div>
                  <Link to={`/events/${ev.id}`} className={s.viewFullBtn}>
                    Ver completo →
                  </Link>
                </div>

                {detail && (
                  <div className={s.quickStats}>
                    <div className={s.quickStat}>
                      <span className={s.quickStatVal}>{detail.meta.totalScheduleItems}</span>
                      <span className={s.quickStatLbl}>Horarios</span>
                    </div>
                    <div className={s.quickStat}>
                      <span className={s.quickStatVal}>{detail.roster.length}</span>
                      <span className={s.quickStatLbl}>Músicos</span>
                    </div>
                    <div className={s.quickStat}>
                      <span className={s.quickStatVal}>{detail.meta.confirmedAttendees}</span>
                      <span className={s.quickStatLbl}>Confirmados</span>
                    </div>
                    <div className={s.quickStat}>
                      <span className={s.quickStatVal}>{detail.meta.totalVehicles}</span>
                      <span className={s.quickStatLbl}>Vehículos</span>
                    </div>
                    {detail.finance && (
                      <div className={s.quickStat}>
                        <span
                          className={s.quickStatVal}
                          style={{ color: detail.finance.isPaid ? '#4A827E' : '#E0A05A', fontSize: 13 }}
                        >
                          {detail.finance.isPaid ? '✓ Pagado' : '⏳ Pendiente'}
                        </span>
                        <span className={s.quickStatLbl}>Finanzas</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

                            <div className={s.tabs}>
                <button
                  className={`${s.tab} ${activeTab === 'schedule' ? s.tabActive : ''}`}
                  onClick={() => setActiveTab('schedule')}
                >
                  Cronograma {detail && `(${detail.schedule.length})`}
                </button>
                <button
                  className={`${s.tab} ${activeTab === 'notes' ? s.tabActive : ''}`}
                  onClick={() => setActiveTab('notes')}
                >
                  Notas
                </button>
                <button
                  className={`${s.tab} ${activeTab === 'roster' ? s.tabActive : ''}`}
                  onClick={() => setActiveTab('roster')}
                >
                  Roster {detail && `(${detail.roster.length})`}
                </button>
              </div>

                            {activeTab === 'schedule' && (
                <div className={s.tabContent}>
                  {!detail || detail.schedule.length === 0 ? (
                    <div className={s.emptyTab}>Sin ítems de cronograma para este evento.</div>
                  ) : (
                    <div className={s.items}>
                      {detail.schedule.map((item) => {
                        const start = new Date(item.startTime);
                        const end = new Date(item.endTime ?? item.startTime);
                        const isPast = end < now;
                        const isCurrent = start <= now && end >= now;
                        return (
                          <div
                            key={item.id}
                            className={`${s.item} ${isPast ? s.past : ''} ${isCurrent ? s.current : ''}`}
                          >
                            <div className={s.time}>{fmtTime(item.startTime)}</div>
                            <div className={s.bar} />
                            <div className={s.info}>
                              <div className={s.itype}>{item.type.replace(/_/g, ' ')}</div>
                              <div className={s.ilabel}>{item.title}</div>
                              {item.endTime && (
                                <div className={s.iend}>hasta {fmtTime(item.endTime)}</div>
                              )}
                              {item.location && (
                                <div className={s.imeta}>📍 {item.location}</div>
                              )}
                              {item.withWho && (
                                <div className={s.imeta}>👤 {item.withWho}</div>
                              )}
                              {item.notes && (
                                <div className={s.inotes}>{item.notes}</div>
                              )}
                            </div>
                            {item.isCompleted && (
                              <div className={s.idone}>✓</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

                            {activeTab === 'notes' && (
                <div className={s.tabContent}>
                  {noteTabs.every((t) => !t.content) ? (
                    <div className={s.emptyTab}>Sin notas para este evento.</div>
                  ) : (
                    <>
                      <div className={s.noteTabs}>
                        {noteTabs.map((tab, i) => (
                          <button
                            key={tab.label}
                            className={`${s.noteTab} ${activeNoteTab === i ? s.noteTabActive : ''}`}
                            onClick={() => setActiveNoteTab(i)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      {noteTabs[activeNoteTab].content ? (
                        <pre className={s.noteContent}>{noteTabs[activeNoteTab].content}</pre>
                      ) : (
                        <div className={s.emptyTab}>Sin {noteTabs[activeNoteTab].label.toLowerCase()}.</div>
                      )}
                    </>
                  )}
                </div>
              )}

                            {activeTab === 'roster' && (
                <div className={s.tabContent}>
                  {!detail || detail.roster.length === 0 ? (
                    <div className={s.emptyTab}>Sin músicos asignados a este evento.</div>
                  ) : (
                    detail.roster.map((entry) => {
                      const confirmed = entry.status === 'CONFIRMED';
                      const declined  = entry.status === 'DECLINED';
                      return (
                        <div key={entry.userId} className={s.rosterRow}>
                          <div className={s.rosterAvatar}>
                            {entry.user.displayName?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className={s.rosterInfo}>
                            <div className={s.rosterName}>{entry.user.displayName}</div>
                            {entry.role && <div className={s.rosterRole}>{entry.role}</div>}
                          </div>
                          <span
                            className={s.rosterStatus}
                            style={{
                              background: confirmed ? 'rgba(74,130,126,0.12)' : declined ? 'rgba(224,90,90,0.12)' : 'rgba(138,150,168,0.10)',
                              color: confirmed ? '#4A827E' : declined ? '#E05A5A' : '#8A96A8',
                            }}
                          >
                            {confirmed ? '✓ Confirmado' : declined ? '✕ Rechazado' : '? Invitado'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
