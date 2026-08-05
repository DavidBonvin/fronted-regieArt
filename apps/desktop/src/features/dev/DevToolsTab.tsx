import React, { useCallback, useEffect, useState } from 'react';
import { getConfig } from '@regieart/api';
import type { StoredTokens } from '@regieart/api';
import type { FetchInterceptorResult, FetchLog } from './useFetchInterceptor';
import { decodeJwtPayload, getTokenTimeInfo } from './jwtUtils';

interface Props {
  interceptor: FetchInterceptorResult;
}

export function DevToolsTab({ interceptor }: Props): React.ReactElement {
  const { logs, keycloakRefreshCount, clearLogs } = interceptor;
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [consoleLog, setConsoleLog] = useState<Array<{ level: 'INFO' | 'WARN' | 'ERROR'; msg: string; ts: Date }>>([]);
  const [storageView, setStorageView] = useState<{ session: [string, string][]; local: [string, string][] }>({ session: [], local: [] });

  useEffect(() => {
    const doRefresh = () => {
      try {
        getConfig()
          .tokenAdapter.getTokens()
          .then(setTokens)
          .catch(() => null);
      } catch {
        /* ignore */
      }
    };
    doRefresh();
    const id = setInterval(doRefresh, 1000);
    return () => clearInterval(id);
  }, []);

  const refreshStorage = useCallback(() => {
    const session: [string, string][] = [];
    const local: [string, string][] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)!;
      session.push([k, sessionStorage.getItem(k) ?? '']);
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      local.push([k, localStorage.getItem(k) ?? '']);
    }
    setStorageView({ session, local });
  }, []);

  useEffect(() => { refreshStorage(); }, [refreshStorage]);

  const log = useCallback((level: 'INFO' | 'WARN' | 'ERROR', msg: string) => {
    setConsoleLog(prev => [{ level, msg, ts: new Date() }, ...prev].slice(0, 200));
  }, []);

  const clearTokens = async () => {
    await getConfig().tokenAdapter.clearTokens().catch(() => null);
    setTokens(null);
    log('WARN', 'Tokens cleared from storage.');
    refreshStorage();
  };

  const forceExpiry = async () => {
    const current = await getConfig().tokenAdapter.getTokens().catch(() => null);
    if (!current) { log('ERROR', 'No tokens to expire.'); return; }
    await getConfig().tokenAdapter.setTokens({ ...current, expiresAt: Date.now() - 1000 });
    log('WARN', 'Token expiresAt forced to past. Next request will trigger a refresh.');
  };

  const deleteStorageKey = (type: 'session' | 'local', key: string) => {
    if (type === 'session') sessionStorage.removeItem(key);
    else localStorage.removeItem(key);
    refreshStorage();
    log('INFO', `Removed key "${key}" from ${type}Storage.`);
  };

  const copyLogs = () => {
    const text = consoleLog
      .map(e => `[${e.ts.toISOString()}] [${e.level}] ${e.msg}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => log('INFO', 'Logs copied to clipboard.'));
  };

  const accessPayload = tokens?.accessToken ? decodeJwtPayload(tokens.accessToken) : null;
  const timeInfo = accessPayload?.exp ? getTokenTimeInfo(accessPayload.exp, accessPayload.iat) : null;

  const tokenStatusColor =
    timeInfo?.status === 'valid' ? colors.ok :
    timeInfo?.status === 'expiring' ? colors.warn :
    colors.fail;

  return (
    <div style={s.container}>

      <section style={s.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={s.title}>Request Log</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: colors.muted, fontSize: 12 }}>
              Keycloak refreshes: <strong style={{ color: colors.warn }}>{keycloakRefreshCount}</strong>
            </span>
            <button style={s.btnSm} onClick={clearLogs}>Clear</button>
          </div>
        </div>
        <p style={s.note}>
          X-Request-ID and Accept-Language are not configured in httpClient.ts — will appear as absent.
        </p>
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Time', 'Method', 'URL', 'Status', 'Duration', 'Auth Header'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={6} style={{ ...s.td, color: colors.muted, textAlign: 'center' }}>No requests captured yet.</td></tr>
              )}
              {logs.map((log: FetchLog) => (
                <tr key={log.id}>
                  <td style={{ ...s.td, whiteSpace: 'nowrap', fontSize: 11 }}>
                    {log.timestamp.toLocaleTimeString()}
                  </td>
                  <td style={{ ...s.td, fontWeight: 600, color: log.method === 'GET' ? colors.ok : colors.warn }}>
                    {log.method}
                  </td>
                  <td style={{ ...s.td, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {log.url}
                  </td>
                  <td style={{ ...s.td, color: log.status >= 400 ? colors.fail : log.status === 0 ? colors.muted : colors.ok }}>
                    {log.status === 0 ? 'ERR' : log.status}
                  </td>
                  <td style={s.td}>{log.durationMs}ms</td>
                  <td style={{ ...s.td, fontSize: 11, color: colors.muted }}>
                    {log.requestHeaders['authorization']
                      ? `Bearer ${log.requestHeaders['authorization'].slice(7, 20)}…`
                      : 'absent'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={s.section}>
        <h3 style={s.title}>JWT Decoder</h3>
        {!tokens ? (
          <p style={s.note}>No tokens in storage.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ ...s.card, gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: tokenStatusColor, fontWeight: 700, fontSize: 15 }}>
                  {timeInfo?.status === 'valid' ? '🟢' : timeInfo?.status === 'expiring' ? '🟡' : '🔴'}{' '}
                  {timeInfo?.label ?? 'Unknown'}
                </span>
                {timeInfo && (
                  <div style={{ flex: 1, minWidth: 120, background: colors.surface2, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${timeInfo.progressPercent}%`, height: '100%', background: tokenStatusColor, transition: 'width 1s linear' }} />
                  </div>
                )}
                <span style={{ color: colors.muted, fontSize: 12 }}>
                  exp: {accessPayload?.exp ? new Date(accessPayload.exp * 1000).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>

            <div>
              <p style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Access Token Claims</p>
              <pre style={s.pre}>
                {accessPayload ? JSON.stringify(accessPayload, null, 2) : 'Failed to decode'}
              </pre>
            </div>

            <div>
              <p style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Refresh Token Claims</p>
              <pre style={s.pre}>
                {tokens.refreshToken ? JSON.stringify(decodeJwtPayload(tokens.refreshToken), null, 2) : 'N/A'}
              </pre>
            </div>
          </div>
        )}
      </section>

      <section style={s.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={s.title}>Storage Inspector</h3>
          <button style={s.btnSm} onClick={refreshStorage}>Refresh</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button style={{ ...s.btnSm, background: colors.fail }} onClick={clearTokens}>Clear Tokens</button>
          <button style={{ ...s.btnSm, background: colors.warn, color: '#000' }} onClick={forceExpiry}>Force Expiry</button>
        </div>
        {(['session', 'local'] as const).map(type => (
          <div key={type} style={{ marginBottom: 16 }}>
            <p style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
              {type === 'session' ? 'sessionStorage' : 'localStorage'} ({storageView[type].length} keys)
            </p>
            {storageView[type].length === 0 ? (
              <p style={{ color: colors.muted, fontSize: 12 }}>Empty</p>
            ) : (
              storageView[type].map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.border}` }}>
                  <div>
                    <span style={{ color: colors.text, fontSize: 13, fontFamily: 'monospace' }}>{key}</span>
                    <span style={{ color: colors.muted, fontSize: 11, marginLeft: 12 }}>
                      {val.length > 60 ? `${val.slice(0, 60)}…` : val}
                    </span>
                  </div>
                  <button
                    style={{ ...s.btnSm, background: '#450a0a', color: '#fca5a5', padding: '2px 8px' }}
                    onClick={() => deleteStorageKey(type, key)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        ))}
      </section>

      <section style={s.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={s.title}>Console</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.btnSm} onClick={copyLogs}>Copy Logs</button>
            <button style={{ ...s.btnSm, background: colors.surface2 }} onClick={() => setConsoleLog([])}>Clear</button>
          </div>
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
          {consoleLog.length === 0 ? (
            <p style={{ color: colors.muted }}>No entries yet.</p>
          ) : (
            consoleLog.map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '3px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.muted, whiteSpace: 'nowrap' }}>{entry.ts.toLocaleTimeString()}</span>
                <span style={{
                  color: entry.level === 'ERROR' ? colors.fail : entry.level === 'WARN' ? colors.warn : colors.ok,
                  fontWeight: 600, minWidth: 40,
                }}>
                  [{entry.level}]
                </span>
                <span style={{ color: colors.text }}>{entry.msg}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}


const colors = {
  bg:      '#0f172a',
  surface: '#1e293b',
  surface2:'#263245',
  border:  '#334155',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  ok:      '#22c55e',
  fail:    '#ef4444',
  warn:    '#f59e0b',
};

const s: Record<string, React.CSSProperties> = {
  container:   { display: 'flex', flexDirection: 'column', gap: 20 },
  section:     { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 20 },
  title:       { margin: '0 0 4px', fontSize: 15, color: colors.text, fontWeight: 600 },
  note:        { color: colors.muted, fontSize: 12, margin: '0 0 12px', fontStyle: 'italic' },
  tableWrapper:{ overflowX: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:          { textAlign: 'left', padding: '8px 10px', color: colors.muted, fontWeight: 500, borderBottom: `1px solid ${colors.border}` },
  td:          { padding: '7px 10px', color: colors.text, borderBottom: `1px solid ${colors.border}` },
  card:        { background: colors.surface2, borderRadius: 6, padding: '10px 14px' },
  pre:         { background: colors.bg, borderRadius: 6, padding: 12, fontSize: 12, overflowY: 'auto', maxHeight: 260, color: colors.text, margin: 0 },
  btnSm:       { padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 },
};
