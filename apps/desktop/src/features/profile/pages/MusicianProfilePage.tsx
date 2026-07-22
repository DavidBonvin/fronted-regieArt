import React from 'react';
import { useParams } from 'react-router-dom';

export function MusicianProfilePage() {
  const { userId } = useParams<{ userId: string }>();

  return (
    <main data-page="musician-profile">
      <h1>Perfil de Músico</h1>
      <p>{userId}</p>
    </main>
  );
}
