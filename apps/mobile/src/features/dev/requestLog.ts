/**
 * Lightweight request log & fetch interceptor for DEV builds.
 * Call installFetchInterceptor() once at app startup (entry/index.tsx).
 * DevToolsScreen subscribes to updates via subscribe().
 */

export interface RequestLogEntry {
  id: string;
  timeLabel: string;
  method: string;
  url: string;
  status: number | null;
  duration: number;
  hasAuth: boolean;
  isKeycloakRefresh: boolean;
}

const MAX_ENTRIES = 150;
const _entries: RequestLogEntry[] = [];
let _keycloakRefreshCount = 0;
const _listeners: Set<() => void> = new Set();

export function getLogEntries(): readonly RequestLogEntry[] { return _entries; }
export function getKeycloakRefreshCount(): number { return _keycloakRefreshCount; }
export function clearLog(): void {
  _entries.length = 0;
  _keycloakRefreshCount = 0;
  _notify();
}

export function subscribeToLog(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _notify(): void {
  _listeners.forEach(l => l());
}

let _installed = false;

export function installFetchInterceptor(): void {
  if (_installed) return;
  _installed = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _orig = (global as any).fetch as typeof fetch;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> => {
    const url =
      typeof input === 'string' ? input
      : input instanceof URL     ? input.toString()
      : (input as Request).url;

    const method = (
      init?.method ??
      (typeof input !== 'string' && !(input instanceof URL)
        ? (input as Request).method
        : 'GET')
    ).toUpperCase();

    // Check for Authorization header in various formats
    const headers = init?.headers;
    let hasAuth = false;
    if (headers) {
      if (headers instanceof Headers) {
        hasAuth = headers.has('Authorization');
      } else if (Array.isArray(headers)) {
        hasAuth = headers.some(([k]) => k.toLowerCase() === 'authorization');
      } else {
        const h = headers as Record<string, string>;
        hasAuth = 'Authorization' in h || 'authorization' in h;
      }
    }

    const isKeycloakRefresh = url.includes('/openid-connect/token') && method === 'POST';
    const start = Date.now();

    try {
      const response = await _orig(input, init);
      const duration = Date.now() - start;

      if (isKeycloakRefresh) _keycloakRefreshCount++;

      _entries.unshift({
        id: `${start}-${Math.random().toString(36).slice(2, 6)}`,
        timeLabel: new Date().toLocaleTimeString(),
        method,
        url,
        status: response.status,
        duration,
        hasAuth,
        isKeycloakRefresh,
      });
      if (_entries.length > MAX_ENTRIES) _entries.length = MAX_ENTRIES;
      _notify();

      return response;
    } catch (err) {
      _entries.unshift({
        id: `${start}-err`,
        timeLabel: new Date().toLocaleTimeString(),
        method,
        url,
        status: null,
        duration: Date.now() - start,
        hasAuth,
        isKeycloakRefresh,
      });
      _notify();
      throw err;
    }
  };
}
