import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createOrganization } from '@regieart/api';
import type { Organization } from '@regieart/types';
import s from './CreateOrganizationModal.module.scss';

interface Props {
  onClose: () => void;
  onCreated: (org: Organization) => void;
}

export function CreateOrganizationModal({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const id = useId();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(t('errors.required_fields')); return; }
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
      setError(err instanceof Error ? err.message : t('errors.generic'));
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
          <h2 className={s.modalTitle}>{t('create_org.title')}</h2>
          <button className={s.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className={s.modalSubtitle}>{t('create_org.subtitle')}</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={s.fieldGroup}>
            <label htmlFor={`${id}-name`} className={s.label}>{t('create_org.field_name')}</label>
            <input
              id={`${id}-name`}
              className={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('create_org.name_placeholder')}
              autoFocus
              required
            />
          </div>

          <div className={s.fieldGroup}>
            <label htmlFor={`${id}-desc`} className={s.label}>{t('create_org.field_description')}</label>
            <textarea
              id={`${id}-desc`}
              className={s.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('create_org.description_placeholder')}
              rows={3}
            />
          </div>

          <div className={s.fieldRow}>
            <div className={s.fieldGroup}>
              <label htmlFor={`${id}-web`} className={s.label}>{t('create_org.field_website')}</label>
              <input
                id={`${id}-web`}
                className={s.input}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={t('create_org.website_placeholder')}
                type="url"
              />
            </div>
            <div className={s.fieldGroup}>
              <label htmlFor={`${id}-phone`} className={s.label}>{t('create_org.field_phone')}</label>
              <input
                id={`${id}-phone`}
                className={s.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('create_org.phone_placeholder')}
                type="tel"
              />
            </div>
          </div>

          {error && <p className={s.errorText}>{error}</p>}

          <div className={s.modalFooter}>
            <button type="button" className={s.cancelBtn} onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </button>
            <button type="submit" className={s.submitBtn} disabled={loading}>
              {loading ? t('create_org.creating') : t('create_org.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
