import React from 'react';
import { useParams } from 'react-router-dom';

export function ConvoyPage() {
  const { daysheetId } = useParams<{ daysheetId: string }>();

  return (
    <main data-page="convoy">
      <h1>Convoy y Vehículos</h1>
      <p>{daysheetId}</p>
    </main>
  );
}
