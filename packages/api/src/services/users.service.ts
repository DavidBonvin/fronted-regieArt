import type {
  User,
  UserPublic,
  UserSkill,
  UserProfileUrls,
  SkillCategory,
  UpdateProfileDto,
  AddSkillDto,
  UserSearchParams,
} from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import type { ApiRes } from '../client/types';

export async function getMe(): Promise<User> {
  const res = await getHttpClient().get('users/me').json<ApiRes<User>>();
  return res.data;
}

export async function updateMe(dto: UpdateProfileDto): Promise<User> {
  const res = await getHttpClient().patch('users/me', { json: dto }).json<ApiRes<User>>();
  return res.data;
}

export async function getMyProfileUrls(): Promise<UserProfileUrls> {
  const res = await getHttpClient().get('users/me/profile-urls').json<ApiRes<UserProfileUrls>>();
  return res.data;
}

export async function getMySkills(): Promise<UserSkill[]> {
  const res = await getHttpClient().get('users/me/skills').json<ApiRes<UserSkill[]>>();
  return res.data;
}

export async function addSkill(dto: AddSkillDto): Promise<UserSkill> {
  const res = await getHttpClient().post('users/me/skills', { json: dto }).json<ApiRes<UserSkill>>();
  return res.data;
}

export async function removeSkill(skillId: string): Promise<void> {
  await getHttpClient().delete(`users/me/skills/${skillId}`);
}

export async function getUserById(userId: string): Promise<UserPublic> {
  const res = await getHttpClient().get(`users/${userId}`).json<ApiRes<UserPublic>>();
  return res.data;
}

export async function getUserSkills(userId: string): Promise<UserSkill[]> {
  const res = await getHttpClient().get(`users/${userId}/skills`).json<ApiRes<UserSkill[]>>();
  return res.data;
}

export async function getUserProfileUrls(userId: string): Promise<UserProfileUrls> {
  const res = await getHttpClient().get(`users/${userId}/profile-urls`).json<ApiRes<UserProfileUrls>>();
  return res.data;
}

export async function searchUsers(params: UserSearchParams): Promise<{
  users: UserPublic[];
  total: number;
  page: number;
  limit: number;
}> {
  const res = await getHttpClient()
    .get('users/search', { searchParams: params as Record<string, string | number> })
    .json<ApiRes<{ users: UserPublic[]; total: number; page: number; limit: number }>>();
  return res.data;
}

export async function listSkillCategories(): Promise<SkillCategory[]> {
  const res = await getHttpClient().get('skill-categories').json<ApiRes<SkillCategory[]>>();
  return res.data;
}
