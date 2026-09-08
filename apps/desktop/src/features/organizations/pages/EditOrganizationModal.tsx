import React, { useEffect, useRef, useState } from 'react';
import type { CreateOrganizationDto, Organization } from '@regieart/types';
import s from './EditOrganizationModal.module.scss';

type EditOrganizationModalProps = {
  organization: Organization;
  onSave: (dto: Partial<CreateOrganizationDto>) => Promise<void>;
  onClose: () => void;
};

type Step = 0 | 1 | 2;

const STEPS = [
  { title: 'Identité', hint: 'Donnez à votre organisation une identité claire.' },
  { title: 'Présentation', hint: 'Expliquez ce que votre équipe fait et partage.' },
  { title: 'Contact', hint: 'Aidez les membres à vous retrouver facilement.' },
];

export function EditOrganizationModal({ organization, onSave, onClose }: EditOrganizationModalProps) {
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState(organization.name);
  const [description, setDescription] = useState(organization.description ?? '');
  const [website, setWebsite] = useState(organization.website ?? '');
  const [phone, setPhone] = useState(organization.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, saving]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      titleRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  function next() {
    if (step === 0 && !name.trim()) {
      setError('Le nom de l’organisation est obligatoire.');
      return;
    }
    setError('');
    setStep((current) => Math.min(2, current + 1) as Step);
  }

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        website: website.trim() || undefined,
        phone: phone.trim() || undefined,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer les changements.');
      setSaving(false);
    }
  }

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="edit-org-title" onClick={onClose}>
      <div className={s.modal} onClick={(event) => event.stopPropagation()}>
        <header className={s.header}>
          <div>
            <p className={s.eyebrow}>Profil de l’organisation</p>
            <h2 id="edit-org-title" ref={titleRef} tabIndex={-1} className={s.title}>Racontez votre équipe</h2>
            <p className={s.subtitle}>Quelques réponses suffisent pour rendre votre espace plus utile.</p>
          </div>
          <button className={s.closeBtn} onClick={onClose} disabled={saving} aria-label="Fermer">×</button>
        </header>

        <nav className={s.steps} aria-label="Étapes de modification">
          {STEPS.map((item, index) => (
            <React.Fragment key={item.title}>
              <button
                className={`${s.step} ${index === step ? s.stepActive : ''} ${index < step ? s.stepDone : ''}`}
                onClick={() => index <= step && setStep(index as Step)}
                disabled={index > step || saving}
                aria-current={index === step ? 'step' : undefined}
              >
                <span className={s.stepNumber}>{index < step ? '✓' : index + 1}</span>
                <span className={s.stepLabel}>{item.title}</span>
              </button>
              {index < STEPS.length - 1 && <span className={s.stepLine} aria-hidden />}
            </React.Fragment>
          ))}
        </nav>

        <div className={s.content}>
          <p className={s.stepHint}>{STEPS[step].hint}</p>

          {step === 0 && (
            <section className={s.section} aria-labelledby="identity-heading">
              <h3 id="identity-heading" className={s.question}>Comment doit-on reconnaître votre équipe ?</h3>
              <label className={s.label} htmlFor="org-name">Nom de l’organisation</label>
              <input
                id="org-name"
                className={s.input}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                autoFocus
                aria-describedby="org-name-help"
              />
              <p id="org-name-help" className={s.help}>Exemple : RégieArt Live, Les Étoiles du Nord, Studio 42.</p>
              <span className={s.counter}>{name.length}/100</span>
            </section>
          )}

          {step === 1 && (
            <section className={s.section} aria-labelledby="presentation-heading">
              <h3 id="presentation-heading" className={s.question}>Que doit savoir quelqu’un qui arrive ici ?</h3>
              <label className={s.label} htmlFor="org-description">Description</label>
              <textarea
                id="org-description"
                className={s.textarea}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={6}
                autoFocus
                placeholder="Décrivez votre activité, votre style ou la façon dont votre équipe travaille…"
                aria-describedby="org-description-help"
              />
              <p id="org-description-help" className={s.help}>Exemple : groupe live, équipe technique ou collectif artistique.</p>
              <span className={s.counter}>{description.length}/500</span>
            </section>
          )}

          {step === 2 && (
            <section className={s.section} aria-labelledby="contact-heading">
              <h3 id="contact-heading" className={s.question}>Comment peut-on vous joindre ?</h3>
              <label className={s.label} htmlFor="org-website">Site web <span className={s.optional}>Optionnel</span></label>
              <input
                id="org-website"
                className={s.input}
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://votre-site.fr"
                autoFocus
              />
              <label className={s.label} htmlFor="org-phone">Téléphone <span className={s.optional}>Optionnel</span></label>
              <input
                id="org-phone"
                className={s.input}
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+33 6 00 00 00 00"
              />
              <p className={s.help}>Ces informations restent modifiables depuis le profil de l’organisation.</p>
            </section>
          )}

          {error && <p className={s.error} role="alert">{error}</p>}
        </div>

        <footer className={s.footer}>
          <button className={s.cancelBtn} onClick={step === 0 ? onClose : () => setStep((current) => (current - 1) as Step)} disabled={saving}>
            {step === 0 ? 'Annuler' : 'Retour'}
          </button>
          {step < 2 ? (
            <button className={s.nextBtn} onClick={next} disabled={saving}>
              Continuer <span aria-hidden>→</span>
            </button>
          ) : (
            <button className={s.saveBtn} onClick={() => void save()} disabled={saving || !name.trim()}>
              {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
