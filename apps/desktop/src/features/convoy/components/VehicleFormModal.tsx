import React, { useState, useRef, useEffect } from 'react';
import { createVehicle, addPickupPoint } from '@regieart/api';
import type { EventVehicle, SupportedCountry, AutocompleteResult } from '@regieart/types';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import s from './VehicleFormModal.module.scss';

const COUNTRIES: { code: SupportedCountry; flag: string; label: string }[] = [
  { code: 'FR', flag: '🇫🇷', label: 'France' },
  { code: 'BE', flag: '🇧🇪', label: 'Belgique' },
  { code: 'ES', flag: '🇪🇸', label: 'España' },
  { code: 'DE', flag: '🇩🇪', label: 'Deutschland' },
  { code: 'IT', flag: '🇮🇹', label: 'Italia' },
  { code: 'CA', flag: '🇨🇦', label: 'Canada' },
];

interface PickupField {
  address: string;
  lat?: number;
  lng?: number;
  time: string; // HH:MM local
}

interface Props {
  eventId: string;
  eventTitle: string;
  eventStartTime?: string;
  venueAddress?: string;
  onCreated: (vehicle: EventVehicle) => void;
  onClose: () => void;
}

function toPickupIso(timeHHMM: string, baseIso?: string): string {
  const base = baseIso ? new Date(baseIso) : new Date();
  const [h, m] = timeHHMM.split(':').map(Number);
  base.setHours(h, m, 0, 0);
  return base.toISOString();
}

export function VehicleFormModal({
  eventId, eventTitle, eventStartTime, venueAddress, onCreated, onClose,
}: Props) {
  const [name, setName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [country, setCountry] = useState<SupportedCountry>('FR');
  const [origin, setOrigin] = useState('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickups, setPickups] = useState<PickupField[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function addPickup() {
    setPickups((p) => [...p, { address: '', time: '' }]);
  }

  function removePickup(idx: number) {
    setPickups((p) => p.filter((_, i) => i !== idx));
  }

  function updatePickup(idx: number, patch: Partial<PickupField>) {
    setPickups((p) => p.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre del vehículo es obligatorio.'); return; }
    if (!origin.trim()) { setError("La adresse d'origine est obligatoire."); return; }
    setSaving(true);
    setError('');
    try {
      const vehicle = await createVehicle(eventId, {
        name: name.trim(),
        driverName: driverName.trim() || undefined,
      });
      // Origin address → first pickup (order 0) so the route endpoint has the departure point
      if (origin.trim()) {
        await addPickupPoint(eventId, vehicle.id, {
          address: origin.trim(),
          time: eventStartTime ? toPickupIso('07:00', eventStartTime) : new Date().toISOString(),
          order: 0,
          lat: originCoords?.lat,
          lng: originCoords?.lng,
        }).catch(() => { /* non-blocking */ });
      }
      for (let i = 0; i < pickups.length; i++) {
        const p = pickups[i];
        if (!p.address.trim()) continue;
        await addPickupPoint(eventId, vehicle.id, {
          address: p.address.trim(),
          time: p.time ? toPickupIso(p.time, eventStartTime) : new Date().toISOString(),
          order: origin.trim() ? i + 1 : i,
          lat: p.lat,
          lng: p.lng,
        }).catch(() => { /* skip if individual pickup fails */ });
      }
      onCreated(vehicle);
    } catch (err: unknown) {
      let msg = 'Error al crear el vehículo';
      if (err && typeof err === 'object' && 'response' in err) {
        try {
          const body = await (err as { response: Response }).response.json() as { message?: string | string[] };
          msg = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? msg);
        } catch { /* keep default */ }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={s.header}>
          <div>
            <div className={s.headerTitle}>Créer et Attacher un Véhicule</div>
            <div className={s.headerSub}>{eventTitle}</div>
          </div>
          <button className={s.closeBtn} onClick={onClose} type="button">×</button>
        </div>

        <form className={s.body} onSubmit={handleSubmit} noValidate>
          {/* 1. Identification */}
          <div className={s.section}>
            <div className={s.sectionTitle}>1. Identification du véhicule</div>
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label}>Nom du véhicule *</label>
                <input
                  ref={firstRef}
                  className={s.input}
                  placeholder="Van 1 - Musiciens, Camión Backline…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>Chauffeur désigné</label>
                <input
                  className={s.input}
                  placeholder="Nombre del conductor"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. Itinerary */}
          <div className={s.section}>
            <div className={s.sectionTitle}>2. Itinéraire & Départ</div>
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label}>Pays d'origine</label>
                <select
                  className={s.select}
                  value={country}
                  onChange={(e) => setCountry(e.target.value as SupportedCountry)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                  ))}
                </select>
              </div>
              <AddressAutocompleteInput
                value={origin}
                onChange={setOrigin}
                onSelect={(r: AutocompleteResult) => {
                  setOriginCoords({ lat: r.lat, lng: r.lng });
                }}
                country={country}
                label="Adresse d'Origine"
                placeholder="8 Rue de la Paix, Paris…"
                required
              />
            </div>
          </div>

          {/* 3. Pickups */}
          <div className={s.section}>
            <div className={s.sectionTitle}>3. Points de ramassage (optionnels)</div>
            {pickups.map((pickup, i) => (
              <div key={i} className={s.pickupRow}>
                <span className={s.pickupNum}>Arrêt {i + 1}</span>
                <AddressAutocompleteInput
                  value={pickup.address}
                  onChange={(v) => updatePickup(i, { address: v })}
                  onSelect={(r: AutocompleteResult) =>
                    updatePickup(i, { address: r.label, lat: r.lat, lng: r.lng })
                  }
                  country={country}
                  placeholder="Dirección del punto de recogida"
                />
                <input
                  type="time"
                  className={`${s.input} ${s.timeInput}`}
                  value={pickup.time}
                  onChange={(e) => updatePickup(i, { time: e.target.value })}
                />
                <button
                  type="button"
                  className={s.removePickupBtn}
                  onClick={() => removePickup(i)}
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            ))}
            <button type="button" className={s.addPickupBtn} onClick={addPickup}>
              ➕ Ajouter un point de ramassage
            </button>
          </div>

          {/* 4. Venue */}
          <div className={s.section}>
            <div className={s.sectionTitle}>4. Destination (automatique depuis l'événement)</div>
            <div className={s.venueBox}>
              🏟️{' '}
              {venueAddress ?? 'Venue de l\'événement (coordonnées GPS depuis le backend)'}
            </div>
          </div>

          {error && <div className={s.errorBanner}>{error}</div>}

          <div className={s.footer}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>Annuler</button>
            <button type="submit" className={s.saveBtn} disabled={saving}>
              {saving ? 'Création en cours…' : '💾 Créer le véhicule et enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
