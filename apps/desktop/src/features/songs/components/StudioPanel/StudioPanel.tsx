import React, { useEffect, useRef, useState } from 'react';
import type { Song } from '@regieart/types';
import { usePlayer } from '../../context/PlayerContext';
import { fetchSongAudioUrl, fetchSongPdfUrl } from '../../services/songsDesktop';
import s from './StudioPanel.module.scss';

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60 | 0).padStart(2, '0')}`;
}

interface StudioPanelProps {
  song: Song | null;
}

export function StudioPanel({ song }: StudioPanelProps) {
  const player = usePlayer();
  const waveRef = useRef<HTMLDivElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [tab, setTab] = useState<'wave' | 'notes' | 'files'>('wave');

  useEffect(() => {
    if (waveRef.current) {
      player.initWaveform(waveRef.current);
    }
    return () => {
      player.initWaveform(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!song) return;
    setAudioError(false);
    setLoadingAudio(true);
    setPdfUrl(null);

    fetchSongAudioUrl(song.id)
      .then((url) => {
        if (url) player.playSong(song, url);
        else setAudioError(true);
      })
      .catch(() => setAudioError(true))
      .finally(() => setLoadingAudio(false));

    fetchSongPdfUrl(song.id)
      .then(setPdfUrl)
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id]);

  if (!song) {
    return (
      <div className={s.empty}>
        <div className={s.emptyIcon}>♪</div>
        <div className={s.emptyTitle}>Sélectionnez un morceau</div>
        <div className={s.emptyText}>Choisissez un morceau dans la liste pour le lire</div>
      </div>
    );
  }

  const isCurrentSong = player.currentSong?.id === song.id;
  const progress =
    isCurrentSong && player.durationSec > 0
      ? player.positionSec / player.durationSec
      : 0;

  return (
    <div className={s.panel}>
      <div className={s.header}>
        <div className={s.songIcon}>♪</div>
        <div className={s.songInfo}>
          <div className={s.songTitle}>{song.title}</div>
          <div className={s.songMeta}>
            {[song.composer, song.arranger].filter(Boolean).join(' · ') ||
              'Sans compositeur'}
          </div>
        </div>
        <div className={s.badges}>
          {song.musicalKey && <span className={s.badge}>{song.musicalKey}</span>}
          {song.tempo && <span className={s.badge}>{song.tempo} bpm</span>}
          {song.genre && <span className={s.badgeAlt}>{song.genre}</span>}
        </div>
      </div>

      <div className={s.stats}>
        {[
          { val: song.musicalKey ?? '—', lbl: 'Tonalité' },
          { val: song.tempo ?? '—', lbl: 'BPM' },
          {
            val: song.durationSeconds ? fmt(song.durationSeconds) : '—',
            lbl: 'Durée',
          },
          { val: song.genre ?? '—', lbl: 'Genre' },
        ].map(({ val, lbl }) => (
          <div key={lbl} className={s.stat}>
            <div className={s.statVal}>{val}</div>
            <div className={s.statLbl}>{lbl}</div>
          </div>
        ))}
      </div>

      <div className={s.tabs}>
        {(['wave', 'notes', 'files'] as const).map((t) => (
          <button
            key={t}
            className={`${s.tab} ${tab === t ? s.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'wave' ? 'Audio' : t === 'notes' ? 'Notes' : 'Fichiers'}
          </button>
        ))}
      </div>

      {tab === 'wave' && (
        <div className={s.waveContent}>
          <div ref={waveRef} className={s.waveform} />

          {loadingAudio && <p className={s.hint}>Chargement de l’audio…</p>}
          {audioError && !loadingAudio && (
            <p className={s.hint}>Aucun audio joint</p>
          )}

          {isCurrentSong && !loadingAudio && (
            <div className={s.controls}>
              <button
                className={s.ctrlBtn}
                onClick={() => player.seekRelative(-10)}
                title="-10s"
              >
                ⏪
              </button>
              <button className={s.ctrlBtnMain} onClick={player.togglePlay}>
                {player.isPlaying ? '⏸' : '▶'}
              </button>
              <button
                className={s.ctrlBtn}
                onClick={() => player.seekRelative(10)}
                title="+10s"
              >
                ⏩
              </button>

              <div className={s.timeBar}>
                <span className={s.timeText}>
                  {fmt(player.positionSec)}
                </span>
                <div
                  className={s.progressBar}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    player.seekTo(ratio * player.durationSec);
                  }}
                >
                  <div
                    className={s.progressFill}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <span className={s.timeText}>
                  {fmt(player.durationSec)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className={s.tabContent}>
          {song.notes ? (
            <p className={s.noteText}>{song.notes}</p>
          ) : (
            <p className={s.emptyTab}>Aucune note pour ce morceau</p>
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className={s.tabContent}>
          {pdfUrl ? (
            <a
              className={s.fileLink}
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              📄 Voir la partition (PDF)
            </a>
          ) : (
            <p className={s.emptyTab}>Aucun fichier joint</p>
          )}
        </div>
      )}
    </div>
  );
}
