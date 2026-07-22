import React from 'react';
import { useParams } from 'react-router-dom';

export function DirectMessagePage() {
  const { userId } = useParams<{ userId: string }>();

  return (
    <main data-page="direct-message">
      <h1>Chat 1 a 1</h1>
      <p>{userId}</p>
    </main>
  );
}
