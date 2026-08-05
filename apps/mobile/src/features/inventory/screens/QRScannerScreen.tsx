import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Vibration,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { listInstruments, getMyOrganizations } from '@regieart/api';
import type { Instrument } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function QRScannerScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [found, setFound] = useState<Instrument | null>(null);
  const [serialInput, setSerialInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function handleSearch(serial: string) {
    if (!serial.trim()) return;
    setSearching(true);
    setNotFound(false);
    try {
      const orgs = await getMyOrganizations();
      const orgId = orgs[0]?.id;
      if (!orgId) { setSearching(false); return; }
      const res = await listInstruments({ orgId });
      const match = res.find((i) => i.serialNumber === serial.trim());
      if (match) {
        Vibration.vibrate(Platform.OS === 'android' ? 100 : undefined);
        setFound(match);
      } else {
        setNotFound(true);
      }
    } finally {
      setSearching(false);
    }
  }

  const inputRef = useRef<any>(null);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.viewfinder}>
        <View style={s.viewfinderInner} />
        <Text style={s.hint}>{t('inventory.qr_hint')}</Text>
      </View>

      <View style={s.bottomSheet}>
        {found ? (
          <View style={s.foundCard}>
            <Text style={s.foundLabel}>{t('inventory.item_found')}</Text>
            <Text style={s.foundName}>{found.name}</Text>
            <Text style={s.foundSub}>
              {found.brand} {found.model} · {found.type}
            </Text>
            <Text style={[s.statusBadge, {
              color: found.status === 'AVAILABLE' ? theme.statusOk
                : found.status === 'IN_USE' ? theme.actionBrand
                : theme.statusError,
            }]}>{found.status}</Text>
            <Pressable
              style={({ pressed }) => [s.doneBtn, pressed && s.doneBtnPressed]}
              onPress={() => navigation.goBack()}
            >
              <Text style={s.doneBtnText}>{t('common.close')}</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={s.manualLabel}>{t('inventory.serial_manual')}</Text>
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder={t('inventory.serial_placeholder')}
              placeholderTextColor={theme.textMuted}
              value={serialInput}
              onChangeText={setSerialInput}
              returnKeyType="search"
              onSubmitEditing={() => handleSearch(serialInput)}
              autoCapitalize="characters"
            />
            {notFound && <Text style={s.notFound}>{t('inventory.serial_not_found')}</Text>}
            {searching ? (
              <ActivityIndicator color={theme.actionBrand} style={s.loader} />
            ) : (
              <Pressable
                style={({ pressed }) => [s.searchBtn, pressed && s.searchBtnPressed]}
                onPress={() => handleSearch(serialInput)}
              >
                <Text style={s.searchBtnText}>{t('common.search')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000000' },
    viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    viewfinderInner: {
      width: 220,
      height: 220,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.actionBrand,
    },
    hint: { position: 'absolute', bottom: 24, color: '#FFFFFF', fontSize: 13, opacity: 0.7 },
    bottomSheet: {
      backgroundColor: theme.surfaceCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      minHeight: 220,
    },
    foundCard: { gap: 6 },
    foundLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: theme.textSecondary, marginBottom: 4 },
    foundName: { fontSize: 20, fontWeight: '700', color: theme.textHeading },
    foundSub: { fontSize: 13, color: theme.textSecondary },
    statusBadge: { fontSize: 12, fontWeight: '700', marginVertical: 4 },
    doneBtn: {
      backgroundColor: theme.actionBrand,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 14,
    },
    doneBtnPressed: { backgroundColor: theme.actionBrandDim },
    doneBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    manualLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 10 },
    input: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.textHeading,
      marginBottom: 8,
    },
    notFound: { fontSize: 13, color: theme.actionDanger, marginBottom: 8 },
    loader: { marginTop: 12 },
    searchBtn: {
      backgroundColor: theme.actionBrand,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    searchBtnPressed: { backgroundColor: theme.actionBrandDim },
    searchBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  });
}

