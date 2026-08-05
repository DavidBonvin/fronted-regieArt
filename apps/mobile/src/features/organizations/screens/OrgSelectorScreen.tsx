import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getMyOrganizations } from '@regieart/api';
import type { Organization } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { RootStackParamList } from '../../../navigation';
import type { ThemeColors } from '@regieart/ui';
import { SELECTED_ORG_KEY } from './OrgHomeScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'OrgSelector'>;

export function OrgSelectorScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setError(null);
    getMyOrganizations()
      .then(setOrgs)
      .catch(() => setError(t('errors.generic')))
      .finally(() => setLoading(false));
  }, [t]));

  async function handleSelectOrg(org: Organization) {
    await AsyncStorage.setItem(SELECTED_ORG_KEY, org.id);
    navigation.replace('MainTabs');
  }

  function renderOrg({ item }: { item: Organization }) {
    const initials = item.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');

    return (
      <Pressable
        style={({ pressed }) => [s.orgCard, pressed && s.orgCardPressed]}
        onPress={() => handleSelectOrg(item)}
        accessibilityRole="button"
      >
        <View style={s.orgAvatar}>
          <Text style={s.orgAvatarText}>{initials}</Text>
        </View>
        <View style={s.orgInfo}>
          <Text style={s.orgName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={s.orgDescription} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.titleRow}>
        <Text style={s.title}>{t('org_selector.title')}</Text>
        <Text style={s.subtitle}>{t('org_selector.subtitle')}</Text>
      </View>

      {loading && (
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      )}

      {!loading && error !== null && (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {!loading && error === null && orgs.length === 0 && (
        <View style={s.center}>
          <Text style={s.emptyText}>{t('org_selector.no_orgs')}</Text>
        </View>
      )}

      {!loading && error === null && orgs.length > 0 && (
        <FlatList
          data={orgs}
          keyExtractor={(item) => item.id}
          renderItem={renderOrg}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.createButton, pressed && s.createButtonPressed]}
          onPress={() => navigation.navigate('CreateOrganization')}
          accessibilityRole="button"
        >
          <Text style={s.createButtonLabel}>{t('org_selector.create_org')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.surfaceApp,
    },
    titleRow: {
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 20,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    errorText: {
      fontSize: 14,
      color: theme.actionDanger,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    orgCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    orgCardPressed: {
      backgroundColor: theme.surfaceRaised,
    },
    orgAvatar: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    orgAvatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textOnAction,
    },
    orgInfo: {
      flex: 1,
    },
    orgName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textHeading,
      marginBottom: 2,
    },
    orgDescription: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    chevron: {
      fontSize: 22,
      color: theme.textMuted,
      marginLeft: 8,
    },
    separator: {
      height: 8,
    },
    footer: {
      padding: 20,
      paddingBottom: 8,
    },
    createButton: {
      borderWidth: 1.5,
      borderColor: theme.actionBrand,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    createButtonPressed: {
      backgroundColor: theme.surfaceRaised,
    },
    createButtonLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.actionBrand,
    },
  });
}
