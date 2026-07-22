import React from 'react';
import { useParams } from 'react-router-dom';

export function PassengersPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();

  return (
    <main data-page="passengers">
      <h1>Pasajeros y GPS Pickups</h1>
      <p>{vehicleId}</p>
    </main>
  );
}
