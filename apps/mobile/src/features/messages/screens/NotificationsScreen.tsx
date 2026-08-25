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
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  acceptInvitation,
  rejectInvitation,
} from '@regieart/api';
import type { Notification } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

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

  async function handleAcceptInvitation(notif: Notification, token: string) {
    setRespondingTo(notif.id);
    try {
      const result = await acceptInvitation(token);
      await markNotificationRead(notif.id);
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n));
      navigation.navigate('OrganizationDetail', { organizationId: result.orgId });
    } finally {
      setRespondingTo(null);
    }
  }

  async function handleRejectInvitation(notifId: string, token: string) {
    setRespondingTo(notifId);
    try {
      await rejectInvitation(token);
      await markNotificationRead(notifId);
      setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, isRead: true } : n));
    } finally {
      setRespondingTo(null);
    }
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
        renderItem={({ item }) => {
          const invitationToken = item.metadata?.invitationToken;
          const isRespondingToThis = respondingTo === item.id;

          return (
            <Pressable
              style={({ pressed }) => [s.notifRow, !item.isRead && s.notifUnread, pressed && s.notifPressed]}
              onPress={() => {
                if (invitationToken) {
                  navigation.navigate('InvitationResponse', { token: invitationToken });
                } else if (!item.isRead) {
                  handleMarkRead(item.id);
                }
              }}
            >
              {!item.isRead && <View style={s.unreadDot} />}
              <View style={s.notifContent}>
                <Text style={s.notifTitle} numberOfLines={1}>{item.title}</Text>
                {item.body && <Text style={s.notifBody} numberOfLines={2}>{item.body}</Text>}
                <Text style={s.notifTime}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
                {invitationToken && (
                  <View style={s.inlineActionRow}>
                    <Pressable
                      style={[s.inlineRejectButton, isRespondingToThis && s.buttonDisabled]}
                      onPress={() => handleRejectInvitation(item.id, invitationToken)}
                      disabled={isRespondingToThis}
                    >
                      <Text style={s.inlineRejectLabel}>Rechazar</Text>
                    </Pressable>
                    <Pressable
                      style={[s.inlineAcceptButton, isRespondingToThis && s.buttonDisabled]}
                      onPress={() => handleAcceptInvitation(item, invitationToken)}
                      disabled={isRespondingToThis}
                    >
                      {isRespondingToThis ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={s.inlineAcceptLabel}>Aceptar</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
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
    inlineActionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    inlineRejectButton: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.borderDefault,
    },
    inlineRejectLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    inlineAcceptButton: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: theme.actionBrand,
      minWidth: 80,
      alignItems: 'center',
    },
    inlineAcceptLabel: { fontSize: 13, fontWeight: '700', color: theme.textOnAction },
    buttonDisabled: { opacity: 0.5 },
  });
}

