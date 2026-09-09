import React, { useEffect, useRef, useState } from 'react';
import { acceptInvitation, rejectInvitation } from '@regieart/api';
import type { InvitationPublic } from '@regieart/types';
import s from './InvitationPromptModal.module.scss';

type Props = {
  invitation: InvitationPublic;
  token: string;
  onClose: () => void;
  onAccepted: (orgId: string) => void;
  onRejected: () => void;
  onViewDetails: () => void;
};

export function InvitationPromptModal({ invitation, token, onClose, onAccepted, onRejected, onViewDetails }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape' && !busy) onClose(); }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [busy, onClose]);

  async function accept() {
    setBusy(true); setError('');
    try {
      const { orgId } = await acceptInvitation(token);
      if (orgId) onAccepted(orgId);
      else throw new Error('La invitación fue aceptada, pero no se recibió la organización.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’accepter cette invitation.');
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true); setError('');
    try { await rejectInvitation(token); onRejected(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de refuser cette invitation.'); setBusy(false); }
  }

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="invitation-prompt-title" onClick={onClose}>
      <div className={s.modal} onClick={(event) => event.stopPropagation()}>
        <button ref={closeRef} className={s.close} onClick={onClose} disabled={busy} aria-label="Fermer">×</button>
        <div className={s.icon} aria-hidden>✉</div>
        <p className={s.eyebrow}>Invitation à rejoindre</p>
        <h2 id="invitation-prompt-title" className={s.title}>{invitation.organization.name}</h2>
        <p className={s.text}><strong>{invitation.createdBy.displayName}</strong> vous invite à rejoindre cette organisation.</p>
        <div className={s.details}>
          <span>Rôle proposé</span><strong>{invitation.role}</strong>
          {invitation.instrument && <><span>Spécialité</span><strong>{invitation.instrument}</strong></>}
        </div>
        {invitation.personalMessage && <blockquote className={s.message}>“{invitation.personalMessage}”</blockquote>}
        {error && <p className={s.error} role="alert">{error}</p>}
        <div className={s.actions}>
          <button className={s.reject} onClick={() => void reject()} disabled={busy}>Refuser</button>
          <button className={s.accept} onClick={() => void accept()} disabled={busy}>{busy ? 'Traitement…' : 'Accepter l’invitation'}</button>
        </div>
        <button className={s.detailsBtn} onClick={onViewDetails} disabled={busy}>Voir les détails de l’invitation</button>
      </div>
    </div>
  );
}
