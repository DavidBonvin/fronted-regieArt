import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAddressAutocomplete, getDaySheetMaster, getEvent, getVenue, createVenue, updateEvent, updateDaySheet, updateVenue } from '@regieart/api';
import type { AutocompleteResult, DaySheetMasterResponse, EventType, SupportedCountry } from '@regieart/types';
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

function toDateTimeInputValue(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}


export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<DaySheetMasterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeNoteTab, setActiveNoteTab] = useState(0);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState<'start' | 'end' | null>(null);
  const [timeDraft, setTimeDraft] = useState('');
  const [savingTime, setSavingTime] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [editingVenue, setEditingVenue] = useState(false);
  const [venueDraft, setVenueDraft] = useState({ name: '', address: '', city: '', country: '', capacity: '' });
  const [venueCountry, setVenueCountry] = useState<SupportedCountry>('FR');
  const [venueSuggestions, setVenueSuggestions] = useState<AutocompleteResult[]>([]);
  const [venueCoords, setVenueCoords] = useState<{ lat: number; lng: number } | null>(null);
  const venueSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingVenue, setSavingVenue] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [generalDraft, setGeneralDraft] = useState({ title: '', type: 'CONCERT' as EventType, description: '', isPublic: false });
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const notesCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    Promise.all([getDaySheetMaster(eventId), getEvent(eventId).catch(() => null)])
      .then(async ([daysheet, event]) => {
        const venue = daysheet.venue ?? (event?.venueId ? await getVenue(event.venueId).catch(() => null) : null);
        setData({ ...daysheet, event: { ...daysheet.event, ...event }, venue: venue ?? undefined });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className={s.spinner}>Cargando evento…</div>;
  if (error || !data) return <div className={s.errorBox}>{error ?? 'Evento no encontrado'}</div>;

  const { event, venue, schedule, roster, finance, weather, meta } = data;
  const typeMeta = TYPE_META[event.type] ?? { icon: '📅', label: event.type, color: '#4A827E' };
  const statusMeta = STATUS_META[event.status] ?? STATUS_META.DRAFT;
  const noteTabs = [
    { label: 'Setlist', content: event.setlistNotes },
    { label: 'DaySheet', content: event.daysheetNotes },
    { label: 'Itinerario', content: event.itineraryNotes },
  ];
  const hasNotes = noteTabs.some((tab) => tab.content);

  async function handleSaveNote() {
    if (!data?.event) return;
    const noteFields = ['setlistNotes', 'daysheetNotes', 'itineraryNotes'] as const;
    setSavingNote(true);
    setNoteError(null);
    try {
      const noteValue = noteDraft.trim() || undefined;
      const updatedEvent = activeNoteTab === 0
        ? await updateEvent(data.event.id, { setlistNotes: noteValue })
        : await updateDaySheet(data.event.id, { [noteFields[activeNoteTab]]: noteValue });
      setData((prev) => prev ? { ...prev, event: { ...prev.event, ...updatedEvent } } : prev);
      setEditingNote(false);
    } catch (e: unknown) {
      setNoteError(e instanceof Error ? e.message : 'No se pudo guardar la nota.');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleSaveTime() {
    if (!data?.event || !editingTime || !timeDraft) return;
    setSavingTime(true);
    setTimeError(null);
    try {
      const value = new Date(timeDraft).toISOString();
      const updatedEvent = editingTime === 'start'
        ? await updateEvent(data.event.id, { startTime: value })
        : await updateEvent(data.event.id, { endTime: value });
      setData((prev) => prev ? { ...prev, event: { ...prev.event, ...updatedEvent } } : prev);
      setEditingTime(null);
    } catch (e: unknown) {
      setTimeError(e instanceof Error ? e.message : 'No se pudo guardar la fecha.');
    } finally {
      setSavingTime(false);
    }
  }

  async function handleSaveVenue() {
    if (!venueDraft.name.trim() || !venueDraft.city.trim()) {
      setVenueError('El nombre y la ciudad son obligatorios.');
      return;
    }
    setSavingVenue(true);
    setVenueError(null);
    try {
      const venuePayload = {
        name: venueDraft.name.trim(),
        address: venueDraft.address.trim() || undefined,
        city: venueDraft.city.trim(),
        country: venueDraft.country.trim() || undefined,
        capacity: venueDraft.capacity ? Number(venueDraft.capacity) : undefined,
        latitude: venueCoords?.lat ?? venue?.latitude,
        longitude: venueCoords?.lng ?? venue?.longitude,
      };
      const updatedVenue = venue
        ? await updateVenue(venue.id, venuePayload)
        : await createVenue(venuePayload);
      if (!venue) await updateEvent(event.id, { venueId: updatedVenue.id });
      setData((prev) => prev ? { ...prev, venue: updatedVenue, event: { ...prev.event, venueId: updatedVenue.id } } : prev);
      setEditingVenue(false);
    } catch (e: unknown) {
      setVenueError(e instanceof Error ? e.message : 'No se pudo guardar el lugar.');
    } finally {
      setSavingVenue(false);
    }
  }

  function handleVenueAddressChange(address: string) {
    setVenueDraft((draft) => ({ ...draft, address }));
    setVenueCoords(null);
    if (venueSearchTimer.current) clearTimeout(venueSearchTimer.current);
    if (address.trim().length < 2) { setVenueSuggestions([]); return; }
    venueSearchTimer.current = setTimeout(() => {
      getAddressAutocomplete(address.trim(), venueCountry).then(setVenueSuggestions).catch(() => setVenueSuggestions([]));
    }, 300);
  }

  function selectVenueAddress(result: AutocompleteResult) {
    setVenueDraft((draft) => ({ ...draft, address: result.label, country: venueCountry }));
    setVenueCoords({ lat: result.lat, lng: result.lng });
    setVenueSuggestions([]);
  }

  async function handleSaveGeneral() {
    if (!event || !generalDraft.title.trim()) {
      setGeneralError('El título es obligatorio.');
      return;
    }
    setSavingGeneral(true);
    setGeneralError(null);
    try {
      const updatedEvent = await updateEvent(event.id, {
        title: generalDraft.title.trim(),
        type: generalDraft.type,
        description: generalDraft.description.trim() || undefined,
        isPublic: generalDraft.isPublic,
      });
      setData((prev) => prev ? { ...prev, event: { ...prev.event, ...updatedEvent } } : prev);
      setEditingGeneral(false);
    } catch (e: unknown) {
      setGeneralError(e instanceof Error ? e.message : 'No se pudo guardar el evento.');
    } finally {
      setSavingGeneral(false);
    }
  }

  return (
    <div className={s.root}>
      <button className={s.backLink} onClick={() => navigate(-1)}>← Volver</button>

      <div
        className={s.hero}
        style={{ borderLeftColor: typeMeta.color }}
      >
        {!editingGeneral && (
          <button
            type="button"
            className={s.heroEditButton}
            onClick={() => {
              setGeneralDraft({ title: event.title, type: event.type, description: event.description ?? '', isPublic: !!event.isPublic });
              setGeneralError(null);
              setEditingGeneral(true);
            }}
            aria-label="Editar información general del evento"
            title="Editar información general del evento"
          >
            ✎
          </button>
        )}
        {editingGeneral ? (
          <div className={s.generalEditor}>
            <div className={s.generalEditorGrid}>
              <label className={s.generalField}>Tipo de evento
                <select value={generalDraft.type} onChange={(e) => setGeneralDraft((draft) => ({ ...draft, type: e.target.value as EventType }))}>
                  {Object.entries(TYPE_META).map(([value, meta]) => <option key={value} value={value}>{meta.icon} {meta.label}</option>)}
                </select>
              </label>
              <label className={s.generalField}>Título
                <input value={generalDraft.title} onChange={(e) => setGeneralDraft((draft) => ({ ...draft, title: e.target.value }))} autoFocus />
              </label>
              <label className={`${s.generalField} ${s.generalFieldFull}`}>Descripción
                <textarea value={generalDraft.description} onChange={(e) => setGeneralDraft((draft) => ({ ...draft, description: e.target.value }))} rows={3} />
              </label>
            </div>
            <label className={s.generalPublicToggle}>
              <input type="checkbox" checked={generalDraft.isPublic} onChange={(e) => setGeneralDraft((draft) => ({ ...draft, isPublic: e.target.checked }))} />
              Evento público
            </label>
            {generalError && <div className={s.generalError}>{generalError}</div>}
            <div className={s.generalEditorActions}>
              <button type="button" onClick={() => setEditingGeneral(false)} disabled={savingGeneral}>Cancelar</button>
              <button type="button" onClick={() => void handleSaveGeneral()} disabled={savingGeneral}>{savingGeneral ? 'Guardando…' : 'Guardar información'}</button>
            </div>
          </div>
        ) : (
          <>
            <div className={s.heroIconBox}>{typeMeta.icon}</div>
            <div className={s.heroContent}>
              <div className={s.heroBadges}>
                <span className={s.typeBadge} style={{ background: typeMeta.color + '26', color: typeMeta.color }}>
                  {typeMeta.label}
                </span>
                <span className={s.statusBadge} style={{ background: statusMeta.bg, color: statusMeta.color }}>
                  {statusMeta.label}
                </span>
                {event.isPublic && <span className={s.publicBadge}>🌐 Público</span>}
              </div>
              <h1 className={s.heroTitle}>{event.title}</h1>
              {event.description && <p className={s.heroDesc}>{event.description}</p>}
              {venue && (
                <div className={s.heroVenue}>
                  <span>📍</span>
                  <span>
                    {venue.name}
                    {venue.address && ` · ${venue.address}`}
                    {venue.city && ` · ${venue.city}`}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
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
              {editingTime === 'start' ? (
                <div className={s.timeEditor}>
                  <input
                    className={s.timeEditorInput}
                    type="datetime-local"
                    value={timeDraft}
                    onChange={(e) => setTimeDraft(e.target.value)}
                  />
                  <div className={s.timeEditorActions}>
                    <button type="button" onClick={() => setEditingTime(null)} disabled={savingTime}>Cancelar</button>
                    <button type="button" onClick={() => void handleSaveTime()} disabled={savingTime}>
                      {savingTime ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                  {timeError && <span className={s.timeEditorError}>{timeError}</span>}
                </div>
              ) : (
                <>
                  <span className={s.timeRowValue}>{fmtFull(event.startTime)}</span>
                  <button
                    type="button"
                    className={s.timeEditButton}
                    onClick={() => { setTimeDraft(toDateTimeInputValue(event.startTime)); setTimeError(null); setEditingTime('start'); }}
                    aria-label="Editar fecha y hora de inicio"
                    title="Editar fecha y hora de inicio"
                  >
                    ✎
                  </button>
                </>
              )}
            </div>
            {event.endTime && (
              <div className={s.timeRow}>
                <span className={s.timeRowLabel}>Fin</span>
                {editingTime === 'end' ? (
                  <div className={s.timeEditor}>
                    <input
                      className={s.timeEditorInput}
                      type="datetime-local"
                      value={timeDraft}
                      onChange={(e) => setTimeDraft(e.target.value)}
                    />
                    <div className={s.timeEditorActions}>
                      <button type="button" onClick={() => setEditingTime(null)} disabled={savingTime}>Cancelar</button>
                      <button type="button" onClick={() => void handleSaveTime()} disabled={savingTime}>
                        {savingTime ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                    {timeError && <span className={s.timeEditorError}>{timeError}</span>}
                  </div>
                ) : (
                  <>
                    <span className={s.timeRowValue}>{fmtFull(event.endTime)}</span>
                    <button
                      type="button"
                      className={s.timeEditButton}
                      onClick={() => { setTimeDraft(toDateTimeInputValue(event.endTime)); setTimeError(null); setEditingTime('end'); }}
                      aria-label="Editar fecha y hora de fin"
                      title="Editar fecha y hora de fin"
                    >
                      ✎
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className={s.card} style={{ marginBottom: 16 }}>
            <div className={s.cardHeaderWithAction}>
              <div className={s.cardHeader}>Ubicación del evento</div>
              {!editingVenue && (
                <button
                  type="button"
                  className={s.sectionEditButton}
                  onClick={() => {
                    setVenueDraft({ name: venue?.name ?? '', address: venue?.address ?? '', city: venue?.city ?? '', country: venue?.country ?? '', capacity: venue?.capacity?.toString() ?? '' });
                    setVenueCountry((venue?.country as SupportedCountry) ?? 'FR');
                    setVenueCoords(venue?.latitude != null && venue.longitude != null ? { lat: venue.latitude, lng: venue.longitude } : null);
                    setVenueSuggestions([]);
                    setVenueError(null);
                    setEditingVenue(true);
                  }}
                  aria-label="Editar dirección del evento"
                  title="Editar dirección del evento"
                >
                  ✎
                </button>
              )}
            </div>
            {editingVenue ? (
                <div className={s.venueEditor}>
                  <label className={s.venueField}>Nombre del lugar<input value={venueDraft.name} onChange={(e) => setVenueDraft((draft) => ({ ...draft, name: e.target.value }))} /></label>
                  <label className={s.venueField}>País
                    <select value={venueCountry} onChange={(e) => { setVenueCountry(e.target.value as SupportedCountry); setVenueSuggestions([]); }}>
                      <option value="FR">🇫🇷 Francia</option>
                      <option value="BE">🇧🇪 Bélgica</option>
                      <option value="IT">🇮🇹 Italia</option>
                      <option value="DE">🇩🇪 Alemania</option>
                      <option value="ES">🇪🇸 España</option>
                      <option value="CA">🇨🇦 Canadá</option>
                    </select>
                  </label>
                  <label className={s.venueField}>Dirección
                    <input value={venueDraft.address} onChange={(e) => handleVenueAddressChange(e.target.value)} placeholder="Busca una dirección" />
                    {venueSuggestions.length > 0 && <span className={s.venueSuggestions}>{venueSuggestions.map((result) => <button type="button" key={`${result.lat}-${result.lng}`} onClick={() => selectVenueAddress(result)}>{result.label}</button>)}</span>}
                  </label>
                  <div className={s.venueEditorGrid}>
                    <label className={s.venueField}>Ciudad<input value={venueDraft.city} onChange={(e) => setVenueDraft((draft) => ({ ...draft, city: e.target.value }))} /></label>
                    <label className={s.venueField}>Capacidad<input type="number" min="0" value={venueDraft.capacity} onChange={(e) => setVenueDraft((draft) => ({ ...draft, capacity: e.target.value }))} /></label>
                  </div>
                  {venue?.latitude != null && venue.longitude != null && <div className={s.venueGpsNote}>GPS configurado. Convoy puede calcular los trayectos.</div>}
                  {venueError && <div className={s.venueEditorError}>{venueError}</div>}
                  <div className={s.venueEditorActions}>
                    <button type="button" onClick={() => setEditingVenue(false)} disabled={savingVenue}>Cancelar</button>
                    <button type="button" onClick={() => void handleSaveVenue()} disabled={savingVenue}>{savingVenue ? 'Guardando…' : 'Guardar dirección'}</button>
                  </div>
                </div>
              ) : venue ? (
                <div className={s.eventAddressBlock}>
                  <div className={s.venueName}>📍 {venue.name}</div>
                  <div className={s.eventAddress}>{venue.address || 'Dirección no configurada'}</div>
                  <div className={s.venueMeta}>{venue.city}{venue.country ? `, ${venue.country}` : ''}</div>
                  {venue.latitude != null && venue.longitude != null && <div className={s.venueGpsNote}>✓ Ubicación GPS disponible para calcular trayectos</div>}
                </div>
            ) : (
              <div className={s.venueMissing}>Este evento todavía no tiene un lugar asignado.</div>
            )}
          </div>

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
            <button
              type="button"
              className={s.actionLink}
              onClick={() => {
                setActiveNoteTab(0);
                notesCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span className={s.actionLinkIcon}>🎼</span> Setlist
            </button>
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
          {(hasNotes || activeNoteTab === 0) && (
            <div ref={notesCardRef} className={s.card} style={{ marginBottom: 16 }}>
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
              {editingNote ? (
                <div className={s.noteEditor}>
                  <textarea
                    className={s.noteEditorInput}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    autoFocus
                    rows={8}
                  />
                  {noteError && <div className={s.noteEditorError}>{noteError}</div>}
                  <div className={s.noteEditorActions}>
                    <button type="button" className={s.noteEditorCancel} onClick={() => setEditingNote(false)} disabled={savingNote}>
                      Cancelar
                    </button>
                    <button type="button" className={s.noteEditorSave} onClick={() => void handleSaveNote()} disabled={savingNote}>
                      {savingNote ? 'Guardando…' : `Guardar ${noteTabs[activeNoteTab].label}`}
                    </button>
                  </div>
                </div>
              ) : noteTabs[activeNoteTab].content ? (
                <div className={s.noteContent}>
                  {noteTabs[activeNoteTab].content}
                  <button
                    type="button"
                    className={s.setlistEditButton}
                    onClick={() => {
                      setNoteDraft(noteTabs[activeNoteTab].content ?? '');
                      setNoteError(null);
                      setEditingNote(true);
                    }}
                    aria-label={`Editar ${noteTabs[activeNoteTab].label}`}
                    title={`Editar ${noteTabs[activeNoteTab].label}`}
                  >
                    ✎
                  </button>
                </div>
              ) : (
                <div className={s.noteContent}>
                  <span className={s.noteEmpty}>Sin {noteTabs[activeNoteTab].label.toLowerCase()}.</span>
                  <button
                    type="button"
                    className={s.setlistEditButton}
                    onClick={() => {
                      setNoteDraft('');
                      setNoteError(null);
                      setEditingNote(true);
                    }}
                    aria-label={`Editar ${noteTabs[activeNoteTab].label}`}
                    title={`Editar ${noteTabs[activeNoteTab].label}`}
                  >
                    ✎
                  </button>
                </div>
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
