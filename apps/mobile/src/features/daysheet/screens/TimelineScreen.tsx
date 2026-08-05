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
import { useTranslation } from 'react-i18next';
import { listEvents, getSchedule } from '@regieart/api';
import type { EventScheduleItem, ScheduleType } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';

const TYPE_COLOR: Partial<Record<ScheduleType, string>> = {
  SOUNDCHECK: '#649D98',
  SHOWTIME: '#F59E0B',
  LOAD_IN: '#8C949B',
  LOAD_OUT: '#565D63',
  DOORS_OPEN: '#4A827E',
};

export function TimelineScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [items, setItems] = useState<EventScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const events = await listEvents({ from, to, limit: 1 });
    if (events.events.length === 0) return;
    const schedule = await getSchedule(events.events[0].id);
    setItems(schedule.sort((a, b) => a.startTime.localeCompare(b.startTime)));
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const now = new Date();

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
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
        }
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.title}>{t('daysheet.timeline_title')}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}><Text style={s.emptyText}>{t('common.no_results')}</Text></View>
        }
        renderItem={({ item }) => {
          const start = new Date(item.startTime);
          const isPast = start < now;
          const isNow = !isPast && (item.endTime ? new Date(item.endTime) > now : start <= new Date(now.getTime() + 30 * 60000));
          const accentColor = TYPE_COLOR[item.type] ?? theme.textSecondary;

          return (
            <View style={s.itemRow}>
              <View style={s.timeCol}>
                <Text style={[s.startTime, isPast && s.pastText]}>
                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {item.endTime && (
                  <Text style={s.endTime}>
                    {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
              <View style={[s.track, { backgroundColor: isNow ? accentColor : isPast ? theme.borderSubtle : accentColor + '66' }]} />
              <View style={[s.card, isPast && s.cardPast]}>
                <Text style={[s.cardType, { color: accentColor }]}>{item.type.replace('_', ' ')}</Text>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                {item.location && <Text style={s.cardSub}>{item.location}</Text>}
                {item.withWho && <Text style={s.cardSub}>{item.withWho}</Text>}
                {isNow && <View style={s.nowPill}><Text style={s.nowText}>NOW</Text></View>}
              </View>
            </View>
          );
        }}
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
    title: { fontSize: 26, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3 },
    list: { paddingHorizontal: 16, paddingBottom: 32 },
    itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    timeCol: { width: 52, paddingTop: 12 },
    startTime: { fontSize: 13, fontWeight: '700', color: theme.textHeading, textAlign: 'right' },
    endTime: { fontSize: 11, color: theme.textMuted, textAlign: 'right', marginTop: 2 },
    pastText: { color: theme.textMuted },
    track: { width: 3, borderRadius: 2, marginHorizontal: 10, alignSelf: 'stretch', minHeight: 60, marginTop: 14 },
    card: {
      flex: 1,
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 13,
    },
    cardPast: { opacity: 0.55 },
    cardType: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: theme.textHeading, marginBottom: 2 },
    cardSub: { fontSize: 12, color: theme.textSecondary },
    nowPill: {
      marginTop: 6,
      backgroundColor: theme.actionBrand,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      alignSelf: 'flex-start',
    },
    nowText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 15, color: theme.textSecondary },
  });
}

