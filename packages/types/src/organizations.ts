export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'EXTERNAL_TECH';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMemberUser {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl: string | null;
  phone?: string;
}

export interface OrganizationMember {
  id: string;
  role: MemberRole;
  joinedAt: string;
  updatedAt: string;
  user: OrganizationMemberUser;
}

export interface OrganizationDetail extends Organization {
  members: OrganizationMember[];
}

export interface InviteLink {
  id: string;
  token: string;
  role: MemberRole;
  expiresAt: string;
  createdAt: string;
}

export interface CreateOrganizationDto {
  name: string;
  description?: string;
  website?: string;
  phone?: string;
}

export interface CreateInviteLinkDto {
  role: MemberRole;
  expiresAt?: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface EmailInvitationInviter {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface EmailInvitation {
  id: string;
  token: string;
  targetEmail: string;
  role: MemberRole;
  instrument?: string | null;
  personalMessage?: string | null;
  status: InvitationStatus;
  expiresAt: string;
  respondedAt?: string | null;
  createdAt: string;
  inviteUrl?: string;
  createdBy?: EmailInvitationInviter;
  targetUser?: { id: string; displayName: string } | null;
}

export interface InvitationPublic {
  id: string;
  role: MemberRole;
  instrument?: string | null;
  personalMessage?: string | null;
  status: InvitationStatus;
  expiresAt: string;
  organization: { id: string; name: string; description?: string; logoUrl?: string | null };
  createdBy: { id: string; displayName: string; avatarUrl?: string | null };
}

export interface InviteByEmailDto {
  email: string;
  role: MemberRole;
  instrument?: string;
  personalMessage?: string;
}
