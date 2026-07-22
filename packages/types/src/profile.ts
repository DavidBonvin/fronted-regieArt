export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export interface Skill {
  id: string;
  name: string;
  level: SkillLevel;
}

export interface MusicianProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  instruments: string[];
  skills: Skill[];
  organizationIds: string[];
  city?: string;
  country?: string;
  isAvailable: boolean;
}

export interface MusicianProfileUpdateRequest {
  displayName?: string;
  bio?: string;
  instruments?: string[];
  skills?: Omit<Skill, 'id'>[];
  city?: string;
  country?: string;
  isAvailable?: boolean;
}

export interface TalentSearchFilters {
  instrument?: string;
  skillLevel?: SkillLevel;
  city?: string;
  country?: string;
  isAvailable?: boolean;
  organizationId?: string;
}

export interface TalentSearchResult {
  profiles: MusicianProfile[];
  total: number;
  page: number;
  pageSize: number;
}
