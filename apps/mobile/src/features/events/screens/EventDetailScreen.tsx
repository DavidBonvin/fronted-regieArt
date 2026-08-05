import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getDaySheetMaster } from '@regieart/api';
import type { DaySheetMasterResponse } from '@regieart/types';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EventDetail'>;


const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  CONCERT:           { icon: '🎤', label: 'Concierto',  color: '#4A827E' },
  REHEARSAL:         { icon: '🎸', label: 'Ensayo',     color: '#7E7B4A' },
  AUDITION:          { icon: '🎼', label: 'Audición',   color: '#6E4A7E' },
  TOUR_DATE:         { icon: '🚌', label: 'Gira',       color: '#4A6E7E' },
  RECORDING_SESSION: { icon: '🎙️', label: 'Grabación',  color: '#7E4F4A' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Borrador',   color: '#8A96A8', bg: '#1E2630' },
  CONFIRMED: { label: 'Confirmado', color: '#4A827E', bg: '#162220' },
  CANCELLED: { label: 'Cancelado',  color: '#E05A5A', bg: '#2A1A1A' },
  COMPLETED: { label: 'Completado', color: '#6B8AC4', bg: '#1A1F2E' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}


export function EventDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { eventId } = route.params;

  const [data, setData] = useState<DaySheetMasterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getDaySheetMaster(eventId);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar el evento');
    }
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}><ActivityIndicator color="#4A827E" size="large" /></View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'No encontrado'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { event, venue, schedule, roster, finance, weather, meta } = data;
  const typeMeta = TYPE_META[event.type] ?? { icon: '📅', label: event.type, color: '#4A827E' };
  const statusMeta = STATUS_META[event.status] ?? STATUS_META.DRAFT;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A827E" />}
      >
        <View style={[styles.hero, { borderLeftColor: typeMeta.color }]}>
          <View style={styles.heroRow}>
            <Text style={styles.heroIcon}>{typeMeta.icon}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroBadges}>
                <View style={[styles.typeBadge, { backgroundColor: typeMeta.color + '26' }]}>
                  <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                </View>
                {event.isPublic && (
                  <View style={styles.publicBadge}>
                    <Text style={styles.publicBadgeText}>🌐 Público</Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroTitle}>{event.title}</Text>
            </View>
          </View>

          {event.description ? (
            <Text style={styles.heroDescription}>{event.description}</Text>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillValue}>{meta.totalScheduleItems}</Text>
            <Text style={styles.statPillLabel}>Horarios</Text>
          </View>
          <View style={styles.statPillDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statPillValue}>{meta.confirmedAttendees}</Text>
            <Text style={styles.statPillLabel}>Confirmados</Text>
          </View>
          <View style={styles.statPillDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statPillValue}>{roster.length}</Text>
            <Text style={styles.statPillLabel}>Músicos</Text>
          </View>
          <View style={styles.statPillDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statPillValue}>{meta.totalVehicles}</Text>
            <Text style={styles.statPillLabel}>Vehículos</Text>
          </View>
        </View>

        <Section title="Fecha y Hora">
          <View style={styles.card}>
            <View style={styles.timeRow}>
              <Text style={styles.timeIcon}>▶</Text>
              <View>
                <Text style={styles.timeLabel}>Inicio</Text>
                <Text style={styles.timeValue}>{fmt(event.startTime)}</Text>
              </View>
            </View>
            {event.endTime && (
              <View style={[styles.timeRow, styles.timeRowBorder]}>
                <Text style={styles.timeIcon}>■</Text>
                <View>
                  <Text style={styles.timeLabel}>Fin</Text>
                  <Text style={styles.timeValue}>{fmt(event.endTime)}</Text>
                </View>
              </View>
            )}
          </View>
        </Section>

        {venue && (
          <Section title="Lugar">
            <View style={styles.card}>
              <Text style={styles.venueTitle}>📍 {venue.name}</Text>
              {venue.address && <Text style={styles.venueMeta}>{venue.address}</Text>}
              <Text style={styles.venueMeta}>{venue.city}{venue.country ? `, ${venue.country}` : ''}</Text>
              {venue.capacity && (
                <Text style={styles.venueCapacity}>Capacidad: {venue.capacity.toLocaleString()} personas</Text>
              )}
              {venue.loadInNotes && (
                <View style={styles.venueNote}>
                  <Text style={styles.venueNoteLabel}>Carga ⬆</Text>
                  <Text style={styles.venueNoteText}>{venue.loadInNotes}</Text>
                </View>
              )}
              {venue.parkingNotes && (
                <View style={styles.venueNote}>
                  <Text style={styles.venueNoteLabel}>Parking 🅿</Text>
                  <Text style={styles.venueNoteText}>{venue.parkingNotes}</Text>
                </View>
              )}
              {venue.technicalContactName && (
                <View style={styles.venueNote}>
                  <Text style={styles.venueNoteLabel}>Técnico 🔧</Text>
                  <Text style={styles.venueNoteText}>
                    {venue.technicalContactName}
                    {venue.technicalContactPhone ? ` · ${venue.technicalContactPhone}` : ''}
                  </Text>
                </View>
              )}
            </View>
          </Section>
        )}

        {weather?.available && (
          <Section title="Clima">
            <View style={[styles.card, styles.weatherCard]}>
              {weather.icon && <Text style={styles.weatherIcon}>{weather.icon}</Text>}
              <View>
                <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
                <Text style={styles.weatherDesc}>{weather.description}</Text>
                {weather.humidity !== undefined && (
                  <Text style={styles.weatherMeta}>💧 {weather.humidity}% · 💨 {weather.windSpeed} km/h</Text>
                )}
              </View>
            </View>
          </Section>
        )}

        {(event.setlistNotes || event.daysheetNotes || event.itineraryNotes) && (
          <Section title="Notas">
            <View style={styles.card}>
              {event.setlistNotes && (
                <View style={styles.noteBlock}>
                  <Text style={styles.noteBlockTitle}>🎵 Setlist</Text>
                  <Text style={styles.noteBlockText}>{event.setlistNotes}</Text>
                </View>
              )}
              {event.daysheetNotes && (
                <View style={[styles.noteBlock, event.setlistNotes ? styles.noteBlockBorder : null]}>
                  <Text style={styles.noteBlockTitle}>📋 DaySheet</Text>
                  <Text style={styles.noteBlockText}>{event.daysheetNotes}</Text>
                </View>
              )}
              {event.itineraryNotes && (
                <View style={[styles.noteBlock, (event.setlistNotes || event.daysheetNotes) ? styles.noteBlockBorder : null]}>
                  <Text style={styles.noteBlockTitle}>🗺 Itinerario</Text>
                  <Text style={styles.noteBlockText}>{event.itineraryNotes}</Text>
                </View>
              )}
            </View>
          </Section>
        )}

        {schedule.length > 0 && (
          <Section title={`Cronograma · ${schedule.length} ítems`}>
            <View style={styles.card}>
              {schedule.map((item, i) => (
                <View key={item.id} style={[styles.scheduleItem, i > 0 && styles.scheduleItemBorder]}>
                  <Text style={styles.scheduleTime}>{fmtTime(item.startTime)}</Text>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleTitle}>{item.title}</Text>
                    <Text style={styles.scheduleType}>{item.type.replace(/_/g, ' ')}</Text>
                    {item.location && <Text style={styles.scheduleMeta}>📍 {item.location}</Text>}
                    {item.notes && <Text style={styles.scheduleMeta}>{item.notes}</Text>}
                  </View>
                  {item.isCompleted && <Text style={styles.scheduleDone}>✓</Text>}
                </View>
              ))}
            </View>
          </Section>
        )}

        {roster.length > 0 && (
          <Section title={`Roster · ${roster.length} músicos`}>
            <View style={styles.card}>
              {roster.map((entry, i) => (
                <View key={entry.userId} style={[styles.rosterRow, i > 0 && styles.rosterRowBorder]}>
                  <View style={styles.rosterAvatar}>
                    <Text style={styles.rosterAvatarText}>
                      {entry.user.displayName?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={styles.rosterInfo}>
                    <Text style={styles.rosterName}>{entry.user.displayName}</Text>
                    {entry.role && <Text style={styles.rosterRole}>{entry.role}</Text>}
                  </View>
                  <View style={[
                    styles.rosterStatus,
                    { backgroundColor: entry.status === 'CONFIRMED' ? '#162220' : '#1E2630' },
                  ]}>
                    <Text style={[
                      styles.rosterStatusText,
                      { color: entry.status === 'CONFIRMED' ? '#4A827E' : '#6B7685' },
                    ]}>
                      {entry.status === 'CONFIRMED' ? '✓' : entry.status === 'DECLINED' ? '✕' : '?'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>
        )}

        {finance && (
          <Section title="Finanzas">
            <View style={styles.card}>
              {finance.cacheTotal && (
                <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>Caché total</Text>
                  <Text style={styles.financeValue}>
                    {finance.currency ?? 'ARS'} {finance.cacheTotal}
                  </Text>
                </View>
              )}
              {finance.perDiemAmount && (
                <View style={[styles.financeRow, styles.financeRowBorder]}>
                  <Text style={styles.financeLabel}>Per diem</Text>
                  <Text style={styles.financeValue}>{finance.perDiemAmount}</Text>
                </View>
              )}
              <View style={[styles.financeRow, (finance.cacheTotal || finance.perDiemAmount) ? styles.financeRowBorder : null]}>
                <Text style={styles.financeLabel}>Estado de pago</Text>
                <Text style={[styles.financeValue, { color: finance.isPaid ? '#4A827E' : '#E0A05A' }]}>
                  {finance.isPaid ? '✓ Pagado' : '⏳ Pendiente'}
                </Text>
              </View>
              {finance.paymentNotes && (
                <Text style={styles.financeNotes}>{finance.paymentNotes}</Text>
              )}
            </View>
          </Section>
        )}

        <Section title="Acciones rápidas">
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Convoy', { eventId: event.id })}
            >
              <Text style={styles.actionBtnIcon}>🚌</Text>
              <Text style={styles.actionBtnLabel}>Convoy</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Expenses', { daysheetId: event.id })}
            >
              <Text style={styles.actionBtnIcon}>💰</Text>
              <Text style={styles.actionBtnLabel}>Gastos</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Checklist', { daysheetId: event.id })}
            >
              <Text style={styles.actionBtnIcon}>☑️</Text>
              <Text style={styles.actionBtnLabel}>Checklist</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Timeline')}
            >
              <Text style={styles.actionBtnIcon}>⏱</Text>
              <Text style={styles.actionBtnLabel}>Timeline</Text>
            </Pressable>
          </View>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#181B1E' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 14, color: '#E05A5A', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#4A827E', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2630',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: '#8A96A8', lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#E8ECF0', textAlign: 'center', letterSpacing: -0.2 },

  hero: {
    margin: 16,
    backgroundColor: '#1C2430',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2E3845',
    borderLeftWidth: 4,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  heroIcon: { fontSize: 36, lineHeight: 42 },
  heroMeta: { flex: 1 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  publicBadge: { backgroundColor: '#1A2030', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  publicBadgeText: { fontSize: 11, color: '#6B7685' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#F6F8F9', letterSpacing: -0.5, lineHeight: 24 },
  heroDescription: { fontSize: 14, color: '#8A96A8', lineHeight: 20, marginTop: 4 },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#1C2430',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E3845',
    marginBottom: 20,
  },
  statPill: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statPillValue: { fontSize: 20, fontWeight: '700', color: '#E8ECF0' },
  statPillLabel: { fontSize: 10, color: '#6B7685', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  statPillDivider: { width: 1, backgroundColor: '#2E3845', marginVertical: 10 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#5A6370', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  card: { backgroundColor: '#1C2430', borderRadius: 14, borderWidth: 1, borderColor: '#2E3845', overflow: 'hidden' },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  timeRowBorder: { borderTopWidth: 1, borderTopColor: '#2E3845' },
  timeIcon: { fontSize: 12, color: '#4A827E' },
  timeLabel: { fontSize: 11, color: '#5A6370', fontWeight: '600' },
  timeValue: { fontSize: 15, color: '#D0D8E4', fontWeight: '600', marginTop: 2 },

  venueTitle: { fontSize: 15, fontWeight: '700', color: '#D0D8E4', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 },
  venueMeta: { fontSize: 13, color: '#8A96A8', paddingHorizontal: 14, paddingBottom: 4 },
  venueCapacity: { fontSize: 12, color: '#6B7685', paddingHorizontal: 14, paddingBottom: 10 },
  venueNote: { borderTopWidth: 1, borderTopColor: '#2E3845', padding: 12, paddingHorizontal: 14 },
  venueNoteLabel: { fontSize: 11, fontWeight: '700', color: '#5A6370', marginBottom: 3 },
  venueNoteText: { fontSize: 13, color: '#8A96A8', lineHeight: 18 },

  weatherCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  weatherIcon: { fontSize: 40 },
  weatherTemp: { fontSize: 28, fontWeight: '700', color: '#D0D8E4' },
  weatherDesc: { fontSize: 14, color: '#8A96A8', marginTop: 2 },
  weatherMeta: { fontSize: 12, color: '#6B7685', marginTop: 4 },

  noteBlock: { padding: 14 },
  noteBlockBorder: { borderTopWidth: 1, borderTopColor: '#2E3845' },
  noteBlockTitle: { fontSize: 12, fontWeight: '700', color: '#6B7685', marginBottom: 6 },
  noteBlockText: { fontSize: 14, color: '#C0C8D4', lineHeight: 22 },

  scheduleItem: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  scheduleItemBorder: { borderTopWidth: 1, borderTopColor: '#2E3845' },
  scheduleTime: { fontSize: 13, fontWeight: '700', color: '#4A827E', width: 46, paddingTop: 2 },
  scheduleInfo: { flex: 1 },
  scheduleTitle: { fontSize: 14, fontWeight: '600', color: '#D0D8E4' },
  scheduleType: { fontSize: 11, color: '#6B7685', marginTop: 1 },
  scheduleMeta: { fontSize: 11, color: '#5A6370', marginTop: 2 },
  scheduleDone: { color: '#4A827E', fontSize: 16, fontWeight: '700' },

  rosterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rosterRowBorder: { borderTopWidth: 1, borderTopColor: '#2E3845' },
  rosterAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#4A827E30', alignItems: 'center', justifyContent: 'center' },
  rosterAvatarText: { fontSize: 15, fontWeight: '700', color: '#4A827E' },
  rosterInfo: { flex: 1 },
  rosterName: { fontSize: 14, fontWeight: '600', color: '#D0D8E4' },
  rosterRole: { fontSize: 12, color: '#6B7685', marginTop: 1 },
  rosterStatus: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rosterStatusText: { fontSize: 14, fontWeight: '700' },

  financeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  financeRowBorder: { borderTopWidth: 1, borderTopColor: '#2E3845' },
  financeLabel: { fontSize: 13, color: '#8A96A8' },
  financeValue: { fontSize: 14, fontWeight: '700', color: '#D0D8E4' },
  financeNotes: { fontSize: 13, color: '#6B7685', paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#2E3845' },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1C2430',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E3845',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  actionBtnIcon: { fontSize: 24 },
  actionBtnLabel: { fontSize: 11, fontWeight: '600', color: '#8A96A8', textAlign: 'center' },
});
