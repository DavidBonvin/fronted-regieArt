import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getVehicles } from '@regieart/api';
import type { EventVehicle } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './PassengersPage.module.scss';

export function PassengersPage() {
  const { vehicleId, daysheetId } = useParams<{ vehicleId: string; daysheetId: string }>();
  const [vehicle, setVehicle] = useState<EventVehicle|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!daysheetId || !vehicleId) { setLoading(false); return; }
    getVehicles(daysheetId).then((vehs) => {
      setVehicle(vehs.find((v) => v.id === vehicleId) ?? null);
    }).finally(() => setLoading(false));
  }, [daysheetId, vehicleId]);

  if (loading) return <div className={p.spinner} style={{ margin:'48px auto' }} />;
  if (!vehicle) return <div className={p.empty}><div className={p.emptyTitle}>Introuvable</div></div>;

  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>Passagers — {vehicle.plateNumber}</h1>

      <div className={p.card}>
        <div className={s.vehicleInfo}>
          <div><span className={s.label}>Chauffeur</span> <strong>{vehicle.driverName ?? 'Inconnu'}</strong></div>
          {vehicle.driverPhone && <div><span className={s.label}>Téléphone</span> <a href={`tel:${vehicle.driverPhone}`} style={{ color:'var(--action-brand)' }}>{vehicle.driverPhone}</a></div>}
          {vehicle.capacity && <div><span className={s.label}>Capacité</span> {vehicle.capacity}</div>}
        </div>
      </div>

      {vehicle.passengers && vehicle.passengers.length > 0 && (
        <div className={p.card} style={{ marginTop:16 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:12 }}>Passagers</div>
          {vehicle.passengers.map((pas: any, i: number) => (
            <div key={i} className={s.pasRow}>
              <div className={s.pasAvatar}>{(pas.displayName?.[0] ?? '?').toUpperCase()}</div>
              <div>{pas.displayName}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}