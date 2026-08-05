import React from 'react';
import { usePlayer } from '../../context/PlayerContext';
import s from './FooterPlayer.module.scss';

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60 | 0).padStart(2, '0')}`;
}

export function FooterPlayer() {
  const player = usePlayer();
  if (!player.currentSong) return null;

  const progress =
    player.durationSec > 0 ? player.positionSec / player.durationSec : 0;

  return (
    <div className={s.footer}>
      <div className={s.songInfo}>
        <div className={s.songIcon}>♪</div>
        <div className={s.songMeta}>
          <div className={s.songTitle}>{player.currentSong.title}</div>
          <div className={s.songSub}>
            {player.currentSong.composer ??
              player.currentSong.musicalKey ??
              'Repertorio'}
          </div>
        </div>
      </div>

      <div className={s.controls}>
        <button
          className={s.ctrlBtn}
          onClick={() => player.seekRelative(-10)}
          title="-10s"
        >
          ⏪
        </button>
        <button
          className={s.ctrlBtnMain}
          onClick={player.togglePlay}
          aria-label={player.isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {player.isPlaying ? '⏸' : '▶'}
        </button>
        <button
          className={s.ctrlBtn}
          onClick={() => player.seekRelative(10)}
          title="+10s"
        >
          ⏩
        </button>
      </div>

      <div className={s.progressArea}>
        <span className={s.time}>{fmt(player.positionSec)}</span>
        <div
          className={s.progress}
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
        <span className={s.time}>{fmt(player.durationSec)}</span>
      </div>

      <button
        className={s.stopBtn}
        onClick={player.stop}
        title="Detener y cerrar"
      >
        ✕
      </button>
    </div>
  );
}
