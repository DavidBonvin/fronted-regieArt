import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Song } from '@regieart/types';
import s from './SongRow.module.scss';

function fmt(sec?: number): string {
  if (!sec) return '—';
  return `${Math.floor(sec / 60)}:${String(sec % 60 | 0).padStart(2, '0')}`;
}

interface SongRowProps {
  song: Song;
  index: number;
  isSelected: boolean;
  isCurrentlyPlaying: boolean;
  onSelect: () => void;
  onPlay: () => void;
}

export function SongRow({
  song,
  index,
  isSelected,
  isCurrentlyPlaying,
  onSelect,
  onPlay,
}: SongRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${s.row} ${isSelected ? s.selected : ''} ${isDragging ? s.dragging : ''}`}
      onClick={onSelect}
    >
      <button
        className={s.drag}
        {...attributes}
        {...listeners}
        title="Arrastrar"
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="2.5" r="1.4" />
          <circle cx="7" cy="2.5" r="1.4" />
          <circle cx="3" cy="7" r="1.4" />
          <circle cx="7" cy="7" r="1.4" />
          <circle cx="3" cy="11.5" r="1.4" />
          <circle cx="7" cy="11.5" r="1.4" />
        </svg>
      </button>

      <div className={s.num}>{index + 1}</div>

      <button
        className={`${s.playBtn} ${isCurrentlyPlaying ? s.playing : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onPlay();
        }}
        aria-label={isCurrentlyPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isCurrentlyPlaying ? '⏸' : '▶'}
      </button>

      <div className={s.meta}>
        <div className={s.title}>{song.title}</div>
        {(song.composer || song.arranger) && (
          <div className={s.sub}>
            {[song.composer, song.arranger].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      <div className={s.chips}>
        {song.musicalKey && <span className={s.chip}>{song.musicalKey}</span>}
        {song.tempo && <span className={s.chip}>{song.tempo} bpm</span>}
      </div>

      <div className={s.dur}>{fmt(song.durationSeconds)}</div>
    </div>
  );
}
