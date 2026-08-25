import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getOrganizationMembers,
  listEmailInvitations,
  removeMember,
  revokeEmailInvitation,
  resendEmailInvitation,
  getOrganization,
} from '@regieart/api';
import type { OrganizationMember, EmailInvitation, MemberRole, InvitationStatus } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';
import { InviteMemberBottomSheet } from '../components/InviteMemberBottomSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'Members'>;

type ActiveTab = 'members' | 'invitations';

const ROLE_COLORS: Record<MemberRole, string> = {
  OWNER: '#F59E0B',
  ADMIN: '#649D98',
  MEMBER: '#8C949B',
  EXTERNAL_TECH: '#565D63',
};

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Admin',
  MEMBER: 'Miembro',
  EXTERNAL_TECH: 'Téc. Ext.',
};

const STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Expirada',
};

const STATUS_COLORS: Record<InvitationStatus, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: '#4A827E',
  REJECTED: '#E74C4C',
  EXPIRED: '#565D63',
};

export function MembersScreen({ route, navigation }: Props) {
  const { organizationId, openInvite } = route.params;
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [orgName, setOrgName] = useState('');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<EmailInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('members');
  const [showInviteSheet, setShowInviteSheet] = useState(false);

  const loadData = useCallback(async () => {
    const [org, mems, invs] = await Promise.all([
      getOrganization(organizationId),
      getOrganizationMembers(organizationId),
      listEmailInvitations(organizationId),
    ]);
    setOrgName(org.name);
    setMembers(mems);
    setInvitations(invs);
  }, [organizationId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  useEffect(() => {
    if (openInvite) setShowInviteSheet(true);
  }, [openInvite]);

  useEffect(() => {
    navigation.setOptions({
      title: orgName ? `Equipo — ${orgName}` : 'Equipo',
      headerRight: () => (
        <Pressable onPress={() => setShowInviteSheet(true)} style={{ marginRight: 4 }}>
          <Text style={{ color: theme.actionBrand, fontWeight: '600', fontSize: 15 }}>+ Invitar</Text>
        </Pressable>
      ),
    });
  }, [orgName, theme, navigation]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function confirmKickMember(member: OrganizationMember) {
    Alert.alert(
      'Expulsar miembro',
      `¿Expulsar a ${member.user.displayName} del equipo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Expulsar',
          style: 'destructive',
          onPress: () => kickMember(member.user.id),
        },
      ],
    );
  }

  async function kickMember(userId: string) {
    await removeMember(organizationId, userId);
    setMembers((prev) => prev.filter((m) => m.user.id !== userId));
  }

  function confirmRevokeInvitation(inv: EmailInvitation) {
    Alert.alert(
      'Revocar invitación',
      `¿Revocar la invitación enviada a ${inv.targetEmail}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: () => revokeInvitation(inv.id),
        },
      ],
    );
  }

  async function revokeInvitation(invitationId: string) {
    await revokeEmailInvitation(organizationId, invitationId);
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
  }

  async function handleResend(inv: EmailInvitation) {
    await resendEmailInvitation(organizationId, inv.id);
    Alert.alert('Enviado', 'El correo fue reenviado correctamente.');
  }

  async function handleShareLink(inv: EmailInvitation) {
    if (!inv.inviteUrl) return;
    await Share.share({ message: inv.inviteUrl });
  }

  function handleInviteSent(inv: EmailInvitation) {
    setInvitations((prev) => [inv, ...prev]);
    setShowInviteSheet(false);
    setActiveTab('invitations');
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
    <SafeAreaView style={s.root} edges={['bottom']}>
      <View style={s.segmentedBar}>
        <Pressable
          style={[s.segButton, activeTab === 'members' && s.segButtonActive]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[s.segButtonLabel, activeTab === 'members' && s.segButtonLabelActive]}>
            Miembros ({members.length})
          </Text>
        </Pressable>
        <Pressable
          style={[s.segButton, activeTab === 'invitations' && s.segButtonActive]}
          onPress={() => setActiveTab('invitations')}
        >
          <Text style={[s.segButtonLabel, activeTab === 'invitations' && s.segButtonLabelActive]}>
            Invitaciones ({invitations.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
        }
      >
        {activeTab === 'members' &&
          (members.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>Sin miembros en el equipo</Text>
            </View>
          ) : (
            members.map((member) => (
              <MemberCard
                key={member.user.id}
                member={member}
                onKick={confirmKickMember}
                theme={theme}
              />
            ))
          ))}

        {activeTab === 'invitations' &&
          (invitations.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>Sin invitaciones enviadas</Text>
            </View>
          ) : (
            invitations.map((inv) => (
              <InvitationCard
                key={inv.id}
                invitation={inv}
                onRevoke={confirmRevokeInvitation}
                onResend={handleResend}
                onShareLink={handleShareLink}
                theme={theme}
              />
            ))
          ))}
      </ScrollView>

      {showInviteSheet && (
        <InviteMemberBottomSheet
          orgId={organizationId}
          onClose={() => setShowInviteSheet(false)}
          onSuccess={handleInviteSent}
        />
      )}
    </SafeAreaView>
  );
}

type MemberCardProps = {
  member: OrganizationMember;
  onKick: (member: OrganizationMember) => void;
  theme: ThemeColors;
};

function MemberCard({ member, onKick, theme }: MemberCardProps) {
  const s = makeStyles(theme);
  const isOwner = member.role === 'OWNER';

  return (
    <View style={s.card}>
      <View style={s.avatarCircle}>
        <Text style={s.avatarInitial}>
          {member.user.displayName?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={s.cardBody}>
        <Text style={s.memberName} numberOfLines={1}>{member.user.displayName}</Text>
        {member.user.email && (
          <Text style={s.memberEmail} numberOfLines={1}>{member.user.email}</Text>
        )}
      </View>
      <View style={s.cardEnd}>
        <View style={[s.roleChip, { backgroundColor: ROLE_COLORS[member.role] + '22' }]}>
          <Text style={[s.roleChipLabel, { color: ROLE_COLORS[member.role] }]}>
            {ROLE_LABELS[member.role]}
          </Text>
        </View>
        {!isOwner && (
          <Pressable style={s.kickButton} onPress={() => onKick(member)}>
            <Text style={s.kickButtonLabel}>Expulsar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

type InvitationCardProps = {
  invitation: EmailInvitation;
  onRevoke: (inv: EmailInvitation) => void;
  onResend: (inv: EmailInvitation) => void;
  onShareLink: (inv: EmailInvitation) => void;
  theme: ThemeColors;
};

function InvitationCard({ invitation, onRevoke, onResend, onShareLink, theme }: InvitationCardProps) {
  const s = makeStyles(theme);
  const isPending = invitation.status === 'PENDING';
  const isExpired = invitation.status === 'EXPIRED';
  const expiresDate = new Date(invitation.expiresAt).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={s.card}>
      <View style={s.cardBody}>
        <View style={s.invitationHeader}>
          <Text style={s.memberEmail} numberOfLines={1}>{invitation.targetEmail}</Text>
          <View style={[s.statusChip, { backgroundColor: STATUS_COLORS[invitation.status] + '22' }]}>
            <Text style={[s.statusChipLabel, { color: STATUS_COLORS[invitation.status] }]}>
              {STATUS_LABELS[invitation.status]}
            </Text>
          </View>
        </View>
        <View style={s.invitationMeta}>
          <View style={[s.roleChip, { backgroundColor: ROLE_COLORS[invitation.role] + '22' }]}>
            <Text style={[s.roleChipLabel, { color: ROLE_COLORS[invitation.role] }]}>
              {ROLE_LABELS[invitation.role]}
            </Text>
          </View>
          {invitation.instrument && (
            <Text style={s.memberMeta}>{invitation.instrument}</Text>
          )}
        </View>
        <Text style={s.expiresLabel}>
          {isExpired ? `Expiró ${expiresDate}` : `Expira ${expiresDate}`}
        </Text>
        <View style={s.invitationActions}>
          {isPending && invitation.inviteUrl && (
            <Pressable style={s.actionChip} onPress={() => onShareLink(invitation)}>
              <Text style={s.actionChipLabel}>Compartir link</Text>
            </Pressable>
          )}
          <Pressable style={s.actionChip} onPress={() => onResend(invitation)}>
            <Text style={s.actionChipLabel}>Reenviar</Text>
          </Pressable>
          {isPending && (
            <Pressable style={[s.actionChip, s.actionChipDanger]} onPress={() => onRevoke(invitation)}>
              <Text style={[s.actionChipLabel, s.actionChipLabelDanger]}>Revocar</Text>
            </Pressable>
          )}
          {isExpired && (
            <Pressable style={[s.actionChip, s.actionChipDanger]} onPress={() => onRevoke(invitation)}>
              <Text style={[s.actionChipLabel, s.actionChipLabelDanger]}>Eliminar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    segmentedBar: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginVertical: 12,
      backgroundColor: theme.surfaceRaised,
      borderRadius: 10,
      padding: 3,
    },
    segButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    segButtonActive: {
      backgroundColor: theme.surfaceCard,
    },
    segButtonLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    segButtonLabelActive: {
      color: theme.textHeading,
      fontWeight: '600',
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    card: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
    },
    avatarCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textHeading,
    },
    cardBody: {
      flex: 1,
      gap: 4,
    },
    cardEnd: {
      alignItems: 'flex-end',
      gap: 8,
    },
    memberName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textHeading,
    },
    memberEmail: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    memberMeta: {
      fontSize: 12,
      color: theme.textMuted,
    },
    roleChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    roleChipLabel: {
      fontSize: 11,
      fontWeight: '700',
    },
    kickButton: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: theme.borderDanger,
    },
    kickButtonLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.actionDanger,
    },
    invitationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    invitationMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusChipLabel: {
      fontSize: 11,
      fontWeight: '700',
    },
    expiresLabel: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 2,
    },
    invitationActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    actionChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: theme.surfaceRaised,
    },
    actionChipDanger: {
      backgroundColor: theme.statusErrorSurface,
    },
    actionChipLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textBody,
    },
    actionChipLabelDanger: {
      color: theme.actionDanger,
    },
  });
}
