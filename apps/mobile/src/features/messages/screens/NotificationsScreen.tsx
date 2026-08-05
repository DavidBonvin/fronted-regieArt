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
import { useTranslation } from 'react-i18next';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '@regieart/api';
import type { Notification } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';

export function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    const res = await listNotifications({ limit: 50 });
    setNotifications(res.notifications);
  }, []);

  useEffect(() => {
    loadNotifications().finally(() => setLoading(false));
  }, [loadNotifications]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleMarkRead(notifId: string) {
    await markNotificationRead(notifId);
    setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, isRead: true } : n));
  }

  const unread = notifications.filter((n) => !n.isRead).length;

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
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
        }
        ListHeaderComponent={
          <View style={s.header}>
            <View style={s.titleRow}>
              <Text style={s.title}>{t('messages.notifications_tab')}</Text>
              {unread > 0 && (
                <Pressable onPress={handleMarkAll}>
                  <Text style={s.markAllText}>{t('messages.mark_all_read')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>{t('common.no_results')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [s.notifRow, !item.isRead && s.notifUnread, pressed && s.notifPressed]}
            onPress={() => !item.isRead && handleMarkRead(item.id)}
          >
            {!item.isRead && <View style={s.unreadDot} />}
            <View style={s.notifContent}>
              <Text style={s.notifTitle} numberOfLines={1}>{item.title}</Text>
              {item.body && <Text style={s.notifBody} numberOfLines={2}>{item.body}</Text>}
              <Text style={s.notifTime}>
                {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </Pressable>
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
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 26, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3 },
    markAllText: { fontSize: 13, fontWeight: '600', color: theme.actionBrand },
    list: { paddingHorizontal: 16, paddingBottom: 32 },
    notifRow: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    notifUnread: { borderLeftWidth: 3, borderLeftColor: theme.actionBrand },
    notifPressed: { backgroundColor: theme.surfaceRaised },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.actionBrand,
      marginTop: 5,
    },
    notifContent: { flex: 1 },
    notifTitle: { fontSize: 14, fontWeight: '600', color: theme.textHeading, marginBottom: 2 },
    notifBody: { fontSize: 13, color: theme.textSecondary, marginBottom: 4 },
    notifTime: { fontSize: 11, color: theme.textMuted },
    separator: { height: 6 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 15, color: theme.textSecondary },
  });
}

