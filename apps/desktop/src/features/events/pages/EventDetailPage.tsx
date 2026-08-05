import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDaySheetMaster } from '@regieart/api';
import type { DaySheetMasterResponse } from '@regieart/types';
import s from './EventDetailPage.module.scss';


const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  CONCERT:           { icon: '🎤', label: 'Concierto',  color: '#4A827E' },
  REHEARSAL:         { icon: '🎸', label: 'Ensayo',     color: '#7E7B4A' },
  AUDITION:          { icon: '🎼', label: 'Audición',   color: '#6E4A7E' },
  TOUR_DATE:         { icon: '🚌', label: 'Gira',       color: '#4A6E7E' },
  RECORDING_SESSION: { icon: '🎙️', label: 'Grabación',  color: '#7E4F4A' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Borrador',   color: '#8A96A8', bg: '#1E2630' },
  CONFIRMED: { label: 'Confirmado', color: '#4A827E', bg: '#162220' },
  CANCELLED: { label: 'Cancelado',  color: '#E05A5A', bg: '#2A1A1A' },
  COMPLETED: { label: 'Completado', color: '#6B8AC4', bg: '#1A1F2E' },
};

function fmtFull(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}


export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<DaySheetMasterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeNoteTab, setActiveNoteTab] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    getDaySheetMaster(eventId)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className={s.spinner}>Cargando evento…</div>;
  if (error || !data) return <div className={s.errorBox}>{error ?? 'Evento no encontrado'}</div>;

  const { event, venue, schedule, roster, finance, weather, meta } = data;
  const typeMeta = TYPE_META[event.type] ?? { icon: '📅', label: event.type, color: '#4A827E' };
  const statusMeta = STATUS_META[event.status] ?? STATUS_META.DRAFT;

  const noteTabs = [
    { label: 'Setlist',    content: event.setlistNotes },
    { label: 'DaySheet',   content: event.daysheetNotes },
    { label: 'Itinerario', content: event.itineraryNotes },
  ];
  const hasNotes = noteTabs.some((t) => t.content);

  return (
    <div className={s.root}>
      <button className={s.backLink} onClick={() => navigate(-1)}>← Volver</button>

      <div
        className={s.hero}
        style={{ borderLeftColor: typeMeta.color }}
      >
        <div className={s.heroIconBox}>{typeMeta.icon}</div>
        <div className={s.heroContent}>
          <div className={s.heroBadges}>
            <span
              className={s.typeBadge}
              style={{ background: typeMeta.color + '26', color: typeMeta.color }}
            >
              {typeMeta.label}
            </span>
            <span
              className={s.statusBadge}
              style={{ background: statusMeta.bg, color: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
            {event.isPublic && <span className={s.publicBadge}>🌐 Público</span>}
          </div>
          <h1 className={s.heroTitle}>{event.title}</h1>
          {event.description && <p className={s.heroDesc}>{event.description}</p>}
        </div>
      </div>

      <div className={s.statsStrip}>
        <div className={s.statCell}>
          <div className={s.statCellValue}>{meta.totalScheduleItems}</div>
          <div className={s.statCellLabel}>Horarios</div>
        </div>
        <div className={s.statCell}>
          <div className={s.statCellValue}>{meta.confirmedAttendees}</div>
          <div className={s.statCellLabel}>Confirmados</div>
        </div>
        <div className={s.statCell}>
          <div className={s.statCellValue}>{roster.length}</div>
          <div className={s.statCellLabel}>Músicos</div>
        </div>
        <div className={s.statCell}>
          <div className={s.statCellValue}>{meta.totalVehicles}</div>
          <div className={s.statCellLabel}>Vehículos</div>
        </div>
      </div>

      <div className={s.mainGrid}>
        <div>
          <div className={s.card} style={{ marginBottom: 16 }}>
            <div className={s.cardHeader}>Fecha y Hora</div>
            <div className={s.timeRow}>
              <span className={s.timeRowLabel}>Inicio</span>
              <span className={s.timeRowValue}>{fmtFull(event.startTime)}</span>
            </div>
            {event.endTime && (
              <div className={s.timeRow}>
                <span className={s.timeRowLabel}>Fin</span>
                <span className={s.timeRowValue}>{fmtFull(event.endTime)}</span>
              </div>
            )}
          </div>

          {venue && (
            <div className={s.card} style={{ marginBottom: 16 }}>
              <div className={s.cardHeader}>Lugar</div>
              <div className={s.venueName}>📍 {venue.name}</div>
              {venue.address && <div className={s.venueMeta}>{venue.address}</div>}
              <div className={s.venueMeta}>
                {venue.city}{venue.country ? `, ${venue.country}` : ''}
              </div>
              {venue.capacity && (
                <div className={s.venueCapacity}>Capacidad: {venue.capacity.toLocaleString()} personas</div>
              )}
              {venue.loadInNotes && (
                <div className={s.venueNote}>
                  <div className={s.venueNoteLabel}>Carga ⬆</div>
                  <div className={s.venueNoteText}>{venue.loadInNotes}</div>
                </div>
              )}
              {venue.parkingNotes && (
                <div className={s.venueNote}>
                  <div className={s.venueNoteLabel}>Parking 🅿</div>
                  <div className={s.venueNoteText}>{venue.parkingNotes}</div>
                </div>
              )}
              {venue.technicalContactName && (
                <div className={s.venueNote}>
                  <div className={s.venueNoteLabel}>Técnico 🔧</div>
                  <div className={s.venueNoteText}>
                    {venue.technicalContactName}
                    {venue.technicalContactPhone ? ` · ${venue.technicalContactPhone}` : ''}
                    {venue.technicalContactEmail ? ` · ${venue.technicalContactEmail}` : ''}
                  </div>
                </div>
              )}
            </div>
          )}

          {weather?.available && (
            <div className={s.card} style={{ marginBottom: 16 }}>
              <div className={s.cardHeader}>Clima</div>
              <div className={s.weatherRow}>
                {weather.icon && <span className={s.weatherIcon}>{weather.icon}</span>}
                <div>
                  <div className={s.weatherTemp}>{weather.temperature}°C</div>
                  <div className={s.weatherDesc}>{weather.description}</div>
                  {(weather.humidity !== undefined || weather.windSpeed !== undefined) && (
                    <div className={s.weatherMeta}>
                      {weather.humidity !== undefined && `💧 ${weather.humidity}%`}
                      {weather.windSpeed !== undefined && ` · 💨 ${weather.windSpeed} km/h`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {finance && (
            <div className={s.card} style={{ marginBottom: 16 }}>
              <div className={s.cardHeader}>Finanzas</div>
              {finance.cacheTotal && (
                <div className={s.financeRow}>
                  <span className={s.financeLabel}>Caché total</span>
                  <span className={s.financeValue}>{finance.currency ?? 'ARS'} {finance.cacheTotal}</span>
                </div>
              )}
              {finance.perDiemAmount && (
                <div className={s.financeRow}>
                  <span className={s.financeLabel}>Per diem</span>
                  <span className={s.financeValue}>{finance.perDiemAmount}</span>
                </div>
              )}
              <div className={s.financeRow}>
                <span className={s.financeLabel}>Estado de pago</span>
                <span
                  className={s.financeValue}
                  style={{ color: finance.isPaid ? '#4A827E' : '#E0A05A' }}
                >
                  {finance.isPaid ? '✓ Pagado' : '⏳ Pendiente'}
                </span>
              </div>
              {finance.paymentNotes && (
                <div className={s.financeNotes}>{finance.paymentNotes}</div>
              )}
            </div>
          )}

          <div className={s.actionsRow}>
            <Link to={`/convoy/${event.id}`} className={s.actionLink}>
              <span className={s.actionLinkIcon}>🚌</span> Convoy
            </Link>
            <Link to={`/finance/${event.id}/expenses`} className={s.actionLink}>
              <span className={s.actionLinkIcon}>💰</span> Gastos
            </Link>
            <Link to={`/inventory/${event.id}/checklist`} className={s.actionLink}>
              <span className={s.actionLinkIcon}>☑️</span> Checklist
            </Link>
          </div>
        </div>

        <div>
          {hasNotes && (
            <div className={s.card} style={{ marginBottom: 16 }}>
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
                <div className={s.noteContent}>{noteTabs[activeNoteTab].content}</div>
              ) : (
                <div className={s.noteEmpty}>Sin notas.</div>
              )}
            </div>
          )}

          {schedule.length > 0 && (
            <div className={s.card} style={{ marginBottom: 16 }}>
              <div className={s.cardHeader}>Cronograma · {schedule.length} ítems</div>
              {schedule.map((item) => (
                <div key={item.id} className={s.scheduleRow}>
                  <span className={s.scheduleTime}>{fmtTime(item.startTime)}</span>
                  <div className={s.scheduleInfo}>
                    <div className={s.scheduleTitle}>{item.title}</div>
                    <div className={s.scheduleType}>{item.type.replace(/_/g, ' ')}</div>
                    {item.location && <div className={s.scheduleMeta}>📍 {item.location}</div>}
                    {item.notes && <div className={s.scheduleMeta}>{item.notes}</div>}
                  </div>
                  {item.isCompleted && <span className={s.scheduleDone}>✓</span>}
                </div>
              ))}
            </div>
          )}

          {roster.length > 0 && (
            <div className={s.card}>
              <div className={s.cardHeader}>Roster · {roster.length} músicos</div>
              {roster.map((entry) => {
                const confirmed = entry.status === 'CONFIRMED';
                return (
                  <div key={entry.userId} className={s.rosterRow}>
                    <div className={s.rosterAvatar}>
                      {entry.user.displayName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className={s.rosterName}>{entry.user.displayName}</div>
                      {entry.role && <div className={s.rosterRole}>{entry.role}</div>}
                    </div>
                    <span
                      className={s.rosterStatus}
                      style={{
                        background: confirmed ? '#162220' : '#1E2630',
                        color: confirmed ? '#4A827E' : entry.status === 'DECLINED' ? '#E05A5A' : '#6B7685',
                      }}
                    >
                      {confirmed ? '✓ Confirmado' : entry.status === 'DECLINED' ? '✕ Rechazado' : '? Invitado'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
