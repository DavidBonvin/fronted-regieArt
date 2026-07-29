import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getConfig,
  getHttpClient,
  initApiClient,
  resetHttpClient,
  getMe,
  searchUsers,
  getMyOrganizations,
  getOrganization,
  getOrganizationMembers,
  listSongs,
  listVenues,
  listEvents,
  getDaySheetMaster,
  listCategories,
  listEntries,
  listInstruments,
  listNotifications,
  listConversations,
  uploadFile,
  getAsset,
  deleteAsset,
} from '@regieart/api';
import type { StoredTokens } from '@regieart/api';
import type { FetchInterceptorResult } from './useFetchInterceptor';

// ─── Environment config ───────────────────────────────────────────────────────

type Env = 'local' | 'production';

const ENV_CONFIG: Record<Env, { apiBaseUrl: string; keycloakUrl: string; label: string }> = {
  local: {
    apiBaseUrl:  'http://localhost:3005/api/v1',
    keycloakUrl: 'http://localhost:8090',
    label: '🏠 Local',
  },
  production: {
    // /api-prod is a Vite dev-server proxy → https://regieart-backend-production.up.railway.app/api/v1
    // This avoids CORS issues when calling Railway from localhost:5173
    apiBaseUrl:  '/api-prod',
    keycloakUrl: 'https://keycloak-production-b2ce.up.railway.app',
    label: '🚀 Producción',
  },
};

function detectEnv(): Env {
  try {
    return getConfig().apiBaseUrl.includes('railway') ? 'production' : 'local';
  } catch {
    return 'local';
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type StepStatus = 'idle' | 'running' | 'ok' | 'fail' | 'skip';

interface StepState {
  status: StepStatus;
  httpStatus?: number;
  durationMs?: number;
  shapeValid?: boolean;
  missingKeys?: string[];
  detail?: string;
}

interface SuiteStep {
  id: string;
  module: string;
  fn: string;
}

type SuiteState = Record<string, StepState>;

interface QueueTestResult {
  status: 'idle' | 'running' | 'ok' | 'fail' | 'warn';
  detail: string;
}

interface StorageTestResult {
  status: 'idle' | 'running' | 'ok' | 'fail' | 'skip';
  detail: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SUITE_STEPS: SuiteStep[] = [
  { id: 'getMe',                  module: 'Users',         fn: 'getMe()' },
  { id: 'searchUsers',            module: 'Users',         fn: 'searchUsers({ q: "a" })' },
  { id: 'getMyOrganizations',     module: 'Orgs',          fn: 'getMyOrganizations()' },
  { id: 'getOrganization',        module: 'Orgs',          fn: 'getOrganization(orgId)' },
  { id: 'getOrganizationMembers', module: 'Orgs',          fn: 'getOrganizationMembers(orgId)' },
  { id: 'listSongs',              module: 'Songs',         fn: 'listSongs({ orgId })' },
  { id: 'listVenues',             module: 'Venues',        fn: 'listVenues()' },
  { id: 'listEvents',             module: 'Events',        fn: 'listEvents({ orgId })' },
  { id: 'getDaySheetMaster',      module: 'DaySheet',      fn: 'getDaySheetMaster(eventId)' },
  { id: 'listCategories',         module: 'Finance',       fn: 'listCategories(orgId)' },
  { id: 'listEntries',            module: 'Finance',       fn: 'listEntries({ orgId })' },
  { id: 'listInstruments',        module: 'Inventory',     fn: 'listInstruments({ orgId })' },
  { id: 'listNotifications',      module: 'Notifications', fn: 'listNotifications()' },
  { id: 'listConversations',      module: 'Messages',      fn: 'listConversations()' },
];

const VALID_MEMBER_ROLES = new Set(['OWNER', 'ADMIN', 'MEMBER', 'EXTERNAL_TECH']);

const INITIAL_SUITE_STATE: SuiteState = Object.fromEntries(
  SUITE_STEPS.map(s => [s.id, { status: 'idle' as StepStatus }]),
);

// ─── Asset-type metadata for storage tests ─────────────────────────────────

type AssetTypeMeta = {
  type:                 import('@regieart/types').AssetType;
  label:                string;
  accept:               string;
  suggestedFile:        string;
  acceptedContentTypes: string[];   // backend whitelist — from upload-policies.ts
  needsOrgId:           boolean;
  needsSongId:          boolean;
  needsEventId:         boolean;
};

const ASSET_TYPE_META: AssetTypeMeta[] = [
  { type: 'org-banner',       label: '🖼️  org-banner',       accept: 'image/*,.svg',     suggestedFile: 'afiche-produccion.svg → set content-type to image/png',           acceptedContentTypes: ['image/jpeg', 'image/png'],                              needsOrgId: true,  needsSongId: false, needsEventId: false },
  { type: 'user-avatar',      label: '👤  user-avatar',      accept: 'image/*',          suggestedFile: 'any JPEG/PNG image',                                          acceptedContentTypes: ['image/jpeg', 'image/png'],                              needsOrgId: false, needsSongId: false, needsEventId: false },
  { type: 'user-banner',      label: '🏷️  user-banner',      accept: 'image/*',          suggestedFile: 'any JPEG/PNG/WebP image',                                      acceptedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],                needsOrgId: false, needsSongId: false, needsEventId: false },
  { type: 'legal-document',   label: '📄  legal-document',   accept: '.pdf,image/*',     suggestedFile: 'any PDF or JPEG (mp3 as PDF: set content-type application/pdf)', acceptedContentTypes: ['application/pdf', 'image/jpeg'],                        needsOrgId: true,  needsSongId: false, needsEventId: false },
  { type: 'audio-track',      label: '🎵  audio-track',      accept: 'audio/*,.mp3',    suggestedFile: 'produccion-Le Petit Pêcheur-BanderaRoja.mp3',                  acceptedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],                 needsOrgId: true,  needsSongId: true,  needsEventId: false },
  { type: 'music-score',      label: '🎼  music-score',      accept: '.pdf,.svg',        suggestedFile: 'afiche-produccion.svg (image/svg+xml) or any PDF',            acceptedContentTypes: ['application/pdf', 'image/svg+xml'],                     needsOrgId: true,  needsSongId: true,  needsEventId: false },
  { type: 'reference-video',  label: '🎬  reference-video',  accept: 'video/*,.mp4',    suggestedFile: 'video.mp4  /  cai en la trampa.mp4',                           acceptedContentTypes: ['video/mp4', 'video/quicktime'],                         needsOrgId: true,  needsSongId: false, needsEventId: true  },
  { type: 'financial-receipt', label: '🧾  financial-receipt', accept: 'image/*,.pdf',    suggestedFile: 'any JPEG/PNG/PDF',                                             acceptedContentTypes: ['image/jpeg', 'image/png', 'application/pdf'],           needsOrgId: true,  needsSongId: false, needsEventId: true  },
  { type: 'technical-file',   label: '🔧  technical-file',   accept: '.xml,.txt,.patch', suggestedFile: 'any XML/TXT (no mediaTest files match natively)',              acceptedContentTypes: ['application/xml', 'text/plain', 'application/octet-stream'], needsOrgId: true,  needsSongId: false, needsEventId: true  },
];

function detectContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
    mp3: 'audio/mpeg',    wav: 'audio/wav', ogg: 'audio/ogg',  flac: 'audio/flac', aac: 'audio/aac',
    mp4: 'video/mp4',     webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mscz: 'application/zip', pdf: 'application/pdf', xml: 'application/xml',
  };
  return map[ext] ?? 'application/octet-stream';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validateShape(
  actual: unknown,
  requiredKeys: string[],
): { valid: boolean; missingKeys: string[] } {
  if (!actual || typeof actual !== 'object') return { valid: false, missingKeys: requiredKeys };
  const missing = requiredKeys.filter(k => !(k in (actual as object)));
  return { valid: missing.length === 0, missingKeys: missing };
}

function statusIcon(status: StepStatus | QueueTestResult['status'] | StorageTestResult['status']): string {
  switch (status) {
    case 'idle':    return '⚪';
    case 'running': return '🟡';
    case 'ok':      return '🟢';
    case 'fail':    return '🔴';
    case 'skip':    return '⏸️';
    case 'warn':    return '⚠️';
    default:        return '⚪';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  interceptor: FetchInterceptorResult;
}

// ─── ROPC Login ──────────────────────────────────────────────────────────────

async function loginWithROPC(
  username: string,
  password: string,
): Promise<void> {
  const cfg = getConfig();
  const tokenUrl = `${cfg.keycloakUrl}/realms/${cfg.realm}/protocol/openid-connect/token`;

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: cfg.clientId,
      username,
      password,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err['error_description'] as string | undefined) ?? `Keycloak ${res.status}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
  };

  const now = Date.now();
  await cfg.tokenAdapter.setTokens({
    accessToken:       data.access_token,
    refreshToken:      data.refresh_token,
    expiresAt:         now + data.expires_in * 1000,
    refreshExpiresAt:  now + data.refresh_expires_in * 1000,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ApiSuiteTab({ interceptor }: Props): React.ReactElement {
  const [currentEnv, setCurrentEnv] = useState<Env>(detectEnv);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState(false);
  const [loginUsername, setLoginUsername] = useState('teststorage@gmail.com');
  const [loginPassword, setLoginPassword] = useState('teststorage@gmail.com');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [suiteState, setSuiteState] = useState<SuiteState>(INITIAL_SUITE_STATE);
  const [queueTest, setQueueTest] = useState<QueueTestResult>({ status: 'idle', detail: '' });
  // ── Storage / Media test state ───────────────────────────────────────────
  const [mediaFile, setMediaFile]               = useState<File | null>(null);
  const [mediaAssetType, setMediaAssetType]     = useState<import('@regieart/types').AssetType>('org-banner');
  const [mediaContentType, setMediaContentType] = useState<string>('image/jpeg');
  const [mediaSongId, setMediaSongId]           = useState('');
  const [mediaEventId, setMediaEventId]         = useState('');
  const [mediaTest, setMediaTest]               = useState<StorageTestResult>({ status: 'idle', detail: '' });
  const [isRunning, setIsRunning]               = useState(false);

  // ── Full Storage Suite (mirrors docs/test-production.mjs) ─────────────
  const [fsFiles, setFsFiles] = useState<{
    svg:      File | null;
    mp3:      File | null;
    mp4Short: File | null;
    mp4Long:  File | null;
    mscz:     File | null;
  }>({ svg: null, mp3: null, mp4Short: null, mp4Long: null, mscz: null });
  const [fsResult, setFsResult]   = useState<StorageTestResult>({ status: 'idle', detail: '' });
  const [isFsRunning, setIsFsRunning] = useState(false);

  // Shared context extracted during the suite run
  const chainRef = useRef<{ firstOrgId?: string; firstEventId?: string }>({});

  // ── Auth check on mount ──────────────────────────────────────────────────
  const recheckAuth = useCallback(() => {
    try {
      getConfig()
        .tokenAdapter.getTokens()
        .then(t => setIsAuthenticated(t !== null))
        .catch(() => setIsAuthenticated(false));
    } catch {
      setConfigError(true);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => { recheckAuth(); }, [recheckAuth]);

  // ── Login handler ────────────────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    setLoginLoading(true);
    setLoginError('');
    try {
      await loginWithROPC(loginUsername, loginPassword);
      recheckAuth();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoginLoading(false);
    }
  }, [loginUsername, loginPassword, recheckAuth]);

  // ── Logout handler ───────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try { await getConfig().tokenAdapter.clearTokens(); } catch { /* ignore */ }
    setIsAuthenticated(false);
    setSuiteState(INITIAL_SUITE_STATE);
    chainRef.current = {};
  }, []);
  // ── Environment switcher ─────────────────────────────────────────────────
  const switchEnv = useCallback(async (env: Env) => {
    const envCfg = ENV_CONFIG[env];
    try {
      const current = getConfig();
      // Reset cached ky instance BEFORE reinitializing so next request picks up new URL
      resetHttpClient();
      initApiClient({
        ...current,
        apiBaseUrl:  envCfg.apiBaseUrl,
        keycloakUrl: envCfg.keycloakUrl,
      });
    } catch {
      // getConfig threw (not yet initialized) — ignore
    }
    setCurrentEnv(env);
    setIsAuthenticated(false);
    setLoginError('');
    setSuiteState(INITIAL_SUITE_STATE);
    chainRef.current = {};
    // Clear stored tokens so the user must re-login with the new env
    try { await getConfig().tokenAdapter.clearTokens(); } catch { /* ignore */ }
  }, []);
  // ── Step state helpers ───────────────────────────────────────────────────
  const setStep = useCallback((id: string, patch: Partial<StepState>) => {
    setSuiteState(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const resetSuite = useCallback(() => {
    setSuiteState(INITIAL_SUITE_STATE);
    chainRef.current = {};
  }, []);

  // ── Generic step runner ──────────────────────────────────────────────────
  const runStep = useCallback(
    async (
      id: string,
      fn: () => Promise<{ data: unknown; requiredKeys?: string[]; detail?: string }>,
    ): Promise<{ data: unknown; ok: boolean }> => {
      setStep(id, { status: 'running' });
      const start = performance.now();
      try {
        const { data, requiredKeys = [], detail } = await fn();
        const durationMs = Math.round(performance.now() - start);

        let shapeValid = true;
        let missingKeys: string[] = [];

        if (requiredKeys.length > 0) {
          const target = Array.isArray(data) ? (data as unknown[])[0] : data;
          if (target !== undefined && target !== null) {
            const r = validateShape(target, requiredKeys);
            shapeValid = r.valid;
            missingKeys = r.missingKeys;
          }
        }

        const autoDetail = detail ?? (Array.isArray(data)
          ? `${(data as unknown[]).length} item(s)${(data as unknown[]).length === 0 ? ' — empty, shape not verified' : ''}`
          : 'OK');

        setStep(id, { status: 'ok', durationMs, shapeValid, missingKeys, detail: autoDetail });
        return { data, ok: true };
      } catch (err: unknown) {
        const durationMs = Math.round(performance.now() - start);
        const detail = err instanceof Error ? err.message : String(err);
        setStep(id, { status: 'fail', durationMs, detail });
        return { data: null, ok: false };
      }
    },
    [setStep],
  );

  const skipStep = useCallback(
    (id: string, reason: string) => {
      setStep(id, { status: 'skip', detail: reason });
    },
    [setStep],
  );

  // ── 401 Queue Coalescing Test ────────────────────────────────────────────
  const run401Test = useCallback(async () => {
    if (!isAuthenticated) return;
    setQueueTest({ status: 'running', detail: 'Forcing token expiry…' });

    const cfg = getConfig();
    let originalTokens: StoredTokens | null = null;

    try {
      originalTokens = await cfg.tokenAdapter.getTokens();
      if (!originalTokens) {
        setQueueTest({ status: 'fail', detail: 'No tokens found — user not authenticated.' });
        return;
      }

      // Force expiry so beforeRequest hook triggers a refresh
      await cfg.tokenAdapter.setTokens({ ...originalTokens, expiresAt: Date.now() - 1000 });

      const countBefore = interceptor.refreshCountRef.current;
      setQueueTest({ status: 'running', detail: 'Firing 4 parallel requests…' });

      const results = await Promise.allSettled([
        getMe(),
        getMyOrganizations(),
        listVenues(),
        listNotifications(),
      ]);

      const refreshesMade = interceptor.refreshCountRef.current - countBefore;
      const allOk = results.every(r => r.status === 'fulfilled');

      if (refreshesMade === 1 && allOk) {
        setQueueTest({ status: 'ok', detail: `✅ Queue OK — exactly 1 refresh for 4 requests. All resolved successfully.` });
      } else if (refreshesMade > 1) {
        setQueueTest({ status: 'fail', detail: `❌ FAIL — ${refreshesMade} refreshes detected (race condition in queue).` });
      } else if (refreshesMade === 0) {
        setQueueTest({ status: 'warn', detail: `⚠️ WARN — 0 refreshes detected. Token may not have been expired or interceptor missed the call.` });
      } else {
        const failedCount = results.filter(r => r.status === 'rejected').length;
        setQueueTest({ status: 'fail', detail: `Refresh count: ${refreshesMade}, failed requests: ${failedCount}/4.` });
      }
    } catch (err: unknown) {
      setQueueTest({ status: 'fail', detail: err instanceof Error ? err.message : String(err) });
    } finally {
      // Always restore original tokens regardless of test outcome
      if (originalTokens) {
        await getConfig().tokenAdapter.setTokens(originalTokens).catch(() => null);
      }
    }
  }, [isAuthenticated, interceptor.refreshCountRef]);

  // ── Full Suite Runner ────────────────────────────────────────────────────
  const runFullSuite = useCallback(async () => {
    if (!isAuthenticated || isRunning) return;
    setIsRunning(true);
    resetSuite();
    chainRef.current = {};

    // Step 1: getMe
    const meRes = await runStep('getMe', async () => {
      const user = await getMe();
      return { data: user, requiredKeys: ['id', 'email', 'firstName', 'lastName'] };
    });

    // Step 2: searchUsers
    await runStep('searchUsers', async () => {
      const result = await searchUsers({ q: 'a', limit: 5 });
      return { data: result, requiredKeys: ['users', 'total'] };
    });

    // Step 3: getMyOrganizations — extracts firstOrgId
    const orgsRes = await runStep('getMyOrganizations', async () => {
      const orgs = await getMyOrganizations();
      if (orgs.length > 0) chainRef.current.firstOrgId = orgs[0].id;
      return { data: orgs, requiredKeys: ['id', 'name'] };
    });

    const { firstOrgId } = chainRef.current;

    if (!orgsRes.ok || !firstOrgId) {
      const reason = orgsRes.ok ? 'No organizations found — skipping org-dependent steps.' : 'getMyOrganizations failed.';
      ['getOrganization', 'getOrganizationMembers', 'listSongs', 'listEvents', 'getDaySheetMaster', 'listCategories', 'listEntries', 'listInstruments'].forEach(id => skipStep(id, reason));
    } else {
      // Step 4: getOrganization
      await runStep('getOrganization', async () => {
        const org = await getOrganization(firstOrgId);
        return { data: org, requiredKeys: ['id', 'name'] };
      });

      // Step 5: getOrganizationMembers — validate roles
      await runStep('getOrganizationMembers', async () => {
        const members = await getOrganizationMembers(firstOrgId);
        const invalidRoles = (members as Array<{ role?: string }>)
          .filter(m => m.role && !VALID_MEMBER_ROLES.has(m.role))
          .map(m => m.role);
        const detail = invalidRoles.length > 0
          ? `⚠️ Unknown roles found: ${invalidRoles.join(', ')}`
          : `${members.length} member(s) — all roles valid`;
        return { data: members, requiredKeys: ['userId', 'role'], detail };
      });

      // Step 6: listSongs
      await runStep('listSongs', async () => {
        const result = await listSongs({ orgId: firstOrgId, limit: 10 });
        return { data: result.songs, requiredKeys: ['id', 'title', 'orgId'] };
      });

      // Step 8: listEvents — extracts firstEventId
      const eventsRes = await runStep('listEvents', async () => {
        const result = await listEvents({ orgId: firstOrgId, limit: 10 });
        if (result.events.length > 0) chainRef.current.firstEventId = result.events[0].id;
        return { data: result.events, requiredKeys: ['id', 'title', 'status'] };
      });

      const { firstEventId } = chainRef.current;

      // Step 9: getDaySheetMaster
      if (!eventsRes.ok || !firstEventId) {
        skipStep('getDaySheetMaster', eventsRes.ok ? 'No events found — skipping daysheet.' : 'listEvents failed.');
      } else {
        await runStep('getDaySheetMaster', async () => {
          const ds = await getDaySheetMaster(firstEventId);
          return { data: ds, requiredKeys: ['event', 'schedule', 'roster', 'vehicles'] };
        });
      }

      // Step 10: listCategories
      await runStep('listCategories', async () => {
        const cats = await listCategories(firstOrgId);
        return { data: cats, requiredKeys: ['id', 'name', 'type'] };
      });

      // Step 11: listEntries
      await runStep('listEntries', async () => {
        const result = await listEntries({ orgId: firstOrgId, limit: 10 });
        return { data: result.entries, requiredKeys: ['id', 'amount', 'status'] };
      });

      // Step 12: listInstruments
      await runStep('listInstruments', async () => {
        const instruments = await listInstruments({ orgId: firstOrgId });
        return { data: instruments, requiredKeys: ['id', 'name', 'type', 'status'] };
      });
    }

    // Step 7: listVenues (no orgId needed)
    await runStep('listVenues', async () => {
      const venues = await listVenues();
      return { data: venues, requiredKeys: ['id', 'name', 'city'] };
    });

    // Step 13: listNotifications
    await runStep('listNotifications', async () => {
      const result = await listNotifications();
      return { data: result.notifications, requiredKeys: ['id', 'type', 'isRead'] };
    });

    // Step 14: listConversations
    await runStep('listConversations', async () => {
      const convs = await listConversations();
      return { data: convs, requiredKeys: ['userId', 'lastMessage'] };
    });

    setIsRunning(false);
  }, [isAuthenticated, isRunning, resetSuite, runStep, skipStep]);

  // ── Storage / Media Upload Test ──────────────────────────────────────────
  const runMediaTest = useCallback(async () => {
    if (!mediaFile) {
      setMediaTest({ status: 'fail', detail: 'Select a file first.' });
      return;
    }

    const meta = ASSET_TYPE_META.find(m => m.type === mediaAssetType)!;
    const { firstOrgId, firstEventId } = chainRef.current;
    const orgId = meta.needsOrgId ? firstOrgId : undefined;

    if (meta.needsOrgId && !orgId) {
      setMediaTest({ status: 'skip', detail: 'Run API Suite first to obtain an orgId (step 3).' });
      return;
    }

    const fileSizeKB = (mediaFile.size / 1024).toFixed(1);
    let assetId: string | null = null;

    // Temporary resources auto-created when the user leaves the ID fields empty
    let tempSongId:  string | null = null;
    let tempEventId: string | null = null;

    type AnyApiRes = { success: boolean; data: Record<string, unknown> };
    const client = getHttpClient();

    try {
      // ── Auto-create temp song if needed ────────────────────────────
      let resolvedSongId: string | undefined = meta.needsSongId
        ? (mediaSongId.trim() || undefined)
        : undefined;

      if (meta.needsSongId && !resolvedSongId) {
        setMediaTest({ status: 'running', detail: '⏳ Creating temporary song for the test…' });
        const songRes = await client.post('songs', {
          json: { orgId, title: `[DEV test] ${mediaAssetType} ${Date.now()}` },
        }).json<AnyApiRes>();
        tempSongId = songRes.data?.id as string | null;
        if (!tempSongId) throw new Error('Could not create temp song — no id in response');
        resolvedSongId = tempSongId;
      }

      // ── Auto-create temp event if needed ────────────────────────────
      let resolvedEventId: string | undefined = meta.needsEventId
        ? (mediaEventId.trim() || firstEventId || undefined)
        : undefined;

      if (meta.needsEventId && !resolvedEventId) {
        setMediaTest({ status: 'running', detail: '⏳ Creating temporary event for the test…' });
        const evRes = await client.post('events', {
          json: {
            orgId,
            title:     `[DEV test] ${mediaAssetType} ${Date.now()}`,
            type:      'REHEARSAL',
            startTime: '2026-09-01T18:00:00.000Z',
          },
        }).json<AnyApiRes>();
        tempEventId = evRes.data?.id as string | null;
        if (!tempEventId) throw new Error('Could not create temp event — no id in response');
        resolvedEventId = tempEventId;
      }

      // ── Upload ──────────────────────────────────────────────────────
      setMediaTest({
        status: 'running',
        detail: [
          `⏳ Step 1/3 — requesting presigned URL…`,
          `  file     : ${mediaFile.name}  (${fileSizeKB} KB)`,
          `  assetType: ${mediaAssetType}`,
          `  content  : ${mediaContentType}`,
          tempSongId  ? `  tempSong : ${tempSongId} (auto-created)`  : '',
          tempEventId ? `  tempEvent: ${tempEventId} (auto-created)` : '',
        ].filter(Boolean).join('\n'),
      });

      assetId = await uploadFile(mediaFile, mediaAssetType, mediaContentType, {
        orgId,
        songId:  resolvedSongId,
        eventId: resolvedEventId,
        displayName:  mediaFile.name.replace(/\.[^.]+$/, ''),
        originalName: mediaFile.name,
      });

      setMediaTest({ status: 'running', detail: `⏳ Step 2/3 — verifying asset…  (assetId: ${assetId})` });
      const asset = await getAsset(assetId);

      setMediaTest({
        status: 'ok',
        detail: [
          '✅ Upload → R2 PUT → Confirm → Get  —  all steps passed',
          `  assetId : ${assetId}`,
          `  status  : ${(asset as unknown as Record<string, unknown>)?.status ?? 'CONFIRMED'}`,
          `  size    : ${fileSizeKB} KB  (${mediaFile.size} B)`,
          `  type    : ${mediaAssetType}  /  ${mediaContentType}`,
          orgId              ? `  orgId   : ${orgId}`             : '',
          resolvedSongId     ? `  songId  : ${resolvedSongId}${tempSongId  ? ' (auto)' : ''}` : '',
          resolvedEventId    ? `  eventId : ${resolvedEventId}${tempEventId ? ' (auto)' : ''}` : '',
        ].filter(Boolean).join('\n'),
      });
    } catch (err: unknown) {
      let detail = err instanceof Error ? err.message : String(err);
      // Extract backend JSON body for richer diagnostics
      const response = (err as Record<string, unknown>)?.response as Response | undefined;
      if (response) {
        try {
          const body = await response.json() as Record<string, unknown>;
          const msg  = body?.error ?? body?.message ?? body;
          detail = `HTTP ${response.status}: ${JSON.stringify(msg)};\nfull body: ${JSON.stringify(body)}`;
        } catch { /* keep original message */ }
      }
      setMediaTest({ status: 'fail', detail });
    } finally {
      // Clean up asset
      if (assetId) {
        await deleteAsset(assetId).catch(() => null);
        setMediaTest(prev =>
          prev.status === 'ok'
            ? { ...prev, detail: prev.detail + '\n  🗑️ Cleanup: asset deleted from R2 + DB.' }
            : prev,
        );
      }
      // Clean up temp song/event (fire-and-forget, best effort)
      if (tempSongId)  await client.delete(`songs/${tempSongId}`).catch(() => null);
      if (tempEventId) await client.delete(`events/${tempEventId}`).catch(() => null);
    }
  }, [mediaFile, mediaAssetType, mediaContentType, mediaSongId, mediaEventId]);

  // ── Full Storage Suite (mirrors docs/test-production.mjs) ─────────────
  const runFullStorageSuite = useCallback(async () => {
    const { firstOrgId } = chainRef.current;
    if (!firstOrgId) {
      setFsResult({ status: 'fail', detail: '⚠️ Run the API Suite first to obtain an orgId (step 3).' });
      return;
    }

    setIsFsRunning(true);
    const client = getHttpClient();
    const lines: string[] = [];

    const log = (msg: string) => {
      lines.push(msg);
      setFsResult({ status: 'running', detail: lines.join('\n') });
    };

    let songId:  string | null = null;
    let eventId: string | null = null;
    const assetIds: string[]   = [];

    type AnyApiRes = { success: boolean; data: Record<string, unknown> };

    try {
      // ── SETUP: create temp song ──────────────────────────────────────
      log('⏳ SETUP 1/2 — POST /songs (recurso temporal)…');
      const songRes = await client.post('songs', {
        json: { orgId: firstOrgId, title: `[DEV test] Storage ${Date.now()}` },
      }).json<AnyApiRes>();
      songId = songRes.data?.id as string | null;
      if (!songId) throw new Error('Song creation failed — no id in response');
      log(`  ✅ Song creado: ${songId}`);

      // ── SETUP: create temp event ─────────────────────────────────────
      log('⏳ SETUP 2/2 — POST /events (recurso temporal)…');
      const evRes = await client.post('events', {
        json: {
          orgId:     firstOrgId,
          title:     `[DEV test] Storage event ${Date.now()}`,
          type:      'REHEARSAL',
          startTime: '2026-09-01T18:00:00.000Z',
        },
      }).json<AnyApiRes>();
      eventId = evRes.data?.id as string | null;
      if (!eventId) throw new Error('Event creation failed — no id in response');
      log(`  ✅ Event creado: ${eventId}`);

      // ── TEST 1: SVG → music-score ────────────────────────────────────
      if (fsFiles.svg) {
        log(`\n⏳ TEST 1 — ${fsFiles.svg.name}  (${(fsFiles.svg.size / 1024).toFixed(1)} KB)  →  music-score`);
        const id = await uploadFile(fsFiles.svg, 'music-score', 'image/svg+xml', {
          orgId: firstOrgId, songId,
          displayName: fsFiles.svg.name.replace(/\.[^.]+$/, ''),
          originalName: fsFiles.svg.name,
        });
        assetIds.push(id);
        log(`  ✅ music-score OK  (assetId: ${id})`);
      } else {
        log('  ⏸️ TEST 1 — SVG no seleccionado, saltado');
      }

      // ── TEST 2: MP3 → audio-track ────────────────────────────────────
      if (fsFiles.mp3) {
        const mb = (fsFiles.mp3.size / 1024 / 1024).toFixed(2);
        log(`\n⏳ TEST 2 — ${fsFiles.mp3.name}  (${mb} MB)  →  audio-track`);
        const id = await uploadFile(fsFiles.mp3, 'audio-track', 'audio/mpeg', {
          orgId: firstOrgId, songId,
          displayName: fsFiles.mp3.name.replace(/\.[^.]+$/, ''),
          originalName: fsFiles.mp3.name,
        });
        assetIds.push(id);
        log(`  ✅ audio-track OK  (assetId: ${id})`);
      } else {
        log('  ⏸️ TEST 2 — MP3 no seleccionado, saltado');
      }

      // ── TEST 3: Short MP4 → reference-video ─────────────────────────
      if (fsFiles.mp4Short) {
        const mb = (fsFiles.mp4Short.size / 1024 / 1024).toFixed(2);
        log(`\n⏳ TEST 3 — ${fsFiles.mp4Short.name}  (${mb} MB)  →  reference-video`);
        const id = await uploadFile(fsFiles.mp4Short, 'reference-video', 'video/mp4', {
          orgId: firstOrgId, eventId,
          displayName: fsFiles.mp4Short.name.replace(/\.[^.]+$/, ''),
          originalName: fsFiles.mp4Short.name,
        });
        assetIds.push(id);
        log(`  ✅ reference-video OK  (assetId: ${id})`);
      } else {
        log('  ⏸️ TEST 3 — MP4 corto no seleccionado, saltado');
      }

      // ── TEST 4: Large MP4 → reference-video (optional, ~270 MB) ──────
      if (fsFiles.mp4Long) {
        const mb = (fsFiles.mp4Long.size / 1024 / 1024).toFixed(2);
        log(`\n⏳ TEST 4 — ${fsFiles.mp4Long.name}  (${mb} MB)  →  reference-video  ⚠️ archivo grande, puede tardar`);
        const id = await uploadFile(fsFiles.mp4Long, 'reference-video', 'video/mp4', {
          orgId: firstOrgId, eventId,
          displayName: fsFiles.mp4Long.name.replace(/\.[^.]+$/, ''),
          originalName: fsFiles.mp4Long.name,
        });
        assetIds.push(id);
        log(`  ✅ reference-video (${mb} MB) OK  (assetId: ${id})`);
      } else {
        log('  ⏸️ TEST 4 — MP4 grande no seleccionado (opcional), saltado');
      }

      // ── TEST 5: .mscz → expects HTTP 400 (formato no soportado) ──────
      if (fsFiles.mscz) {
        log(`\n⏳ TEST 5 — ${fsFiles.mscz.name}  →  music-score  (espera HTTP 400 — formato no soportado)`);
        try {
          await uploadFile(fsFiles.mscz, 'music-score', 'application/octet-stream', {
            orgId: firstOrgId, songId, originalName: fsFiles.mscz.name,
          });
          log('  ❌ FAIL — Se esperaba 400 pero el upload fue exitoso. El backend no rechazó .mscz.');
        } catch (err: unknown) {
          const resp = (err as Record<string, unknown>)?.response as Response | undefined;
          if (resp?.status === 400) {
            log('  ✅ Backend rechazó correctamente → HTTP 400');
          } else {
            log(`  ⚠️  Recibido HTTP ${resp?.status ?? 'unknown'} (se esperaba 400)`);
          }
        }
      } else {
        log('  ⏸️ TEST 5 — .mscz no seleccionado, saltado');
      }

      // ── TEST 6: Search assets ────────────────────────────────────────
      log('\n⏳ TEST 6 — GET /storage/assets (búsqueda)');
      const searchRes = await client.get('storage/assets', {
        searchParams: { orgId: firstOrgId, limit: '20', orderBy: 'createdAt', order: 'desc' },
      }).json<{ data: { total: number; items: Record<string, unknown>[] } }>();
      const total = searchRes.data?.total ?? 0;
      const items = searchRes.data?.items ?? [];
      log(`  ✅ ${total} assets en la org`);
      items.slice(0, 5).forEach(a => {
        log(`    [${a.status}] ${a.displayName ?? a.originalName ?? a.key}  (${a.assetType})`);
      });

      // ── TEST 7: Download URLs ────────────────────────────────────────
      if (assetIds.length > 0) {
        log('\n⏳ TEST 7 — GET /storage/assets/:id/download');
        for (const assetId of assetIds) {
          const dlRes = await client
            .get(`storage/assets/${assetId}/download`)
            .json<{ data: { downloadUrl: string } }>();
          const url = dlRes.data?.downloadUrl ?? '';
          log(`  ✅ ${assetId.slice(-8)} → ${url.substring(0, 70)}…`);
        }
      }

      const passed = [
        fsFiles.svg      && '✅ TEST 1  music-score (SVG)',
        fsFiles.mp3      && '✅ TEST 2  audio-track (MP3)',
        fsFiles.mp4Short && '✅ TEST 3  reference-video (MP4 corto)',
        fsFiles.mp4Long  && '✅ TEST 4  reference-video (MP4 grande)',
        fsFiles.mscz     && '✅ TEST 5  formato no soportado → 400',
        '✅ TEST 6  búsqueda de assets',
        assetIds.length > 0 && '✅ TEST 7  download URLs',
      ].filter(Boolean);

      setFsResult({
        status: 'ok',
        detail: lines.join('\n') + `\n\n── RESULTADO ──\n${passed.join('\n')}\n\n🗑️ Limpiando recursos temporales…`,
      });

    } catch (err: unknown) {
      let detail = err instanceof Error ? err.message : String(err);
      const resp = (err as Record<string, unknown>)?.response as Response | undefined;
      if (resp) {
        try {
          const body = await resp.json() as Record<string, unknown>;
          const msg  = body?.error ?? body?.message ?? body;
          detail = `HTTP ${resp.status}: ${JSON.stringify(msg)}`;
        } catch { /* keep original */ }
      }
      setFsResult({ status: 'fail', detail: lines.join('\n') + `\n\n❌ Error: ${detail}` });

    } finally {
      for (const id of assetIds) {
        await deleteAsset(id).catch(() => null);
      }
      if (eventId) await client.delete(`events/${eventId}`).catch(() => null);
      if (songId)  await client.delete(`songs/${songId}`).catch(() => null);
      setIsFsRunning(false);
      setFsResult(prev =>
        prev.status === 'ok'
          ? {
              ...prev,
              detail: prev.detail.replace(
                '🗑️ Limpiando recursos temporales…',
                `🗑️ Limpieza completa — ${assetIds.length} asset(s) + song + event eliminados.`,
              ),
            }
          : prev,
      );
    }
  }, [fsFiles]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (isAuthenticated === null) {
    return <p style={s.muted}>Checking authentication…</p>;
  }

  const envBar = (
    <div style={s.envBar}>
      <span style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>ENTORNO:</span>
      {(['local', 'production'] as Env[]).map(env => (
        <button
          key={env}
          style={{
            ...s.envBtn,
            ...(currentEnv === env ? s.envBtnActive : {}),
          }}
          onClick={() => switchEnv(env)}
        >
          {ENV_CONFIG[env].label}
        </button>
      ))}
      <span style={{ color: colors.muted, fontSize: 11, marginLeft: 8, fontFamily: 'monospace' }}>
        {ENV_CONFIG[currentEnv].apiBaseUrl}
      </span>
    </div>
  );

  if (configError) {
    return (
      <div style={s.authError}>
        [CONFIG ERROR] initApiClient() was never called. Verify that{' '}
        <code>import './shared/api/client'</code> exists in main.tsx.
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        {envBar}
        <div style={{ ...s.section, maxWidth: 420, marginTop: 16 }}>
          <h3 style={s.sectionTitle}>🔑 DEV Login (Keycloak ROPC)</h3>
          <p style={s.muted}>
            Usa las credenciales de prueba para obtener tokens sin necesitar el flujo PKCE.
          </p>

          <label style={s.label}>Usuario</label>
          <input
            style={s.input}
            type="email"
            value={loginUsername}
            onChange={e => setLoginUsername(e.target.value)}
            placeholder="teststorage@gmail.com"
          />

          <label style={s.label}>Contraseña</label>
          <input
            style={s.input}
            type="password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            placeholder="••••••••"
          />

          {loginError && (
            <div style={{ ...s.result, color: colors.fail, marginBottom: 12 }}>
              ❌ {loginError}
            </div>
          )}

          <button
            style={{ ...s.btn, width: '100%', marginTop: 4, opacity: loginLoading ? 0.6 : 1 }}
            onClick={handleLogin}
            disabled={loginLoading}
          >
            {loginLoading ? '⏳ Autenticando…' : '▶ Login y ejecutar playground'}
          </button>

          <p style={{ ...s.muted, marginTop: 12, fontSize: 11 }}>
            client_id: <code>regieart-mobile</code> · grant_type: password · DEV only
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>

      {/* ── Env toggle ── */}
      {envBar}

      {/* ── Auth bar ── */}
      <div style={s.authBar}>
        <span style={{ color: colors.ok }}>🟢 Autenticado</span>
        <span style={{ color: colors.muted, fontSize: 12 }}>{loginUsername}</span>
        <button style={{ ...s.btn, background: colors.surface2, fontSize: 12, padding: '4px 12px' }} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>

      {/* ── 401 Queue Test ── */}
      <section style={s.section}>
        <h3 style={s.sectionTitle}>401 Queue Coalescing Test</h3>
        <p style={s.muted}>
          Forces token expiry, fires 4 parallel requests, and verifies exactly 1 Keycloak refresh.
        </p>
        <button style={s.btn} onClick={run401Test} disabled={queueTest.status === 'running'}>
          {queueTest.status === 'running' ? '⏳ Running…' : '▶ Test 401 Queue'}
        </button>
        {queueTest.status !== 'idle' && (
          <div style={{ ...s.result, color: queueTest.status === 'ok' ? colors.ok : queueTest.status === 'fail' ? colors.fail : colors.warn }}>
            {statusIcon(queueTest.status)} {queueTest.detail}
          </div>
        )}
      </section>

      {/* ── Endpoint Suite ── */}
      <section style={s.section}>
        <h3 style={s.sectionTitle}>Endpoint Suite</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button style={s.btn} onClick={runFullSuite} disabled={isRunning}>
            {isRunning ? '⏳ Running Suite…' : '▶ Run Full Suite'}
          </button>
          <button style={{ ...s.btn, background: colors.surface2 }} onClick={resetSuite} disabled={isRunning}>
            Reset
          </button>
        </div>

        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Module', 'Function', 'Time (ms)', 'Result', 'Shape', 'Detail'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUITE_STEPS.map(step => {
                const st = suiteState[step.id];
                const resultColor =
                  st.status === 'ok' ? colors.ok :
                  st.status === 'fail' ? colors.fail :
                  st.status === 'skip' ? colors.skip :
                  st.status === 'running' ? colors.warn :
                  colors.muted;
                return (
                  <tr key={step.id}>
                    <td style={s.td}>{step.module}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{step.fn}</td>
                    <td style={s.td}>{st.durationMs != null ? `${st.durationMs}ms` : '—'}</td>
                    <td style={{ ...s.td, color: resultColor, fontWeight: 600 }}>
                      {statusIcon(st.status)} {st.status.toUpperCase()}
                    </td>
                    <td style={s.td}>
                      {st.shapeValid === undefined ? '—' :
                       st.shapeValid ? '✅' :
                       `❌ missing: ${st.missingKeys?.join(', ')}`}
                    </td>
                    <td style={{ ...s.td, color: colors.muted, fontSize: 12, maxWidth: 300 }}>
                      {st.detail ?? ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Storage Media Test ── */}
      <section style={s.section}>
        <h3 style={s.sectionTitle}>Storage R2 — Media File Test</h3>
        <p style={s.muted}>
          Select a file from <code>MediasTest/</code>, choose the asset type, and run the full flow:
          presigned-upload → PUT to R2 → confirm → get → delete.
        </p>

        {/* Asset type selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: colors.muted, fontSize: 12, minWidth: 88 }}>Asset type:</span>
            <select
              value={mediaAssetType}
              onChange={e => {
                const next = e.target.value as import('@regieart/types').AssetType;
                setMediaAssetType(next);
                // Auto-set content type to first accepted value for the new type
                const nextMeta = ASSET_TYPE_META.find(m => m.type === next);
                if (nextMeta) setMediaContentType(nextMeta.acceptedContentTypes[0]);
              }}
              style={{ background: colors.surface2, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
            >
              {ASSET_TYPE_META.map(m => (
                <option key={m.type} value={m.type}>
                  {m.label}
                  {m.needsSongId ? '  ⚠️ needs songId' : ''}
                  {m.needsEventId ? '  ⚠️ needs eventId' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Content-type — editable, backend-validated */}
          {(() => {
            const meta = ASSET_TYPE_META.find(m => m.type === mediaAssetType)!;
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: colors.muted, fontSize: 12, minWidth: 88 }}>Content-Type:</span>
                  <input
                    type="text"
                    value={mediaContentType}
                    onChange={e => setMediaContentType(e.target.value)}
                    style={{ width: 260, background: colors.surface2, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'monospace' }}
                  />
                  <span style={{ color: colors.muted, fontSize: 11 }}>
                    accepted: {meta.acceptedContentTypes.map(ct => (
                      <button
                        key={ct}
                        onClick={() => setMediaContentType(ct)}
                        style={{ marginLeft: 4, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, color: colors.muted, cursor: 'pointer', fontSize: 11, padding: '1px 6px' }}
                      >
                        {ct}
                      </button>
                    ))}
                  </span>
                </div>

                {/* File picker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: colors.muted, fontSize: 12, minWidth: 88 }}>File:</span>
                  <input
                    type="file"
                    accept={meta.accept}
                    onChange={e => {
                      const f = e.target.files?.[0] ?? null;
                      setMediaFile(f);
                      // Auto-detect content type but cap to accepted list
                      if (f) {
                        const detected = detectContentType(f);
                        setMediaContentType(
                          meta.acceptedContentTypes.includes(detected)
                            ? detected
                            : meta.acceptedContentTypes[0],
                        );
                      }
                    }}
                    style={{ color: colors.text, fontSize: 12 }}
                  />
                </div>
                <p style={{ ...s.muted, fontSize: 11, margin: '2px 0 0 96px' }}>
                  📌 MediasTest suggestion: <strong>{meta.suggestedFile}</strong>
                </p>

                {/* Extra IDs when required */}
                {meta.needsSongId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: colors.warn, fontSize: 12, minWidth: 88 }}>Song ID:</span>
                    <input
                      type="text"
                      placeholder="Optional — leave blank to auto-create a temp song"
                      value={mediaSongId}
                      onChange={e => setMediaSongId(e.target.value)}
                      style={{ flex: 1, maxWidth: 340, background: colors.surface2, color: colors.text, border: `1px solid ${colors.warn}`, borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
                    />
                  </div>
                )}
                {meta.needsEventId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: colors.warn, fontSize: 12, minWidth: 88 }}>Event ID:</span>
                    <input
                      type="text"
                      placeholder="Optional — leave blank to auto-create a temp event"
                      value={mediaEventId}
                      onChange={e => setMediaEventId(e.target.value)}
                      style={{ flex: 1, maxWidth: 340, background: colors.surface2, color: colors.text, border: `1px solid ${colors.warn}`, borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
                    />
                    {chainRef.current.firstEventId && !mediaEventId && (
                      <span style={{ color: colors.muted, fontSize: 11 }}>
                        (auto: {chainRef.current.firstEventId})
                      </span>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {mediaFile && (
          <p style={{ ...s.muted, fontSize: 11, marginBottom: 8 }}>
            Selected: <strong>{mediaFile.name}</strong> — {(mediaFile.size / 1024).toFixed(1)} KB — sending as <strong style={{ color: colors.warn }}>{mediaContentType}</strong>
          </p>
        )}

        <button
          style={{ ...s.btn, opacity: mediaTest.status === 'running' ? 0.6 : 1 }}
          onClick={runMediaTest}
          disabled={mediaTest.status === 'running' || !mediaFile}
        >
          {mediaTest.status === 'running' ? '⏳ Running…' : '▶ Test Upload Flow'}
        </button>

        {mediaTest.status !== 'idle' && (
          <pre style={{
            ...s.result,
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: 12,
            color: mediaTest.status === 'ok'   ? colors.ok
                 : mediaTest.status === 'fail'  ? colors.fail
                 : mediaTest.status === 'skip'  ? colors.skip
                 : colors.muted,
          }}>
            {statusIcon(mediaTest.status)} {mediaTest.detail}
          </pre>
        )}
      </section>

      {/* ── Full Storage Suite ── */}
      <section style={s.section}>
        <h3 style={s.sectionTitle}>Storage Suite — Todos los formatos</h3>
        <p style={s.muted}>
          Replica <code>docs/test-production.mjs</code>: crea song + event temporales, sube todos los
          formatos, prueba .mscz (espera 400), busca assets y obtiene URLs de descarga. Elimina todo al final.
          Requiere que el API Suite haya corrido primero (necesita orgId del paso 3).
        </p>

        {/* File pickers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {([
            { key: 'svg'     , label: '📄 TEST 1 — SVG → music-score',                      accept: '.svg,image/svg+xml'  },
            { key: 'mp3'     , label: '🎵 TEST 2 — MP3 → audio-track',                      accept: '.mp3,audio/mpeg'     },
            { key: 'mp4Short', label: '🎬 TEST 3 — MP4 corto → reference-video',             accept: '.mp4,video/mp4'      },
            { key: 'mp4Long' , label: '🎬 TEST 4 — MP4 grande → reference-video (opcional)', accept: '.mp4,video/mp4'      },
            { key: 'mscz'    , label: '🔴 TEST 5 — .mscz → espera HTTP 400',                 accept: '.mscz'               },
          ] as const).map(({ key, label, accept }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: colors.muted, fontSize: 12, minWidth: 360 }}>{label}</span>
              <input
                type="file"
                accept={accept}
                onChange={e => setFsFiles(prev => ({ ...prev, [key]: e.target.files?.[0] ?? null }))}
                style={{ color: colors.text, fontSize: 12 }}
              />
              {fsFiles[key] && (
                <span style={{ color: colors.ok, fontSize: 11 }}>
                  {fsFiles[key]!.name}  ({(fsFiles[key]!.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              )}
            </div>
          ))}
        </div>

        <button
          style={{ ...s.btn, opacity: isFsRunning ? 0.6 : 1 }}
          onClick={runFullStorageSuite}
          disabled={isFsRunning}
        >
          {isFsRunning ? '⏳ Running Full Suite…' : '▶ Run Full Storage Suite'}
        </button>

        {fsResult.status !== 'idle' && (
          <pre style={{
            ...s.result,
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: 12,
            maxHeight: 520,
            overflowY: 'auto',
            color: fsResult.status === 'ok'   ? colors.ok
                 : fsResult.status === 'fail'  ? colors.fail
                 : colors.muted,
          }}>
            {statusIcon(fsResult.status)} {fsResult.detail}
          </pre>
        )}
      </section>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  skip:    '#a78bfa',
};

const s: Record<string, React.CSSProperties> = {
  container:    { display: 'flex', flexDirection: 'column', gap: 24 },
  envBar:       { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#0d1a2e', borderRadius: 8, border: `1px solid ${colors.border}`, flexWrap: 'wrap' },
  envBtn:       { padding: '4px 14px', background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 20, color: colors.muted, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  envBtnActive: { background: '#1d4ed8', borderColor: '#3b82f6', color: '#fff' },
  authBar:      { display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}` },
  section:      { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 20 },
  sectionTitle: { margin: '0 0 8px', fontSize: 15, color: colors.text, fontWeight: 600 },
  muted:        { color: colors.muted, fontSize: 13, margin: '0 0 12px' },
  label:        { display: 'block', color: colors.muted, fontSize: 12, marginBottom: 4, marginTop: 12 },
  input:        {
    width: '100%', boxSizing: 'border-box', padding: '8px 12px',
    background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6,
    color: colors.text, fontSize: 14, outline: 'none',
  },
  btn: {
    padding: '7px 16px', background: '#3b82f6', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
  },
  result: { marginTop: 10, fontSize: 13, padding: '8px 12px', background: colors.surface2, borderRadius: 6 },
  tableWrapper: { overflowX: 'auto' },
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:     { textAlign: 'left', padding: '8px 12px', color: colors.muted, fontWeight: 500, borderBottom: `1px solid ${colors.border}` },
  td:     { padding: '8px 12px', color: colors.text, borderBottom: `1px solid ${colors.border}`, verticalAlign: 'top' },
  authError: {
    background: '#450a0a', border: '1px solid #ef4444', borderRadius: 8,
    padding: 16, color: '#fca5a5', fontFamily: 'monospace', fontSize: 14,
  },
};
