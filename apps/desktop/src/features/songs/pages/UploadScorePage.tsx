import React from 'react';
import { useParams } from 'react-router-dom';

export function UploadScorePage() {
  const { songId } = useParams<{ songId: string }>();

  return (
    <main data-page="upload-score">
      <h1>Cargar Partitura a R2</h1>
      <p>{songId}</p>
    </main>
  );
}
