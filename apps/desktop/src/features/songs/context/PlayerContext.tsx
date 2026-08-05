import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { Song } from '@regieart/types';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  isLoading: boolean;
}

export interface PlayerContextValue extends PlayerState {
  wsRef: React.MutableRefObject<WaveSurfer | null>;
  initWaveform: (container: HTMLElement | null) => void;
  playSong: (song: Song, url: string) => void;
  togglePlay: () => void;
  seekTo: (sec: number) => void;
  seekRelative: (deltaSec: number) => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    isLoading: false,
  });
  const wsRef = useRef<WaveSurfer | null>(null);

  const initWaveform = useCallback((container: HTMLElement | null) => {
    if (wsRef.current) {
      wsRef.current.destroy();
      wsRef.current = null;
    }
    if (!container) return;

    const ws = WaveSurfer.create({
      container,
      waveColor: 'rgba(255,255,255,0.10)',
      progressColor: '#4A827E',
      cursorColor: '#649D98',
      height: 72,
      normalize: true,
      interact: true,
      barWidth: 2,
      barGap: 1,
      barRadius: 3,
    });

    ws.on('ready', () =>
      setState((p) => ({ ...p, durationSec: ws.getDuration(), isLoading: false })),
    );
    ws.on('play', () => setState((p) => ({ ...p, isPlaying: true })));
    ws.on('pause', () => setState((p) => ({ ...p, isPlaying: false })));
    ws.on('finish', () =>
      setState((p) => ({ ...p, isPlaying: false, positionSec: 0 })),
    );
    ws.on('timeupdate', (t: number) =>
      setState((p) => ({ ...p, positionSec: t })),
    );
    ws.on('error', () => setState((p) => ({ ...p, isLoading: false })));

    wsRef.current = ws;
  }, []);

  const playSong = useCallback((song: Song, url: string) => {
    setState((p) => ({ ...p, currentSong: song, isLoading: true, positionSec: 0 }));
    wsRef.current?.load(url);
    wsRef.current?.once('ready', () => wsRef.current?.play());
  }, []);

  const togglePlay = useCallback(() => wsRef.current?.playPause(), []);

  const seekTo = useCallback((sec: number) => {
    if (!wsRef.current) return;
    const dur = wsRef.current.getDuration();
    if (dur > 0) wsRef.current.seekTo(sec / dur);
  }, []);

  const seekRelative = useCallback((deltaSec: number) => {
    if (!wsRef.current) return;
    const cur = wsRef.current.getCurrentTime();
    const dur = wsRef.current.getDuration();
    const target = Math.max(0, Math.min(dur, cur + deltaSec));
    if (dur > 0) wsRef.current.seekTo(target / dur);
  }, []);

  const stop = useCallback(() => {
    wsRef.current?.stop();
    setState((p) => ({ ...p, isPlaying: false, positionSec: 0 }));
  }, []);

  return (
    <PlayerContext.Provider
      value={{ ...state, wsRef, initWaveform, playSong, togglePlay, seekTo, seekRelative, stop }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
