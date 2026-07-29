import type { Song, CreateSongDto, UpdateSongDto, SongListParams } from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import type { ApiRes } from '../client/types';

export async function createSong(dto: CreateSongDto): Promise<Song> {
  const res = await getHttpClient().post('songs', { json: dto }).json<ApiRes<Song>>();
  return res.data;
}

export async function listSongs(params: SongListParams): Promise<{
  songs: Song[];
  total: number;
  page: number;
  limit: number;
}> {
  const res = await getHttpClient()
    .get('songs', { searchParams: params as Record<string, string | number> })
    .json<ApiRes<{ songs: Song[]; total: number; page: number; limit: number }>>();
  return res.data;
}

export async function getSong(songId: string): Promise<Song> {
  const res = await getHttpClient().get(`songs/${songId}`).json<ApiRes<Song>>();
  return res.data;
}

export async function updateSong(songId: string, dto: UpdateSongDto): Promise<Song> {
  const res = await getHttpClient().patch(`songs/${songId}`, { json: dto }).json<ApiRes<Song>>();
  return res.data;
}

export async function deleteSong(songId: string): Promise<void> {
  await getHttpClient().delete(`songs/${songId}`);
}
