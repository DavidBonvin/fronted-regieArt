import { useCallback, useEffect, useRef, useState } from 'react';

export interface FetchLog {
  id: string;
  url: string;
  method: string;
  status: number;
  durationMs: number;
  requestHeaders: Record<string, string>;
  timestamp: Date;
}

export interface FetchInterceptorResult {
  logs: FetchLog[];
  keycloakRefreshCount: number;
  refreshCountRef: React.MutableRefObject<number>;
  clearLogs: () => void;
}

export function useFetchInterceptor(): FetchInterceptorResult {
  const [logs, setLogs] = useState<FetchLog[]>([]);
  const [keycloakRefreshCount, setKeycloakRefreshCount] = useState(0);
  const refreshCountRef = useRef(0);

  const clearLogs = useCallback(() => setLogs([]), []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async function patchedFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url;

      const method = (
        init?.method ??
        (input instanceof Request ? input.method : 'GET')
      ).toUpperCase();

      const requestHeaders: Record<string, string> = {};
      const rawHeaders = init?.headers ?? (input instanceof Request ? input.headers : undefined);
      if (rawHeaders) {
        new Headers(rawHeaders).forEach((value, key) => {
          requestHeaders[key] = value;
        });
      }

      const start = performance.now();

      try {
        const response = await originalFetch(input, init);
        const durationMs = Math.round(performance.now() - start);

        if (url.includes('/protocol/openid-connect/token')) {
          refreshCountRef.current += 1;
          setKeycloakRefreshCount(c => c + 1);
        }

        setLogs(prev =>
          [
            { id: crypto.randomUUID(), url, method, status: response.status, durationMs, requestHeaders, timestamp: new Date() },
            ...prev,
          ].slice(0, 50),
        );

        return response;
      } catch (err: unknown) {
        const durationMs = Math.round(performance.now() - start);
        setLogs(prev =>
          [
            { id: crypto.randomUUID(), url, method, status: 0, durationMs, requestHeaders, timestamp: new Date() },
            ...prev,
          ].slice(0, 50),
        );
        throw err;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return { logs, keycloakRefreshCount, refreshCountRef, clearLogs };
}
