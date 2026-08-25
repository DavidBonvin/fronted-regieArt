import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getOrganization, getInviteLinks, getMe, uploadFile, resolveImageUrls } from '@regieart/api';
import type { OrganizationDetail, OrganizationMember, InviteLink, MemberRole } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { RootStackParamList } from '../../../navigation';
import type { ThemeColors } from '@regieart/ui';

const orgLogoKey = (id: string) => `@regieart:orgLogo:${id}`;
const orgBannerKey = (id: string) => `@regieart:orgBanner:${id}`;

type Props = NativeStackScreenProps<RootStackParamList, 'OrganizationDetail'>;

type TabId = 'info' | 'members' | 'shows' | 'invites';

const ROLE_COLOR: Record<MemberRole, string> = {
  OWNER: '#F59E0B',
  ADMIN: '#4A827E',
  MEMBER: '#8C949B',
  EXTERNAL_TECH: '#565D63',
};

const ADMIN_ROLES: MemberRole[] = ['OWNER', 'ADMIN'];

export function OrganizationDetailScreen({ route, navigation }: Props) {
  const { organizationId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [isAdmin, setIsAdmin] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoPickerMode, setLogoPickerMode] = useState<null | 'main'>(null);
  const [bannerPickerMode, setBannerPickerMode] = useState<null | 'main'>(null);
  const [memberAvatarUrls, setMemberAvatarUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    async function load() {
      const [cachedLogo, cachedBanner] = await Promise.all([
        AsyncStorage.getItem(orgLogoKey(organizationId)).catch(() => null),
        AsyncStorage.getItem(orgBannerKey(organizationId)).catch(() => null),
      ]);
      if (cachedLogo) setLogoUrl(cachedLogo);
      if (cachedBanner) setBannerUrl(cachedBanner);

      try {
        const [data, me] = await Promise.all([
          getOrganization(organizationId),
          getMe().catch(() => null),
        ]);
        setOrg(data);
        if (me) {
          const myMember = data.members.find((m) => m.user.id === me.id);
          setIsAdmin(myMember ? ADMIN_ROLES.includes(myMember.role) : false);
        }
        const rawUrls = data.members.map((m) => m.user.avatarUrl);
        resolveImageUrls(rawUrls).then((resolved) => {
          const map: Record<string, string | null> = {};
          data.members.forEach((m, i) => { map[m.user.id] = resolved[i]; });
          setMemberAvatarUrls(map);
        }).catch(() => {});
        const links = await getInviteLinks(organizationId).catch(() => []);
        setInviteLinks(links.filter((l) => new Date(l.expiresAt) > new Date()));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [organizationId]);

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator color={theme.actionBrand} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!org) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><Text style={s.errorText}>{t('errors.not_found')}</Text></View>
      </SafeAreaView>
    );
  }

  const leaders = org.members.filter((m) => ADMIN_ROLES.includes(m.role));
  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: t('org_detail.tab_info') },
    { id: 'members', label: `${t('org_detail.tab_members')} (${org.members.length})` },
    { id: 'shows', label: t('org_detail.tab_shows') },
    { id: 'invites', label: t('org_detail.tab_invites') },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topNav}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backArrow}>←</Text>
        </Pressable>
        <View style={s.topNavActions}>
          <Text style={s.topNavAction}>↑</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable
          style={s.banner}
          onPress={() => isAdmin && setBannerPickerMode('main')}
          accessibilityRole={isAdmin ? 'button' : undefined}
        >
          {bannerUrl
            ? <Image source={{ uri: bannerUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            : <View style={s.bannerPlaceholder} />
          }
          <View style={s.bannerGradientOverlay} />
          <View style={s.logoOverlay}>
            <Pressable
              style={s.logoBox}
              onPress={() => isAdmin && setLogoPickerMode('main')}
              accessibilityRole={isAdmin ? 'button' : undefined}
            >
              {logoUrl
                ? <Image source={{ uri: logoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                : <Text style={s.logoInitials}>
                    {org.name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')}
                  </Text>
              }
              {isAdmin && (
                <View style={s.logoEditBadge}>
                  <Text style={s.logoEditBadgeText}>✎</Text>
                </View>
              )}
            </Pressable>
            <View style={s.orgTitleBlock}>
              <Text style={s.orgName} numberOfLines={1}>{org.name}</Text>
              {org.description ? (
                <Text style={s.orgTagline} numberOfLines={1}>{org.description}</Text>
              ) : null}
            </View>
          </View>
          {isAdmin && (
            <View style={s.bannerEditHint}>
              <Text style={s.bannerEditHintText}>📷</Text>
            </View>
          )}
        </Pressable>

        <View style={s.metaRow}>
          {org.website ? <Text style={s.metaItem}>🌐 {org.website.replace(/^https?:\/\//, '')}</Text> : null}
          <Text style={s.metaItem}>
            👥 {t('org_detail.members_count', { count: org.members.length })}
          </Text>
        </View>

        {isAdmin && (
          <View style={s.actionRow}>
            <Pressable style={s.actionBtn} onPress={() => navigation.navigate('Members', { organizationId: org.id })}>
              <Text style={s.actionBtnLabel}>{t('org_detail.invite_musician')}</Text>
            </Pressable>
            <Pressable style={[s.actionBtn, s.actionBtnSecondary]}>
              <Text style={s.actionBtnSecondaryLabel}>{t('org_detail.edit_profile')} ✏</Text>
            </Pressable>
            <Pressable style={[s.actionBtn, s.actionBtnSecondary]}>
              <Text style={s.actionBtnSecondaryLabel}>{t('org_detail.settings')} ⚙</Text>
            </Pressable>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
          {tabs.map((tab) => (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={s.tab}>
              <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>{tab.label}</Text>
              {activeTab === tab.id && <View style={s.tabUnderline} />}
            </Pressable>
          ))}
        </ScrollView>
        <View style={s.tabDivider} />

        {activeTab === 'info' && (
          <View style={s.tabContent}>
            {org.description ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>{t('org_detail.about_section')}</Text>
                <Text style={s.bodyText}>{org.description}</Text>
              </View>
            ) : null}

            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('org_detail.leaders_section')}</Text>
              {leaders.map((m) => <MemberRow key={m.id} member={m} avatarUrl={memberAvatarUrls[m.user.id] ?? null} s={s} />)}
            </View>
          </View>
        )}

        {activeTab === 'members' && (
          <View style={s.tabContent}>
            {org.members.map((m) => <MemberRow key={m.id} member={m} avatarUrl={memberAvatarUrls[m.user.id] ?? null} s={s} full />)}
          </View>
        )}

        {activeTab === 'shows' && (
          <View style={s.tabContent}>
            <Text style={s.emptyText}>{t('dashboard.no_events')}</Text>
          </View>
        )}

        {activeTab === 'invites' && isAdmin && (
          <View style={s.tabContent}>
            {inviteLinks.length === 0
              ? <Text style={s.emptyText}>{t('common.no_results')}</Text>
              : inviteLinks.map((link) => {
                  const days = Math.max(0, Math.round((new Date(link.expiresAt).getTime() - Date.now()) / 86400000));
                  return (
                    <View key={link.id} style={s.inviteCard}>
                      <View style={s.inviteInfo}>
                        <Text style={s.inviteToken} numberOfLines={1}>🔗 /join/{link.token.slice(0, 12)}...</Text>
                        <Text style={s.inviteMeta}>
                          {t('org_detail.role_expiry', { role: link.role, days })}
                        </Text>
                      </View>
                      <View style={[s.roleBadge, { backgroundColor: ROLE_COLOR[link.role] }]}>
                        <Text style={s.roleBadgeText}>{link.role}</Text>
                      </View>
                    </View>
                  );
                })
            }
          </View>
        )}
      </ScrollView>

      {logoPickerMode === 'main' && (
        <OrgImagePickerModal
          theme={theme} t={t}
          title="Cambiar Logo de la Organización"
          aspect={[1, 1] as [number, number]}
          assetLabel="org-logo"
          orgId={organizationId}
          assetType="org-banner"
          onUploaded={async (dataUri) => {
            await AsyncStorage.setItem(orgLogoKey(organizationId), dataUri).catch(() => {});
            setLogoUrl(dataUri);
            setLogoPickerMode(null);
          }}
          onClose={() => setLogoPickerMode(null)}
        />
      )}
      {bannerPickerMode === 'main' && (
        <OrgImagePickerModal
          theme={theme} t={t}
          title="Cambiar Banner de la Organización"
          aspect={[16, 5] as [number, number]}
          assetLabel="org-banner"
          orgId={organizationId}
          assetType="org-banner"
          onUploaded={async (dataUri) => {
            await AsyncStorage.setItem(orgBannerKey(organizationId), dataUri).catch(() => {});
            setBannerUrl(dataUri);
            setBannerPickerMode(null);
          }}
          onClose={() => setBannerPickerMode(null)}
        />
      )}
    </SafeAreaView>
  );
}

function OrgImagePickerModal({ theme, t, title, aspect, assetLabel, orgId, assetType, onUploaded, onClose }: {
  theme: ThemeColors;
  t: ReturnType<typeof import('react-i18next').useTranslation>['t'];
  title: string;
  aspect: [number, number];
  assetLabel: string;
  orgId: string;
  assetType: 'org-banner';
  onUploaded: (dataUri: string) => Promise<void>;
  onClose: () => void;
}) {
  const s = makeStyles(theme);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Permiso denegado'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const dataUri = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;

    setUploading(true);
    try {
      await uploadFile(asset.uri, assetType, mimeType, {
        orgId,
        displayName: `${assetLabel}-${Date.now()}.jpg`,
        originalName: `${assetLabel}-${Date.now()}.jpg`,
      });
      await onUploaded(dataUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
      setUploading(false);
    }
  }

  return (
    <Modal visible animationType="slide" transparent>
      <Pressable style={s.modalBg} onPress={onClose}>
        <Pressable
          style={[s.modalSheet, { paddingBottom: Platform.OS === 'ios' ? 40 : 24 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{title}</Text>

          {uploading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator color={theme.actionBrand} size="large" />
              <Text style={[s.modalFieldLabel, { marginTop: 12, textAlign: 'center' }]}>Subiendo imagen…</Text>
            </View>
          ) : (
            <Pressable style={s.pickerOption} onPress={pick}>
              <Text style={s.pickerIcon}>🖼️</Text>
              <View style={s.pickerInfo}>
                <Text style={s.pickerTitle}>Seleccionar del Dispositivo</Text>
                <Text style={s.pickerSub}>
                  {aspect[0] === 1 ? 'Imagen cuadrada (logo)' : 'Imagen horizontal (16:5)'}
                </Text>
              </View>
            </Pressable>
          )}

          {error && (
            <Text style={[s.modalFieldLabel, { color: '#E05252', textAlign: 'center', marginTop: 8 }]}>{error}</Text>
          )}
          <Pressable onPress={onClose} style={s.modalCancelBtn}>
            <Text style={s.modalCancelLabel}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MemberRow({ member, avatarUrl, s, full }: { member: OrganizationMember; avatarUrl: string | null; s: ReturnType<typeof makeStyles>; full?: boolean }) {
  const initials = member.user.displayName
    .split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

  return (
    <View style={s.memberRow}>
      {avatarUrl
        ? <Image source={{ uri: avatarUrl }} style={s.memberAvatar} />
        : (
          <View style={[s.memberAvatar, s.memberAvatarFallback]}>
            <Text style={s.memberAvatarText}>{initials}</Text>
          </View>
        )
      }
      <View style={s.memberInfo}>
        <Text style={s.memberName}>{member.user.displayName}</Text>
        {full && member.user.email ? (
          <Text style={s.memberEmail} numberOfLines={1}>{member.user.email}</Text>
        ) : null}
      </View>
      <View style={[s.roleBadge, { backgroundColor: ROLE_COLOR[member.role] }]}>
        <Text style={s.roleBadgeText}>{member.role}</Text>
      </View>
    </View>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: 14, color: theme.actionDanger, textAlign: 'center' },

    topNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    backBtn: { padding: 8 },
    backArrow: { fontSize: 22, color: theme.textHeading },
    topNavActions: { flexDirection: 'row', gap: 12 },
    topNavAction: { fontSize: 20, color: theme.textSecondary, padding: 8 },

    banner: { position: 'relative', height: 160, marginBottom: 0, overflow: 'hidden' },
    bannerPlaceholder: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.actionBrand,
      opacity: 0.28,
    },
    bannerGradientOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    bannerEditHint: {
      position: 'absolute', bottom: 8, right: 10,
      backgroundColor: 'rgba(0,0,0,0.42)',
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    bannerEditHintText: { fontSize: 16, color: '#fff' },
    logoOverlay: {
      position: 'absolute',
      bottom: 12,
      left: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoBox: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.surfaceApp,
      overflow: 'hidden',
      position: 'relative',
    },
    logoEditBadge: {
      position: 'absolute', bottom: 0, right: 0,
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center', justifyContent: 'center',
    },
    logoEditBadgeText: { fontSize: 9, color: '#fff' },
    logoInitials: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
    orgTitleBlock: { flex: 1 },
    orgName: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    orgTagline: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSubtle,
    },
    metaItem: { fontSize: 13, color: theme.textSecondary },

    actionRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSubtle,
    },
    actionBtn: {
      flex: 1,
      backgroundColor: theme.actionBrand,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    actionBtnLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
    actionBtnSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    actionBtnSecondaryLabel: { fontSize: 13, color: theme.textSecondary },

    tabBar: { flexGrow: 0 },
    tabBarContent: { paddingHorizontal: 16 },
    tab: { paddingHorizontal: 4, paddingVertical: 14, marginRight: 20, position: 'relative' },
    tabLabel: { fontSize: 14, color: theme.textMuted, fontWeight: '500' },
    tabLabelActive: { color: theme.actionBrand, fontWeight: '700' },
    tabUnderline: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: theme.actionBrand,
      borderRadius: 2,
    },
    tabDivider: { height: 1, backgroundColor: theme.borderSubtle, marginBottom: 8 },

    tabContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
    section: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    bodyText: { fontSize: 14, color: theme.textBody, lineHeight: 21 },
    emptyText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', marginTop: 32 },

    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSubtle,
      gap: 12,
    },
    memberAvatar: { width: 42, height: 42, borderRadius: 21 },
    memberAvatarFallback: {
      backgroundColor: `${theme.actionBrand}40`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberAvatarText: { fontSize: 15, fontWeight: '700', color: theme.actionBrand },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 14, fontWeight: '600', color: theme.textHeading },
    memberEmail: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

    roleBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    roleBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

    inviteCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      padding: 14,
      marginBottom: 10,
      gap: 12,
    },
    inviteInfo: { flex: 1 },
    inviteToken: { fontSize: 13, color: theme.textBody, fontFamily: 'monospace' },
    inviteMeta: { fontSize: 11, color: theme.textMuted, marginTop: 3 },

    modalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet: {
      backgroundColor: theme.surfaceCard, borderTopLeftRadius: 22, borderTopRightRadius: 22,
      padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '75%',
    },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderSubtle, alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.textHeading, marginBottom: 20 },
    modalFieldLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
    modalCancelBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 8 },
    modalCancelLabel: { fontSize: 14, color: theme.textSecondary },
    pickerOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
    pickerIcon: { fontSize: 28, width: 36, textAlign: 'center' },
    pickerInfo: { flex: 1 },
    pickerTitle: { fontSize: 15, fontWeight: '600', color: theme.textHeading },
    pickerSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  });
}
