import React from 'react';
import { useParams } from 'react-router-dom';

export function InvitationsPage() {
  const { orgId } = useParams<{ orgId: string }>();

  return (
    <main data-page="invitations">
      <h1>Invitaciones QR / Link</h1>
      <p>{orgId}</p>
    </main>
  );
}
