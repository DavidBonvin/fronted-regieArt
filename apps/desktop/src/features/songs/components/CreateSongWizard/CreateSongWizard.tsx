import React, { useEffect, useRef, useState } from 'react';
import { getMyOrganizations } from '@regieart/api';
import type { CreateSongDto } from '@regieart/types';
import { createSongWorkflow } from '../../services/songsDesktop';
import s from './CreateSongWizard.module.scss';

const MUSICAL_KEYS = [
  'Do', 'Do#', 'Re♭', 'Re', 'Re#', 'Mi♭', 'Mi',
  'Fa', 'Fa#', 'Sol♭', 'Sol', 'Sol#', 'La♭', 'La', 'La#', 'Si♭', 'Si',
];

const GENRES = [
  'Pop', 'Rock', 'Jazz', 'Clásico', 'Folk',
  'Electrónica', 'Reggaeton', 'Salsa', 'Cumbia', 'Otro',
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
      .then((orgs) => { if (orgs[0]) setOrgId(orgs[0].id); })
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
    if (!w.title.trim()) { setError('El título es requerido'); return; }
    if (!orgId) { setError('No se encontró organización'); return; }
    if (w.tempo && !Number.isFinite(Number(w.tempo))) { setError('El tempo no es un número válido.'); return; }
    if (w.durationSeconds && !Number.isFinite(Number(w.durationSeconds))) { setError('La duración no es un número válido.'); return; }
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
      setError(e instanceof Error ? e.message : 'Error al crear la canción');
      setSaving(false);
    }
  }

  const canNext = step === 1 ? !!w.title.trim() : true;

  const preview = (
    <div className={s.preview}>
      <div className={s.previewIcon}>♪</div>
      <div className={s.previewTitle}>{w.title || 'Nueva Canción'}</div>
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
            <div className={s.sidebarTitle}>Nueva Canción</div>
            <div className={s.sidebarSub}>Agregar al repertorio</div>
          </div>

          <div className={s.steps}>
            {[
              { n: 1, label: 'Información', sub: 'Datos técnicos' },
              { n: 2, label: 'Archivos', sub: 'Audio y partituras' },
              { n: 3, label: 'Finalizar', sub: 'Notas y guardar' },
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
          <button className={s.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>

          <div className={s.formArea}>
            {step === 1 && <Step1 w={w} upd={upd} />}
            {step === 2 && <Step2 w={w} upd={upd} />}
            {step === 3 && <Step3 w={w} upd={upd} saving={saving} error={error} />}
          </div>

          <div className={s.nav}>
            {step > 1 ? (
              <button className={s.btnBack} onClick={() => setStep((p) => p - 1)}>
                ← Atrás
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
                Siguiente →
              </button>
            ) : (
              <button
                className={s.btnSave}
                onClick={handleSave}
                disabled={saving || !w.title.trim()}
              >
                {saving ? 'Guardando…' : '✓ Guardar Canción'}
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
      <h2 className={s.stepHeading}>Información Técnica</h2>
      <p className={s.stepDesc}>Ingresa los datos musicales de la canción.</p>

      <div className={s.field}>
        <label className={s.label}>Título *</label>
        <input
          className={s.input}
          value={w.title}
          onChange={(e) => upd('title', e.target.value)}
          placeholder="Ej: La Flor de la Vida"
          autoFocus
        />
      </div>

      <div className={s.row2}>
        <div className={s.field}>
          <label className={s.label}>Compositor</label>
          <input
            className={s.input}
            value={w.composer}
            onChange={(e) => upd('composer', e.target.value)}
            placeholder="Ej: Carlos Vives"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Arreglista</label>
          <input
            className={s.input}
            value={w.arranger}
            onChange={(e) => upd('arranger', e.target.value)}
            placeholder="Ej: Juan Pérez"
          />
        </div>
      </div>

      <div className={s.row2}>
        <div className={s.field}>
          <label className={s.label}>Género</label>
          <select
            className={s.select}
            value={w.genre}
            onChange={(e) => upd('genre', e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className={s.field}>
          <label className={s.label}>Tonalidad</label>
          <select
            className={s.select}
            value={w.musicalKey}
            onChange={(e) => upd('musicalKey', e.target.value)}
          >
            <option value="">Seleccionar…</option>
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
            placeholder="Ej: 120"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Duración (segundos)</label>
          <input
            className={s.input}
            type="number"
            min={1}
            value={w.durationSeconds}
            onChange={(e) => upd('durationSeconds', e.target.value)}
            placeholder="Ej: 240"
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
      <h2 className={s.stepHeading}>Archivos</h2>
      <p className={s.stepDesc}>
        Sube la pista de audio y/o la partitura. Ambos son opcionales.
      </p>

      <div className={s.dropzoneLabel}>Pista de Audio</div>
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
            <span>Arrastra un archivo de audio o haz clic para seleccionar</span>
            <span className={s.dropzoneSub}>MP3, WAV, FLAC, AAC…</span>
          </div>
        )}
      </div>
      {w.audioProgress > 0 && w.audioProgress < 100 && (
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ width: `${w.audioProgress}%` }} />
        </div>
      )}

      <div className={s.dropzoneLabel} style={{ marginTop: 20 }}>Partitura (PDF)</div>
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
            <span>Arrastra el PDF o haz clic para seleccionar</span>
            <span className={s.dropzoneSub}>Solo archivos PDF</span>
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
      <h2 className={s.stepHeading}>Notas y Resumen</h2>
      <p className={s.stepDesc}>Agrega instrucciones o notas adicionales y revisa el resumen.</p>

      <div className={s.field}>
        <label className={s.label}>Notas de la canción</label>
        <textarea
          className={s.textarea}
          value={w.notes}
          onChange={(e) => upd('notes', e.target.value)}
          placeholder="Indicaciones de ensayo, estructura, etc."
          rows={4}
        />
      </div>

      <div className={s.summary}>
        <div className={s.summaryTitle}>Resumen</div>
        <div className={s.summaryGrid}>
          <span className={s.summaryKey}>Título</span>
          <span className={s.summaryVal}>{w.title || '—'}</span>
          <span className={s.summaryKey}>Compositor</span>
          <span className={s.summaryVal}>{w.composer || '—'}</span>
          <span className={s.summaryKey}>Tonalidad</span>
          <span className={s.summaryVal}>{w.musicalKey || '—'}</span>
          <span className={s.summaryKey}>Tempo</span>
          <span className={s.summaryVal}>{w.tempo ? `${w.tempo} bpm` : '—'}</span>
          <span className={s.summaryKey}>Género</span>
          <span className={s.summaryVal}>{w.genre || '—'}</span>
          <span className={s.summaryKey}>Audio</span>
          <span className={s.summaryVal}>{w.audioFile?.name ?? 'Sin archivo'}</span>
          <span className={s.summaryKey}>Partitura</span>
          <span className={s.summaryVal}>{w.pdfFile?.name ?? 'Sin archivo'}</span>
        </div>
      </div>

      {error && <div className={s.errorMsg}>{error}</div>}
      {saving && (
        <div className={s.savingMsg}>
          Subiendo archivos y guardando…
          {w.audioProgress > 0 && w.audioProgress < 100 && (
            <span> Audio: {w.audioProgress}%</span>
          )}
        </div>
      )}
    </div>
  );
}
