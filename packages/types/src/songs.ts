export interface Song {
  id: string;
  orgId: string;
  title: string;
  composer?: string;
  arranger?: string;
  genre?: string;
  musicalKey?: string;
  tempo?: number;
  durationSeconds?: number;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSongDto {
  orgId: string;
  title: string;
  composer?: string;
  arranger?: string;
  genre?: string;
  musicalKey?: string;
  tempo?: number;
  durationSeconds?: number;
  notes?: string;
}

export interface UpdateSongDto {
  title?: string;
  composer?: string;
  arranger?: string;
  genre?: string;
  musicalKey?: string;
  tempo?: number;
  durationSeconds?: number;
  notes?: string;
}

export interface SongListParams {
  orgId?: string;
  search?: string;
  genre?: string;
  page?: number;
  limit?: number;
}

export interface Repertoire {
  id: string;
  name: string;
  description?: string;
  songs: Song[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreUploadRequest {
  songId: string;
  fileName: string;
  fileType: 'pdf' | 'musicxml';
  contentType: string;
}

export interface ScoreUploadPresignedUrl {
  uploadUrl: string;
  fileKey: string;
  expiresAt: string;
}
