import { searchAssets, getDownloadUrl } from '@regieart/api';
import type { Song } from '@regieart/types';

export async function fetchSongAudioUrl(song: Song): Promise<string> {
  const { assets } = await searchAssets({ songId: song.id, assetType: 'audio-track', limit: 1 });
  const audioAsset = assets?.[0];
  if (!audioAsset) {
    throw new Error('Esta canción no tiene audio subido todavía.');
  }
  const { downloadUrl } = await getDownloadUrl(audioAsset.id);
  return downloadUrl;
}
