import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getUserById, getUserSkills } from '@regieart/api';
import type { UserPublic, UserSkill } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicianProfile'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const EXPERTISE_COLORS: Record<string, string> = {
  BEGINNER: '#565D63',
  INTERMEDIATE: '#649D98',
  ADVANCED: '#4A827E',
  PROFESSIONAL: '#F59E0B',
};

export function MusicianProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [user, setUser] = useState<UserPublic | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [u, sk] = await Promise.all([getUserById(userId), getUserSkills(userId)]);
    setUser(u);
    setSkills(sk);
    navigation.setOptions({ title: u.displayName });
  }, [userId, navigation]);

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

  if (!user) return null;

  const initials = user.displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.displayName}>{user.displayName}</Text>
          {user.city || user.country ? (
            <Text style={s.location}>{[user.city, user.country].filter(Boolean).join(', ')}</Text>
          ) : null}
          {user.bio ? <Text style={s.bio}>{user.bio}</Text> : null}
        </View>

        <View style={s.actionRow}>
          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={() => navigation.navigate('DirectMessage', { userId, displayName: user.displayName })}
          >
            <Text style={s.actionBtnText}>{t('musician_search.message_button')}</Text>
          </Pressable>
        </View>

        {skills.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>{t('profile.skills_label').toUpperCase()}</Text>
            <View style={s.skillsGrid}>
              {skills.map((sk) => (
                <View
                  key={sk.id}
                  style={[s.skillChip, { borderColor: EXPERTISE_COLORS[sk.expertiseLevel] ?? theme.borderDefault }]}
                >
                  <Text style={s.skillName}>{sk.skillCategory.name}</Text>
                  <Text style={[s.skillLevel, { color: EXPERTISE_COLORS[sk.expertiseLevel] ?? theme.textMuted }]}>
                    {sk.expertiseLevel}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {user.memberships.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>{t('profile.bands_label').toUpperCase()}</Text>
            {user.memberships.map((m) => (
              <View key={m.organization.id} style={s.memberRow}>
                <Text style={s.memberOrgName}>{m.organization.name}</Text>
                <View style={s.roleChip}>
                  <Text style={s.roleChipText}>{m.role}</Text>
                </View>
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
    scroll: { padding: 20, paddingBottom: 40 },
    hero: { alignItems: 'center', marginBottom: 20 },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.surfaceRaised,
      borderWidth: 2,
      borderColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    avatarText: { fontSize: 32, fontWeight: '700', color: theme.actionBrand },
    displayName: { fontSize: 24, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3, marginBottom: 4 },
    location: { fontSize: 14, color: theme.textSecondary, marginBottom: 8 },
    bio: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    actionBtn: {
      flex: 1,
      backgroundColor: theme.actionBrand,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    actionBtnPressed: { backgroundColor: theme.actionBrandDim },
    actionBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    section: { marginBottom: 24 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: theme.textSecondary,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    skillChip: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8 },
    skillName: { fontSize: 13, fontWeight: '600', color: theme.textHeading, marginBottom: 2 },
    skillLevel: { fontSize: 10, fontWeight: '500' },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 6,
    },
    memberOrgName: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.textHeading },
    roleChip: {
      borderRadius: 6,
      backgroundColor: theme.surfaceRaised,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    roleChipText: { fontSize: 11, fontWeight: '600', color: theme.textSecondary },
  });
}

