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
import { listConversations, listNotifications } from '@regieart/api';
import type { Conversation, Notification } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'conversations' | 'notifications';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Avatar({
  name,
  size,
  theme,
}: {
  name: string;
  size: number;
  theme: ThemeColors;
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.surfaceRaised,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: theme.borderSubtle,
      }}
    >
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: theme.actionBrand }}>
        {initials}
      </Text>
    </View>
  );
}

export function MessagesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [activeTab, setActiveTab] = useState<Tab>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [convs, notifRes] = await Promise.all([
      listConversations(),
      listNotifications({ limit: 30 }),
    ]);
    setConversations(convs);
    setNotifications(notifRes.notifications);
    setUnreadNotifs(notifRes.unreadCount);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function renderConversation({ item }: { item: Conversation }) {
    return (
      <Pressable
        style={({ pressed }) => [s.row, pressed && s.rowPressed]}
        onPress={() =>
          navigation.navigate('DirectMessage', {
            userId: item.userId,
            displayName: item.user.displayName,
          })
        }
      >
        <Avatar name={item.user.displayName} size={48} theme={theme} />
        <View style={s.rowContent}>
          <View style={s.rowTop}>
            <Text style={s.rowTitle} numberOfLines={1}>
              {item.user.displayName}
            </Text>
            {item.lastMessage && (
              <Text style={s.rowTime}>{timeAgo(item.lastMessage.createdAt)}</Text>
            )}
          </View>
          {item.lastMessage && (
            <Text style={s.rowSubtitle} numberOfLines={1}>
              {item.lastMessage.content}
            </Text>
          )}
        </View>
        {item.unreadCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  function renderNotification({ item }: { item: Notification }) {
    return (
      <View style={[s.notifRow, !item.isRead && s.notifRowUnread]}>
        <View style={[s.notifDot, item.isRead && s.notifDotRead]} />
        <View style={s.notifContent}>
          <Text style={s.notifTitle} numberOfLines={2}>
            {item.title ?? item.type}
          </Text>
          {item.body ? (
            <Text style={s.notifBody} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          <Text style={s.notifTime}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>{t('messages.title')}</Text>
        {unreadNotifs > 0 && activeTab === 'notifications' && (
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>{unreadNotifs}</Text>
          </View>
        )}
      </View>

      <View style={s.tabs}>
        <Pressable
          style={[s.tab, activeTab === 'conversations' && s.tabActive]}
          onPress={() => setActiveTab('conversations')}
        >
          <Text style={[s.tabLabel, activeTab === 'conversations' && s.tabLabelActive]}>
            {t('messages.tab_band_chat')}
          </Text>
        </Pressable>
        <Pressable
          style={[s.tab, activeTab === 'notifications' && s.tabActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <View style={s.tabRow}>
            <Text style={[s.tabLabel, activeTab === 'notifications' && s.tabLabelActive]}>
              {t('messages.tab_alerts')}
            </Text>
            {unreadNotifs > 0 && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeText}>{unreadNotifs}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      ) : activeTab === 'conversations' ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.userId}
          renderItem={renderConversation}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No conversations yet</Text>
              <Text style={s.emptySubtitle}>
                Message a band member to start a conversation.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No notifications</Text>
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
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 4,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.3,
      flex: 1,
    },
    headerBadge: {
      backgroundColor: theme.actionDanger,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    headerBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSubtle,
      marginBottom: 4,
    },
    tab: { paddingHorizontal: 8, paddingVertical: 12, marginRight: 8 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: theme.actionBrand },
    tabRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabLabel: { fontSize: 14, fontWeight: '500', color: theme.textSecondary },
    tabLabelActive: { color: theme.actionBrand, fontWeight: '600' },
    tabBadge: {
      backgroundColor: theme.actionDanger,
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 24 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      minHeight: 72,
    },
    rowPressed: { backgroundColor: theme.surfaceRaised },
    rowContent: { flex: 1, marginLeft: 14 },
    rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    rowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.textHeading },
    rowTime: { fontSize: 12, color: theme.textMuted },
    rowSubtitle: { fontSize: 13, color: theme.textSecondary },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
      marginLeft: 10,
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    separator: { height: 6 },
    notifRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    notifRowUnread: { backgroundColor: theme.surfaceRaised },
    notifDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.actionBrand,
      marginTop: 5,
    },
    notifDotRead: { backgroundColor: theme.borderDefault },
    notifContent: { flex: 1 },
    notifTitle: { fontSize: 14, fontWeight: '600', color: theme.textHeading, marginBottom: 2 },
    notifBody: { fontSize: 13, color: theme.textSecondary, lineHeight: 18, marginBottom: 4 },
    notifTime: { fontSize: 11, color: theme.textMuted },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
  });
}
