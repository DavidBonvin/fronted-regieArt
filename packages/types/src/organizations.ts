export type MemberRole = 'owner' | 'admin' | 'manager' | 'musician' | 'crew';

export interface OrganizationMember {
  userId: string;
  role: MemberRole;
  joinedAt: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  members: OrganizationMember[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationCreateRequest {
  name: string;
  description?: string;
}

export interface InvitationCreateRequest {
  organizationId: string;
  role: MemberRole;
  expiresInHours?: number;
}

export interface Invitation {
  id: string;
  organizationId: string;
  organizationName: string;
  role: MemberRole;
  code: string;
  link: string;
  qrData: string;
  createdAt: string;
  expiresAt: string;
  usedByUserId?: string;
  usedAt?: string;
}

export interface InvitationAcceptRequest {
  code: string;
}
