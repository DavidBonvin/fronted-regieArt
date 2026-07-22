import React from 'react';
import { useParams } from 'react-router-dom';

export function ScoreViewerPage() {
  const { songId } = useParams<{ songId: string }>();

  return (
    <main data-page="score-viewer">
      <h1>Visor de Partitura / Atril</h1>
      <p>{songId}</p>
    </main>
  );
}
