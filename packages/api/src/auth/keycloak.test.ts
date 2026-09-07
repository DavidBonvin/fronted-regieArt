import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initApiClient } from '../config'
import { loginWithPassword, refreshAccessToken, logout, toStoredTokens } from './keycloak'

const mockTokenAdapter = {
  getTokens: vi.fn(async () => null),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
}

const mockFileReader = {
  readAsBinary: vi.fn(async () => new ArrayBuffer(0)),
  readChunk: vi.fn(async () => new ArrayBuffer(0)),
  getSize: vi.fn(async () => 0),
}

const baseConfig = {
  apiBaseUrl: 'https://api.example.com/v1/',
  keycloakUrl: 'https://auth.example.com',
  realm: 'test-realm',
  clientId: 'test-client',
  tokenAdapter: mockTokenAdapter,
  fileReaderAdapter: mockFileReader,
}

const tokenResponse = {
  success: true,
  data: {
    accessToken: 'access-abc',
    refreshToken: 'refresh-xyz',
    expiresIn: 300,
    refreshExpiresIn: 1800,
  },
}

const mockFetch = vi.fn()

describe('keycloak', () => {
  beforeEach(() => {
    initApiClient(baseConfig)
    mockTokenAdapter.setTokens.mockClear()
    mockTokenAdapter.clearTokens.mockClear()
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  describe('loginWithPassword', () => {
    it('returns stored tokens on success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => tokenResponse })
      const tokens = await loginWithPassword('user@test.com', 'secret')
      expect(tokens.accessToken).toBe('access-abc')
      expect(tokens.refreshToken).toBe('refresh-xyz')
    })

    it('persists tokens via tokenAdapter', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => tokenResponse })
      await loginWithPassword('user@test.com', 'secret')
      expect(mockTokenAdapter.setTokens).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'access-abc' }),
      )
    })

    it('posts to the backend login endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => tokenResponse })
      await loginWithPassword('user@test.com', 'secret')
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.example.com/v1/auth/login')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({ email: 'user@test.com', password: 'secret' })
    })

    it('surfaces the backend error message on failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Identifiants invalides' } }),
      })
      await expect(loginWithPassword('bad@test.com', 'wrong')).rejects.toThrow('Identifiants invalides')
    })

    it('falls back to a generic message when the body carries no detail', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      await expect(loginWithPassword('bad@test.com', 'wrong')).rejects.toThrow(/incorrect/i)
    })
  })

  describe('refreshAccessToken', () => {
    it('returns the new token payload on success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => tokenResponse })
      const result = await refreshAccessToken('valid-refresh-token')
      expect(result.accessToken).toBe('access-abc')
      expect(result.refreshToken).toBe('refresh-xyz')
    })

    it('posts to the backend refresh endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => tokenResponse })
      await refreshAccessToken('valid-refresh-token')
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.example.com/v1/auth/refresh')
      expect(JSON.parse(init.body)).toEqual({ refreshToken: 'valid-refresh-token' })
    })

    it('reports the status and body when the refresh is rejected', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'invalid_grant' })
      await expect(refreshAccessToken('expired-token')).rejects.toThrow(
        'Token refresh failed (HTTP 400): invalid_grant',
      )
    })

    it('rejects an incomplete payload instead of storing empty tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { accessToken: 'only-access' } }),
      })
      await expect(refreshAccessToken('valid-refresh-token')).rejects.toThrow('incomplete payload')
    })
  })

  describe('toStoredTokens', () => {
    it('converts lifetimes into absolute timestamps', () => {
      const before = Date.now()
      const tokens = toStoredTokens({
        accessToken: 'a', refreshToken: 'r', expiresIn: 300, refreshExpiresIn: 1800,
      })
      expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 300_000)
      expect(tokens.refreshExpiresAt).toBeGreaterThanOrEqual(before + 1_800_000)
    })

    it('falls back to defaults when lifetimes are missing', () => {
      const tokens = toStoredTokens({
        accessToken: 'a', refreshToken: 'r',
      } as unknown as Parameters<typeof toStoredTokens>[0])
      expect(Number.isFinite(tokens.expiresAt)).toBe(true)
      expect(Number.isFinite(tokens.refreshExpiresAt)).toBe(true)
      expect(tokens.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  describe('logout', () => {
    it('calls Keycloak logout endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      await logout('refresh-token-123')
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('https://auth.example.com/realms/test-realm/protocol/openid-connect/logout')
    })
  })
})
