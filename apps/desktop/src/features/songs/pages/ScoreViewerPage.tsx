import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSong } from '@regieart/api';
import type { Song } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './ScoreViewerPage.module.scss';

export function ScoreViewerPage() {
  const { songId } = useParams<{ songId: string }>();
  const { t } = useTranslation();
  const [song, setSong] = useState<Song|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!songId) return;
    getSong(songId).then(setSong).finally(() => setLoading(false));
  }, [songId]);

  if (loading) return <div className={p.spinner} style={{ margin:'48px auto' }} />;
  if (!song) return <div className={p.empty}><div className={p.emptyTitle}>{t('common.not_found')}</div></div>;

  const fmt = (sec?: number) => !sec ? '—' : `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;

  return (
    <div className={p.page}>
      <div className={s.header}>
        <div>
          <h1 className={p.pageTitle}>{song.title}</h1>
          {song.composer && <p className={p.pageSubtitle}>{song.composer}</p>}
        </div>
        <Link to={`/songs/${song.id}/upload`} className={p.btnSecondary}>{t('common.edit')}</Link>
      </div>

      <div className={p.grid3} style={{ marginBottom:20 }}>
        {song.musicalKey && (
          <div className={p.statCard}>
            <div className={p.statLabel}>{t('repertoire.key_label')}</div>
            <div className={p.statValue}>{song.musicalKey}</div>
          </div>
        )}
        {song.tempo && (
          <div className={p.statCard}>
            <div className={p.statLabel}>{t('repertoire.bpm_label')}</div>
            <div className={p.statValue}>{song.tempo} BPM</div>
          </div>
        )}
        {song.durationSeconds && (
          <div className={p.statCard}>
            <div className={p.statLabel}>{t('repertoire.duration_label')}</div>
            <div className={p.statValue}>{fmt(song.durationSeconds)}</div>
          </div>
        )}
      </div>

      {song.notes && (
        <div className={p.card} style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>{t('upload_score.notes_label')}</div>
          <p style={{ margin:0, color:'var(--text-body)', lineHeight:1.6 }}>{song.notes}</p>
        </div>
      )}

      {song.notes ? (
        <div className={s.pdfViewer}>
          <div className={s.pdfPlaceholder}>
            <p style={{ color:'var(--text-muted)', fontSize:14 }}>{t('score_viewer.no_preview')}</p>
          </div>
        </div>
      ) : (
        <div className={p.empty}>
          <div className={p.emptyTitle}>{t('score_viewer.no_score')}</div>
          <div className={p.emptyBody}><Link to={`/songs/${song.id}/upload`} style={{ color:'var(--action-brand)' }}>{t('upload_score.upload_pdf')}</Link></div>
        </div>
      )}
    </div>
  );
}