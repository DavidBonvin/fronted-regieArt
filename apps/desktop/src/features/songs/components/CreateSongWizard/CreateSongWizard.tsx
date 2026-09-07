import React, { useEffect, useRef, useState } from 'react';
import { getMyOrganizations } from '@regieart/api';
import type { CreateSongDto } from '@regieart/types';
import { createSongWorkflow } from '../../services/songsDesktop';
import s from './CreateSongWizard.module.scss';
import { getActiveOrganization } from '../../../../shared/utils/activeOrganization';

const MUSICAL_KEYS = [
  'Do', 'Do#', 'Ré♭', 'Ré', 'Ré#', 'Mi♭', 'Mi',
  'Fa', 'Fa#', 'Sol♭', 'Sol', 'Sol#', 'La♭', 'La', 'La#', 'Si♭', 'Si',
];

const GENRES = [
  'Pop', 'Rock', 'Jazz', 'Classique', 'Folk',
  'Électronique', 'Reggaeton', 'Salsa', 'Cumbia', 'Autre',
];

interface WizardState {
  title: string;
  composer: string;
  arranger: string;
  genre: string;
  musicalKey: string;
  tempo: string;
  durationSeconds: string;
  audioFile: File | null;
  pdfFile: File | null;
  audioProgress: number;
  pdfProgress: number;
  notes: string;
}

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateSongWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [w, setW] = useState<WizardState>({
    title: '', composer: '', arranger: '', genre: '', musicalKey: '',
    tempo: '', durationSeconds: '', audioFile: null, pdfFile: null,
    audioProgress: 0, pdfProgress: 0, notes: '',
  });
  const [orgId, setOrgId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyOrganizations()
      .then((orgs) => { const active = getActiveOrganization(orgs); if (active) setOrgId(active.id); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function upd<K extends keyof WizardState>(k: K, v: WizardState[K]) {
    setW((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!w.title.trim()) { setError('Le titre est obligatoire'); return; }
    if (!orgId) { setError('Aucune organisation trouvée'); return; }
    if (w.tempo && !Number.isFinite(Number(w.tempo))) { setError('Le tempo n’est pas un nombre valide.'); return; }
    if (w.durationSeconds && !Number.isFinite(Number(w.durationSeconds))) { setError('La durée n’est pas un nombre valide.'); return; }
    setSaving(true);
    setError(null);
    try {
      const dto: CreateSongDto = {
        orgId,
        title: w.title.trim(),
        ...(w.composer && { composer: w.composer }),
        ...(w.arranger && { arranger: w.arranger }),
        ...(w.genre && { genre: w.genre }),
        ...(w.musicalKey && { musicalKey: w.musicalKey }),
        ...(w.tempo && { tempo: Number(w.tempo) }),
        ...(w.durationSeconds && { durationSeconds: Number(w.durationSeconds) }),
        ...(w.notes && { notes: w.notes }),
      };
      await createSongWorkflow({
        dto,
        audioFile: w.audioFile ?? undefined,
        pdfFile: w.pdfFile ?? undefined,
        onAudioProgress: (pct) => upd('audioProgress', pct),
        onPdfProgress: (pct) => upd('pdfProgress', pct),
      });
      onCreated?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création du morceau');
      setSaving(false);
    }
  }

  const canNext = step === 1 ? !!w.title.trim() : true;

  const preview = (
    <div className={s.preview}>
      <div className={s.previewIcon}>♪</div>
      <div className={s.previewTitle}>{w.title || 'Nouveau morceau'}</div>
      {w.composer && <div className={s.previewSub}>{w.composer}</div>}
      <div className={s.previewChips}>
        {w.musicalKey && <span className={s.chip}>{w.musicalKey}</span>}
        {w.tempo && <span className={s.chip}>{w.tempo} bpm</span>}
        {w.genre && <span className={s.chip}>{w.genre}</span>}
      </div>
    </div>
  );

  return (
    <div
      className={s.backdrop}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={s.modal}>
        <div className={s.sidebar}>
          <div className={s.sidebarTop}>
            <div className={s.sidebarTitle}>Nouveau morceau</div>
            <div className={s.sidebarSub}>Ajouter au répertoire</div>
          </div>

          <div className={s.steps}>
            {[
              { n: 1, label: 'Informations', sub: 'Données techniques' },
              { n: 2, label: 'Fichiers', sub: 'Audio et partitions' },
              { n: 3, label: 'Finaliser', sub: 'Notes et enregistrement' },
            ].map(({ n, label, sub }) => (
              <div
                key={n}
                className={`${s.step} ${step === n ? s.stepActive : ''} ${step > n ? s.stepDone : ''}`}
                onClick={() => step > n && setStep(n)}
              >
                <div className={s.stepNum}>{step > n ? '✓' : n}</div>
                <div>
                  <div className={s.stepLabel}>{label}</div>
                  <div className={s.stepSub}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {preview}
        </div>

        <div className={s.content}>
          <button className={s.closeBtn} onClick={onClose} aria-label="Fermer">✕</button>

          <div className={s.formArea}>
            {step === 1 && <Step1 w={w} upd={upd} />}
            {step === 2 && <Step2 w={w} upd={upd} />}
            {step === 3 && <Step3 w={w} upd={upd} saving={saving} error={error} />}
          </div>

          <div className={s.nav}>
            {step > 1 ? (
              <button className={s.btnBack} onClick={() => setStep((p) => p - 1)}>
                ← Précédent
              </button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <button
                className={s.btnNext}
                onClick={() => canNext && setStep((p) => p + 1)}
                disabled={!canNext}
              >
                Suivant →
              </button>
            ) : (
              <button
                className={s.btnSave}
                onClick={handleSave}
                disabled={saving || !w.title.trim()}
              >
                {saving ? 'Enregistrement…' : '✓ Enregistrer le morceau'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step1({
  w,
  upd,
}: {
  w: WizardState;
  upd: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}) {
  return (
    <div className={s.stepForm}>
      <h2 className={s.stepHeading}>Informations techniques</h2>
      <p className={s.stepDesc}>Saisissez les données musicales du morceau.</p>

      <div className={s.field}>
        <label className={s.label}>Titre *</label>
        <input
          className={s.input}
          value={w.title}
          onChange={(e) => upd('title', e.target.value)}
          placeholder="Ex : La Fleur de la Vie"
          autoFocus
        />
      </div>

      <div className={s.row2}>
        <div className={s.field}>
          <label className={s.label}>Compositeur</label>
          <input
            className={s.input}
            value={w.composer}
            onChange={(e) => upd('composer', e.target.value)}
            placeholder="Ex : Claude Debussy"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Arrangeur</label>
          <input
            className={s.input}
            value={w.arranger}
            onChange={(e) => upd('arranger', e.target.value)}
            placeholder="Ex : Jean Dupont"
          />
        </div>
      </div>

      <div className={s.row2}>
        <div className={s.field}>
          <label className={s.label}>Genre</label>
          <select
            className={s.select}
            value={w.genre}
            onChange={(e) => upd('genre', e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className={s.field}>
          <label className={s.label}>Tonalité</label>
          <select
            className={s.select}
            value={w.musicalKey}
            onChange={(e) => upd('musicalKey', e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {MUSICAL_KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={s.row2}>
        <div className={s.field}>
          <label className={s.label}>Tempo (BPM)</label>
          <input
            className={s.input}
            type="number"
            min={40}
            max={300}
            value={w.tempo}
            onChange={(e) => upd('tempo', e.target.value)}
            placeholder="Ex : 120"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Durée (secondes)</label>
          <input
            className={s.input}
            type="number"
            min={1}
            value={w.durationSeconds}
            onChange={(e) => upd('durationSeconds', e.target.value)}
            placeholder="Ex : 240"
          />
        </div>
      </div>
    </div>
  );
}

function Step2({
  w,
  upd,
}: {
  w: WizardState;
  upd: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}) {
  const audioRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  function handleDrop(
    e: React.DragEvent,
    accept: 'audio' | 'pdf',
  ) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (accept === 'audio') upd('audioFile', file);
    else upd('pdfFile', file);
  }

  return (
    <div className={s.stepForm}>
      <h2 className={s.stepHeading}>Fichiers</h2>
      <p className={s.stepDesc}>
        Importez la piste audio et/ou la partition. Les deux sont facultatifs.
      </p>

      <div className={s.dropzoneLabel}>Piste audio</div>
      <div
        className={`${s.dropzone} ${w.audioFile ? s.dropzoneHasFile : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, 'audio')}
        onClick={() => audioRef.current?.click()}
      >
        <input
          ref={audioRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) upd('audioFile', e.target.files[0]);
          }}
        />
        {w.audioFile ? (
          <div className={s.fileChosen}>
            <span>🎵</span>
            <span>{w.audioFile.name}</span>
            <button
              className={s.removeBtn}
              onClick={(e) => {
                e.stopPropagation();
                upd('audioFile', null);
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className={s.dropzoneHint}>
            <span className={s.dropzoneIcon}>🎵</span>
            <span>Glissez un fichier audio ou cliquez pour sélectionner</span>
            <span className={s.dropzoneSub}>MP3, WAV, FLAC, AAC…</span>
          </div>
        )}
      </div>
      {w.audioProgress > 0 && w.audioProgress < 100 && (
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ width: `${w.audioProgress}%` }} />
        </div>
      )}

      <div className={s.dropzoneLabel} style={{ marginTop: 20 }}>Partition (PDF)</div>
      <div
        className={`${s.dropzone} ${w.pdfFile ? s.dropzoneHasFile : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, 'pdf')}
        onClick={() => pdfRef.current?.click()}
      >
        <input
          ref={pdfRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) upd('pdfFile', e.target.files[0]);
          }}
        />
        {w.pdfFile ? (
          <div className={s.fileChosen}>
            <span>📄</span>
            <span>{w.pdfFile.name}</span>
            <button
              className={s.removeBtn}
              onClick={(e) => {
                e.stopPropagation();
                upd('pdfFile', null);
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className={s.dropzoneHint}>
            <span className={s.dropzoneIcon}>📄</span>
            <span>Glissez le PDF ou cliquez pour sélectionner</span>
            <span className={s.dropzoneSub}>Fichiers PDF uniquement</span>
          </div>
        )}
      </div>
      {w.pdfProgress > 0 && w.pdfProgress < 100 && (
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ width: `${w.pdfProgress}%` }} />
        </div>
      )}
    </div>
  );
}

function Step3({
  w,
  upd,
  saving,
  error,
}: {
  w: WizardState;
  upd: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className={s.stepForm}>
      <h2 className={s.stepHeading}>Notes et récapitulatif</h2>
      <p className={s.stepDesc}>Ajoutez des consignes ou des notes supplémentaires et vérifiez le récapitulatif.</p>

      <div className={s.field}>
        <label className={s.label}>Notes du morceau</label>
        <textarea
          className={s.textarea}
          value={w.notes}
          onChange={(e) => upd('notes', e.target.value)}
          placeholder="Consignes de répétition, structure, etc."
          rows={4}
        />
      </div>

      <div className={s.summary}>
        <div className={s.summaryTitle}>Récapitulatif</div>
        <div className={s.summaryGrid}>
          <span className={s.summaryKey}>Titre</span>
          <span className={s.summaryVal}>{w.title || '—'}</span>
          <span className={s.summaryKey}>Compositeur</span>
          <span className={s.summaryVal}>{w.composer || '—'}</span>
          <span className={s.summaryKey}>Tonalité</span>
          <span className={s.summaryVal}>{w.musicalKey || '—'}</span>
          <span className={s.summaryKey}>Tempo</span>
          <span className={s.summaryVal}>{w.tempo ? `${w.tempo} bpm` : '—'}</span>
          <span className={s.summaryKey}>Genre</span>
          <span className={s.summaryVal}>{w.genre || '—'}</span>
          <span className={s.summaryKey}>Audio</span>
          <span className={s.summaryVal}>{w.audioFile?.name ?? 'Aucun fichier'}</span>
          <span className={s.summaryKey}>Partition</span>
          <span className={s.summaryVal}>{w.pdfFile?.name ?? 'Aucun fichier'}</span>
        </div>
      </div>

      {error && <div className={s.errorMsg}>{error}</div>}
      {saving && (
        <div className={s.savingMsg}>
          Envoi des fichiers et enregistrement…
          {w.audioProgress > 0 && w.audioProgress < 100 && (
            <span> Audio: {w.audioProgress}%</span>
          )}
        </div>
      )}
    </div>
  );
}
