import React, { useState } from 'react';
import { useFetchInterceptor } from './useFetchInterceptor';
import { ApiSuiteTab } from './ApiSuiteTab';
import { DevToolsTab } from './DevToolsTab';
import { WriteSuiteTab } from './WriteSuiteTab';

type Tab = 'suite' | 'write' | 'devtools';

export default function ApiPlayground(): React.ReactElement | null {
  const interceptor = useFetchInterceptor();
  const [activeTab, setActiveTab] = useState<Tab>('suite');

  if (!import.meta.env.DEV) return null;

  return (
    <div style={s.root}>
      <div style={s.header}>
        <span style={s.badge}>DEV</span>
        <h1 style={s.heading}>RégieArt API Playground</h1>
        <span style={s.url}>{import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3005/api/v1'}</span>
      </div>

      <div style={s.tabs}>
        {(['suite', 'write', 'devtools'] as Tab[]).map(tab => (
          <button
            key={tab}
            style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'suite' ? '🧪 API Suite' : tab === 'write' ? '✍️ Write Suite' : '🛠️ DevTools'}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {activeTab === 'suite'    ? <ApiSuiteTab interceptor={interceptor} />
         : activeTab === 'write' ? <WriteSuiteTab />
         : <DevToolsTab interceptor={interceptor} />}
      </div>
    </div>
  );
}

const colors = {
  bg:     '#0f172a',
  border: '#334155',
  text:   '#f1f5f9',
  muted:  '#94a3b8',
};

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: colors.bg,
    color: colors.text,
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: 24,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    borderBottom: `1px solid ${colors.border}`,
    paddingBottom: 16,
  },
  badge: {
    background: '#7c3aed',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    padding: '3px 7px',
    borderRadius: 4,
  },
  heading: { margin: 0, fontSize: 20, fontWeight: 700, color: colors.text },
  url:     { marginLeft: 'auto', fontSize: 12, color: colors.muted, fontFamily: 'monospace' },
  tabs:    { display: 'flex', gap: 4, marginBottom: 20 },
  tab:     {
    padding: '8px 20px',
    background: 'transparent',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: 6,
    color: colors.muted,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  tabActive: {
    background: '#1e293b',
    color: colors.text,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#3b82f6',
  },
  content: { maxWidth: 1200 },
};
