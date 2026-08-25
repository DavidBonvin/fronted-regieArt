import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getPublicInvitation, acceptInvitation, rejectInvitation, getMe } from '@regieart/api';
import type { InvitationPublic, MemberRole } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import { getStoredTokens } from '../../../shared/api/client';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'InvitationResponse'>;

type ScreenState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'expired'; invitation: InvitationPublic }
  | { phase: 'consumed'; invitation: InvitationPublic }
  | { phase: 'unauthenticated'; invitation: InvitationPublic }
  | { phase: 'ready'; invitation: InvitationPublic }
  | { phase: 'accepted'; orgId: string }
  | { phase: 'rejected' };

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MEMBER: 'Miembro',
  EXTERNAL_TECH: 'Técnico Externo',
};

const ROLE_COLORS: Record<MemberRole, string> = {
  OWNER: '#F59E0B',
  ADMIN: '#649D98',
  MEMBER: '#8C949B',
  EXTERNAL_TECH: '#565D63',
};

export function InvitationResponseScreen({ route, navigation }: Props) {
  const { token } = route.params;
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [state, setState] = useState<ScreenState>({ phase: 'loading' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: 'Invitación' });
    loadInvitation();
  }, [token]);

  async function loadInvitation() {
    setState({ phase: 'loading' });
    try {
      const invitation = await getPublicInvitation(token);

      if (invitation.status === 'EXPIRED') {
        setState({ phase: 'expired', invitation });
        return;
      }
      if (invitation.status === 'ACCEPTED' || invitation.status === 'REJECTED') {
        setState({ phase: 'consumed', invitation });
        return;
      }

      const tokens = await getStoredTokens();
      if (!tokens?.accessToken) {
        setState({ phase: 'unauthenticated', invitation });
        return;
      }

      setState({ phase: 'ready', invitation });
    } catch {
      setState({ phase: 'error', message: 'No se encontró la invitación o ya no es válida.' });
    }
  }

  async function handleAccept() {
    if (state.phase !== 'ready') return;
    setActionLoading(true);
    try {
      const result = await acceptInvitation(token);
      setState({ phase: 'accepted', orgId: result.orgId });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (state.phase !== 'ready') return;
    setActionLoading(true);
    try {
      await rejectInvitation(token);
      setState({ phase: 'rejected' });
    } finally {
      setActionLoading(false);
    }
  }

  function handleNavigateToOrg(orgId: string) {
    navigation.replace('OrganizationDetail', { organizationId: orgId });
  }

  if (state.phase === 'loading') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (state.phase === 'error') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.stateIcon}>✕</Text>
          <Text style={s.stateTitle}>Invitación no válida</Text>
          <Text style={s.stateBody}>{state.message}</Text>
          <Pressable style={s.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={s.primaryButtonLabel}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (state.phase === 'accepted') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.stateIcon}>✓</Text>
          <Text style={s.stateTitle}>¡Bienvenido al equipo!</Text>
          <Text style={s.stateBody}>Has aceptado la invitación con éxito.</Text>
          <Pressable style={s.primaryButton} onPress={() => handleNavigateToOrg(state.orgId)}>
            <Text style={s.primaryButtonLabel}>Ir al equipo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (state.phase === 'rejected') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.stateIcon}>✗</Text>
          <Text style={s.stateTitle}>Invitación rechazada</Text>
          <Text style={s.stateBody}>Has rechazado la invitación.</Text>
          <Pressable style={s.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={s.primaryButtonLabel}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const invitation = state.invitation;

  if (state.phase === 'expired') {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.content}>
          <InvitationDetails invitation={invitation} theme={theme} />
          <View style={s.warningBanner}>
            <Text style={s.warningIcon}>⏱</Text>
            <Text style={s.warningText}>
              Esta invitación expiró el{' '}
              {new Date(invitation.expiresAt).toLocaleDateString('es', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (state.phase === 'consumed') {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.content}>
          <InvitationDetails invitation={invitation} theme={theme} />
          <View style={s.warningBanner}>
            <Text style={s.warningIcon}>ℹ</Text>
            <Text style={s.warningText}>
              Esta invitación ya fue {invitation.status === 'ACCEPTED' ? 'aceptada' : 'rechazada'}.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (state.phase === 'unauthenticated') {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.content}>
          <InvitationDetails invitation={invitation} theme={theme} />
          <View style={s.warningBanner}>
            <Text style={s.warningIcon}>⚠</Text>
            <Text style={s.warningText}>
              Debes iniciar sesión con la cuenta correcta para aceptar esta invitación.
            </Text>
          </View>
          <View style={s.actionRow}>
            <Pressable
              style={s.primaryButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={s.primaryButtonLabel}>Iniciar Sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <InvitationDetails invitation={invitation} theme={theme} />
        <View style={s.actionRow}>
          <Pressable
            style={[s.secondaryButton, actionLoading && s.buttonDisabled]}
            onPress={handleReject}
            disabled={actionLoading}
          >
            <Text style={s.secondaryButtonLabel}>Rechazar</Text>
          </Pressable>
          <Pressable
            style={[s.primaryButton, s.primaryButtonFlex, actionLoading && s.buttonDisabled]}
            onPress={handleAccept}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color={theme.textOnAction} size="small" />
            ) : (
              <Text style={s.primaryButtonLabel}>Aceptar e Ingresar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type InvitationDetailsProps = {
  invitation: InvitationPublic;
  theme: ThemeColors;
};

function InvitationDetails({ invitation, theme }: InvitationDetailsProps) {
  const s = makeStyles(theme);

  return (
    <>
      <View style={s.orgSection}>
        <View style={s.orgLogoCircle}>
          <Text style={s.orgLogoInitials}>
            {invitation.organization.name
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? '')
              .join('')}
          </Text>
        </View>
        <Text style={s.orgName}>{invitation.organization.name}</Text>
        {invitation.organization.description && (
          <Text style={s.orgDescription}>{invitation.organization.description}</Text>
        )}
      </View>

      <View style={s.inviterSection}>
        <Text style={s.inviterLabel}>Invitado por</Text>
        <Text style={s.inviterName}>{invitation.createdBy.displayName}</Text>
      </View>

      <View style={s.detailsCard}>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Rol</Text>
          <View style={[s.roleChip, { backgroundColor: ROLE_COLORS[invitation.role] + '22' }]}>
            <Text style={[s.roleChipLabel, { color: ROLE_COLORS[invitation.role] }]}>
              {ROLE_LABELS[invitation.role]}
            </Text>
          </View>
        </View>
        {invitation.instrument && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Instrumento</Text>
            <Text style={s.detailValue}>{invitation.instrument}</Text>
          </View>
        )}
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Expira</Text>
          <Text style={s.detailValue}>
            {new Date(invitation.expiresAt).toLocaleDateString('es', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>

      {invitation.personalMessage && (
        <View style={s.messageCard}>
          <Text style={s.messageLabel}>Mensaje personal</Text>
          <Text style={s.messageText}>{invitation.personalMessage}</Text>
        </View>
      )}
    </>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    content: { padding: 20, gap: 16, paddingBottom: 40 },
    stateIcon: { fontSize: 48, color: theme.actionBrand },
    stateTitle: { fontSize: 22, fontWeight: '700', color: theme.textHeading, textAlign: 'center' },
    stateBody: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', lineHeight: 22 },
    orgSection: { alignItems: 'center', gap: 8, paddingVertical: 16 },
    orgLogoCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.borderDefault,
    },
    orgLogoInitials: { fontSize: 28, fontWeight: '700', color: theme.textHeading },
    orgName: { fontSize: 24, fontWeight: '700', color: theme.textHeading, textAlign: 'center' },
    orgDescription: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 },
    inviterSection: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      gap: 2,
    },
    inviterLabel: { fontSize: 12, color: theme.textMuted },
    inviterName: { fontSize: 16, fontWeight: '600', color: theme.textHeading },
    detailsCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { fontSize: 13, color: theme.textSecondary },
    detailValue: { fontSize: 14, fontWeight: '500', color: theme.textHeading },
    roleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    roleChipLabel: { fontSize: 12, fontWeight: '700' },
    messageCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 14,
      gap: 6,
      borderLeftWidth: 3,
      borderLeftColor: theme.actionBrand,
    },
    messageLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    messageText: { fontSize: 15, color: theme.textBody, lineHeight: 22 },
    warningBanner: {
      backgroundColor: theme.statusPendingSurface,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    warningIcon: { fontSize: 18 },
    warningText: { flex: 1, fontSize: 14, color: theme.statusPending, lineHeight: 20 },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    primaryButton: {
      backgroundColor: theme.actionBrand,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonFlex: { flex: 1 },
    primaryButtonLabel: { fontSize: 16, fontWeight: '700', color: theme.textOnAction },
    secondaryButton: {
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.borderDefault,
    },
    secondaryButtonLabel: { fontSize: 15, fontWeight: '600', color: theme.textSecondary },
    buttonDisabled: { opacity: 0.6 },
  });
}
