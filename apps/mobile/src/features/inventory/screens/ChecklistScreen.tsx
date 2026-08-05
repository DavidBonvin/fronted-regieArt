import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getEventAssignments, getMyOrganizations } from '@regieart/api';
import type { InstrumentAssignment } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Checklist'>;

const INSTRUMENT_EMOJI: Record<string, string> = {
  BRASS: '🎺', WOODWIND: '🎷', STRING: '🎸', KEYBOARD: '🎹',
  PERCUSSION: '🥁', AUDIO_GEAR: '🎛️', LIGHTING: '💡', OTHER: '🎵',
};

export function ChecklistScreen({ route }: Props) {
  const { daysheetId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [assignments, setAssignments] = useState<InstrumentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const orgs = await getMyOrganizations();
    const orgId = orgs[0]?.id;
    if (!orgId) return;
    const res = await getEventAssignments({ orgId, eventId: daysheetId });
    setAssignments(res);
  }, [daysheetId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const verified = assignments.filter((a) => !a.returnedAt);
  const progress = assignments.length > 0 ? verified.length / assignments.length : 0;

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
        }
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.title}>{t('inventory.checklist_title')}</Text>
            <View style={s.progressCard}>
              <View style={s.progressRow}>
                <Text style={s.progressLabel}>{t('inventory.progress_label')}</Text>
                <Text style={s.progressCount}>{verified.length} / {assignments.length}</Text>
              </View>
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}><Text style={s.emptyText}>{t('common.no_results')}</Text></View>
        }
        renderItem={({ item }) => (
          <View style={s.itemRow}>
            <Text style={s.itemEmoji}>{INSTRUMENT_EMOJI[item.instrument.type] ?? '🎵'}</Text>
            <View style={s.itemInfo}>
              <Text style={s.itemName} numberOfLines={1}>{item.instrument.name}</Text>
              <Text style={s.itemUser} numberOfLines={1}>{item.user.displayName}</Text>
            </View>
            <View style={[s.statusDot, { backgroundColor: item.returnedAt ? theme.borderDefault : theme.actionBrand }]} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        contentContainerStyle={s.list}
      />
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { padding: 16, paddingBottom: 8 },
    title: { fontSize: 26, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3, marginBottom: 14 },
    progressCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 8,
    },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    progressCount: { fontSize: 13, fontWeight: '700', color: theme.textHeading },
    progressBar: { height: 6, backgroundColor: theme.surfaceRaised, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, backgroundColor: theme.actionBrand, borderRadius: 3 },
    list: { paddingHorizontal: 16, paddingBottom: 32 },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      gap: 12,
    },
    itemEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '600', color: theme.textHeading, marginBottom: 2 },
    itemUser: { fontSize: 12, color: theme.textSecondary },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    separator: { height: 6 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 15, color: theme.textSecondary },
  });
}

