import type { MemberRole } from './organizations';

export type ExpertiseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
export type SkillCategoryType = 'INSTRUMENT' | 'TECHNICAL' | 'MANAGEMENT';

export interface SkillCategory {
  id: string;
  name: string;
  type: SkillCategoryType;
  icon?: string;
}

export interface UserSkill {
  id: string;
  skillCategory: SkillCategory;
  expertiseLevel: ExpertiseLevel;
  yearsExp?: number;
}

export interface UserMembership {
  role: MemberRole;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface User {
  id: string;
  keycloakId: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  city?: string;
  country?: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  memberships: UserMembership[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio?: string;
  city?: string;
  country?: string;
  skills: UserSkill[];
  memberships: UserMembership[];
}

export interface UserProfileUrls {
  avatarUrl: string | null;
  bannerUrl: string | null;
}

export interface UpdateProfileDto {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  city?: string;
  country?: string;
}

export interface AddSkillDto {
  skillCategoryId: string;
  expertiseLevel: ExpertiseLevel;
  yearsExp?: number;
}

export interface UserSearchParams {
  skill?: string;
  city?: string;
  orgId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface TalentSearchResult {
  profiles: UserPublic[];
  total: number;
  page: number;
  pageSize: number;
}
