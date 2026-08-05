import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { searchUsers } from '@regieart/api';
import type { UserPublic } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TalentSearchScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim() && !city.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchUsers({ q: query.trim() || undefined, city: city.trim() || undefined, limit: 20 });
      setResults(res.users);
    } finally {
      setLoading(false);
    }
  }

  function renderUser({ item }: { item: UserPublic }) {
    const initials = item.displayName
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');

    const mainSkill = item.skills?.[0];

    return (
      <Pressable
        style={({ pressed }) => [s.card, pressed && s.cardPressed]}
        onPress={() => navigation.navigate('MusicianProfile', { userId: item.id })}
      >
        <View style={s.cardLeft}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.userInfo}>
            <Text style={s.userName} numberOfLines={1}>{item.displayName}</Text>
            {item.city || item.country ? (
              <Text style={s.userLocation} numberOfLines={1}>
                {[item.city, item.country].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            {mainSkill && (
              <Text style={s.userSkill} numberOfLines={1}>
                {mainSkill.skillCategory.name} · {mainSkill.expertiseLevel}
              </Text>
            )}
          </View>
        </View>
        <View style={s.cardRight}>
          {item.memberships?.length > 0 && (
            <Text style={s.bandsCount}>
              {t('musician_search.bands_count', { count: item.memberships.length })}
            </Text>
          )}
          <Text style={s.chevron}>›</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.searchSection}>
        <Text style={s.title}>{t('musician_search.title')}</Text>
        <TextInput
          style={s.input}
          placeholder={t('musician_search.search_placeholder')}
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          clearButtonMode="while-editing"
        />
        <TextInput
          style={[s.input, s.inputCity]}
          placeholder={t('musician_search.city_placeholder')}
          placeholderTextColor={theme.textMuted}
          value={city}
          onChangeText={setCity}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          clearButtonMode="while-editing"
        />
        <Pressable
          style={({ pressed }) => [s.searchBtn, pressed && s.searchBtnPressed]}
          onPress={handleSearch}
        >
          <Text style={s.searchBtnText}>{t('common.search')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      ) : searched && results.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>{t('common.no_results')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    searchSection: { padding: 16, paddingBottom: 8 },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.3,
      marginBottom: 14,
    },
    input: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.textHeading,
      marginBottom: 8,
    },
    inputCity: {},
    searchBtn: {
      backgroundColor: theme.actionBrand,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    searchBtnPressed: { backgroundColor: theme.actionBrandDim },
    searchBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 15, color: theme.textSecondary },
    listContent: { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 24 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      minHeight: 76,
    },
    cardPressed: { backgroundColor: theme.surfaceRaised },
    cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.borderSubtle,
    },
    avatarText: { fontSize: 16, fontWeight: '700', color: theme.actionBrand },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: '600', color: theme.textHeading, marginBottom: 2 },
    userLocation: { fontSize: 12, color: theme.textMuted, marginBottom: 1 },
    userSkill: { fontSize: 12, color: theme.actionBrand },
    cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    bandsCount: { fontSize: 12, color: theme.textSecondary },
    chevron: { fontSize: 20, color: theme.textMuted },
    separator: { height: 6 },
  });
}

