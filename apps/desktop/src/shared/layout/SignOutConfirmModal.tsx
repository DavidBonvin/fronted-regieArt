import React, { useEffect, useRef } from 'react';
import s from './SignOutConfirmModal.module.scss';

type SignOutConfirmModalProps = {
  initials: string;
  userName: string;
  orgName?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SignOutConfirmModal({
  initials, userName, orgName, onConfirm, onCancel,
}: SignOutConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

  return (
    <div
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-title"
      onClick={onCancel}
    >
      <div className={s.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={s.identity}>
          <span className={s.avatar}>{initials}</span>
          <span className={s.identityText}>
            <span className={s.identityName}>{userName}</span>
            {orgName && <span className={s.identityOrg}>{orgName}</span>}
          </span>
        </div>

        <h2 id="signout-title" className={s.title}>Se déconnecter ?</h2>
        <p className={s.text}>
          Vous devrez saisir à nouveau vos identifiants pour revenir. Les images de profil
          gardées en mémoire sur cet appareil seront effacées.
        </p>

        <div className={s.actions}>
          <button ref={cancelRef} className={s.btnCancel} onClick={onCancel}>Annuler</button>
          <button className={s.btnConfirm} onClick={onConfirm}>Se déconnecter</button>
        </div>
      </div>
    </div>
  );
}
