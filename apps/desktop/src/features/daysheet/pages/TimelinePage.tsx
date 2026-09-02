import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  listEvents, getDaySheetMaster, getEvent, getMyOrganizations,
  createScheduleItem, updateScheduleItem, toggleScheduleItemComplete, deleteScheduleItem,
} from '@regieart/api';
import type { Event, DaySheetMasterResponse, EventScheduleItem, ScheduleType } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './TimelinePage.module.scss';
import { useActiveOrganizationId } from '../../../shared/utils/useActiveOrganizationId';

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

const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: 'DEPARTURE', label: 'Salida' },
  { value: 'ARRIVAL', label: 'Llegada' },
  { value: 'LOAD_IN', label: 'Carga / montaje' },
  { value: 'SOUNDCHECK', label: 'Prueba de sonido' },
  { value: 'DOORS_OPEN', label: 'Apertura de puertas' },
  { value: 'CATERING_DINNER', label: 'Catering / cena' },
  { value: 'SHOWTIME', label: 'Inicio del show' },
  { value: 'LOAD_OUT', label: 'Desmontaje / carga' },
  { value: 'OTHER', label: 'Otra actividad' },
];

type RightTab = 'schedule' | 'notes' | 'roster';
type ScheduleDraft = {
  type: ScheduleType;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  withWho: string;
  notes: string;
};

function toDateTimeInputValue(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function emptyScheduleDraft(startTime?: string): ScheduleDraft {
  return {
    type: 'OTHER',
    title: '',
    startTime: toDateTimeInputValue(startTime) || toDateTimeInputValue(new Date().toISOString()),
    endTime: '',
    location: '',
    withWho: '',
    notes: '',
  };
}

function scheduleDraftFromItem(item: EventScheduleItem): ScheduleDraft {
  return {
    type: item.type,
    title: item.title,
    startTime: toDateTimeInputValue(item.startTime),
    endTime: toDateTimeInputValue(item.endTime),
    location: item.location ?? '',
    withWho: item.withWho ?? '',
    notes: item.notes ?? '',
  };
}

export function TimelinePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeOrgId = useActiveOrganizationId();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DaySheetMasterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<RightTab>('schedule');
  const [activeNoteTab, setActiveNoteTab] = useState(0);
  const [scheduleEditorItem, setScheduleEditorItem] = useState<EventScheduleItem | null | undefined>(undefined);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(emptyScheduleDraft());
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = now.toISOString().slice(0, 10);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60).toISOString().slice(0, 10);

    getMyOrganizations()
      .then((orgs) => listEvents({ orgId: activeOrgId ?? orgs[0]?.id, from, to, limit: 20 }))
      .catch(() => listEvents({ from, to, limit: 20 }))
      .then((res) => {
        setEvents(res.events);
        if (res.events[0]) selectEvent(res.events[0].id);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  function selectEvent(id: string) {
    setSelectedId(id);
    setDetail(null);
    setLoadingDetail(true);
    setActiveTab('schedule');
    setScheduleEditorItem(undefined);
    Promise.all([getDaySheetMaster(id), getEvent(id).catch(() => null)])
      .then(([daysheet, event]) => setDetail({ ...daysheet, event: { ...daysheet.event, ...event } }))
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }

  function openScheduleEditor(item?: EventScheduleItem) {
    setScheduleError(null);
    setScheduleDraft(item ? scheduleDraftFromItem(item) : emptyScheduleDraft(ev?.startTime));
    setScheduleEditorItem(item ?? null);
  }

  function closeScheduleEditor() {
    if (!scheduleSaving) setScheduleEditorItem(undefined);
  }

  async function handleSaveSchedule() {
    if (!ev || !scheduleDraft.title.trim() || !scheduleDraft.startTime) {
      setScheduleError('Indica un nombre y una hora de inicio.');
      return;
    }
    setScheduleSaving(true);
    setScheduleError(null);
    const payload = {
      type: scheduleDraft.type,
      title: scheduleDraft.title.trim(),
      startTime: new Date(scheduleDraft.startTime).toISOString(),
      endTime: scheduleDraft.endTime ? new Date(scheduleDraft.endTime).toISOString() : undefined,
      location: scheduleDraft.location.trim() || undefined,
      withWho: scheduleDraft.withWho.trim() || undefined,
      notes: scheduleDraft.notes.trim() || undefined,
    };
    try {
      const item = scheduleEditorItem
        ? await updateScheduleItem(ev.id, scheduleEditorItem.id, payload)
        : await createScheduleItem(ev.id, payload);
      setDetail((prev) => prev ? {
        ...prev,
        schedule: [...prev.schedule.filter((current) => current.id !== item.id), item]
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
        meta: { ...prev.meta, totalScheduleItems: prev.schedule.filter((current) => current.id !== item.id).length + 1 },
      } : prev);
      setScheduleEditorItem(undefined);
    } catch (e: unknown) {
      setScheduleError(e instanceof Error ? e.message : 'No se pudo guardar la actividad.');
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleToggleSchedule(item: EventScheduleItem) {
    if (!ev) return;
    try {
      const updated = await toggleScheduleItemComplete(ev.id, item.id);
      setDetail((prev) => prev ? { ...prev, schedule: prev.schedule.map((current) => current.id === updated.id ? updated : current) } : prev);
    } catch { /* keep the current state when the request fails */ }
  }

  async function handleDeleteSchedule(item: EventScheduleItem) {
    if (!ev || !window.confirm(`¿Eliminar "${item.title}" del cronograma?`)) return;
    try {
      await deleteScheduleItem(ev.id, item.id);
      setDetail((prev) => prev ? {
        ...prev,
        schedule: prev.schedule.filter((current) => current.id !== item.id),
        meta: { ...prev.meta, totalScheduleItems: Math.max(0, prev.schedule.length - 1) },
      } : prev);
    } catch { /* keep the current state when the request fails */ }
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
      <button className={s.timelineBackLink} onClick={() => navigate(-1)}>
        ← Volver
      </button>
      <div className={s.timelineGrid}>
                <div className={s.timelineEventList}>
          <div className={s.timelineListTitle}>{t('nav.timeline')}</div>

          {loading ? (
            <div className={p.spinner} style={{ marginTop: 24 }} />
          ) : events.length === 0 ? (
            <div className={s.timelineEmptyMessage}>Sin eventos próximos</div>
          ) : (
            events.map((item) => {
              const tm = TYPE_META[item.type] ?? { icon: '📅', label: item.type, color: '#4A827E' };
              const sm = STATUS_META[item.status] ?? STATUS_META.DRAFT;
              const isActive = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  className={`${s.timelineEventItem} ${isActive ? s.timelineEventItemActive : ''}`}
                  style={isActive ? { borderLeftColor: tm.color } : {}}
                  onClick={() => selectEvent(item.id)}
                >
                  <div className={s.timelineEventItemRow}>
                    <span className={s.timelineEventItemIcon}>{tm.icon}</span>
                    <div className={s.timelineEventItemMeta}>
                      <div className={s.timelineEventName}>{item.title}</div>
                      <div className={s.timelineEventDate}>
                        {new Date(item.startTime).toLocaleDateString('es-AR', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                        {' · '}
                        {fmtTime(item.startTime)}
                      </div>
                    </div>
                  </div>
                  <div className={s.timelineEventBadges}>
                    <span
                      className={s.timelineTypePill}
                      style={{ background: tm.color + '26', color: tm.color }}
                    >
                      {tm.label}
                    </span>
                    <span
                      className={s.timelineStatusPill}
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

                <div className={s.timelineDetailPanel}>
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
                className={s.timelineEventHeader}
                style={{ borderLeftColor: typeMeta?.color ?? '#4A827E' }}
              >
                <div className={s.timelineEventHeaderTop}>
                  <span className={s.timelineEventHeaderIcon}>{typeMeta?.icon}</span>
                  <div className={s.timelineEventHeaderContent}>
                    <div className={s.timelineEventHeaderBadges}>
                      <span
                        className={s.timelineTypePill}
                        style={{ background: (typeMeta?.color ?? '#4A827E') + '26', color: typeMeta?.color }}
                      >
                        {typeMeta?.label}
                      </span>
                      <span
                        className={s.timelineStatusPill}
                        style={{ background: statusMeta?.bg, color: statusMeta?.color }}
                      >
                        {statusMeta?.label}
                      </span>
                      {ev.isPublic && <span className={s.timelinePublicPill}>🌐 Público</span>}
                    </div>
                    <h2 className={s.timelineEventHeaderTitle}>{ev.title}</h2>
                    <div className={s.timelineEventHeaderMeta}>
                      <span>🗓 {fmtDateTime(ev.startTime)}</span>
                      {ev.endTime && <span> — {fmtDateTime(ev.endTime)}</span>}
                      {detail?.venue && <span> · 📍 {detail.venue.name}, {detail.venue.city}</span>}
                    </div>
                    {ev.description && (
                      <p className={s.timelineEventHeaderDesc}>{ev.description}</p>
                    )}
                  </div>
                  <Link to={`/events/${ev.id}`} className={s.timelineViewFullBtn}>
                    Ver completo →
                  </Link>
                </div>

                {detail && (
                  <div className={s.timelineQuickStats}>
                    <div className={s.timelineQuickStat}>
                      <span className={s.timelineQuickStatValue}>{detail.meta.totalScheduleItems}</span>
                      <span className={s.timelineQuickStatLabel}>Horarios</span>
                    </div>
                    <div className={s.timelineQuickStat}>
                      <span className={s.timelineQuickStatValue}>{detail.roster.length}</span>
                      <span className={s.timelineQuickStatLabel}>Músicos</span>
                    </div>
                    <div className={s.timelineQuickStat}>
                      <span className={s.timelineQuickStatValue}>{detail.meta.confirmedAttendees}</span>
                      <span className={s.timelineQuickStatLabel}>Confirmados</span>
                    </div>
                    <div className={s.timelineQuickStat}>
                      <span className={s.timelineQuickStatValue}>{detail.meta.totalVehicles}</span>
                      <span className={s.timelineQuickStatLabel}>Vehículos</span>
                    </div>
                    {detail.finance && (
                      <div className={s.timelineQuickStat}>
                        <span
                          className={s.timelineQuickStatValue}
                          style={{ color: detail.finance.isPaid ? '#4A827E' : '#E0A05A', fontSize: 13 }}
                        >
                          {detail.finance.isPaid ? '✓ Pagado' : '⏳ Pendiente'}
                        </span>
                        <span className={s.timelineQuickStatLabel}>Finanzas</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

                            <div className={s.timelineTabs}>
                <button
                  className={`${s.timelineTab} ${activeTab === 'schedule' ? s.timelineTabActive : ''}`}
                  onClick={() => setActiveTab('schedule')}
                >
                  Cronograma {detail && `(${detail.schedule.length})`}
                </button>
                <button
                  className={`${s.timelineTab} ${activeTab === 'notes' ? s.timelineTabActive : ''}`}
                  onClick={() => setActiveTab('notes')}
                >
                  Notas
                </button>
                <button
                  className={`${s.timelineTab} ${activeTab === 'roster' ? s.timelineTabActive : ''}`}
                  onClick={() => setActiveTab('roster')}
                >
                  Participantes {detail && `(${detail.roster.length})`}
                </button>
              </div>

                            {activeTab === 'schedule' && (
                <div className={s.timelineTabContent}>
                                <div className={s.scheduleToolbar}>
                                  <div>
                                    <strong className={s.scheduleToolbarTitle}>Plan del evento</strong>
                                    <span className={s.scheduleToolbarHint}>Organiza las tareas antes, durante y después del show.</span>
                                  </div>
                                  <button type="button" className={s.addScheduleButton} onClick={() => openScheduleEditor()}>
                                    + Agregar actividad
                                  </button>
                                </div>
                                {!detail || detail.schedule.length === 0 ? (
                                  <div className={s.scheduleEmptyState}>
                                    <span className={s.scheduleEmptyIcon}>◷</span>
                                    <strong>El cronograma está vacío</strong>
                                    <span>Agrega la salida, prueba de sonido, show y cualquier tarea logística.</span>
                                    <button type="button" className={s.scheduleEmptyButton} onClick={() => openScheduleEditor()}>
                                      Crear primera actividad
                                    </button>
                                  </div>
                                ) : (
                                  <div className={s.timelineScheduleList}>
                                    {detail.schedule.map((item) => {
                        const start = new Date(item.startTime);
                        const end = new Date(item.endTime ?? item.startTime);
                        const isPast = end < now;
                        const isCurrent = start <= now && end >= now;
                        const typeLabel = SCHEDULE_TYPES.find((type) => type.value === item.type)?.label ?? item.type;
                        return (
                          <div
                            key={item.id}
                            className={`${s.timelineScheduleItem} ${isPast ? s.timelineScheduleItemPast : ''} ${isCurrent ? s.timelineScheduleItemCurrent : ''}`}
                          >
                            <div className={s.timelineScheduleTime}>{fmtTime(item.startTime)}</div>
                            <div className={s.timelineScheduleBar} />
                            <div className={s.timelineScheduleInfo}>
                              <div className={s.timelineScheduleType}>{typeLabel}</div>
                              <div className={s.timelineScheduleTitle}>{item.title}</div>
                              {item.endTime && (
                                <div className={s.timelineScheduleEndTime}>hasta {fmtTime(item.endTime)}</div>
                              )}
                              {item.location && (
                                <div className={s.timelineScheduleMeta}>📍 {item.location}</div>
                              )}
                              {item.withWho && (
                                <div className={s.timelineScheduleMeta}>👤 {item.withWho}</div>
                              )}
                              {item.notes && (
                                <div className={s.timelineScheduleNotes}>{item.notes}</div>
                              )}
                            </div>
                            <div className={s.scheduleItemActions}>
                              <button
                                type="button"
                                className={`${s.scheduleCompleteButton} ${item.isCompleted ? s.scheduleCompleteButtonDone : ''}`}
                                onClick={() => void handleToggleSchedule(item)}
                                title={item.isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
                              >
                                {item.isCompleted ? '✓' : '○'}
                              </button>
                              <button type="button" className={s.scheduleEditButton} onClick={() => openScheduleEditor(item)} title="Editar actividad">✎</button>
                              <button type="button" className={s.scheduleDeleteButton} onClick={() => void handleDeleteSchedule(item)} title="Eliminar actividad">×</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

                            {activeTab === 'notes' && (
                <div className={s.timelineTabContent}>
                  <div className={s.timelineNoteTabs}>
                    {noteTabs.map((tab, i) => (
                      <button
                        key={tab.label}
                        className={`${s.timelineNoteTab} ${activeNoteTab === i ? s.timelineNoteTabActive : ''}`}
                        onClick={() => setActiveNoteTab(i)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {noteTabs[activeNoteTab].content ? (
                    <pre className={s.timelineNoteContent}>{noteTabs[activeNoteTab].content}</pre>
                  ) : (
                    <div className={s.timelineEmptyTab}>Sin {noteTabs[activeNoteTab].label.toLowerCase()}.</div>
                  )}
                </div>
              )}

                            {activeTab === 'roster' && (
                <div className={s.timelineTabContent}>
                  {!detail || detail.roster.length === 0 ? (
                    <div className={s.timelineEmptyTab}>Sin músicos asignados a este evento.</div>
                  ) : (
                    detail.roster.map((entry) => {
                      const confirmed = entry.status === 'CONFIRMED';
                      const declined  = entry.status === 'DECLINED';
                      return (
                        <div key={entry.userId} className={s.timelineRosterRow}>
                          <div className={s.timelineRosterAvatar}>
                            {entry.user.displayName?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className={s.timelineRosterInfo}>
                            <div className={s.timelineRosterName}>{entry.user.displayName}</div>
                            {entry.role && <div className={s.timelineRosterRole}>{entry.role}</div>}
                          </div>
                          <span
                            className={s.timelineRosterStatus}
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
      {scheduleEditorItem !== undefined && ev && (
        <div className={s.scheduleModalOverlay} onClick={closeScheduleEditor} role="dialog" aria-modal="true" aria-label="Editar actividad del cronograma">
          <form className={s.scheduleModal} onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); void handleSaveSchedule(); }}>
            <div className={s.scheduleModalHeader}>
              <div>
                <span className={s.scheduleModalEyebrow}>{scheduleEditorItem ? 'Editar actividad' : 'Nueva actividad'}</span>
                <h3 className={s.scheduleModalTitle}>{scheduleEditorItem ? 'Actualiza el plan del evento' : 'Agrega una actividad'}</h3>
              </div>
              <button type="button" className={s.scheduleModalClose} onClick={closeScheduleEditor} aria-label="Cerrar">×</button>
            </div>
            <div className={s.scheduleFormGrid}>
              <label className={s.scheduleField}>
                <span>Tipo de actividad</span>
                <select value={scheduleDraft.type} onChange={(event) => setScheduleDraft((draft) => ({ ...draft, type: event.target.value as ScheduleType }))}>
                  {SCHEDULE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className={s.scheduleField}>
                <span>Nombre de la actividad</span>
                <input value={scheduleDraft.title} onChange={(event) => setScheduleDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Ej. Prueba de sonido" autoFocus />
              </label>
              <label className={s.scheduleField}>
                <span>Inicio</span>
                <input type="datetime-local" value={scheduleDraft.startTime} onChange={(event) => setScheduleDraft((draft) => ({ ...draft, startTime: event.target.value }))} />
              </label>
              <label className={s.scheduleField}>
                <span>Fin <em>(opcional)</em></span>
                <input type="datetime-local" value={scheduleDraft.endTime} onChange={(event) => setScheduleDraft((draft) => ({ ...draft, endTime: event.target.value }))} />
              </label>
              <label className={s.scheduleField}>
                <span>Lugar <em>(opcional)</em></span>
                <input value={scheduleDraft.location} onChange={(event) => setScheduleDraft((draft) => ({ ...draft, location: event.target.value }))} placeholder="Ej. Escenario principal" />
              </label>
              <label className={s.scheduleField}>
                <span>Responsable <em>(opcional)</em></span>
                <input value={scheduleDraft.withWho} onChange={(event) => setScheduleDraft((draft) => ({ ...draft, withWho: event.target.value }))} placeholder="Ej. Equipo técnico" />
              </label>
              <label className={`${s.scheduleField} ${s.scheduleFieldFull}`}>
                <span>Notas <em>(opcional)</em></span>
                <textarea value={scheduleDraft.notes} onChange={(event) => setScheduleDraft((draft) => ({ ...draft, notes: event.target.value }))} rows={3} placeholder="Indicaciones para el equipo" />
              </label>
            </div>
            {scheduleError && <div className={s.scheduleFormError}>{scheduleError}</div>}
            <div className={s.scheduleModalFooter}>
              <button type="button" className={s.scheduleCancelButton} onClick={closeScheduleEditor} disabled={scheduleSaving}>Cancelar</button>
              <button type="submit" className={s.scheduleSaveButton} disabled={scheduleSaving}>{scheduleSaving ? 'Guardando…' : 'Guardar actividad'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
