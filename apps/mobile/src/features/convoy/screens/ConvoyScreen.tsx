import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useConvoySummary } from '../hooks/useConvoySummary';
import { useCalculateRoute } from '../hooks/useCalculateRoute';
import { openGPSNavigation } from '../../../shared/utils/openGPSNavigation';
import type { RootStackParamList } from '../../../navigation';
import type { ConvoySummaryItem, RouteResult } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Convoy'>;

// ─── VehicleCard ──────────────────────────────────────────────────────────────

function VehicleCard({
  vehicle,
  eventId,
  onRouteCalculated,
  styles,
}: {
  vehicle: ConvoySummaryItem;
  eventId: string;
  onRouteCalculated: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const { calculate, isLoading, errorStatus } = useCalculateRoute(
    eventId,
    vehicle.vehicleId,
    onRouteCalculated,
  );
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [navSheetOpen, setNavSheetOpen] = useState(false);

  const departure = vehicle.suggestedDepartureAt
    ? new Date(vehicle.suggestedDepartureAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const venueCoords =
    routeResult?.venueLat != null && routeResult.venueLng != null
      ? { lat: routeResult.venueLat, lng: routeResult.venueLng }
      : null;

  async function handleCalculate() {
    try {
      const result = await calculate();
      setRouteResult(result);
    } catch {
      if (errorStatus === 400) {
        Alert.alert(
          'Sin coordenadas GPS',
          'El lugar del show no tiene coordenadas GPS. Edita el evento primero.',
        );
      } else if (errorStatus === 503) {
        Alert.alert('Servicio no disponible', 'El servicio de rutas OSRM no está disponible. Intenta más tarde.');
      }
    }
  }

  return (
    <View style={styles.vehicleCard}>
      {/* Header */}
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleHeaderLeft}>
          <Text style={styles.vehicleIcon}>🚐</Text>
          <View>
            <Text style={styles.vehicleName}>{vehicle.name}</Text>
            {vehicle.driverName && (
              <Text style={styles.driverLabel}>Chauffeur : {vehicle.driverName}</Text>
            )}
          </View>
        </View>
        <View style={vehicle.routeCalculated ? styles.badgeReady : styles.badgePending}>
          <Text style={vehicle.routeCalculated ? styles.badgeReadyText : styles.badgePendingText}>
            {vehicle.routeCalculated ? '🟢 Prête' : '⚠️ Sans route'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statText}>👥 {vehicle.passengersCount} passagers</Text>
        {vehicle.originAddress && (
          <Text style={styles.statRoute} numberOfLines={1}>
            📍 {vehicle.originAddress}
          </Text>
        )}
        {routeResult?.cached && (
          <Text style={styles.cacheBadge}>⚡ Cache Redis</Text>
        )}
      </View>

      {vehicle.routeCalculated ? (
        /* ── State D ── */
        <View style={styles.routeDetails}>
          <View style={styles.metricsRow}>
            {vehicle.routeDistanceKm != null && (
              <View style={styles.metric}>
                <Text style={styles.metricVal}>{vehicle.routeDistanceKm} km</Text>
                <Text style={styles.metricLabel}>Distance</Text>
              </View>
            )}
            {vehicle.routeDurationMin != null && (
              <View style={styles.metric}>
                <Text style={styles.metricVal}>{vehicle.routeDurationMin} min</Text>
                <Text style={styles.metricLabel}>Durée</Text>
              </View>
            )}
            {departure && (
              <View style={styles.metric}>
                <Text style={[styles.metricVal, styles.metricDep]}>{departure}</Text>
                <Text style={styles.metricLabel}>Départ suggéré</Text>
              </View>
            )}
          </View>

          {routeResult && routeResult.legs.length > 0 && (
            <View style={styles.legs}>
              <Text style={styles.legsTitle}>Étapes et ramassages</Text>
              {routeResult.legs.map((leg, i) => (
                <View key={i} style={styles.legRow}>
                  <View style={styles.legIdx}><Text style={styles.legIdxText}>{i + 1}</Text></View>
                  <Text style={styles.legFrom} numberOfLines={1}>{leg.from}</Text>
                  <Text style={styles.legDist}>{leg.distanceKm} km · {leg.durationMin} min</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionsRow}>
            {venueCoords && (
              <>
                <Pressable
                  style={({ pressed }) => [styles.btnNav, pressed && styles.btnPressed]}
                  onPress={() => setNavSheetOpen((v) => !v)}
                >
                  <Text style={styles.btnNavText}>🧭 Lancer la Navigation</Text>
                </Pressable>
                {navSheetOpen && (
                  <View style={styles.navSheet}>
                    <Pressable
                      style={styles.navOption}
                      onPress={() => { openGPSNavigation(venueCoords.lat, venueCoords.lng, 'google'); setNavSheetOpen(false); }}
                    >
                      <Text style={styles.navOptionText}>🗺️ Google Maps</Text>
                    </Pressable>
                    <Pressable
                      style={styles.navOption}
                      onPress={() => { openGPSNavigation(venueCoords.lat, venueCoords.lng, 'waze'); setNavSheetOpen(false); }}
                    >
                      <Text style={styles.navOptionText}>🏎️ Waze GPS</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
              onPress={handleCalculate}
              disabled={isLoading}
            >
              <Text style={styles.btnSecondaryText}>
                {isLoading ? '⏳ Calculant…' : '🔄 Recalculer'}
              </Text>
            </Pressable>
            <Pressable style={styles.btnWarn}>
              <Text style={styles.btnWarnText}>⚠️ Signaler un Retard</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        /* ── State C ── */
        <View style={styles.noRouteBox}>
          <Text style={styles.noRouteText}>
            La route n'a pas encore été calculée. Les temps de trajet et l'heure de départ ne sont pas disponibles.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btnCalculate, pressed && styles.btnPressed, isLoading && styles.btnDisabled]}
            onPress={handleCalculate}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnCalculateText}>📍 Calculer la Route et l'Itinéraire</Text>
            }
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── ConvoyScreen ─────────────────────────────────────────────────────────────

export function ConvoyScreen({ route }: Props) {
  const { eventId } = route.params;
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicles, isLoading, error, refetch } = useConvoySummary(eventId);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
        }
      >
        <Text style={styles.title}>Convoi & Transport</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!error && vehicles.length === 0 && (
          /* ── State A ── */
          <View style={styles.noConvoyBox}>
            <Text style={styles.noConvoyIcon}>🚐</Text>
            <Text style={styles.noConvoyTitle}>Aucun convoi configuré</Text>
            <Text style={styles.noConvoyText}>
              Créez un convoi depuis le bureau pour organiser le transport de l'équipe.
            </Text>
          </View>
        )}

        {vehicles.map((v) => (
          <VehicleCard
            key={v.vehicleId}
            vehicle={v}
            eventId={eventId}
            onRouteCalculated={refetch}
            styles={styles}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#1e1e1e' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, gap: 14, paddingBottom: 40 },
    title: { fontSize: 22, fontWeight: '700', color: '#f0f0f0', marginBottom: 8 },

    errorBox: {
      backgroundColor: 'rgba(200,60,60,0.12)',
      borderRadius: 8,
      padding: 14,
    },
    errorText: { fontSize: 13, color: '#e07070' },

    noConvoyBox: {
      backgroundColor: '#2e2e2e',
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    noConvoyIcon: { fontSize: 36 },
    noConvoyTitle: { fontSize: 16, fontWeight: '700', color: '#f0f0f0' },
    noConvoyText: { fontSize: 13, color: '#a0a0a0', textAlign: 'center', lineHeight: 18 },

    vehicleCard: {
      backgroundColor: '#2e2e2e',
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    vehicleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    vehicleHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    vehicleIcon: { fontSize: 22 },
    vehicleName: { fontSize: 15, fontWeight: '700', color: '#f0f0f0' },
    driverLabel: { fontSize: 12, color: '#a0a0a0', marginTop: 1 },

    badgeReady: {
      backgroundColor: 'rgba(76,175,80,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(76,175,80,0.3)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeReadyText: { fontSize: 11, fontWeight: '700', color: '#4caf50' },
    badgePending: {
      backgroundColor: 'rgba(255,152,0,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,152,0,0.25)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgePendingText: { fontSize: 11, fontWeight: '700', color: '#ff9800' },

    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statText: { fontSize: 12, color: '#a0a0a0' },
    statRoute: { fontSize: 12, color: '#a0a0a0', flex: 1 },
    cacheBadge: {
      fontSize: 11,
      fontWeight: '700',
      color: '#7ed0cc',
      backgroundColor: 'rgba(74,130,126,0.15)',
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },

    noRouteBox: {
      backgroundColor: '#242424',
      borderWidth: 1,
      borderColor: 'rgba(255,152,0,0.25)',
      borderRadius: 8,
      padding: 14,
      gap: 12,
    },
    noRouteText: { fontSize: 13, color: '#a0a0a0', lineHeight: 18 },

    btnCalculate: {
      backgroundColor: theme.actionBrand,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    btnCalculateText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    routeDetails: { gap: 14 },
    metricsRow: {
      flexDirection: 'row',
      gap: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#3e3e3e',
    },
    metric: { gap: 2 },
    metricVal: { fontSize: 16, fontWeight: '700', color: '#f0f0f0' },
    metricDep: { color: theme.actionBrand },
    metricLabel: { fontSize: 10, color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: 0.5 },

    legs: { gap: 8 },
    legsTitle: {
      fontSize: 10,
      fontWeight: '700',
      color: '#a0a0a0',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    legRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legIdx: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    legIdxText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    legFrom: { flex: 1, fontSize: 13, color: '#f0f0f0' },
    legDist: { fontSize: 12, color: theme.actionBrand, flexShrink: 0 },

    actionsRow: { gap: 8 },
    btnNav: {
      backgroundColor: theme.actionBrand,
      borderRadius: 8,
      paddingVertical: 11,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    btnNavText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    navSheet: {
      backgroundColor: '#252525',
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#3e3e3e',
    },
    navOption: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#333' },
    navOptionText: { fontSize: 14, color: '#f0f0f0' },

    btnSecondary: {
      borderWidth: 1,
      borderColor: '#3e3e3e',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    btnSecondaryText: { fontSize: 13, color: '#a0a0a0' },

    btnWarn: {
      borderWidth: 1,
      borderColor: 'rgba(255,152,0,0.3)',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    btnWarnText: { fontSize: 13, color: '#ff9800' },

    btnPressed: { opacity: 0.75 },
    btnDisabled: { opacity: 0.5 },
  });
}
