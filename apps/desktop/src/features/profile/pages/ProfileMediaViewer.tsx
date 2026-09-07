import React, { useEffect, useRef } from 'react';
import s from './ProfileMediaViewer.module.scss';

export type ProfileMediaKind = 'avatar' | 'banner';

type ProfileMediaViewerProps = {
  src: string;
  kind: ProfileMediaKind;
  userName: string;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
};

const TITLE: Record<ProfileMediaKind, string> = {
  avatar: 'Photo de profil',
  banner: 'Bannière du profil',
};

const EDIT_LABEL: Record<ProfileMediaKind, string> = {
  avatar: 'Changer la photo',
  banner: 'Changer la bannière',
};

function fileName(kind: ProfileMediaKind, userName: string): string {
  const slug = userName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profil';
  return `${slug}-${kind === 'avatar' ? 'photo' : 'banniere'}.jpg`;
}

export function ProfileMediaViewer({
  src, kind, userName, canEdit, onEdit, onClose,
}: ProfileMediaViewerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`${TITLE[kind]} — ${userName}`}
      onClick={onClose}
    >
      <button ref={closeRef} className={s.closeBtn} onClick={onClose} aria-label="Fermer">✕</button>

      <div className={s.shell} onClick={(e) => e.stopPropagation()}>
        <div className={s.caption}>
          <span className={s.captionTitle}>{TITLE[kind]}</span>
          <span className={s.captionSub}>{userName}</span>
        </div>

        <div className={s.stage}>
          <div className={kind === 'avatar' ? s.avatarFrame : s.bannerFrame}>
            <img src={src} alt={`${TITLE[kind]} de ${userName}`} />
          </div>
        </div>

        <div className={s.actions}>
          {canEdit && (
            <button className={s.btnPrimary} onClick={onEdit}>📷 {EDIT_LABEL[kind]}</button>
          )}
          <a className={s.btn} href={src} download={fileName(kind, userName)}>⬇ Télécharger</a>
          <button className={s.btn} onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
