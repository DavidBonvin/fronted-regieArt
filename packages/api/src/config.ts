import type { TokenStorageAdapter } from './auth/tokenStorage';
import type { FileReaderAdapter } from './storage/fileReader';

export interface ApiClientConfig {
  apiBaseUrl: string;
  keycloakUrl: string;
  realm: string;
  clientId: string;
  tokenAdapter: TokenStorageAdapter;
  fileReaderAdapter: FileReaderAdapter;
  onSessionExpired?: () => void;
}

let _config: ApiClientConfig | null = null;

export function initApiClient(config: ApiClientConfig): void {
  _config = {
    ...config,
    apiBaseUrl: config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`,
  };
}

export function getConfig(): ApiClientConfig {
  if (!_config) {
    throw new Error('@regieart/api: initApiClient() must be called before making requests.');
  }
  return _config;
}
