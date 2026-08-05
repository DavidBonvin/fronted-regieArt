import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initApiClient, getConfig } from './config'

const mockAdapter = {
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
  apiBaseUrl: 'https://api.example.com/v1',
  keycloakUrl: 'https://auth.example.com',
  realm: 'test-realm',
  clientId: 'test-client',
  tokenAdapter: mockAdapter,
  fileReaderAdapter: mockFileReader,
}

describe('config', () => {
  it('throws before initialization', () => {
    expect(() => getConfig()).toThrow('@regieart/api: initApiClient() must be called before making requests.')
  })

  it('appends trailing slash to apiBaseUrl when missing', () => {
    initApiClient(baseConfig)
    expect(getConfig().apiBaseUrl).toBe('https://api.example.com/v1/')
  })

  it('preserves trailing slash already present in apiBaseUrl', () => {
    initApiClient({ ...baseConfig, apiBaseUrl: 'https://api.example.com/v1/' })
    expect(getConfig().apiBaseUrl).toBe('https://api.example.com/v1/')
  })

  it('stores keycloak realm and clientId', () => {
    initApiClient(baseConfig)
    const config = getConfig()
    expect(config.realm).toBe('test-realm')
    expect(config.clientId).toBe('test-client')
    expect(config.keycloakUrl).toBe('https://auth.example.com')
  })
})
