import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  createEvent,
  addRosterMember,
  getOrganizationMembers,
  listVenues,
  createVenue,
  updateVenue,
  getMyOrganizations,
  getAddressAutocomplete,
} from '@regieart/api';
import type { EventType, Venue, OrganizationMember, SupportedCountry, AutocompleteResult } from '@regieart/types';
import s from './CreateEventWizard.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';


const EVENT_TYPES: { value: EventType; label: string; icon: string }[] = [
  { value: 'CONCERT', label: 'Concierto', icon: '🎤' },
  { value: 'REHEARSAL', label: 'Ensayo', icon: '🎸' },
  { value: 'AUDITION', label: 'Audición', icon: '🎼' },
  { value: 'TOUR_DATE', label: 'Gira', icon: '🚌' },
  { value: 'RECORDING_SESSION', label: 'Grabación', icon: '🎙️' },
];

const STEPS = [
  { label: 'Tipo y Título', sub: 'Tipo de evento, nombre, visibilidad' },
  { label: 'Fecha y Lugar', sub: 'Horario de inicio, fin y venue' },
  { label: 'Notas', sub: 'Setlist, daysheet, itinerario' },
  { label: 'Roster', sub: 'Músicos invitados y confirmación' },
];

function toIso(dt: string): string {
  if (!dt) return '';
  try { return new Date(dt).toISOString(); }
  catch { return ''; }
}

function tomorrowAt(hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}


interface Props {
  onClose: () => void;
}


const GEO_COUNTRIES: { code: SupportedCountry; flag: string; label: string }[] = [
  { code: 'FR', flag: '🇫🇷', label: 'France' },
  { code: 'ES', flag: '🇪🇸', label: 'España' },
  { code: 'BE', flag: '🇧🇪', label: 'Belgique' },
  { code: 'DE', flag: '🇩🇪', label: 'Deutschland' },
  { code: 'IT', flag: '🇮🇹', label: 'Italia' },
  { code: 'CA', flag: '🇨🇦', label: 'Canada' },
];

function extractCity(label: string): string {
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? label;
  const words = last.split(' ').filter(Boolean);
  return words[words.length - 1] ?? '—';
}

interface VenueSearchProps {
  selected: Venue | null;
  onSelect: (v: Venue | null) => void;
}

function VenueLocationPicker({ selected, onSelect }: VenueSearchProps) {
  // ── Venue name search ──────────────────────────────────────────
  const [query, setQuery] = useState(selected?.name ?? '');
  const [results, setResults] = useState<Venue[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Address autocomplete ───────────────────────────────────────
  const [country, setCountry] = useState<SupportedCountry>('FR');
  const [addrQuery, setAddrQuery] = useState(selected?.address ?? '');
  const [addrSuggestions, setAddrSuggestions] = useState<AutocompleteResult[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrCoords, setAddrCoords] = useState<{ lat: number; lng: number } | null>(
    selected?.latitude != null && selected?.longitude != null
      ? { lat: selected.latitude, lng: selected.longitude }
      : null,
  );
  const addrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchVenues = useCallback((q: string) => {
    if (nameTimer.current) clearTimeout(nameTimer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    nameTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await listVenues(q);
        setResults(data);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, []);

  function searchAddress(q: string) {
    if (addrTimer.current) clearTimeout(addrTimer.current);
    setAddrCoords(null);
    if (q.length < 2) { setAddrSuggestions([]); return; }
    addrTimer.current = setTimeout(async () => {
      setAddrLoading(true);
      try {
        const res = await getAddressAutocomplete(q, country);
        setAddrSuggestions(res);
      } catch { setAddrSuggestions([]); }
      finally { setAddrLoading(false); }
    }, 300);
  }

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    if (selected) onSelect(null);
    searchVenues(e.target.value);
  }

  function handleVenueSelect(v: Venue) {
    onSelect(v);
    setQuery(v.name);
    setAddrQuery(v.address ?? '');
    setAddrCoords(
      v.latitude != null && v.longitude != null ? { lat: v.latitude, lng: v.longitude } : null,
    );
    setOpen(false);
  }

  async function handleAddrSelect(result: AutocompleteResult) {
    setAddrQuery(result.label);
    setAddrCoords({ lat: result.lat, lng: result.lng });
    setAddrSuggestions([]);
    if (selected?.id) {
      try {
        const updated = await updateVenue(selected.id, {
          address: result.label,
          latitude: result.lat,
          longitude: result.lng,
        });
        onSelect(updated);
      } catch { /* non-blocking */ }
    }
  }

  async function handleCreate() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const v = await createVenue({
        name: query.trim(),
        address: addrQuery.trim() || undefined,
        city: addrQuery.trim() ? extractCity(addrQuery) : '—',
        latitude: addrCoords?.lat,
        longitude: addrCoords?.lng,
      });
      onSelect(v);
      setQuery(v.name);
      setOpen(false);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const gpsSet = addrCoords != null;
  const showAddress = query.trim().length >= 1;

  return (
    <div className={s.venueWrapper}>
      {/* Venue name search */}
      <input
        type="text"
        className={s.fieldInput}
        value={query}
        onChange={handleNameChange}
        placeholder={loading ? 'Buscando...' : 'Buscar o crear venue...'}
        style={selected ? { borderColor: '#4A827E', background: '#162220' } : {}}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className={s.venueDropdown}>
          {results.map((v) => (
            <div key={v.id} className={s.venueItem} onMouseDown={() => handleVenueSelect(v)}>
              <span className={s.venueName}>{v.name}</span>
              <span className={s.venueCity}>{v.city}{v.address ? ` — ${v.address}` : ''}</span>
            </div>
          ))}
          {query.trim() && (
            <div className={s.venueItem} onMouseDown={handleCreate}>
              <span className={s.venueCreate}>+ Crear &quot;{query.trim()}&quot;</span>
            </div>
          )}
        </div>
      )}

      {/* Address section — shown as soon as a name is entered */}
      {showAddress && (
        <div className={s.venueAddressSection}>
          <div className={s.venueCountryRow}>
            <select
              className={s.venueCountrySelect}
              value={country}
              onChange={(e) => { setCountry(e.target.value as SupportedCountry); setAddrSuggestions([]); }}
            >
              {GEO_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
              ))}
            </select>
            <div className={s.venueAddrWrap}>
              <input
                type="text"
                className={`${s.fieldInput} ${s.venueAddrInput}`}
                placeholder="Dirección completa del venue…"
                value={addrQuery}
                onChange={(e) => { setAddrQuery(e.target.value); searchAddress(e.target.value); }}
                style={gpsSet ? { borderColor: '#4A827E', paddingRight: '90px' } : {}}
              />
              {addrLoading && <span className={s.venueAddrSpinner} />}
              {gpsSet && <span className={s.venueGpsBadge}>📍 GPS ✓</span>}
            </div>
          </div>
          {addrSuggestions.length > 0 && (
            <div className={s.venueAddrSuggestions}>
              {addrSuggestions.map((r, i) => (
                <div key={i} className={s.venueItem} onMouseDown={() => void handleAddrSelect(r)}>
                  <span className={s.venueName}>📍 {r.label}</span>
                </div>
              ))}
            </div>
          )}
          {!addrLoading && addrQuery.length >= 2 && addrSuggestions.length === 0 && !gpsSet && (
            <div className={s.venueAddrEmpty}>Sin resultados — escribe más despacio o prueba otra dirección</div>
          )}
        </div>
      )}
    </div>
  );
}


export function CreateEventWizard({ onClose }: Props) {
  const [step, setStep] = useState(0);

  const [eventType, setEventType] = useState<EventType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const [startDt, setStartDt] = useState(tomorrowAt(20));
  const [endDt, setEndDt] = useState(tomorrowAt(23));
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const [activeNoteTab, setActiveNoteTab] = useState(0);
  const [setlistNotes, setSetlistNotes] = useState('');
  const [daysheetNotes, setDaysheetNotes] = useState('');
  const [itineraryNotes, setItineraryNotes] = useState('');

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    getMyOrganizations()
      .then((orgs) => setOrgId(getActiveOrganization(orgs)?.id ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== 3 || !orgId) return;
    setLoadingMembers(true);
    getOrganizationMembers(orgId)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [step, orgId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canProceed = () => {
    if (step === 0) return !!eventType && title.trim().length >= 2;
    if (step === 1) return !!startDt;
    return true;
  };

  const toggleMember = (userId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!orgId) throw new Error('No hay organización. Verificá tu sesión.');
      if (!eventType) throw new Error('Seleccioná un tipo de evento.');
      const startIso = toIso(startDt);
      if (!startIso) throw new Error('Fecha de inicio inválida.');

      const event = await createEvent({
        orgId,
        title: title.trim(),
        type: eventType,
        startTime: startIso,
        endTime: endDt ? toIso(endDt) || undefined : undefined,
        venueId: selectedVenue?.id,
        description: description.trim() || undefined,
        isPublic,
        setlistNotes: setlistNotes.trim() || undefined,
        daysheetNotes: daysheetNotes.trim() || undefined,
        itineraryNotes: itineraryNotes.trim() || undefined,
      });

      await Promise.all(
        Array.from(selectedIds).map((userId) =>
          addRosterMember(event.id, {
            userId,
            role: memberRoles[userId] || 'Músico',
          }).catch(() => {}),
        ),
      );

      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear el evento.');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const activeType = EVENT_TYPES.find((t) => t.value === eventType);

  const previewStartLabel = startDt
    ? new Date(startDt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
    : null;


  const noteValues = [setlistNotes, daysheetNotes, itineraryNotes];
  const noteSetters = [setSetlistNotes, setDaysheetNotes, setItineraryNotes];
  const notePlaceholders = [
    '1. Canción de apertura\n2. ...',
    'Rider técnico, notas de producción...',
    '15:00 Entrada staff\n16:00 Soundcheck...',
  ];

  return (
    <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.sidebar}>
        <div className={s.sidebarHeader}>
          <span className={s.sidebarTitle}>Nuevo Evento</span>
          <button className={s.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={s.stepper}>
          {STEPS.map((st, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div
                key={st.label}
                className={`${s.stepItem} ${i === STEPS.length - 1 ? s.stepItemLast : ''} ${active ? s.stepItemActive : ''} ${done ? s.stepDone : ''}`}
                onClick={() => done && setStep(i)}
              >
                <div className={s.stepDot}>{done ? '✓' : i + 1}</div>
                <div className={s.stepInfo}>
                  <span className={s.stepLabel}>{st.label}</span>
                  <span className={s.stepSublabel}>{st.sub}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={s.previewCard}>
          {!title && !eventType ? (
            <div className={s.previewCardEmpty}>
              <span style={{ fontSize: 28 }}>📋</span>
              <span>La vista previa aparecerá aquí</span>
            </div>
          ) : (
            <>
              <div className={s.previewLabel}>Vista Previa</div>
              {activeType && (
                <div className={s.previewType}>
                  <span>{activeType.icon}</span> {activeType.label}
                </div>
              )}
              <div className={title ? s.previewTitle : `${s.previewTitle} ${s.previewTitleEmpty}`}>
                {title || 'Sin título…'}
              </div>
              <div className={s.previewMeta}>
                {previewStartLabel && (
                  <div className={s.previewMetaRow}>
                    <span className={s.previewMetaIcon}>🗓</span>
                    {previewStartLabel}
                  </div>
                )}
                {selectedVenue && (
                  <div className={s.previewMetaRow}>
                    <span className={s.previewMetaIcon}>📍</span>
                    {selectedVenue.name}
                  </div>
                )}
                {isPublic && (
                  <div className={s.previewMetaRow}>
                    <span className={s.previewMetaIcon}>🌐</span>
                    Evento público
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={s.canvas}>
        <div className={s.canvasInner}>
          {step === 0 && (
            <>
              <h2 className={s.stepHeading}>¿Qué tipo de evento?</h2>
              <p className={s.stepSub}>Elegí el tipo de actividad que vas a crear.</p>

              <div className={s.typeGrid}>
                {EVENT_TYPES.map((et) => (
                  <div
                    key={et.value}
                    className={`${s.typeCard} ${eventType === et.value ? s.typeCardActive : ''}`}
                    onClick={() => setEventType(et.value)}
                  >
                    <span className={s.typeIcon}>{et.icon}</span>
                    <span className={s.typeLabel}>{et.label}</span>
                  </div>
                ))}
              </div>

              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Nombre del evento</label>
                <input
                  type="text"
                  className={s.fieldInput}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Concierto de verano"
                  maxLength={120}
                  autoFocus
                />
              </div>

              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Descripción <span style={{ fontWeight: 400, textTransform: 'none', color: '#3A4454' }}>— opcional</span></label>
                <textarea
                  className={`${s.fieldInput} ${s.fieldTextarea}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción breve del evento..."
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div
                className={s.toggleRow}
                onClick={() => setIsPublic((v) => !v)}
                role="switch"
                aria-checked={isPublic}
              >
                <div className={s.toggleInfo}>
                  <div className={s.toggleLabel}>Evento público</div>
                  <div className={s.toggleSub}>Visible fuera de la organización</div>
                </div>
                <div className={`${s.toggle} ${isPublic ? s.toggleOn : ''}`}>
                  <div className={s.toggleKnob} />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className={s.stepHeading}>Fecha y lugar</h2>
              <p className={s.stepSub}>Definí cuándo y dónde ocurrirá el evento.</p>

              <div className={s.dateRow}>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>Inicio</label>
                  <input
                    type="datetime-local"
                    className={`${s.fieldInput} ${s.fieldDatetime}`}
                    value={startDt}
                    onChange={(e) => setStartDt(e.target.value)}
                  />
                </div>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>Fin <span style={{ fontWeight: 400, textTransform: 'none', color: '#3A4454' }}>— opcional</span></label>
                  <input
                    type="datetime-local"
                    className={`${s.fieldInput} ${s.fieldDatetime}`}
                    value={endDt}
                    onChange={(e) => setEndDt(e.target.value)}
                  />
                </div>
              </div>

              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Venue <span style={{ fontWeight: 400, textTransform: 'none', color: '#3A4454' }}>— opcional</span></label>
                <VenueLocationPicker selected={selectedVenue} onSelect={setSelectedVenue} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className={s.stepHeading}>Notas del evento</h2>
              <p className={s.stepSub}>Setlist, instrucciones de producción e itinerario.</p>

              <div className={s.noteTabs}>
                {['Setlist', 'DaySheet', 'Itinerario'].map((tab, i) => (
                  <button
                    key={tab}
                    className={`${s.noteTab} ${activeNoteTab === i ? s.noteTabActive : ''}`}
                    onClick={() => setActiveNoteTab(i)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className={s.fieldGroup}>
                <textarea
                  className={`${s.fieldInput} ${s.fieldTextarea}`}
                  value={noteValues[activeNoteTab]}
                  onChange={(e) => noteSetters[activeNoteTab](e.target.value)}
                  placeholder={notePlaceholders[activeNoteTab]}
                  rows={12}
                  style={{ minHeight: 240 }}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className={s.summaryCard}>
                <div className={s.summaryIcon}>{activeType?.icon ?? '📅'}</div>
                <div className={s.summaryInfo}>
                  <p className={s.summaryTitle}>{title}</p>
                  <p className={s.summaryMeta}>
                    {activeType?.label}
                    {startDt && ` · ${new Date(startDt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}`}
                    {selectedVenue && ` · ${selectedVenue.name}`}
                  </p>
                </div>
              </div>

              <h2 className={s.stepHeading}>Agregar músicos al evento</h2>
              <p className={s.stepSub}>Seleccioná los miembros de la organización que participarán.</p>

              {error && <div className={s.errorBanner}>{error}</div>}

              {loadingMembers ? (
                <p style={{ color: '#5A6370', fontSize: 14 }}>Cargando miembros…</p>
              ) : members.length === 0 ? (
                <p style={{ color: '#5A6370', fontSize: 14 }}>No hay miembros en la organización.</p>
              ) : (
                <div className={s.memberList}>
                  {members.map((m) => {
                    const sel = selectedIds.has(m.user.id);
                    return (
                      <div
                        key={m.id}
                        className={`${s.memberRow} ${sel ? s.memberRowSelected : ''}`}
                        onClick={() => toggleMember(m.user.id)}
                      >
                        <div className={`${s.checkbox} ${sel ? s.checkboxChecked : ''}`}>
                          {sel && '✓'}
                        </div>
                        <span className={s.memberName}>{m.user.displayName}</span>
                        {sel && (
                          <input
                            type="text"
                            className={s.roleInput}
                            value={memberRoles[m.user.id] ?? ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              setMemberRoles((prev) => ({ ...prev, [m.user.id]: e.target.value }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Rol (ej: Guitarra)"
                            maxLength={40}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className={s.bottomBar}>
          <button
            className={s.backBtn}
            onClick={step === 0 ? onClose : goBack}
          >
            {step === 0 ? 'Cancelar' : '← Anterior'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              className={s.nextBtn}
              onClick={goNext}
              disabled={!canProceed()}
            >
              Siguiente →
            </button>
          ) : (
            <button
              className={s.submitBtn}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Creando…' : '✓ Crear Evento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
