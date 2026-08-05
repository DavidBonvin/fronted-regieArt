import React, { useCallback, useEffect, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { listEvents, getDaySheetMaster } from '@regieart/api';
import type { DaySheetMasterResponse } from '@regieart/types';
import type { ScheduleType } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';

type DashboardTab = 'daysheet' | 'announcements' | 'teams' | 'finance';

const SCHEDULE_TYPE_KEYS: Record<ScheduleType, string> = {
  DEPARTURE: 'daysheet.schedule_types.DEPARTURE',
  ARRIVAL: 'daysheet.schedule_types.ARRIVAL',
  LOAD_IN: 'daysheet.schedule_types.LOAD_IN',
  SOUNDCHECK: 'daysheet.schedule_types.SOUNDCHECK',
  DOORS_OPEN: 'daysheet.schedule_types.DOORS_OPEN',
  CATERING_DINNER: 'daysheet.schedule_types.CATERING_DINNER',
  SHOWTIME: 'daysheet.schedule_types.SHOWTIME',
  LOAD_OUT: 'daysheet.schedule_types.LOAD_OUT',
  OTHER: 'daysheet.schedule_types.OTHER',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function DashboardScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [activeTab, setActiveTab] = useState<DashboardTab>('daysheet');
  const [daysheet, setDaysheet] = useState<DaySheetMasterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const result = await listEvents({
        from: today.toISOString(),
        to: tomorrow.toISOString(),
        limit: 1,
      });

      if (result.events.length > 0) {
        const master = await getDaySheetMaster(result.events[0].id);
        setDaysheet(master);
      } else {
        setDaysheet(null);
      }
    } catch {
      setError(t('errors.network'));
    }
  }, [t]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const tabs: Array<{ key: DashboardTab; label: string }> = [
    { key: 'daysheet', label: t('dashboard.tabs_daysheet') },
    { key: 'announcements', label: t('dashboard.tabs_announcements') },
    { key: 'teams', label: t('dashboard.tabs_teams') },
    { key: 'finance', label: t('dashboard.tabs_finance') },
  ];

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
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>RégieArt</Text>
        {daysheet?.weather?.available && (
          <Text style={s.weatherBadge}>
            {t('dashboard.weather_degrees', {
              degrees: Math.round(daysheet.weather.temperature ?? 0),
            })}
          </Text>
        )}
      </View>

      <ScrollView
        style={s.tabRow}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabRowContent}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.actionBrand}
          />
        }
      >
        {error !== null && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {activeTab === 'daysheet' && (
          <>
            {daysheet === null ? (
              <NoEventCard t={t} s={s} />
            ) : (
              <DaysheetContent daysheet={daysheet} theme={theme} t={t} s={s} />
            )}
          </>
        )}

        {activeTab !== 'daysheet' && (
          <View style={s.placeholderSection}>
            <Text style={s.placeholderText}>{t('common.loading')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NoEventCard({
  t,
  s,
}: {
  t: (key: string) => string;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.card}>
      <Text style={s.showLabel}>{t('dashboard.show_today')}</Text>
      <Text style={s.noEventTitle}>{t('dashboard.no_event_today')}</Text>
      <Text style={s.noEventSubtitle}>{t('dashboard.no_event_subtitle')}</Text>
      <Pressable style={({ pressed }) => [s.createBtn, pressed && s.createBtnPressed]}>
        <Text style={s.createBtnLabel}>{t('dashboard.status_creating')}</Text>
      </Pressable>
    </View>
  );
}

function DaysheetContent({
  daysheet,
  t,
  s,
}: {
  daysheet: DaySheetMasterResponse;
  theme: ThemeColors;
  t: (key: string, opts?: Record<string, unknown>) => string;
  s: ReturnType<typeof makeStyles>;
}) {
  const event = daysheet.event;
  const schedule = daysheet.schedule;
  const completedCount = schedule.filter((i) => i.isCompleted).length;

  return (
    <>
      <View style={s.card}>
        <Text style={s.showLabel}>{t('dashboard.show_today')}</Text>
        <Text style={s.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>
        {event.description ? (
          <Text style={s.eventDescription} numberOfLines={3}>
            {event.description}
          </Text>
        ) : null}

        <View style={s.progressRow}>
          <View style={[s.progressBar, { width: `${schedule.length > 0 ? Math.round((completedCount / schedule.length) * 100) : 0}%` }]} />
        </View>
        <Text style={s.progressLabel}>
          {completedCount}/{schedule.length}
        </Text>
      </View>

      {schedule.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('daysheet.timeline_title')}</Text>
          {schedule.map((item) => (
            <View key={item.id} style={s.timelineRow}>
              <View style={[s.timelineDot, item.isCompleted && s.timelineDotDone]} />
              <View style={s.timelineContent}>
                <Text style={s.timelineTime}>{formatTime(item.startTime)}</Text>
                <Text style={s.timelineLabel}>
                  {t(SCHEDULE_TYPE_KEYS[item.type as ScheduleType] ?? 'daysheet.schedule_types.OTHER')}
                  {item.title !== item.type ? ` — ${item.title}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {daysheet.venue && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('daysheet.venue_notes')}</Text>
          <View style={s.card}>
            <Text style={s.venueAddress}>{daysheet.venue.address}</Text>
            {daysheet.venue.parkingNotes ? (
              <Text style={s.venueNoteText}>{daysheet.venue.parkingNotes}</Text>
            ) : null}
            <View style={s.venueActions}>
              <Pressable style={s.venueBtn}>
                <Text style={s.venueBtnLabel}>{t('daysheet.contact_tech_button')}</Text>
              </Pressable>
              <Pressable style={s.venueBtn}>
                <Text style={s.venueBtnLabel}>{t('daysheet.open_gps')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.surfaceApp,
    },
    flex: {
      flex: 1,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.3,
    },
    weatherBadge: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    tabRow: {
      flexGrow: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSubtle,
    },
    tabRowContent: {
      paddingHorizontal: 16,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginRight: 4,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: theme.actionBrand,
    },
    tabLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    tabLabelActive: {
      color: theme.actionBrand,
      fontWeight: '600',
    },
    scrollContent: {
      padding: 16,
      gap: 12,
    },
    card: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 14,
      padding: 18,
    },
    showLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: theme.actionBrand,
      marginBottom: 8,
    },
    eventTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.2,
      marginBottom: 6,
    },
    eventDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    progressRow: {
      height: 3,
      backgroundColor: theme.surfaceRaised,
      borderRadius: 2,
      marginTop: 14,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: theme.actionBrand,
      borderRadius: 2,
    },
    progressLabel: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 4,
      textAlign: 'right',
    },
    noEventTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textHeading,
      marginBottom: 6,
    },
    noEventSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    createBtn: {
      alignSelf: 'flex-start',
      backgroundColor: theme.actionBrand,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    createBtnPressed: {
      backgroundColor: theme.actionBrandDim,
    },
    createBtnLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textOnAction,
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: theme.textSecondary,
      paddingHorizontal: 4,
    },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: theme.surfaceCard,
      borderRadius: 10,
      padding: 14,
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.borderDefault,
      marginTop: 4,
    },
    timelineDotDone: {
      backgroundColor: theme.actionBrand,
    },
    timelineContent: {
      flex: 1,
    },
    timelineTime: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 2,
    },
    timelineLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.textBody,
    },
    venueAddress: {
      fontSize: 15,
      color: theme.textBody,
      marginBottom: 6,
    },
    venueNoteText: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
      marginBottom: 14,
    },
    venueActions: {
      flexDirection: 'row',
      gap: 10,
    },
    venueBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderDefault,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    venueBtnLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textBody,
    },
    errorBanner: {
      backgroundColor: theme.statusErrorSurface,
      borderRadius: 10,
      padding: 14,
    },
    errorText: {
      fontSize: 14,
      color: theme.statusError,
    },
    placeholderSection: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    placeholderText: {
      fontSize: 15,
      color: theme.textMuted,
    },
  });
}
