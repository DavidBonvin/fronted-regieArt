import React, { useId, useState } from 'react';
import { createOrganization } from '@regieart/api';
import type { Organization } from '@regieart/types';
import s from './CreateOrganizationModal.module.scss';

interface Props {
  onClose: () => void;
  onCreated: (org: Organization) => void;
}

export function CreateOrganizationModal({ onClose, onCreated }: Props) {
  const id = useId();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Veuillez remplir tous les champs obligatoires.'); return; }
    setLoading(true);
    setError(null);
    try {
      const org = await createOrganization({
        name: name.trim(),
        description: description.trim() || undefined,
        website: website.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onCreated(org);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={s.backdrop} onClick={handleBackdropClick} role="dialog" aria-modal="true">
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <h2 className={s.modalTitle}>Nouvelle organisation</h2>
          <button className={s.closeBtn} onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <p className={s.modalSubtitle}>Créez l’espace de travail de votre projet musical.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={s.fieldGroup}>
            <label htmlFor={`${id}-name`} className={s.label}>Nom du groupe / organisation *</label>
            <input
              id={`${id}-name`}
              className={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Les Étoiles du Nord"
              autoFocus
              required
            />
          </div>

          <div className={s.fieldGroup}>
            <label htmlFor={`${id}-desc`} className={s.label}>Description / Biographie (optionnel)</label>
            <textarea
              id={`${id}-desc`}
              className={s.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Orchestre de musique du monde..."
              rows={3}
            />
          </div>

          <div className={s.fieldRow}>
            <div className={s.fieldGroup}>
              <label htmlFor={`${id}-web`} className={s.label}>Site web officiel (optionnel)</label>
              <input
                id={`${id}-web`}
                className={s.input}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://etoilesdunord.ca"
                type="url"
              />
            </div>
            <div className={s.fieldGroup}>
              <label htmlFor={`${id}-phone`} className={s.label}>Téléphone de contact (optionnel)</label>
              <input
                id={`${id}-phone`}
                className={s.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-514-555-0100"
                type="tel"
              />
            </div>
          </div>

          {error && <p className={s.errorText}>{error}</p>}

          <div className={s.modalFooter}>
            <button type="button" className={s.cancelBtn} onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className={s.submitBtn} disabled={loading}>
              {loading ? 'Création en cours...' : 'CRÉER L’ORGANISATION'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
