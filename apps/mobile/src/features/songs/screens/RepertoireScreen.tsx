import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { listSongs, getMyOrganizations } from '@regieart/api';
import type { Song } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RepertoireScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [songs, setSongs] = useState<Song[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSongs = useCallback(
    async (query?: string) => {
      if (!orgId) {
        const orgs = await getMyOrganizations();
        if (orgs.length === 0) { setSongs([]); return; }
        const id = orgs[0].id;
        setOrgId(id);
        const result = await listSongs({ orgId: id, search: query, limit: 50 });
        setSongs(result.songs);
      } else {
        const result = await listSongs({ orgId, search: query, limit: 50 });
        setSongs(result.songs);
      }
    },
    [orgId],
  );

  useEffect(() => {
    loadSongs().finally(() => setLoading(false));
  }, [loadSongs]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadSongs(search || undefined);
    setRefreshing(false);
  }

  function handleSearch(text: string) {
    setSearch(text);
    loadSongs(text || undefined);
  }

  function renderSong({ item }: { item: Song }) {
    const initials = item.title.slice(0, 2).toUpperCase();
    return (
      <Pressable
        style={({ pressed }) => [s.songRow, pressed && s.songRowPressed]}
        onPress={() => navigation.navigate('ScoreViewer', { songId: item.id })}
      >
        <View style={s.songInitials}>
          <Text style={s.songInitialsText}>{initials}</Text>
        </View>
        <View style={s.songInfo}>
          <Text style={s.songTitle} numberOfLines={1}>{item.title}</Text>
          <View style={s.songMeta}>
            {item.composer ? <Text style={s.songMetaText}>{item.composer}</Text> : null}
            {item.musicalKey ? (
              <View style={s.metaChip}>
                <Text style={s.metaChipText}>{item.musicalKey}</Text>
              </View>
            ) : null}
            {item.tempo ? (
              <View style={s.metaChip}>
                <Text style={s.metaChipText}>{item.tempo} BPM</Text>
              </View>
            ) : null}
            {item.durationSeconds ? (
              <Text style={s.songMetaText}>{formatDuration(item.durationSeconds)}</Text>
            ) : null}
          </View>
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>{t('repertoire.title')}</Text>
        <Pressable
          style={s.addBtn}
          onPress={() => navigation.navigate('UploadScore', {})}
          accessibilityLabel={t('repertoire.add_song')}
        >
          <Text style={s.addBtnText}>+</Text>
        </Pressable>
      </View>

      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          placeholder={t('repertoire.search_placeholder')}
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={handleSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      ) : songs.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>{t('repertoire.no_songs')}</Text>
          <Pressable
            style={({ pressed }) => [s.emptyBtn, pressed && s.emptyBtnPressed]}
            onPress={() => navigation.navigate('UploadScore', {})}
          >
            <Text style={s.emptyBtnText}>{t('repertoire.add_song')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={renderSong}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.3,
    },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: { fontSize: 22, color: '#FFFFFF', lineHeight: 26, fontWeight: '300' },
    searchBar: { paddingHorizontal: 16, paddingBottom: 12 },
    searchInput: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      color: theme.textHeading,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 },
    emptyBtn: {
      backgroundColor: theme.actionBrand,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 13,
    },
    emptyBtnPressed: { backgroundColor: theme.actionBrandDim },
    emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    songRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      minHeight: 68,
    },
    songRowPressed: { backgroundColor: theme.surfaceRaised },
    songInitials: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    songInitialsText: { fontSize: 14, fontWeight: '700', color: theme.actionBrand },
    songInfo: { flex: 1 },
    songTitle: { fontSize: 15, fontWeight: '600', color: theme.textHeading, marginBottom: 4 },
    songMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    songMetaText: { fontSize: 12, color: theme.textSecondary },
    metaChip: {
      borderRadius: 4,
      backgroundColor: theme.surfaceRaised,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    metaChipText: { fontSize: 11, fontWeight: '500', color: theme.textSecondary },
    chevron: { fontSize: 20, color: theme.textMuted, marginLeft: 8 },
    separator: { height: 6 },
  });
}

