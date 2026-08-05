import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { listInstruments, getMyOrganizations } from '@regieart/api';
import type { Instrument, InstrumentStatus } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = 'ALL' | InstrumentStatus;

const TYPE_ICONS: Record<string, string> = {
  BRASS: '🎺', WOODWIND: '🎷', STRING: '🎸', KEYBOARD: '🎹',
  PERCUSSION: '🥁', AUDIO_GEAR: '🎛', LIGHTING: '💡', OTHER: '📦',
};

function statusColor(status: InstrumentStatus, theme: ThemeColors) {
  if (status === 'AVAILABLE') return { bg: theme.statusOkSurface, text: theme.statusOk };
  if (status === 'IN_USE') return { bg: theme.statusPendingSurface, text: theme.statusPending };
  if (status === 'MAINTENANCE') return { bg: theme.statusErrorSurface, text: theme.statusError };
  return { bg: theme.surfaceRaised, text: theme.textMuted };
}

export function BacklineScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const id = orgId ?? (await getMyOrganizations().then((orgs) => orgs[0]?.id));
    if (!id) return;
    if (!orgId) setOrgId(id);
    const items = await listInstruments({ orgId: id });
    setInstruments(items);
  }, [orgId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const filtered = filter === 'ALL' ? instruments : instruments.filter((i) => i.status === filter);
  const verifiedCount = instruments.filter((i) => i.status !== 'MAINTENANCE' && i.status !== 'RETIRED').length;
  const percent = instruments.length > 0 ? Math.round((verifiedCount / instruments.length) * 100) : 0;

  const filters: Array<{ key: Filter; label: string }> = [
    { key: 'ALL', label: t('inventory.filter_all') },
    { key: 'AVAILABLE', label: t('common.available') },
    { key: 'IN_USE', label: t('common.in_use') },
  ];

  function renderInstrument({ item }: { item: Instrument }) {
    const st = statusColor(item.status, theme);
    return (
      <View style={s.row}>
        <View style={s.rowIcon}>
          <Text style={s.rowIconText}>{TYPE_ICONS[item.type] ?? '📦'}</Text>
        </View>
        <View style={s.rowInfo}>
          <Text style={s.rowTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={s.rowSubtitle} numberOfLines={1}>
            {[item.brand, item.model].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: st.bg }]}>
          <Text style={[s.statusText, { color: st.text }]}>{item.status}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>{t('inventory.title')}</Text>
        <Pressable
          style={s.scanBtn}
          onPress={() => navigation.navigate('QRScanner')}
          accessibilityLabel={t('inventory.scan_qr')}
        >
          <Text style={s.scanBtnText}>⊙</Text>
        </Pressable>
      </View>

      {!loading && instruments.length > 0 && (
        <View style={s.progressCard}>
          <Text style={s.progressLabel}>
            {t('inventory.progress_label', {
              checked: verifiedCount,
              total: instruments.length,
              percent,
            })}
          </Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${percent}%` }]} />
          </View>
        </View>
      )}

      <View style={s.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterChipText, filter === f.key && s.filterChipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderInstrument}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>{t('common.no_results')}</Text>
            </View>
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
      paddingBottom: 8,
    },
    title: { fontSize: 26, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3 },
    scanBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderDefault,
    },
    scanBtnText: { fontSize: 18, color: theme.actionBrand },
    progressCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 14,
    },
    progressLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 8 },
    progressTrack: {
      height: 4,
      backgroundColor: theme.surfaceRaised,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: theme.actionBrand, borderRadius: 2 },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 12,
    },
    filterChip: {
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: theme.surfaceRaised,
    },
    filterChipActive: { backgroundColor: theme.actionBrand },
    filterChipText: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
    filterChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      minHeight: 66,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowIconText: { fontSize: 18 },
    rowInfo: { flex: 1 },
    rowTitle: { fontSize: 15, fontWeight: '600', color: theme.textHeading, marginBottom: 2 },
    rowSubtitle: { fontSize: 12, color: theme.textSecondary },
    statusChip: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusText: { fontSize: 10, fontWeight: '600' },
    separator: { height: 6 },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyTitle: { fontSize: 15, color: theme.textSecondary },
  });
}

