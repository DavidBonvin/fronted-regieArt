import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSong } from '@regieart/api';
import type { Song } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';
import { fetchSongAudioUrl } from '../services/trackPlayerService';
import { usePlayer } from '../../../shared/player/PlayerContext';

type RouteT = RouteProp<RootStackParamList, 'SongPlayer'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;


function generateWaveform(seed: string, count = 42): number[] {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
  return Array.from({ length: count }, (_, i) => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const base = 0.25 + Math.abs(Math.sin(i * 0.42)) * 0.45;
    const noise = ((h & 0xff) / 255) * 0.3;
    return Math.min(1, Math.max(0.12, base + noise));
  });
}


function useMetronome(bpm: number, active: boolean) {
  const beatAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || bpm <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      beatAnim.setValue(1);
      return;
    }
    const ms = (60 / bpm) * 1000;
    const tick = () => {
      Animated.sequence([
        Animated.timing(beatAnim, { toValue: 1.18, duration: 80, useNativeDriver: true }),
        Animated.timing(beatAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    };
    tick();
    intervalRef.current = setInterval(tick, ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, bpm, beatAnim]);

  return beatAnim;
}


export function SongPlayerModal() {
  const { theme } = useTheme();
  const route = useRoute<RouteT>();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);
  const player = usePlayer();

  const { songId } = route.params;

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const isPlaying = player.isPlaying;
  const positionMs = player.positionMs;
  const durationMs = player.durationMs;
  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const waveform = song ? generateWaveform(song.id) : [];

  const beatAnim = useMetronome(song?.tempo ?? 0, metronomeOn);

  useEffect(() => {
    getSong(songId)
      .then(setSong)
      .catch(() => Alert.alert('Error', 'No se pudo cargar la canción.'))
      .finally(() => setLoading(false));
  }, [songId]);

  useEffect(() => {
    if (!song) return;
    if (player.currentSong?.id === songId) return; // Already playing
    setLoadingAudio(true);
    fetchSongAudioUrl(song)
      .then((url) => player.playSong(song, url))
      .catch((err) => {
        if (__DEV__) console.warn(err);
      })
      .finally(() => setLoadingAudio(false));
  }, [song]);

  const seekRelative = useCallback(
    (delta: number) => player.seekRelative(delta),
    [player],
  );

  function formatTime(ms: number) {
    const t = Math.floor(ms / 1000);
    const m = Math.floor(t / 60);
    const sec = t % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.actionBrand} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={s.minimizeBtn}
          hitSlop={10}
        >
          <Text style={s.minimizeBtnText}>⌄ Minimizar</Text>
        </Pressable>
        <Text style={s.topBarTitle}>Reproduciendo</Text>
        <Pressable
          onPress={() => navigation.navigate('ScoreViewer', { songId })}
          hitSlop={10}
        >
          <Text style={s.scoreBtn}>📄 Partitura</Text>
        </Pressable>
      </View>

      <View style={s.artworkContainer}>
        <View style={s.artwork}>
          <Text style={s.artworkIcon}>🎼</Text>
        </View>
      </View>

      <View style={s.songInfo}>
        <Text style={s.songTitle} numberOfLines={1}>{song?.title ?? '—'}</Text>
        <Text style={s.songArtist} numberOfLines={1}>
          {song?.composer ?? song?.arranger ?? 'RégieArt'}
        </Text>
        <View style={s.chips}>
          {song?.musicalKey ? (
            <View style={s.chipKey}>
              <Text style={s.chipKeyText}>🎵 {song.musicalKey}</Text>
            </View>
          ) : null}
          {song?.tempo ? (
            <View style={s.chipBpm}>
              <Text style={s.chipBpmText}>⏱ {song.tempo} BPM</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={s.waveformContainer}>
        <View style={s.waveformBars}>
          {waveform.map((h, i) => {
            const barProgress = i / waveform.length;
            const played = barProgress <= progress;
            return (
              <Pressable
                key={i}
                onPress={() => player.seekTo(barProgress * durationMs)}
                style={[
                  s.waveBar,
                  { height: Math.round(h * 48) },
                  played && s.waveBarPlayed,
                ]}
              />
            );
          })}
        </View>
        <View style={s.timeRow}>
          <Text style={s.timeText}>{formatTime(positionMs)}</Text>
          <Text style={s.timeText}>{formatTime(durationMs)}</Text>
        </View>
      </View>

      <View style={s.controls}>
        <Pressable onPress={() => seekRelative(-10)} style={s.ctrlBtn} hitSlop={8}>
          <Text style={s.ctrlIcon}>⏪</Text>
          <Text style={s.ctrlLabel}>-10s</Text>
        </Pressable>

        <Pressable onPress={player.togglePlay} style={s.playBtn} disabled={loadingAudio || player.isLoading}>
          {loadingAudio || player.isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.playBtnIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => seekRelative(10)} style={s.ctrlBtn} hitSlop={8}>
          <Text style={s.ctrlIcon}>⏩</Text>
          <Text style={s.ctrlLabel}>+10s</Text>
        </Pressable>
      </View>

      <View style={s.toolsRow}>
        <Pressable
          onPress={() => setMetronomeOn((v) => !v)}
          style={[s.toolBtn, metronomeOn && s.toolBtnActive]}
        >
          <Animated.Text
            style={[s.toolBtnIcon, { transform: [{ scale: beatAnim }] }]}
          >
            🥁
          </Animated.Text>
          <Text style={[s.toolBtnLabel, metronomeOn && s.toolBtnLabelActive]}>
            {metronomeOn && song?.tempo ? `${song.tempo} BPM` : 'Metrónomo'}
          </Text>
          {metronomeOn && (
            <View style={s.toolBtnBadge}>
              <Text style={s.toolBtnBadgeText}>ON</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('ScoreViewer', { songId })}
          style={s.toolBtn}
        >
          <Text style={s.toolBtnIcon}>📄</Text>
          <Text style={s.toolBtnLabel}>Ver Partitura</Text>
        </Pressable>
      </View>

      {!loadingAudio && !isPlaying && !player.isLoading && player.currentSong?.id !== songId && (
        <View style={s.noAudioBanner}>
          <Text style={s.noAudioText}>
            Sin audio subido. Agrega uno desde el wizard de creación.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}


function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.surfaceApp },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    minimizeBtn: {},
    minimizeBtnText: { fontSize: 13, color: t.textMuted },
    topBarTitle: { fontSize: 13, fontWeight: '700', color: t.textSecondary },
    scoreBtn: { fontSize: 13, color: t.actionBrand, fontWeight: '600' },

    artworkContainer: { alignItems: 'center', paddingVertical: 24 },
    artwork: {
      width: 180,
      height: 180,
      borderRadius: 24,
      backgroundColor: t.actionBrand + '22',
      borderWidth: 2,
      borderColor: t.actionBrand + '44',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.actionBrand,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 12,
    },
    artworkIcon: { fontSize: 64 },

    songInfo: { paddingHorizontal: 28, alignItems: 'center', marginBottom: 20 },
    songTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: t.textHeading,
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    songArtist: { fontSize: 15, color: t.textMuted, marginTop: 4, textAlign: 'center' },
    chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
    chipKey: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      backgroundColor: '#4A827E22',
    },
    chipKeyText: { fontSize: 12, fontWeight: '700', color: '#4A827E' },
    chipBpm: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      backgroundColor: '#7E7B4A22',
    },
    chipBpmText: { fontSize: 12, fontWeight: '700', color: '#A0996A' },

    waveformContainer: { paddingHorizontal: 20, marginBottom: 20 },
    waveformBars: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 52,
      marginBottom: 6,
    },
    waveBar: {
      width: 3,
      borderRadius: 2,
      backgroundColor: t.borderSubtle,
    },
    waveBarPlayed: { backgroundColor: t.actionBrand },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    timeText: { fontSize: 11, color: t.textMuted, fontVariant: ['tabular-nums'] },

    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    ctrlBtn: { alignItems: 'center' },
    ctrlIcon: { fontSize: 24 },
    ctrlLabel: { fontSize: 10, color: t.textMuted, marginTop: 2 },
    playBtn: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: t.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.actionBrand,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
      elevation: 10,
    },
    playBtnIcon: { fontSize: 26, color: '#fff' },

    toolsRow: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
    },
    toolBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: t.surfaceCard,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: t.borderSubtle,
    },
    toolBtnActive: {
      borderColor: t.actionBrand + '88',
      backgroundColor: t.actionBrand + '15',
    },
    toolBtnIcon: { fontSize: 22 },
    toolBtnLabel: { fontSize: 12, fontWeight: '600', color: t.textMuted, flex: 1 },
    toolBtnLabelActive: { color: t.actionBrand },
    toolBtnBadge: {
      backgroundColor: t.actionBrand,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    toolBtnBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

    noAudioBanner: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: '#7E7B4A22',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: '#7E7B4A44',
    },
    noAudioText: { fontSize: 12, color: '#A0996A', textAlign: 'center' },
  });
}
