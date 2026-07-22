import React from 'react';
import { useParams } from 'react-router-dom';

export function VenueDetailPage() {
  const { venueId } = useParams<{ venueId: string }>();

  return (
    <main data-page="venue-detail">
      <h1>Detalle de Venue</h1>
      <p>{venueId}</p>
    </main>
  );
}
