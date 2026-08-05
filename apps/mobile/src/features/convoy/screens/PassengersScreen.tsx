import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { listEvents, getVehicles } from '@regieart/api';
import type { EventVehicle } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Passengers'>;

export function PassengersScreen({ route }: Props) {
  const { vehicleId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [vehicle, setVehicle] = useState<EventVehicle | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();
    const events = await listEvents({ from, to, limit: 5 });
    for (const event of events.events) {
      const vehicles = await getVehicles(event.id);
      const found = vehicles.find((v) => v.id === vehicleId);
      if (found) { setVehicle(found); return; }
    }
  }, [vehicleId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.empty}>{t('common.no_results')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.vehicleHeader}>
          <Text style={s.vehicleName}>{vehicle.name}</Text>
          {vehicle.plateNumber && <Text style={s.plate}>{vehicle.plateNumber}</Text>}
          {vehicle.driverName && (
            <Text style={s.driverLine}>
              {t('convoy.driver_badge')}: {vehicle.driverName}
              {vehicle.driverPhone ? ` · ${vehicle.driverPhone}` : ''}
            </Text>
          )}
        </View>

        {vehicle.passengers.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>{t('convoy.passengers_title').toUpperCase()}</Text>
            {vehicle.passengers.map((p) => (
              <View key={p.userId} style={s.passengerRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {(p.user?.displayName ?? '?').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={s.passengerName}>{p.user?.displayName ?? p.userId}</Text>
              </View>
            ))}
          </View>
        )}

        {vehicle.pickups && vehicle.pickups.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>{t('convoy.pickups_title').toUpperCase()}</Text>
            {vehicle.pickups.sort((a, b) => a.order - b.order).map((p) => (
              <View key={p.id} style={s.pickupRow}>
                <View style={s.pickupOrder}>
                  <Text style={s.pickupOrderText}>{p.order}</Text>
                </View>
                <View style={s.pickupInfo}>
                  <Text style={s.pickupAddress}>{p.address}</Text>
                  <Text style={s.pickupTime}>{new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  {p.notes ? <Text style={s.pickupNotes}>{p.notes}</Text> : null}
                </View>
                {(p.lat && p.lng) ? (
                  <Text
                    style={s.mapsLink}
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${p.lat},${p.lng}`)}
                  >
                    Maps
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { fontSize: 15, color: theme.textSecondary },
    scroll: { padding: 16, paddingBottom: 40 },
    vehicleHeader: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
    },
    vehicleName: { fontSize: 22, fontWeight: '700', color: theme.textHeading, marginBottom: 4 },
    plate: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, letterSpacing: 1, marginBottom: 4 },
    driverLine: { fontSize: 13, color: theme.actionBrand, fontWeight: '500' },
    section: { marginBottom: 20 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: theme.textSecondary, marginBottom: 10, paddingHorizontal: 4 },
    passengerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 6,
      gap: 10,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 12, fontWeight: '700', color: theme.actionBrand },
    passengerName: { fontSize: 14, fontWeight: '600', color: theme.textHeading },
    pickupRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 14,
      marginBottom: 6,
      gap: 12,
    },
    pickupOrder: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.statusOkSurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    pickupOrderText: { fontSize: 13, fontWeight: '700', color: theme.actionBrand },
    pickupInfo: { flex: 1 },
    pickupAddress: { fontSize: 14, fontWeight: '600', color: theme.textHeading, marginBottom: 2 },
    pickupTime: { fontSize: 12, color: theme.textSecondary },
    pickupNotes: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    mapsLink: { fontSize: 13, fontWeight: '600', color: theme.actionBrand, paddingTop: 4 },
  });
}

