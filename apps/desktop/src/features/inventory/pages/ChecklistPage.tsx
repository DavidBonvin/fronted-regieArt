import React from 'react';
import { useParams } from 'react-router-dom';

export function ChecklistPage() {
  const { daysheetId } = useParams<{ daysheetId: string }>();

  return (
    <main data-page="checklist">
      <h1>Checklist de Equipamiento</h1>
      <p>{daysheetId}</p>
    </main>
  );
}
