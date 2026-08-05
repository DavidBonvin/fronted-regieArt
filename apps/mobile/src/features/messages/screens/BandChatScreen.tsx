import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getMyOrganizations, getOrganizationMembers } from '@regieart/api';
import type { OrganizationMember } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'BandChat'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function BandChatScreen({ route }: Props) {
  const { channelId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const orgs = await getMyOrganizations();
      const orgId = orgs[0]?.id;
      if (orgId) {
        const mems = await getOrganizationMembers(orgId);
        setMembers(mems);
      }
      setLoading(false);
    }
    init();
  }, [channelId]);

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
      <View style={s.center}>
        <Text style={s.emptyIcon}>💬</Text>
        <Text style={s.emptyTitle}>{t('messages.band_chat_title')}</Text>
        <Text style={s.emptySubtitle}>{t('messages.band_chat_hint')}</Text>
      </View>

      <View style={s.memberList}>
        <Text style={s.sectionLabel}>{t('band_management.members_title', { count: members.length })}</Text>
        <View style={s.avatarRow}>
          {members.slice(0, 8).map((m) => {
            const initials = m.user.displayName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
            return (
              <Pressable
                key={m.id}
                style={({ pressed }) => [s.memberAvatar, pressed && s.memberAvatarPressed]}
                onPress={() => navigation.navigate('DirectMessage', { userId: m.user.id, displayName: m.user.displayName })}
              >
                <Text style={s.memberAvatarText}>{initials}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textHeading, marginBottom: 8, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 },
    memberList: {
      backgroundColor: theme.surfaceCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 32,
    },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: theme.textSecondary, marginBottom: 12 },
    avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    memberAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surfaceRaised,
      borderWidth: 1.5,
      borderColor: theme.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberAvatarPressed: { backgroundColor: theme.surfaceRaised, borderColor: theme.actionBrand },
    memberAvatarText: { fontSize: 14, fontWeight: '700', color: theme.actionBrand },
  });
}

