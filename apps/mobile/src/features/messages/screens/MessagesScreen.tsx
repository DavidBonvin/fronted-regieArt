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
import { listConversations, listNotifications, getMyOrganizations, getOrganizationMembers, getMe } from '@regieart/api';
import type { Conversation, Notification, OrganizationMember } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'conversations' | 'notifications';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propriétaire', ADMIN: 'Administrateur', MEMBER: 'Membre', EXTERNAL_TECH: 'Technicien externe',
};

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
        backgroundColor: theme.actionBrand,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.34, fontWeight: '700', color: '#fff' }}>
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
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [myId, setMyId] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const timeAgo = useCallback((iso: string): string => {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (minutes < 1) return t('messages.time_now');
    if (minutes < 60) return t('messages.time_min', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('messages.time_hour', { count: hours });
    const days = Math.floor(hours / 24);
    if (days === 1) return t('messages.time_yesterday');
    return t('messages.time_days', { count: days });
  }, [t]);

  const loadData = useCallback(async () => {
    const [convs, notifRes, me] = await Promise.all([
      listConversations(),
      listNotifications({ limit: 30 }),
      getMe(),
    ]);
    setConversations(convs);
    setNotifications(notifRes.notifications);
    setUnreadNotifs(notifRes.unreadCount);
    setMyId(me.id);
  }, []);

  useEffect(() => {
    getMyOrganizations()
      .then((orgs) => (orgs[0] ? getOrganizationMembers(orgs[0].id) : []))
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const showMemberList = showMembers || (!loading && conversations.length === 0);

  function renderMember({ item }: { item: OrganizationMember }) {
    return (
      <Pressable
        style={({ pressed }) => [s.row, pressed && s.rowPressed]}
        onPress={() => {
          setShowMembers(false);
          navigation.navigate('DirectMessage', {
            userId: item.user.id,
            displayName: item.user.displayName,
          });
        }}
      >
        <Avatar name={item.user.displayName} size={48} theme={theme} />
        <View style={s.rowContent}>
          <Text style={s.rowTitle} numberOfLines={1}>{item.user.displayName}</Text>
          <Text style={s.rowSubtitle} numberOfLines={1}>
            {ROLE_LABEL[item.role] ?? item.role}
          </Text>
        </View>
      </Pressable>
    );
  }

  function renderConversation({ item }: { item: Conversation }) {
    const unread = item.unreadCount > 0;
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
          <Text style={[s.rowSubtitle, unread && s.rowSubtitleUnread]} numberOfLines={1}>
            {item.lastMessage
              ? `${item.lastMessage.senderId === myId ? t('messages.you_prefix') : ''}${item.lastMessage.content}`
              : t('messages.no_message')}
          </Text>
        </View>
        {unread && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
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
        {activeTab === 'conversations' && (
          <Pressable
            style={[s.composeBtn, showMembers && s.composeBtnActive]}
            onPress={() => setShowMembers((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={t('messages.new_conversation')}
          >
            <Text style={[s.composeIcon, showMembers && s.composeIconActive]}>
              {showMembers ? '✕' : '✎'}
            </Text>
          </Pressable>
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
        showMemberList ? (
          <FlatList
            data={members.filter((m) => m.user.id !== myId)}
            keyExtractor={(item) => item.id}
            renderItem={renderMember}
            contentContainerStyle={s.listContent}
            ItemSeparatorComponent={() => <View style={s.separator} />}
            ListHeaderComponent={<Text style={s.listLabel}>{t('messages.band_members')}</Text>}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
            }
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Text style={s.emptySubtitle}>{t('messages.no_members_hint')}</Text>
              </View>
            }
          />
        ) : (
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
                <Text style={s.emptyTitle}>{t('messages.no_conversations')}</Text>
                <Text style={s.emptySubtitle}>{t('messages.no_conversations_hint')}</Text>
              </View>
            }
          />
        )
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
    composeBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    composeBtnActive: { backgroundColor: theme.actionBrand, borderColor: 'transparent' },
    composeIcon: { fontSize: 16, color: theme.textBody },
    composeIconActive: { color: '#fff' },
    listLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.textMuted,
      paddingVertical: 8,
    },
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
    rowSubtitleUnread: { color: theme.textHeading, fontWeight: '600' },
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
