import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveImageUrl, resolveImageUrls, clearImageCache } from './imageCache'

vi.mock('./storage.service', () => ({
  getPresignedDownloadUrl: vi.fn(),
}))

import { getPresignedDownloadUrl } from './storage.service'

const mockSign = vi.mocked(getPresignedDownloadUrl)

const r2Url = (path: string) => `https://bucket.abc123.r2.cloudflarestorage.com/${path}`
const signedResponse = (downloadUrl: string) => ({
  downloadUrl,
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  isPublic: false,
})

describe('imageCache', () => {
  beforeEach(() => {
    clearImageCache()
    mockSign.mockReset()
  })

  describe('resolveImageUrl', () => {
    it('returns null for null', async () => {
      expect(await resolveImageUrl(null)).toBeNull()
    })

    it('returns null for undefined', async () => {
      expect(await resolveImageUrl(undefined)).toBeNull()
    })

    it('returns data: URI unchanged', async () => {
      const url = 'data:image/png;base64,abc123'
      expect(await resolveImageUrl(url)).toBe(url)
    })

    it('returns blob: URI unchanged', async () => {
      const url = 'blob:https://example.com/uuid-123'
      expect(await resolveImageUrl(url)).toBe(url)
    })

    it('returns non-R2 URL unchanged', async () => {
      const url = 'https://cdn.example.com/photo.jpg'
      expect(await resolveImageUrl(url)).toBe(url)
    })

    it('returns already-signed R2 URL unchanged', async () => {
      const url = r2Url('photo.jpg') + '?X-Amz-Signature=abc'
      expect(await resolveImageUrl(url)).toBe(url)
    })

    it('resolves raw R2 URL to signed URL', async () => {
      const raw = r2Url('photo.jpg')
      mockSign.mockResolvedValueOnce(signedResponse('https://cdn.example.com/signed.jpg'))
      expect(await resolveImageUrl(raw)).toBe('https://cdn.example.com/signed.jpg')
      expect(mockSign).toHaveBeenCalledWith('photo.jpg')
    })

    it('falls back to raw URL when signing fails', async () => {
      const raw = r2Url('fail.jpg')
      mockSign.mockRejectedValueOnce(new Error('network error'))
      expect(await resolveImageUrl(raw)).toBe(raw)
    })

    it('returns cached signed URL without re-fetching', async () => {
      const raw = r2Url('cached.jpg')
      mockSign.mockResolvedValue(signedResponse('https://cdn.example.com/cached.jpg'))
      await resolveImageUrl(raw)
      await resolveImageUrl(raw)
      expect(mockSign).toHaveBeenCalledTimes(1)
    })
  })

  describe('resolveImageUrls', () => {
    it('resolves multiple URLs preserving order', async () => {
      const urls = ['https://a.com/1.jpg', null, 'data:image/png;base64,x']
      const result = await resolveImageUrls(urls)
      expect(result).toEqual(['https://a.com/1.jpg', null, 'data:image/png;base64,x'])
    })
  })

  describe('clearImageCache', () => {
    it('forces re-fetch after cache is cleared', async () => {
      const raw = r2Url('reset.jpg')
      mockSign.mockResolvedValue(signedResponse('https://cdn.example.com/signed.jpg'))
      await resolveImageUrl(raw)
      clearImageCache()
      await resolveImageUrl(raw)
      expect(mockSign).toHaveBeenCalledTimes(2)
    })
  })
})
