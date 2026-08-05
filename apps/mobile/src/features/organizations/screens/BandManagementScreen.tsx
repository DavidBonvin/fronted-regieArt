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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  getMyOrganizations,
  getOrganizationMembers,
  getInviteLinks,
  createInviteLink,
  revokeInviteLink,
} from '@regieart/api';
import type { OrganizationMember, InviteLink, MemberRole } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ROLE_COLORS: Record<MemberRole, string> = {
  OWNER: '#F59E0B',
  ADMIN: '#649D98',
  MEMBER: '#8C949B',
  EXTERNAL_TECH: '#565D63',
};

export function BandManagementScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const id = orgId ?? (await getMyOrganizations().then((orgs) => orgs[0]?.id));
    if (!id) return;
    if (!orgId) setOrgId(id);
    const [mems, links] = await Promise.all([
      getOrganizationMembers(id),
      getInviteLinks(id),
    ]);
    setMembers(mems);
    setInviteLinks(links.filter((l) => new Date(l.expiresAt) > new Date()));
  }, [orgId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleGenerateLink(role: MemberRole) {
    if (!orgId) return;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const link = await createInviteLink(orgId, { role, expiresAt } as any);
    setInviteLinks((prev) => [link, ...prev]);
  }

  async function handleShareLink(link: InviteLink) {
    await Share.share({ message: link.token });
  }

  async function handleRevoke(linkId: string) {
    if (!orgId) return;
    await revokeInviteLink(orgId, linkId);
    setInviteLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  function renderMember({ item }: { item: OrganizationMember }) {
    const initials = item.user.displayName
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');

    return (
      <Pressable
        style={({ pressed }) => [s.memberRow, pressed && s.memberRowPressed]}
        onPress={() => navigation.navigate('MusicianProfile', { userId: item.user.id })}
      >
        <View style={s.memberAvatar}>
          <Text style={s.memberAvatarText}>{initials}</Text>
        </View>
        <View style={s.memberInfo}>
          <Text style={s.memberName} numberOfLines={1}>{item.user.displayName}</Text>
          <Text style={s.memberSince} numberOfLines={1}>
            {new Date(item.joinedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={[s.roleChip, { borderColor: ROLE_COLORS[item.role] }]}>
          <Text style={[s.roleChipText, { color: ROLE_COLORS[item.role] }]}>{item.role}</Text>
        </View>
      </Pressable>
    );
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
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('band_management.invite_section')}</Text>
          <View style={s.inviteButtons}>
            {(['MEMBER', 'ADMIN', 'EXTERNAL_TECH'] as MemberRole[]).map((role) => (
              <Pressable
                key={role}
                style={({ pressed }) => [s.inviteBtn, pressed && s.inviteBtnPressed]}
                onPress={() => handleGenerateLink(role)}
              >
                <Text style={s.inviteBtnText}>+ {role}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {inviteLinks.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>{t('band_management.active_links')}</Text>
            {inviteLinks.map((link) => (
              <View key={link.id} style={s.linkRow}>
                <View style={s.linkInfo}>
                  <View style={[s.roleChip, { borderColor: ROLE_COLORS[link.role] }]}>
                    <Text style={[s.roleChipText, { color: ROLE_COLORS[link.role] }]}>{link.role}</Text>
                  </View>
                  <Text style={s.linkExpiry}>
                    Expires {new Date(link.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={s.linkActions}>
                  <Pressable style={s.linkBtn} onPress={() => handleShareLink(link)}>
                    <Text style={s.linkBtnText}>{t('band_management.copy_link')}</Text>
                  </Pressable>
                  <Pressable style={[s.linkBtn, s.linkBtnRevoke]} onPress={() => handleRevoke(link.id)}>
                    <Text style={[s.linkBtnText, s.linkBtnRevokeText]}>{t('band_management.revoke')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionLabel}>
            {t('band_management.members_title', { count: members.length })}
          </Text>
          {members.map((m) => (
            <View key={m.id}>
              {renderMember({ item: m })}
              <View style={s.memberSeparator} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 24 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: theme.textSecondary,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    inviteButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    inviteBtn: {
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.actionBrand,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    inviteBtnPressed: { backgroundColor: theme.surfaceRaised },
    inviteBtnText: { fontSize: 13, fontWeight: '600', color: theme.actionBrand },
    linkRow: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    linkInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    linkExpiry: { fontSize: 12, color: theme.textMuted },
    linkActions: { flexDirection: 'row', gap: 8 },
    linkBtn: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.borderDefault,
      paddingVertical: 8,
      alignItems: 'center',
    },
    linkBtnRevoke: { borderColor: theme.actionDanger },
    linkBtnText: { fontSize: 13, fontWeight: '500', color: theme.textBody },
    linkBtnRevokeText: { color: theme.actionDanger },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      minHeight: 66,
    },
    memberRowPressed: { backgroundColor: theme.surfaceRaised },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    memberAvatarText: { fontSize: 13, fontWeight: '700', color: theme.actionBrand },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '600', color: theme.textHeading, marginBottom: 2 },
    memberSince: { fontSize: 12, color: theme.textMuted },
    memberSeparator: { height: 6 },
    roleChip: { borderRadius: 6, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 3 },
    roleChipText: { fontSize: 10, fontWeight: '700' },
  });
}

