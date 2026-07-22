import React from 'react';
import { useParams } from 'react-router-dom';

export function BandChatPage() {
  const { channelId } = useParams<{ channelId: string }>();

  return (
    <main data-page="band-chat">
      <h1>Chat de Banda</h1>
      <p>{channelId}</p>
    </main>
  );
}
