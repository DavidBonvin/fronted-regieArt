import type {
  Asset,
  AssetType,
  AssetSearchParams,
  UpdateAssetDto,
  CreatePresignedUploadDto,
  PresignedUploadResponse,
  ConfirmUploadDto,
  MultipartInitiateDto,
  MultipartInitiateResponse,
  AssetDownloadResponse,
} from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import { getConfig } from '../config';
import type { ApiRes } from '../client/types';

export interface UploadOptions {
  orgId?: string;
  songId?: string;
  eventId?: string;
  displayName?: string;
  /** Original filename as stored in the backend metadata (auto-detected from File.name if omitted). */
  originalName?: string;
  description?: string;
  tags?: string[];
  language?: string;
  isPublic?: boolean;
  durationSeconds?: number;
  bitrate?: number;
  pageCount?: number;
  onProgress?: (percent: number) => void;
}

export async function uploadFile(
  fileOrUri: File | Blob | string,
  assetType: AssetType,
  contentType: string,
  options?: UploadOptions,
): Promise<string> {
  const config = getConfig();
  const client = getHttpClient();

  const sizeBytes = await config.fileReaderAdapter.getSize(fileOrUri);

  // Auto-detect originalName from File.name if caller doesn't supply it
  const originalName =
    options?.originalName ??
    (fileOrUri instanceof File ? fileOrUri.name : undefined);

  const presignedDto: CreatePresignedUploadDto = {
    assetType,
    contentType,
    fileSizeBytes: sizeBytes,
    orgId: options?.orgId,
    songId: options?.songId,
    eventId: options?.eventId,
    displayName: options?.displayName,
    originalName,
    description: options?.description,
    tags: options?.tags,
    language: options?.language,
    isPublic: options?.isPublic,
    durationSeconds: options?.durationSeconds,
    bitrate: options?.bitrate,
    pageCount: options?.pageCount,
  };

  const { uploadUrl, key, assetId } = await client
    .post('storage/presigned-upload', { json: presignedDto })
    .json<ApiRes<PresignedUploadResponse>>()
    .then((r) => r.data);

  // Guard: detect backend error sentinels (e.g. 'pending-db-error') that are returned
  // with HTTP 200 but represent a failed DB write.  A valid asset ID is a CUID (starts
  // with 'c', alphanumeric, 20+ chars); anything else means the upload was not recorded.
  if (!assetId || !/^c[a-z0-9]{19,}$/.test(assetId)) {
    throw new Error(
      `presigned-upload returned an invalid asset ID: "${assetId}". ` +
      'The server may have a database error — check the backend logs.',
    );
  }

  // Streaming path: skip readAsBinary entirely — safe for large files on memory-constrained
  // platforms (e.g. React Native / Android) where loading a 50 MB video as Base64 causes OOM.
  if (config.fileReaderAdapter.streamUploadToPresignedUrl && typeof fileOrUri === 'string') {
    await config.fileReaderAdapter.streamUploadToPresignedUrl(fileOrUri, uploadUrl, contentType, sizeBytes);
  } else {
    const binary = await config.fileReaderAdapter.readAsBinary(fileOrUri);

    // Platform hook: use adapter's PUT if provided (e.g. browser routes through Vite proxy).
    // Falls back to direct fetch — works in Node / React Native where CORS isn't an issue.
    if (config.fileReaderAdapter.putToPresignedUrl) {
      await config.fileReaderAdapter.putToPresignedUrl(uploadUrl, binary, contentType);
    } else {
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(sizeBytes),
        },
        body: binary,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`R2 PUT failed HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }
    }
  }

  const confirmDto: ConfirmUploadDto = {
    key,
    assetType,
    // Only technical metadata is accepted by confirm-upload (backend: forbidNonWhitelisted)
    // Metadata fields (displayName, description, tags…) are set in presigned-upload only
    durationSeconds: options?.durationSeconds ?? null,
    bitrate:         options?.bitrate         ?? null,
    pageCount:       options?.pageCount        ?? null,
    // width / height: not in UploadOptions yet — leave undefined unless the caller needs them
  };

  await client.post('storage/confirm-upload', { json: confirmDto });

  return assetId;
}

export async function uploadLargeFile(
  fileOrUri: File | Blob | string,
  assetType: AssetType,
  contentType: string,
  originalName: string,
  options?: UploadOptions & { maxConcurrent?: number },
): Promise<string> {
  const config = getConfig();
  const client = getHttpClient();
  const maxConcurrent = options?.maxConcurrent ?? 5;

  const totalSizeBytes = await config.fileReaderAdapter.getSize(fileOrUri);

  const initiateDto: MultipartInitiateDto = {
    assetType,
    contentType,
    totalSizeBytes,
    originalName,
    orgId: options?.orgId,
    eventId: options?.eventId,
    displayName: options?.displayName,
  };

  const { uploadId, key, assetId, parts, partSizeBytes } = await client
    .post('storage/multipart/initiate', { json: initiateDto })
    .json<ApiRes<MultipartInitiateResponse>>()
    .then((r) => r.data);

  const completedParts: Array<{ partNumber: number; etag: string }> = [];
  const totalParts = parts.length;

  for (let i = 0; i < totalParts; i += maxConcurrent) {
    const batch = parts.slice(i, i + maxConcurrent);

    const results = await Promise.all(
      batch.map(async (part) => {
        const start = (part.partNumber - 1) * partSizeBytes;
        const end = Math.min(start + partSizeBytes, totalSizeBytes);

        const chunk = await config.fileReaderAdapter.readChunk(fileOrUri, start, end);

        const response = await fetch(part.uploadUrl, {
          method: 'PUT',
          body: chunk,
        });

        if (!response.ok) {
          throw new Error(`Multipart part ${part.partNumber} failed with status ${response.status}`);
        }

        const rawEtag = response.headers.get('ETag') ?? response.headers.get('etag') ?? '';
        return { partNumber: part.partNumber, etag: rawEtag.replace(/"/g, '') };
      }),
    );

    completedParts.push(...results);
    options?.onProgress?.(Math.round((Math.min(i + batch.length, totalParts) / totalParts) * 100));
  }

  await client.post('storage/multipart/complete', {
    json: { key, uploadId, assetId, parts: completedParts },
  });

  return assetId;
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  await getHttpClient().delete('storage/multipart/abort', { json: { key, uploadId } });
}

export async function getDownloadUrl(assetId: string): Promise<AssetDownloadResponse> {
  const res = await getHttpClient()
    .get(`storage/assets/${assetId}/download`)
    .json<ApiRes<AssetDownloadResponse>>();
  return res.data;
}

export async function getPresignedDownloadUrl(key: string): Promise<AssetDownloadResponse> {
  const res = await getHttpClient()
    .get('storage/presigned-download', { searchParams: { key } })
    .json<ApiRes<AssetDownloadResponse>>();
  return res.data;
}

export async function searchAssets(params: AssetSearchParams): Promise<{
  assets: Asset[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.set('q', params.q);
  if (params.orgId) searchParams.set('orgId', params.orgId);
  if (params.songId) searchParams.set('songId', params.songId);
  if (params.eventId) searchParams.set('eventId', params.eventId);
  if (params.language) searchParams.set('language', params.language);
  if (params.createdFrom) searchParams.set('createdFrom', params.createdFrom);
  if (params.createdTo) searchParams.set('createdTo', params.createdTo);
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));

  const assetTypes = Array.isArray(params.assetType)
    ? params.assetType
    : params.assetType
      ? [params.assetType]
      : [];
  assetTypes.forEach((t) => searchParams.append('assetType', t));

  const tags = Array.isArray(params.tags)
    ? params.tags
    : params.tags
      ? [params.tags]
      : [];
  tags.forEach((t) => searchParams.append('tags', t));

  const res = await getHttpClient()
    .get('storage/assets', { searchParams })
    .json<ApiRes<{ assets: Asset[]; total: number; totalPages: number; page: number }>>();
  return res.data;
}

export async function getAsset(assetId: string): Promise<Asset> {
  const res = await getHttpClient().get(`storage/assets/${assetId}`).json<ApiRes<Asset>>();
  return res.data;
}

export async function updateAsset(assetId: string, dto: UpdateAssetDto): Promise<Asset> {
  const res = await getHttpClient()
    .patch(`storage/assets/${assetId}`, { json: dto })
    .json<ApiRes<Asset>>();
  return res.data;
}

export async function deleteAsset(assetId: string): Promise<void> {
  await getHttpClient().delete(`storage/assets/${assetId}`);
}
