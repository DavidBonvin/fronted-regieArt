import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getOrganization, listEvents, listConversations, listNotifications } from '@regieart/api';
import type { OrganizationDetail, Event, Conversation, Notification } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

export const SELECTED_ORG_KEY = '@regieart:selectedOrgId';

const EVENT_TYPE_ICONS: Record<string, string> = {
  CONCERT: '🎤', REHEARSAL: '🎸', AUDITION: '🎼', TOUR_DATE: '🚌', RECORDING_SESSION: '🎙️',
};
const EVENT_TYPE_LABELS: Record<string, string> = {
  CONCERT: 'Concierto', REHEARSAL: 'Ensayo', AUDITION: 'Audición', TOUR_DATE: 'Gira', RECORDING_SESSION: 'Grabación',
};
const EVENT_TYPE_COLORS: Record<string, string> = {
  CONCERT: '#4A827E', REHEARSAL: '#7E7B4A', AUDITION: '#6E4A7E', TOUR_DATE: '#4A6E7E', RECORDING_SESSION: '#7E4F4A',
};
const EVENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado', COMPLETED: 'Completado',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function OrgHomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const id = await AsyncStorage.getItem(SELECTED_ORG_KEY);
    if (!id) { setLoading(false); return; }
    setOrgId(id);

    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30).toISOString();

    const [orgRes, eventsRes, convosRes, notifsRes] = await Promise.allSettled([
      getOrganization(id),
      listEvents({ orgId: id, from, to, limit: 10 }),
      listConversations(),
      listNotifications({ limit: 20 }),
    ]);

    if (orgRes.status === 'fulfilled') setOrg(orgRes.value);
    if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.events ?? []);
    if (convosRes.status === 'fulfilled') {
      const list = Array.isArray(convosRes.value) ? convosRes.value : [];
      setConvos(list.slice(0, 5));
    }
    if (notifsRes.status === 'fulfilled') {
      setNotifs((notifsRes.value.notifications ?? []).filter((n) => !n.isRead).slice(0, 5));
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]));

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator color={theme.actionBrand} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!org) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.noOrgText}>No hay organización seleccionada</Text>
          <Pressable style={s.selectBtn} onPress={() => navigation.navigate('OrgSelector')}>
            <Text style={s.selectBtnLabel}>Seleccionar organización</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const today = new Date();
  const unreadMessages = convos.filter((c) => c.unreadCount > 0).length;
  const unreadNotifs = notifs.length;
  const initials = org.name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />}
      >
        <View style={s.orgHeader}>
          <View style={s.orgAvatar}><Text style={s.orgAvatarText}>{initials}</Text></View>
          <View style={s.orgMeta}>
            <Text style={s.orgName}>{org.name}</Text>
            <View style={s.activeBadge}><Text style={s.activeBadgeLabel}>● Active</Text></View>
          </View>
          <Pressable style={s.switchBtn} onPress={() => navigation.navigate('OrgSelector')}>
            <Text style={s.switchBtnLabel}>⇄</Text>
          </Pressable>
        </View>

        <Text style={s.dateText}>
          {today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{events.length}</Text>
            <Text style={s.statLabel}>{t('dashboard.next_event')}</Text>
            <Text style={s.statSub}>{t('dashboard.next_14_days')}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCard}>
            <Text style={s.statValue}>{unreadMessages}</Text>
            <Text style={s.statLabel}>{t('dashboard.unread_messages')}</Text>
            <Text style={s.statSub}>{t('dashboard.conversations')}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCard}>
            <Text style={s.statValue}>{unreadNotifs}</Text>
            <Text style={s.statLabel}>{t('dashboard.notifications')}</Text>
            <Text style={s.statSub}>{t('dashboard.unread')}</Text>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Próximos eventos</Text>
          </View>
          {events.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>{t('dashboard.no_events')}</Text>
              <Text style={s.emptyHint}>{t('dashboard.no_events_hint')}</Text>
            </View>
          ) : (
            events.map((ev) => {
              const typeIcon = EVENT_TYPE_ICONS[ev.type] ?? '📅';
              const typeLabel = EVENT_TYPE_LABELS[ev.type] ?? ev.type;
              const typeColor = EVENT_TYPE_COLORS[ev.type] ?? '#4A827E';
              const statusLabel = EVENT_STATUS_LABELS[ev.status];
              const isToday = (() => {
                const d = new Date(ev.startTime);
                return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
              })();
              return (
                <Pressable
                  key={ev.id}
                  style={[s.richEventCard, { borderLeftColor: typeColor }]}
                  onPress={() => navigation.navigate('EventDetail', { eventId: ev.id })}
                >
                  <View style={s.richEventRow}>
                    <Text style={s.richEventIcon}>{typeIcon}</Text>
                    <View style={s.richEventMeta}>
                      <View style={s.richEventBadges}>
                        <View style={[s.richTypeBadge, { backgroundColor: typeColor + '26' }]}>
                          <Text style={[s.richTypeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
                        </View>
                        {isToday && (
                          <View style={s.todayBadge}><Text style={s.todayBadgeText}>Hoy</Text></View>
                        )}
                        <Text style={s.richStatusText}>{statusLabel}</Text>
                      </View>
                      <Text style={s.richEventTitle} numberOfLines={2}>{ev.title}</Text>
                      <Text style={s.richEventTime}>
                        {new Date(ev.startTime).toLocaleDateString('es-AR', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' · '}
                        {new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {ev.description ? (
                        <Text style={s.richEventDesc} numberOfLines={1}>{ev.description}</Text>
                      ) : null}
                    </View>
                    <Text style={s.richEventArrow}>›</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>{t('nav.messages')}</Text>
            <Pressable onPress={() => orgId && navigation.navigate('BandChat', { channelId: orgId })}>
              <Text style={s.viewAll}>{t('common.view_all')} →</Text>
            </Pressable>
          </View>
          {convos.length === 0 ? (
            <View style={s.emptyCard}><Text style={s.emptyTitle}>No results</Text></View>
          ) : (
            convos.map((c) => (
              <Pressable
                key={c.userId}
                style={s.convoRow}
                onPress={() => navigation.navigate('DirectMessage', { userId: c.userId, displayName: c.user.displayName })}
              >
                <View style={s.convoAvatar}>
                  <Text style={s.convoAvatarText}>{c.user.displayName?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={s.convoMeta}>
                  <Text style={s.convoName}>{c.user.displayName}</Text>
                  {c.lastMessage && (
                    <Text style={s.convoLast} numberOfLines={1}>{c.lastMessage.content}</Text>
                  )}
                </View>
                {c.unreadCount > 0 && (
                  <View style={s.unreadBadge}><Text style={s.unreadBadgeLabel}>{c.unreadCount}</Text></View>
                )}
              </Pressable>
            ))
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Accesos rápidos</Text>
          <View style={s.actionsGrid}>
            <Pressable style={s.actionTile} onPress={() => navigation.navigate('Timeline')}>
              <Text style={s.actionIcon}>📅</Text>
              <Text style={s.actionLabel}>{t('nav.timeline')}</Text>
            </Pressable>
            <Pressable style={s.actionTile} onPress={() => navigation.navigate('Finance')}>
              <Text style={s.actionIcon}>💰</Text>
              <Text style={s.actionLabel}>{t('nav.finance')}</Text>
            </Pressable>
            <Pressable style={s.actionTile} onPress={() => navigation.navigate('Backline')}>
              <Text style={s.actionIcon}>🎸</Text>
              <Text style={s.actionLabel}>{t('nav.backline')}</Text>
            </Pressable>
            <Pressable style={s.actionTile} onPress={() => navigation.navigate('OrganizationDetail', { organizationId: orgId! })}>
              <Text style={s.actionIcon}>🏷</Text>
              <Text style={s.actionLabel}>Perfil org.</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    noOrgText: { fontSize: 15, color: theme.textSecondary, marginBottom: 16, textAlign: 'center' },
    selectBtn: { backgroundColor: theme.actionBrand, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    selectBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
    orgHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
    orgAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.actionBrand, alignItems: 'center', justifyContent: 'center' },
    orgAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
    orgMeta: { flex: 1 },
    orgName: { fontSize: 17, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.2 },
    activeBadge: { marginTop: 3 },
    activeBadgeLabel: { fontSize: 12, color: '#4A827E', fontWeight: '600' },
    switchBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: theme.borderSubtle },
    switchBtnLabel: { fontSize: 18, color: theme.textSecondary },
    dateText: { fontSize: 12, color: theme.textMuted, paddingHorizontal: 16, marginBottom: 16 },
    statsRow: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: theme.surfaceCard, borderRadius: 14, borderWidth: 1, borderColor: theme.borderSubtle, marginBottom: 20 },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    statValue: { fontSize: 24, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.5 },
    statLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 2, textAlign: 'center', fontWeight: '600' },
    statSub: { fontSize: 10, color: theme.textMuted, textAlign: 'center' },
    statDivider: { width: 1, backgroundColor: theme.borderSubtle, marginVertical: 12 },
    section: { paddingHorizontal: 16, marginBottom: 24 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
    viewAll: { fontSize: 13, color: theme.actionBrand, fontWeight: '600' },
    eventCard: { backgroundColor: theme.surfaceCard, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.borderSubtle },
    eventTitle: { fontSize: 15, fontWeight: '700', color: theme.textHeading, marginBottom: 4 },
    eventTime: { fontSize: 13, color: theme.textSecondary },
    emptyCard: { backgroundColor: theme.surfaceCard, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: theme.borderSubtle },
    emptyTitle: { fontSize: 14, color: theme.textSecondary, fontWeight: '600', marginBottom: 4 },
    emptyHint: { fontSize: 12, color: theme.textMuted, textAlign: 'center' },
    convoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
    convoAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: `${theme.actionBrand}30`, alignItems: 'center', justifyContent: 'center' },
    convoAvatarText: { fontSize: 15, fontWeight: '700', color: theme.actionBrand },
    convoMeta: { flex: 1 },
    convoName: { fontSize: 14, fontWeight: '600', color: theme.textHeading },
    convoLast: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    unreadBadge: { backgroundColor: theme.actionBrand, borderRadius: 12, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    unreadBadgeLabel: { fontSize: 11, color: '#fff', fontWeight: '700' },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionTile: { flex: 1, minWidth: '45%', backgroundColor: theme.surfaceCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.borderSubtle },
    actionIcon: { fontSize: 28, marginBottom: 8 },
    actionLabel: { fontSize: 12, fontWeight: '600', color: theme.textBody, textAlign: 'center' },
    richEventCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      borderLeftWidth: 4,
      marginBottom: 10,
      padding: 14,
    },
    richEventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    richEventIcon: { fontSize: 28, lineHeight: 32 },
    richEventMeta: { flex: 1 },
    richEventBadges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 6 },
    richTypeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    richTypeBadgeText: { fontSize: 10, fontWeight: '700' },
    todayBadge: { backgroundColor: '#4A827E', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    todayBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
    richStatusText: { fontSize: 10, color: theme.textMuted, fontWeight: '600' },
    richEventTitle: { fontSize: 15, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.2, marginBottom: 3 },
    richEventTime: { fontSize: 12, color: theme.textSecondary },
    richEventDesc: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
    richEventArrow: { fontSize: 22, color: theme.textMuted, paddingTop: 2 },
  });
}
