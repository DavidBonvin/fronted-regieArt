import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSong, createSong, updateSong, getMyOrganizations } from '@regieart/api';
import type { Song } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './UploadScorePage.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B','Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm'];

export function UploadScorePage() {
  const { songId } = useParams<{ songId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isNew = !songId || songId === 'new';

  const [form, setForm] = useState({ title:'', composer:'', musicalKey:'', tempo:'', durationSeconds:'', notes:'' });
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyOrganizations().then((orgs) => setOrgId(getActiveOrganization(orgs)?.id ?? ''));
    if (!isNew && songId) {
      getSong(songId).then((song) => {
        setForm({
          title: song.title,
          composer: song.composer ?? '',
          musicalKey: song.musicalKey ?? '',
          tempo: song.tempo ? String(song.tempo) : '',
          durationSeconds: song.durationSeconds ? String(song.durationSeconds) : '',
          notes: song.notes ?? '',
        });
      }).finally(() => setLoading(false));
    }
  }, [songId, isNew]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function handleSave() {
    if (!form.title || !orgId) return;
    if (form.tempo && !Number.isFinite(Number(form.tempo))) return;
    if (form.durationSeconds && !Number.isFinite(Number(form.durationSeconds))) return;
    setSaving(true);
    try {
      const dto: any = {
        title: form.title.trim(),
        orgId,
        composer: form.composer || undefined,
        musicalKey: form.musicalKey || undefined,
        tempo: form.tempo ? Number(form.tempo) : undefined,
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : undefined,
        notes: form.notes || undefined,
      };
      const song: Song = isNew ? await createSong(dto) : await updateSong(songId!, dto);
      navigate(`/songs/${song.id}/score`);
    } finally { setSaving(false); }
  }

  if (loading) return <div className={p.spinner} style={{ margin:'48px auto' }} />;

  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>{isNew ? t('upload_score.add_title') : t('common.edit')}</h1>

      <div className={`${p.card} ${s.form}`}>
        <label className={s.label}>{t('upload_score.title_label')} *
          <input className={s.input} value={form.title} onChange={set('title')} />
        </label>
        <label className={s.label}>{t('upload_score.composer_label')}
          <input className={s.input} value={form.composer} onChange={set('composer')} />
        </label>
        <div className={s.row2}>
          <label className={s.label}>{t('upload_score.key_label')}
            <select className={s.select} value={form.musicalKey} onChange={set('musicalKey')}>
              <option value="">{t('common.none')}</option>
              {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className={s.label}>{t('upload_score.tempo_label')}
            <input className={s.input} type="number" min={20} max={300} value={form.tempo} onChange={set('tempo')} />
          </label>
        </div>
        <label className={s.label}>{t('upload_score.notes_label')}
          <textarea className={s.textarea} rows={4} value={form.notes} onChange={set('notes')} />
        </label>
        <div className={s.actions}>
          <button className={p.btnSecondary} onClick={() => navigate(-1)}>{t('common.cancel')}</button>
          <button className={p.btnPrimary} onClick={handleSave} disabled={saving || !form.title}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}