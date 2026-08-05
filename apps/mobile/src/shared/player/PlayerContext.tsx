import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import type { Song } from '@regieart/types';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  isLoading: boolean;
}

export interface PlayerContextValue extends PlayerState {
  playSong: (song: Song, url: string) => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  seekRelative: (deltaSeconds: number) => Promise<void>;
  stop: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionRef = useRef(0);
  const isPlayingRef = useRef(false);
  const [state, setState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    positionMs: 0,
    durationMs: 0,
    isLoading: false,
  });

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    }).catch(() => {});
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    positionRef.current = status.positionMillis;
    isPlayingRef.current = status.isPlaying;
    setState((prev) => ({
      ...prev,
      isPlaying: status.isPlaying,
      positionMs: status.positionMillis,
      durationMs: status.durationMillis ?? prev.durationMs,
      isLoading: status.isBuffering,
    }));
  }, []);

  const playSong = useCallback(
    async (song: Song, url: string) => {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        currentSong: song,
        isLoading: true,
        isPlaying: false,
        positionMs: 0,
      }));

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        onPlaybackStatusUpdate,
      );
      soundRef.current = sound;
    },
    [onPlaybackStatusUpdate],
  );

  const togglePlay = useCallback(async () => {
    if (!soundRef.current) return;
    if (isPlayingRef.current) {
      await soundRef.current.pauseAsync().catch(() => {});
    } else {
      await soundRef.current.playAsync().catch(() => {});
    }
  }, []);

  const seekTo = useCallback(async (ms: number) => {
    await soundRef.current?.setPositionAsync(ms).catch(() => {});
  }, []);

  const seekRelative = useCallback(async (deltaSeconds: number) => {
    const newPos = Math.max(0, positionRef.current + deltaSeconds * 1000);
    await soundRef.current?.setPositionAsync(newPos).catch(() => {});
  }, []);

  const stop = useCallback(async () => {
    await soundRef.current?.stopAsync().catch(() => {});
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setState({
      currentSong: null,
      isPlaying: false,
      positionMs: 0,
      durationMs: 0,
      isLoading: false,
    });
  }, []);

  return (
    <PlayerContext.Provider
      value={{ ...state, playSong, togglePlay, seekTo, seekRelative, stop }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
