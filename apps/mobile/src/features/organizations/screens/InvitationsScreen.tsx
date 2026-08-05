import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getInviteLinks, revokeInviteLink } from '@regieart/api';
import type { InviteLink, MemberRole } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Invitations'>;

const ROLE_COLORS: Record<MemberRole, string> = {
  OWNER: '#F59E0B',
  ADMIN: '#649D98',
  MEMBER: '#8C949B',
  EXTERNAL_TECH: '#565D63',
};

export function InvitationsScreen({ route }: Props) {
  const { organizationId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLinks = useCallback(async () => {
    const all = await getInviteLinks(organizationId);
    setLinks(all.filter((l) => new Date(l.expiresAt) > new Date()));
  }, [organizationId]);

  useEffect(() => {
    loadLinks().finally(() => setLoading(false));
  }, [loadLinks]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadLinks();
    setRefreshing(false);
  }

  async function handleShare(link: InviteLink) {
    await Share.share({ message: link.token });
  }

  async function handleRevoke(linkId: string) {
    await revokeInviteLink(organizationId, linkId);
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

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
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
        }
      >
        <Text style={s.title}>{t('band_management.active_links')}</Text>

        {links.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>{t('common.no_results')}</Text>
          </View>
        ) : (
          links.map((link) => (
            <View key={link.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.roleChip, { borderColor: ROLE_COLORS[link.role] }]}>
                  <Text style={[s.roleChipText, { color: ROLE_COLORS[link.role] }]}>{link.role}</Text>
                </View>
                <Text style={s.expiry}>
                  {new Date(link.expiresAt).toLocaleDateString()}
                </Text>
              </View>

              <Text style={s.tokenText} numberOfLines={2} selectable>
                {link.token}
              </Text>

              <View style={s.actions}>
                <Pressable
                  style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
                  onPress={() => handleShare(link)}
                >
                  <Text style={s.actionBtnText}>{t('band_management.copy_link')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.actionBtn, s.revokeBtn, pressed && s.revokeBtnPressed]}
                  onPress={() => handleRevoke(link.id)}
                >
                  <Text style={[s.actionBtnText, s.revokeBtnText]}>{t('band_management.revoke')}</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 26, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3, marginBottom: 16 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 15, color: theme.textSecondary },
    card: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    roleChip: { borderRadius: 6, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 3 },
    roleChipText: { fontSize: 10, fontWeight: '700' },
    expiry: { fontSize: 12, color: theme.textMuted },
    tokenText: { fontSize: 12, color: theme.textSecondary, fontFamily: 'monospace', marginBottom: 14 },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.borderDefault,
      paddingVertical: 9,
      alignItems: 'center',
    },
    actionBtnPressed: { backgroundColor: theme.surfaceRaised },
    actionBtnText: { fontSize: 13, fontWeight: '500', color: theme.textBody },
    revokeBtn: { borderColor: theme.actionDanger },
    revokeBtnPressed: { backgroundColor: theme.surfaceRaised },
    revokeBtnText: { color: theme.actionDanger },
  });
}
