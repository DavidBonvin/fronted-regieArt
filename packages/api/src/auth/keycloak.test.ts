import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initApiClient } from '../config'
import { loginWithPassword, refreshAccessToken, logout } from './keycloak'

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
  access_token: 'access-abc',
  refresh_token: 'refresh-xyz',
  expires_in: 300,
  refresh_expires_in: 1800,
  token_type: 'Bearer',
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

    it('posts to the correct Keycloak token endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => tokenResponse })
      await loginWithPassword('user@test.com', 'secret')
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('https://auth.example.com/realms/test-realm/protocol/openid-connect/token')
    })

    it('throws with status code on failed login', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' })
      await expect(loginWithPassword('bad@test.com', 'wrong')).rejects.toThrow('Login failed (401)')
    })
  })

  describe('refreshAccessToken', () => {
    it('returns new token response on success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => tokenResponse })
      const result = await refreshAccessToken('valid-refresh-token')
      expect(result.access_token).toBe('access-abc')
    })

    it('throws on failed refresh', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) })
      await expect(refreshAccessToken('expired-token')).rejects.toThrow('Token refresh failed')
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
