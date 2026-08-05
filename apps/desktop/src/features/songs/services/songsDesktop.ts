import { searchAssets, getDownloadUrl, createSong, uploadFile } from '@regieart/api';
import type { UploadOptions } from '@regieart/api';
import type { CreateSongDto, Song } from '@regieart/types';

export async function fetchSongAudioUrl(songId: string): Promise<string | null> {
  const { assets } = await searchAssets({ songId, assetType: 'audio-track', limit: 1 });
  if (!assets[0]) return null;
  const { downloadUrl } = await getDownloadUrl(assets[0].id);
  return downloadUrl;
}

export async function fetchSongPdfUrl(songId: string): Promise<string | null> {
  const { assets } = await searchAssets({ songId, assetType: 'music-score', limit: 1 });
  if (!assets[0]) return null;
  const { downloadUrl } = await getDownloadUrl(assets[0].id);
  return downloadUrl;
}

export interface CreateSongWorkflowInput {
  dto: CreateSongDto;
  audioFile?: File;
  pdfFile?: File;
  onAudioProgress?: (pct: number) => void;
  onPdfProgress?: (pct: number) => void;
}

export async function createSongWorkflow({
  dto,
  audioFile,
  pdfFile,
  onAudioProgress,
  onPdfProgress,
}: CreateSongWorkflowInput): Promise<Song> {
  const song = await createSong(dto);
  const base: UploadOptions = { orgId: dto.orgId, songId: song.id };

  if (audioFile) {
    await uploadFile(audioFile, 'audio-track', audioFile.type || 'audio/mpeg', {
      ...base,
      displayName: `${dto.title} (Audio)`,
      originalName: audioFile.name,
      onProgress: onAudioProgress,
    });
  }

  if (pdfFile) {
    await uploadFile(pdfFile, 'music-score', 'application/pdf', {
      ...base,
      displayName: `${dto.title} (Partitura)`,
      originalName: pdfFile.name,
      onProgress: onPdfProgress,
    });
  }

  return song;
}
