import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getVenue } from '@regieart/api';
import type { Venue } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'VenueDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function VenueDetailScreen({ route }: Props) {
  const { venueId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVenue(venueId)
      .then((v) => {
        setVenue(v);
        navigation.setOptions({ title: v.name });
      })
      .finally(() => setLoading(false));
  }, [venueId, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!venue) return null;

  function openMaps() {
    if (venue!.latitude && venue!.longitude) {
      Linking.openURL(`https://maps.google.com/?q=${venue!.latitude},${venue!.longitude}`);
    } else if (venue!.address) {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(venue!.address + ', ' + venue!.city)}`);
    }
  }

  function callContact() {
    if (venue!.technicalContactPhone) {
      Linking.openURL(`tel:${venue!.technicalContactPhone}`);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headerCard}>
          <Text style={s.venueName}>{venue.name}</Text>
          <Text style={s.venueCity}>{[venue.city, venue.country].filter(Boolean).join(', ')}</Text>
          {venue.address && <Text style={s.venueAddress}>{venue.address}</Text>}
          {venue.capacity && (
            <Text style={s.capacityTag}>{t('daysheet.venue_capacity')}: {venue.capacity}</Text>
          )}
          {(venue.latitude || venue.address) && (
            <Pressable style={({ pressed }) => [s.mapsBtn, pressed && s.mapsBtnPressed]} onPress={openMaps}>
              <Text style={s.mapsBtnText}>📍 {t('daysheet.open_maps')}</Text>
            </Pressable>
          )}
        </View>

        {venue.loadInNotes && (
          <View style={s.infoCard}>
            <Text style={s.infoLabel}>{t('daysheet.load_in_notes').toUpperCase()}</Text>
            <Text style={s.infoText}>{venue.loadInNotes}</Text>
          </View>
        )}

        {venue.parkingNotes && (
          <View style={s.infoCard}>
            <Text style={s.infoLabel}>{t('daysheet.parking_notes').toUpperCase()}</Text>
            <Text style={s.infoText}>{venue.parkingNotes}</Text>
          </View>
        )}

        {(venue.technicalContactName || venue.technicalContactPhone) && (
          <View style={s.contactCard}>
            <Text style={s.infoLabel}>{t('daysheet.tech_contact').toUpperCase()}</Text>
            {venue.technicalContactName && (
              <Text style={s.contactName}>{venue.technicalContactName}</Text>
            )}
            {venue.technicalContactPhone && (
              <Pressable onPress={callContact}>
                <Text style={s.contactPhone}>{venue.technicalContactPhone}</Text>
              </Pressable>
            )}
            {venue.technicalContactEmail && (
              <Text style={s.contactEmail}>{venue.technicalContactEmail}</Text>
            )}
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
    scroll: { padding: 16, paddingBottom: 40, gap: 12 },
    headerCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 20,
      padding: 18,
    },
    venueName: { fontSize: 22, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3, marginBottom: 4 },
    venueCity: { fontSize: 14, fontWeight: '600', color: theme.actionBrand, marginBottom: 2 },
    venueAddress: { fontSize: 13, color: theme.textSecondary, marginBottom: 8 },
    capacityTag: { fontSize: 12, color: theme.textMuted, marginBottom: 10 },
    mapsBtn: {
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.actionBrand,
      paddingVertical: 9,
      paddingHorizontal: 14,
      alignSelf: 'flex-start',
    },
    mapsBtnPressed: { backgroundColor: theme.surfaceRaised },
    mapsBtnText: { fontSize: 13, fontWeight: '600', color: theme.actionBrand },
    infoCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 16,
      padding: 16,
    },
    infoLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: theme.textSecondary, marginBottom: 8 },
    infoText: { fontSize: 14, color: theme.textBody, lineHeight: 20 },
    contactCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 16,
      padding: 16,
    },
    contactName: { fontSize: 16, fontWeight: '600', color: theme.textHeading, marginBottom: 4 },
    contactPhone: { fontSize: 14, color: theme.actionBrand, fontWeight: '600', marginBottom: 2 },
    contactEmail: { fontSize: 13, color: theme.textSecondary },
  });
}

