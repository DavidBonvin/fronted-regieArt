export type SongKey =
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb'
  | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#'
  | 'Ab' | 'A' | 'A#' | 'Bb' | 'B'
  | 'Cm' | 'C#m' | 'Dm' | 'D#m' | 'Ebm'
  | 'Em' | 'Fm' | 'F#m' | 'Gm' | 'G#m'
  | 'Am' | 'A#m' | 'Bbm' | 'Bm';

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: SongKey;
  bpm: number;
  durationSeconds: number;
  scoreFileUrl?: string;
  scoreFileType?: 'pdf' | 'musicxml';
  tags: string[];
  organizationId: string;
  uploadedBy: string;
  createdAt: string;
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

export interface SongCreateRequest {
  title: string;
  artist: string;
  key: SongKey;
  bpm: number;
  durationSeconds: number;
  tags?: string[];
  organizationId: string;
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
