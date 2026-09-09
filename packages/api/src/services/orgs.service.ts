import type {
  Organization,
  OrganizationDetail,
  OrganizationMember,
  InviteLink,
  CreateOrganizationDto,
  CreateInviteLinkDto,
  MemberRole,
  EmailInvitation,
  InviteByEmailDto,
  InvitationPublic,
} from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import type { ApiRes } from '../client/types';

export async function createOrganization(dto: CreateOrganizationDto): Promise<Organization> {
  const res = await getHttpClient().post('organizations', { json: dto }).json<ApiRes<Organization>>();
  return res.data;
}

export async function getMyOrganizations(): Promise<Organization[]> {
  const res = await getHttpClient().get('organizations').json<ApiRes<Organization[]>>();
  return res.data;
}

export async function getOrganization(orgId: string): Promise<OrganizationDetail> {
  const res = await getHttpClient().get(`organizations/${orgId}`).json<ApiRes<OrganizationDetail>>();
  return res.data;
}

export async function updateOrganization(
  orgId: string,
  dto: Partial<CreateOrganizationDto>,
): Promise<Organization> {
  const res = await getHttpClient()
    .patch(`organizations/${orgId}`, { json: dto })
    .json<ApiRes<Organization>>();
  return res.data;
}

export async function deleteOrganization(orgId: string): Promise<void> {
  await getHttpClient().delete(`organizations/${orgId}`);
}

export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const res = await getHttpClient()
    .get(`organizations/${orgId}/members`)
    .json<ApiRes<OrganizationMember[]>>();
  return res.data;
}

export async function updateMemberRole(
  orgId: string,
  memberId: string,
  role: MemberRole,
): Promise<void> {
  await getHttpClient().patch(`organizations/${orgId}/members/${memberId}/role`, { json: { role } });
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  await getHttpClient().delete(`organizations/${orgId}/members/${userId}`);
}

export async function createInviteLink(
  orgId: string,
  dto: CreateInviteLinkDto,
): Promise<InviteLink> {
  const res = await getHttpClient()
    .post(`organizations/${orgId}/invite-links`, { json: dto })
    .json<ApiRes<InviteLink>>();
  return res.data;
}

export async function getInviteLinks(orgId: string): Promise<InviteLink[]> {
  const res = await getHttpClient()
    .get(`organizations/${orgId}/invite-links`)
    .json<ApiRes<InviteLink[]>>();
  return res.data;
}

export async function revokeInviteLink(orgId: string, linkId: string): Promise<void> {
  await getHttpClient().delete(`organizations/${orgId}/invite-links/${linkId}`);
}

export async function inviteByEmail(orgId: string, dto: InviteByEmailDto): Promise<EmailInvitation> {
  const res = await getHttpClient()
    .post(`organizations/${orgId}/invitations`, { json: dto })
    .json<ApiRes<EmailInvitation>>();
  return res.data;
}

export async function listEmailInvitations(orgId: string): Promise<EmailInvitation[]> {
  const res = await getHttpClient()
    .get(`organizations/${orgId}/invitations`)
    .json<ApiRes<EmailInvitation[]>>();
  return res.data;
}

export async function revokeEmailInvitation(orgId: string, invitationId: string): Promise<void> {
  await getHttpClient().delete(`organizations/${orgId}/invitations/${invitationId}`);
}

export async function resendEmailInvitation(orgId: string, invitationId: string): Promise<void> {
  await getHttpClient().post(`organizations/${orgId}/invitations/${invitationId}/resend`);
}

export async function getPublicInvitation(token: string): Promise<InvitationPublic> {
  const res = await getHttpClient()
    .get(`invitations/${token}`)
    .json<ApiRes<InvitationPublic>>();
  return res.data;
}

export async function getInvitationById(invitationId: string): Promise<InvitationPublic & { token: string }> {
  const res = await getHttpClient()
    .get(`invitations/by-id/${invitationId}`)
    .json<ApiRes<(InvitationPublic & { token?: string; inviteUrl?: string })>>();
  const data = res.data;
  const token = data.token ?? data.inviteUrl?.match(/\/invitations\/([^/?#]+)/)?.[1];
  if (!token || token === data.id || token === invitationId) {
    throw new Error('La invitación no devolvió un token válido.');
  }
  return { ...data, token };
}

export async function acceptInvitation(token: string): Promise<{ orgId: string }> {
  try {
    const res = await getHttpClient()
      .post(`invitations/${token}/accept`)
      .json<ApiRes<{
        orgId?: string;
        organizationId?: string;
        organization?: { id?: string };
        org?: { id?: string };
      }>>();
    const data = res.data;
    const orgId = data.orgId ?? data.organizationId ?? data.organization?.id ?? data.org?.id;
    if (!orgId) throw new Error('La invitación fue aceptada, pero la respuesta no contiene el id de la organización.');
    return { orgId };
  } catch (error) {
    const response = (error as { response?: Response }).response;
    if (response) {
      const body = await response.clone().json().catch(() => null) as {
        error?: { message?: string; details?: string[] };
      } | null;
      const message = body?.error?.message;
      const details = body?.error?.details?.join(' ');
      if (message || details) throw new Error([message, details].filter(Boolean).join(': '));
    }
    throw error;
  }
}

export async function rejectInvitation(token: string): Promise<void> {
  await getHttpClient().post(`invitations/${token}/reject`);
}

export async function joinOrganization(token: string): Promise<OrganizationMember> {
  const res = await getHttpClient()
    .post(`organizations/join/${token}`)
    .json<ApiRes<OrganizationMember>>();
  return res.data;
}
