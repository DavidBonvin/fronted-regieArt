import React, { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { listSongs, getMyOrganizations } from '@regieart/api';
import type { Song } from '@regieart/types';
import { PlayerProvider, usePlayer } from '../context/PlayerContext';
import { SongRow } from '../components/SongRow/SongRow';
import { StudioPanel } from '../components/StudioPanel/StudioPanel';
import { FooterPlayer } from '../components/FooterPlayer/FooterPlayer';
import { CreateSongWizard } from '../components/CreateSongWizard/CreateSongWizard';
import { fetchSongAudioUrl } from '../services/songsDesktop';
import s from './RepertoirePage.module.scss';

function RepertoireInner() {
  const player = usePlayer();

  const [songs, setSongs] = useState<Song[]>([]);
  const [filtered, setFiltered] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const orgs = await getMyOrganizations();
      const id = orgs[0]?.id;
      if (!id) return;
      const res = await listSongs({ orgId: id, limit: 200 });
      setSongs(res.songs);
      setFiltered(res.songs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSongs(); }, [loadSongs]);

  function handleSearch(q: string) {
    setSearch(q);
    const lq = q.toLowerCase();
    setFiltered(
      songs.filter(
        (song) =>
          song.title.toLowerCase().includes(lq) ||
          (song.composer ?? '').toLowerCase().includes(lq) ||
          (song.genre ?? '').toLowerCase().includes(lq),
      ),
    );
  }

  async function handlePlay(song: Song) {
    if (player.currentSong?.id === song.id) {
      player.togglePlay();
      return;
    }
    setSelectedSong(song);
    const url = await fetchSongAudioUrl(song.id);
    if (url) player.playSong(song, url);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFiltered((items) => {
      const oldIdx = items.findIndex((s) => s.id === active.id);
      const newIdx = items.findIndex((s) => s.id === over.id);
      return arrayMove(items, oldIdx, newIdx);
    });
  }

  return (
    <div className={s.page}>
      <div className={s.toolbar}>
        <div className={s.toolbarLeft}>
          <h1 className={s.title}>Repertorio</h1>
          <span className={s.count}>{filtered.length} canciones</span>
        </div>
        <div className={s.toolbarRight}>
          <div className={s.searchWrap}>
            <span className={s.searchIcon}>⌕</span>
            <input
              className={s.search}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar por título, compositor…"
            />
          </div>
          <button className={s.btnAdd} onClick={() => setShowWizard(true)}>
            + Subir Canción
          </button>
        </div>
      </div>

      <div className={s.body}>
        <div className={s.listCol}>
          {loading ? (
            <div className={s.center}>Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className={s.center}>
              <div className={s.emptyIcon}>♪</div>
              <p className={s.emptyMsg}>
                {search
                  ? 'Sin resultados para esa búsqueda'
                  : 'No hay canciones en el repertorio'}
              </p>
              {!search && (
                <button className={s.btnAddAlt} onClick={() => setShowWizard(true)}>
                  + Agregar primera canción
                </button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filtered.map((song) => song.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className={s.list}>
                  {filtered.map((song, idx) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      index={idx}
                      isSelected={selectedSong?.id === song.id}
                      isCurrentlyPlaying={
                        player.currentSong?.id === song.id && player.isPlaying
                      }
                      onSelect={() => setSelectedSong(song)}
                      onPlay={() => handlePlay(song)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className={s.studioCol}>
          <StudioPanel song={selectedSong} />
        </div>
      </div>

      {showWizard && (
        <CreateSongWizard
          onClose={() => setShowWizard(false)}
          onCreated={loadSongs}
        />
      )}

      <FooterPlayer />
    </div>
  );
}

export function RepertoirePage() {
  return (
    <PlayerProvider>
      <RepertoireInner />
    </PlayerProvider>
  );
}
