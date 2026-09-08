import React, { useEffect, useRef, useState } from 'react';
import type { Event, EventStatus } from '@regieart/types';
import s from './OrganizationSettingsModal.module.scss';

type OrganizationSettingsModalProps = {
  organizationName: string;
  isOwner: boolean;
  futureEventCount: number;
  events: Event[];
  onEditEvent: (event: Event) => Promise<void>;
  onDeleteEvent: (event: Event) => Promise<void>;
  onOpenEvent: (event: Event) => void;
  onEditProfile: () => void;
  onManageMembers: () => void;
  onInvite: () => void;
  onDelete: () => Promise<void>;
  onLeave: () => Promise<void>;
  onClose: () => void;
};

export function OrganizationSettingsModal({
  organizationName,
  isOwner,
  futureEventCount,
  events,
  onEditEvent,
  onDeleteEvent,
  onOpenEvent,
  onEditProfile,
  onManageMembers,
  onInvite,
  onDelete,
  onLeave,
  onClose,
}: OrganizationSettingsModalProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [dangerAction, setDangerAction] = useState<'delete' | 'leave' | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [eventDraft, setEventDraft] = useState<Event | null>(null);
  const [eventDelete, setEventDelete] = useState<Event | null>(null);
  const [eventBusy, setEventBusy] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [busy, onClose]);

  function chooseDanger(action: 'delete' | 'leave') {
    setDangerAction(action);
    setConfirmation('');
    setError('');
  }

  function cancelDanger() {
    if (busy) return;
    setDangerAction(null);
    setConfirmation('');
    setError('');
  }

  async function confirmDanger() {
    if (confirmation.trim() !== organizationName || busy || (dangerAction === 'delete' && futureEventCount > 0)) return;
    setBusy(true);
    setError('');
    try {
      if (dangerAction === 'delete') await onDelete();
      else await onLeave();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de terminer cette action.');
      setBusy(false);
    }
  }

  async function saveEvent() {
    if (!eventDraft || !eventDraft.title.trim() || eventBusy) return;
    setEventBusy(true);
    try {
      await onEditEvent(eventDraft);
      setEventDraft(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de modifier cet événement.');
    } finally { setEventBusy(false); }
  }

  async function confirmEventDelete() {
    if (!eventDelete || eventBusy) return;
    setEventBusy(true);
    try {
      await onDeleteEvent(eventDelete);
      setEventDelete(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de supprimer cet événement.');
    } finally { setEventBusy(false); }
  }

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="org-settings-title" onClick={onClose}>
      <div className={s.modal} onClick={(event) => event.stopPropagation()}>
        <header className={s.header}>
          <div>
            <p className={s.eyebrow}>Espace organisation</p>
            <h2 id="org-settings-title" ref={titleRef} tabIndex={-1} className={s.title}>Paramètres du groupe</h2>
            <p className={s.subtitle}>{organizationName} · choisissez une action à effectuer.</p>
          </div>
          <button className={s.closeBtn} onClick={onClose} disabled={busy} aria-label="Fermer">×</button>
        </header>

        {!dangerAction ? (
          <div className={s.content}>
            <section className={s.section} aria-labelledby="workspace-actions-title">
              <h3 id="workspace-actions-title" className={s.sectionTitle}>Faire évoluer le groupe</h3>
              <button className={s.action} onClick={onEditProfile}>
                <span className={s.actionIcon}>✦</span>
                <span className={s.actionCopy}><strong>Modifier le profil</strong><small>Nom, présentation, site web et téléphone.</small></span>
                <span className={s.arrow} aria-hidden>→</span>
              </button>
              <button className={s.action} onClick={onManageMembers}>
                <span className={s.actionIcon}>♙</span>
                <span className={s.actionCopy}><strong>Gérer les membres</strong><small>Inviter, modifier les rôles ou retirer un membre.</small></span>
                <span className={s.arrow} aria-hidden>→</span>
              </button>
              <button className={s.action} onClick={onInvite}>
                <span className={s.actionIcon}>✉</span>
                <span className={s.actionCopy}><strong>Inviter quelqu’un</strong><small>Créer un lien ou envoyer une invitation par e-mail.</small></span>
                <span className={s.arrow} aria-hidden>→</span>
              </button>
            </section>

            <section className={s.section} aria-labelledby="events-actions-title">
              <h3 id="events-actions-title" className={s.sectionTitle}>Événements de l’organisation</h3>
              {events.length === 0 ? (
                <p className={s.emptyEvents}>Aucun événement à venir dans les 14 prochains jours.</p>
              ) : events.map((event) => (
                <div className={s.eventRow} key={event.id}>
                  <button className={s.eventInfo} onClick={() => onOpenEvent(event)}>
                    <strong>{event.title}</strong>
                    <small>{new Date(event.startTime).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {event.status}</small>
                  </button>
                  <button className={s.eventIconBtn} onClick={() => setEventDraft(event)} aria-label={`Modifier ${event.title}`}>✎</button>
                  <button className={s.eventIconBtnDanger} onClick={() => setEventDelete(event)} aria-label={`Supprimer ${event.title}`}>⌫</button>
                </div>
              ))}
            </section>

            <section className={s.sectionDanger} aria-labelledby="danger-actions-title">
              <h3 id="danger-actions-title" className={s.sectionTitleDanger}>Zone sensible</h3>
              {isOwner ? (
                <button className={s.dangerAction} onClick={() => chooseDanger('delete')} disabled={futureEventCount > 0}>
                  <span className={s.dangerIcon}>⌫</span>
                  <span className={s.actionCopy}><strong>Supprimer l’organisation</strong><small>{futureEventCount > 0 ? `Bloqué : ${futureEventCount} événement(s) à venir doivent d’abord être terminés ou replanifiés.` : 'Cette action est définitive et retire tout l’espace.'}</small></span>
                  <span className={s.arrow} aria-hidden>→</span>
                </button>
              ) : (
                <button className={s.dangerAction} onClick={() => chooseDanger('leave')}>
                  <span className={s.dangerIcon}>↪</span>
                  <span className={s.actionCopy}><strong>Quitter l’organisation</strong><small>Vous perdrez l’accès aux événements et ressources du groupe.</small></span>
                  <span className={s.arrow} aria-hidden>→</span>
                </button>
              )}
            </section>
          </div>
        ) : (
          <div className={s.confirmContent}>
            <div className={s.warningIcon} aria-hidden>{dangerAction === 'delete' ? '!' : '↪'}</div>
            <h3 className={s.confirmTitle}>
              {dangerAction === 'delete' ? 'Supprimer cette organisation ?' : 'Quitter cette organisation ?'}
            </h3>
            <p className={s.confirmText}>
              {dangerAction === 'delete'
                ? `Tous les membres, événements et ressources liés à cet espace pourront devenir inaccessibles. ${futureEventCount > 0 ? 'La suppression est bloquée tant que des événements futurs existent.' : 'Cette action ne peut pas être annulée.'}`
                : 'Quitter ne supprime pas l’organisation ni ses événements. Vous perdrez votre accès aux événements et aux ressources, sauf si un administrateur vous invite à nouveau.'}
            </p>
            <label className={s.confirmLabel} htmlFor="organization-confirmation">
              Écrivez <strong>{organizationName}</strong> pour confirmer
            </label>
            <input
              id="organization-confirmation"
              className={s.confirmInput}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              aria-describedby="organization-confirmation-help"
            />
            <p id="organization-confirmation-help" className={s.help}>La confirmation doit respecter les majuscules et minuscules.</p>
            {error && <p className={s.error} role="alert">{error}</p>}
          </div>
        )}

        {eventDraft && (
          <div className={s.subOverlay} role="dialog" aria-modal="true" aria-labelledby="event-edit-title">
            <div className={s.subModal}>
              <h3 id="event-edit-title" className={s.confirmTitle}>Modifier l’événement</h3>
              <label className={s.confirmLabel} htmlFor="event-title">Titre</label>
              <input id="event-title" className={s.confirmInput} value={eventDraft.title} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} />
              <label className={s.confirmLabel} htmlFor="event-status">Statut</label>
              <select id="event-status" className={s.confirmInput} value={eventDraft.status} onChange={(e) => setEventDraft({ ...eventDraft, status: e.target.value as EventStatus })}>
                <option value="DRAFT">Brouillon</option><option value="CONFIRMED">Confirmé</option><option value="CANCELLED">Annulé</option><option value="COMPLETED">Terminé</option>
              </select>
              <div className={s.subFooter}><button className={s.cancelBtn} onClick={() => setEventDraft(null)}>Annuler</button><button className={s.confirmDangerBtn} style={{ background: 'var(--action-brand)' }} onClick={() => void saveEvent()} disabled={eventBusy || !eventDraft.title.trim()}>Enregistrer</button></div>
            </div>
          </div>
        )}

        {eventDelete && (
          <div className={s.subOverlay} role="dialog" aria-modal="true" aria-labelledby="event-delete-title">
            <div className={s.subModal}>
              <h3 id="event-delete-title" className={s.confirmTitle}>Supprimer cet événement ?</h3>
              <p className={s.confirmText}>« {eventDelete.title} » sera supprimé. Les membres ne pourront plus consulter sa planification. Cette action est irréversible.</p>
              <div className={s.subFooter}><button className={s.cancelBtn} onClick={() => setEventDelete(null)}>Annuler</button><button className={s.confirmDangerBtn} onClick={() => void confirmEventDelete()} disabled={eventBusy}>Supprimer</button></div>
            </div>
          </div>
        )}

        <footer className={s.footer}>
          {dangerAction ? (
            <>
              <button className={s.cancelBtn} onClick={cancelDanger} disabled={busy}>Retour</button>
              <button className={s.confirmDangerBtn} onClick={() => void confirmDanger()} disabled={busy || confirmation !== organizationName || (dangerAction === 'delete' && futureEventCount > 0)}>
                {busy ? 'Traitement…' : dangerAction === 'delete' ? 'Supprimer définitivement' : 'Quitter le groupe'}
              </button>
            </>
          ) : (
            <button className={s.cancelBtn} onClick={onClose}>Fermer</button>
          )}
        </footer>
      </div>
    </div>
  );
}
