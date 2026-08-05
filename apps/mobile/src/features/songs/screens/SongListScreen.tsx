import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listSongs, getMyOrganizations } from '@regieart/api';
import type { Song } from '@regieart/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';
import { fetchSongAudioUrl } from '../services/trackPlayerService';
import { usePlayer } from '../../../shared/player/PlayerContext';

const SELECTED_ORG_KEY = '@regieart:selectedOrgId';
type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}


function MiniPlayer({ theme }: { theme: ThemeColors }) {
  const player = usePlayer();
  const navigation = useNavigation<Nav>();
  const s = miniStyles(theme);

  if (!player.currentSong) return null;

  const progress =
    player.durationMs > 0 ? player.positionMs / player.durationMs : 0;

  function fmt(ms: number) {
    const t = Math.floor(ms / 1000);
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }

  return (
    <Pressable
      style={s.root}
      onPress={() =>
        navigation.navigate('SongPlayer', { songId: player.currentSong!.id })
      }
    >
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <View style={s.row}>
        <View style={s.artwork}>
          <Text style={s.artworkIcon}>🎵</Text>
        </View>
        <View style={s.info}>
          <Text style={s.title} numberOfLines={1}>
            {player.currentSong.title}
          </Text>
          <Text style={s.sub} numberOfLines={1}>
            {player.currentSong.composer ?? 'RégieArt'}
          </Text>
        </View>
        <Text style={s.time}>
          {fmt(player.positionMs)} / {fmt(player.durationMs)}
        </Text>
        <Pressable style={s.playBtn} hitSlop={10} onPress={player.togglePlay}>
          <Text style={s.playBtnText}>{player.isPlaying ? '⏸' : '▶'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}


export function SongListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);
  const player = usePlayer();

  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const orgIdRef = useRef<string | null>(null);

  const filterKeys = [
    'all',
    ...Array.from(new Set(songs.map((s) => s.musicalKey).filter(Boolean))) as string[],
  ];

  function applyFilter(list: Song[], filter: string, query: string) {
    let r = list;
    if (filter !== 'all') r = r.filter((s) => s.musicalKey === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.composer?.toLowerCase().includes(q) ||
          s.arranger?.toLowerCase().includes(q),
      );
    }
    setFilteredSongs(r);
  }

  async function loadSongs(query = '') {
    try {
      let id = orgIdRef.current;
      if (!id) {
        const stored = await AsyncStorage.getItem(SELECTED_ORG_KEY);
        id = stored ?? (await getMyOrganizations().then((o) => o[0]?.id ?? null));
        if (id) {
          orgIdRef.current = id;
        }
      }
      if (!id) { setSongs([]); setFilteredSongs([]); return; }
      const { songs: fetched } = await listSongs({ orgId: id, search: query || undefined, limit: 100 });
      setSongs(fetched);
      applyFilter(fetched, activeFilter, query);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadSongs().finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSongs(search);
    }, [search, activeFilter]),
  );

  async function handlePlay(song: Song) {
    try {
      const url = await fetchSongAudioUrl(song);
      await player.playSong(song, url);
      navigation.navigate('SongPlayer', { songId: song.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reproducir';
      Alert.alert('Sin audio', msg);
    }
  }

  const renderItem = useCallback(
    ({ item, index: rawIndex }: ListRenderItemInfo<Song>) => {
      const index = rawIndex + 1;
      const isCurrentlyPlaying = player.currentSong?.id === item.id;
      return (
          <Pressable
            style={s.songRow}
          >
            <View style={s.dragHandle}>
              <Text style={s.dragIcon}>≡</Text>
            </View>

            <Text style={s.songIndex}>{index}</Text>

            <View style={[s.artwork, isCurrentlyPlaying && s.artworkPlaying]}>
              <Text style={s.artworkIcon}>{isCurrentlyPlaying ? '🔊' : '🎼'}</Text>
            </View>

            <View style={s.songInfo}>
              <Text style={[s.songTitle, isCurrentlyPlaying && s.songTitlePlaying]} numberOfLines={1}>
                {item.title}
              </Text>
              {(item.composer || item.arranger) ? (
                <Text style={s.songComposer} numberOfLines={1}>
                  {item.composer ?? item.arranger}
                </Text>
              ) : null}
              <View style={s.chips}>
                {item.musicalKey ? (
                  <View style={s.chipKey}>
                    <Text style={s.chipKeyText}>🎵 {item.musicalKey}</Text>
                  </View>
                ) : null}
                {item.tempo ? (
                  <View style={s.chipBpm}>
                    <Text style={s.chipBpmText}>⏱ {item.tempo} BPM</Text>
                  </View>
                ) : null}
                {item.durationSeconds ? (
                  <Text style={s.duration}>{formatDuration(item.durationSeconds)}</Text>
                ) : null}
              </View>
            </View>

            <Pressable onPress={() => handlePlay(item)} style={s.playBtn} hitSlop={8}>
              <Text style={s.playBtnText}>{isCurrentlyPlaying ? '🔊' : '▶'}</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('ScoreViewer', { songId: item.id })}
              style={s.menuBtn}
              hitSlop={8}
            >
              <Text style={s.menuBtnText}>⋮</Text>
            </Pressable>
          </Pressable>
      );
    },
    [s, player.currentSong?.id, navigation],
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Repertorio</Text>
          <Text style={s.headerSub}>
            {songs.length} {songs.length === 1 ? 'canción' : 'canciones'} · mantén presionado ≡ para ordenar
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('CreateSongWizard')}
          style={s.addBtn}
        >
          <Text style={s.addBtnText}>+ Nueva</Text>
        </Pressable>
      </View>

      <View style={s.searchRow}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Buscar canción, compositor..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            applyFilter(songs, activeFilter, t);
          }}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => {
              setSearch('');
              applyFilter(songs, activeFilter, '');
            }}
            hitSlop={8}
          >
            <Text style={s.searchClear}>✕</Text>
          </Pressable>
        )}
      </View>

      {filterKeys.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {filterKeys.map((key) => (
            <Pressable
              key={key}
              onPress={() => {
                setActiveFilter(key);
                applyFilter(songs, key, search);
              }}
              style={[s.filterChip, activeFilter === key && s.filterChipActive]}
            >
              <Text style={[s.filterChipText, activeFilter === key && s.filterChipTextActive]}>
                {key === 'all' ? 'Todos' : `🎵 ${key}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={theme.actionBrand} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={theme.actionBrand}
              onRefresh={async () => {
                setRefreshing(true);
                await loadSongs(search);
                setRefreshing(false);
              }}
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🎼</Text>
              <Text style={s.emptyTitle}>Sin canciones en el repertorio</Text>
              <Text style={s.emptySub}>Agrega la primera con el botón + Nueva</Text>
              <Pressable
                style={s.emptyBtn}
                onPress={() => navigation.navigate('CreateSongWizard')}
              >
                <Text style={s.emptyBtnText}>+ Agregar canción</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <MiniPlayer theme={theme} />
    </SafeAreaView>
  );
}


function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.surfaceApp },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: t.textHeading, letterSpacing: -0.4 },
    headerSub: { fontSize: 12, color: t.textMuted, marginTop: 2 },
    addBtn: {
      backgroundColor: t.actionBrand,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: t.surfaceCard,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: t.borderSubtle,
    },
    searchIcon: { fontSize: 14, marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: t.textHeading },
    searchClear: { fontSize: 14, color: t.textMuted, paddingLeft: 8 },

    filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: t.surfaceCard,
      borderWidth: 1,
      borderColor: t.borderSubtle,
    },
    filterChipActive: { backgroundColor: t.actionBrand + '22', borderColor: t.actionBrand },
    filterChipText: { fontSize: 12, fontWeight: '600', color: t.textMuted },
    filterChipTextActive: { color: t.actionBrand },

    songRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.borderSubtle,
      backgroundColor: t.surfaceApp,
      gap: 8,
    },
    songRowDragging: {
      backgroundColor: t.surfaceCard,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    dragHandle: { paddingHorizontal: 4 },
    dragIcon: { fontSize: 16, color: t.textMuted },
    songIndex: { width: 22, fontSize: 12, fontWeight: '700', color: t.textMuted, textAlign: 'right' },
    artwork: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: t.actionBrand + '22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    artworkPlaying: { backgroundColor: t.actionBrand + '44' },
    artworkIcon: { fontSize: 18 },
    songInfo: { flex: 1, minWidth: 0 },
    songTitle: { fontSize: 14, fontWeight: '700', color: t.textHeading },
    songTitlePlaying: { color: t.actionBrand },
    songComposer: { fontSize: 12, color: t.textMuted, marginTop: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    chipKey: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: '#4A827E22',
    },
    chipKeyText: { fontSize: 10, fontWeight: '700', color: '#4A827E' },
    chipBpm: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: '#7E7B4A22',
    },
    chipBpmText: { fontSize: 10, fontWeight: '700', color: '#A0996A' },
    duration: { fontSize: 10, color: t.textMuted, alignSelf: 'center' },
    playBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: t.actionBrand + '22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    playBtnText: { fontSize: 14 },
    menuBtn: { paddingHorizontal: 4 },
    menuBtnText: { fontSize: 20, color: t.textMuted },

    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: t.textHeading, textAlign: 'center' },
    emptySub: { fontSize: 13, color: t.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
    emptyBtn: {
      marginTop: 20,
      backgroundColor: t.actionBrand,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
}

function miniStyles(t: ThemeColors) {
  return StyleSheet.create({
    root: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: t.surfaceCard,
      borderTopWidth: 1,
      borderTopColor: t.borderSubtle,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 16,
    },
    progressBar: {
      height: 2,
      backgroundColor: t.borderSubtle,
    },
    progressFill: {
      height: 2,
      backgroundColor: t.actionBrand,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
    },
    artwork: {
      width: 36,
      height: 36,
      borderRadius: 6,
      backgroundColor: t.actionBrand + '22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    artworkIcon: { fontSize: 16 },
    info: { flex: 1, minWidth: 0 },
    title: { fontSize: 13, fontWeight: '700', color: t.textHeading },
    sub: { fontSize: 11, color: t.textMuted, marginTop: 1 },
    time: { fontSize: 11, color: t.textMuted, fontVariant: ['tabular-nums'] },
    playBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playBtnText: { fontSize: 12, color: '#fff' },
    nextBtn: { paddingHorizontal: 4 },
    nextBtnText: { fontSize: 18 },
  });
}
