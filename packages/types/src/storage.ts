export type AssetType =
  | 'user-avatar'
  | 'user-banner'
  | 'org-banner'
  | 'audio-track'
  | 'music-score'
  | 'reference-video'
  | 'financial-receipt'
  | 'technical-file'
  | 'legal-document';

export type AssetStatus = 'PENDING' | 'CONFIRMED' | 'DELETED';

export interface Asset {
  id: string;
  key: string;
  assetType: AssetType;
  status: AssetStatus;
  displayName?: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  uploadedById: string;
  orgId?: string;
  songId?: string;
  eventId?: string;
  tags?: string[];
  language?: string;
  isPublic: boolean;
  etag?: string;
  confirmedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  key: string;
  assetId: string;
  expiresAt: string;
}

export interface ConfirmUploadDto {
  key: string;
  assetType: AssetType;
  /** Technical metadata — only these fields are accepted by POST /storage/confirm-upload */
  durationSeconds?: number | null;
  bitrate?:         number | null;
  width?:           number | null;
  height?:          number | null;
  pageCount?:       number | null;
}

export interface CreatePresignedUploadDto {
  assetType: AssetType;
  contentType: string;
  /** Backend field name — was incorrectly 'sizeBytes' in frontend types */
  fileSizeBytes: number;
  orgId?: string;
  songId?: string;
  eventId?: string;
  displayName?: string;
  originalName?: string;
  description?: string;
  tags?: string[];
  language?: string;
  isPublic?: boolean;
  durationSeconds?: number;
  bitrate?: number;
  pageCount?: number;
}

export interface MultipartInitiateDto {
  assetType: AssetType;
  contentType: string;
  totalSizeBytes: number;
  partSizeBytes?: number;
  orgId?: string;
  eventId?: string;
  displayName?: string;
  originalName: string;
}

export interface MultipartInitiateResponse {
  uploadId: string;
  key: string;
  assetId: string;
  parts: Array<{
    partNumber: number;
    uploadUrl: string;
  }>;
  partSizeBytes: number;
}

export interface MultipartCompleteDto {
  key: string;
  uploadId: string;
  assetId: string;
  parts: Array<{
    partNumber: number;
    etag: string;
  }>;
}

export interface AssetDownloadResponse {
  downloadUrl: string;
  expiresAt: string;
  isPublic: boolean;
}

export interface AssetSearchParams {
  q?: string;
  assetType?: AssetType | AssetType[];
  orgId?: string;
  songId?: string;
  eventId?: string;
  tags?: string | string[];
  language?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
}

export interface UpdateAssetDto {
  displayName?: string;
  description?: string;
  tags?: string[];
  language?: string;
  isPublic?: boolean;
}
