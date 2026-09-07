import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getVenue } from '@regieart/api';
import type { Venue } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './VenueDetailPage.module.scss';

export function VenueDetailPage() {
  const { venueId } = useParams<{ venueId: string }>();
  const [venue, setVenue] = useState<Venue|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venueId) return;
    getVenue(venueId).then(setVenue).finally(() => setLoading(false));
  }, [venueId]);

  if (loading) return <div className={p.spinner} style={{ margin:'48px auto' }} />;
  if (!venue) return <div className={p.empty}><div className={p.emptyTitle}>Introuvable</div></div>;

  const address = [venue.address, venue.city, venue.country].filter(Boolean).join(', ');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className={p.page}>
      <div className={p.pageHeader}>
        <h1 className={p.pageTitle}>{venue.name}</h1>
        {(venue.city || venue.country) && (
          <p className={p.pageSubtitle}>
            📍 {[venue.city, venue.country].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      <div className={`${p.grid2} ${s.grid}`}>
        <div className={p.card}>
          <div className={s.sectionTitle}>Adresse</div>
          <div className={s.row}>{address || 'Inconnue'}</div>
          {address && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={p.btnSecondary} style={{ marginTop:12, display:'inline-block' }}>
              Ouvrir la carte
            </a>
          )}
        </div>

        <div className={p.card}>
          <div className={s.sectionTitle}>Détails</div>
          {venue.capacity && <div className={s.row}>Capacité : <strong>{venue.capacity}</strong></div>}
          {venue.technicalContactPhone && (
            <div className={s.row}>
              Téléphone : <a href={`tel:${venue.technicalContactPhone}`} style={{ color:'var(--action-brand)' }}>{venue.technicalContactPhone}</a>
            </div>
          )}
          {venue.technicalContactEmail && (
            <div className={s.row}>
              E-mail : <a href={`mailto:${venue.technicalContactEmail}`} style={{ color:'var(--action-brand)' }}>{venue.technicalContactEmail}</a>
            </div>
          )}
          {venue.technicalContactName && (
            <div className={s.row}>Contact technique : <strong>{venue.technicalContactName}</strong></div>
          )}
        </div>
      </div>

      {venue.parkingNotes && (
        <div className={`${p.card} ${s.notesCard}`}>
          <div className={s.sectionTitle}>Notes</div>
          <p style={{ margin:0, color:'var(--text-body)', fontSize:14, lineHeight:1.6 }}>{venue.parkingNotes}</p>
        </div>
      )}
    </div>
  );
}