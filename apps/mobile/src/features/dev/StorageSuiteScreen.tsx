import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { createSong, deleteAsset, getAsset, getConfig, getHttpClient, getMyOrganizations, resetHttpClient, uploadFile } from '@regieart/api';
import type { AssetType } from '@regieart/types';
import { storeUserTokens } from '../../shared/api/client';

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  bg:      '#0f172a',
  surface: '#1e293b',
  surface2:'#263248',
  border:  '#334155',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  ok:      '#22c55e',
  fail:    '#ef4444',
  warn:    '#f59e0b',
  info:    '#3b82f6',
};

// ─── ROPC login helper ────────────────────────────────────────────────────────

async function loginROPC(username: string, password: string): Promise<void> {
  const cfg = getConfig();
  const url = `${cfg.keycloakUrl}/realms/${cfg.realm}/protocol/openid-connect/token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', client_id: cfg.clientId, username, password }).toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err['error_description'] as string | undefined) ?? `Keycloak ${res.status}`);
  }
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number; refresh_expires_in: number };
  await storeUserTokens(data.access_token, data.refresh_token, data.expires_in, data.refresh_expires_in);
  resetHttpClient(); // force new client to pick up fresh tokens
}

// ─── Minimal 1×1 transparent PNG (Base64) ────────────────────────────────────
// Used for the automated synthesized-file test (no user interaction needed).
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Asset type definitions ─────────────────────────────────────────────────
// Mirrors ASSET_TYPE_META from ApiSuiteTab.tsx (desktop playground).

interface AssetDef {
  type: AssetType;
  needsOrgId: boolean;
  needsSongId: boolean;
  needsEventId: boolean;
}

const MIME_TO_ASSET: Record<string, AssetDef> = {
  'image/jpeg':      { type: 'user-avatar',     needsOrgId: false, needsSongId: false, needsEventId: false },
  'image/png':       { type: 'user-avatar',     needsOrgId: false, needsSongId: false, needsEventId: false },
  'image/webp':      { type: 'user-avatar',     needsOrgId: false, needsSongId: false, needsEventId: false },
  'image/heic':      { type: 'user-avatar',     needsOrgId: false, needsSongId: false, needsEventId: false },
  'image/heif':      { type: 'user-avatar',     needsOrgId: false, needsSongId: false, needsEventId: false },
  'audio/mpeg':      { type: 'audio-track',     needsOrgId: true,  needsSongId: true,  needsEventId: false },
  'audio/wav':       { type: 'audio-track',     needsOrgId: true,  needsSongId: true,  needsEventId: false },
  'audio/ogg':       { type: 'audio-track',     needsOrgId: true,  needsSongId: true,  needsEventId: false },
  'audio/mp4':       { type: 'audio-track',     needsOrgId: true,  needsSongId: true,  needsEventId: false },
  'video/mp4':       { type: 'reference-video', needsOrgId: true,  needsSongId: false, needsEventId: true  },
  'video/quicktime': { type: 'reference-video', needsOrgId: true,  needsSongId: false, needsEventId: true  },
  'video/x-m4v':     { type: 'reference-video', needsOrgId: true,  needsSongId: false, needsEventId: true  },
  'application/pdf': { type: 'legal-document',  needsOrgId: true,  needsSongId: false, needsEventId: false },
};

/** MIME → AssetDef.  Falls back to legal-document (orgId required) for unknowns. */
function getAssetDef(mime: string): AssetDef {
  return MIME_TO_ASSET[mime.toLowerCase()]
    ?? { type: 'legal-document', needsOrgId: true, needsSongId: false, needsEventId: false };
}

// ─── Temp resource factories ──────────────────────────────────────────────────

async function createTempSong(orgId: string): Promise<string> {
  const song = await createSong({
    orgId,
    title: `[DEV Storage Test] ${Date.now()}`,
    composer: 'StorageSuite',
  });
  return song.id;
}

async function createTempEvent(orgId: string): Promise<string> {
  type R = { success: boolean; data: Record<string, unknown> };
  const evRes = await getHttpClient().post('events', {
    json: {
      orgId,
      title: `[DEV Storage Test] ${Date.now()}`,
      type: 'CONCERT',
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      endTime:   new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      isPublic: false,
    },
  }).json<R>();
  return evRes.data.id as string;
}

/** Format bytes → human readable. */
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Per-test state ───────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'running' | 'ok' | 'fail';

interface TestState {
  status: TestStatus;
  detail: string;
}

const INIT: TestState = { status: 'idle', detail: '' };

// ─── Full upload → verify → delete cycle ─────────────────────────────────────

async function runUploadCycle(
  log: (msg: string) => void,
  fileUri: string,
  assetType: AssetType,
  contentType: string,
  displayName: string,
  options: { orgId?: string; songId?: string; eventId?: string } = {},
): Promise<void> {
  const sizeInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
  const bytes = (sizeInfo as unknown as { size?: number }).size ?? 0;
  log(`  📂 Archivo: ${displayName}  ${fmtBytes(bytes)}  (${contentType})`);
  const idInfo = [options.orgId && `orgId:…${options.orgId.slice(-8)}`, options.songId && `songId:…${options.songId.slice(-8)}`, options.eventId && `eventId:…${options.eventId.slice(-8)}`].filter(Boolean).join('  ');
  if (idInfo) log(`  ℹ️ ${idInfo}`);

  log('  ⏳ POST /storage/presigned-upload → PUT R2 → POST confirm-upload…');
  const assetId = await uploadFile(fileUri, assetType, contentType, {
    displayName,
    originalName: displayName,
    ...options,
  });
  log(`  ✅ Subido → assetId: ${assetId}`);

  log('  ⏳ GET /storage/assets/:id…');
  const asset = await getAsset(assetId);
  log(`  ✅ Asset: status=${asset.status}  type=${asset.assetType}  key=${asset.key.slice(-32)}`);

  log('  ⏳ DELETE /storage/assets/:id…');
  await deleteAsset(assetId);
  log('  ✅ Asset eliminado');
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StorageSuiteScreen() {
  const [email,    setEmail]    = useState('teststorage@gmail.com');
  const [password, setPassword] = useState('teststorage@gmail.com');
  const [loginState, setLoginState] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle');
  const [orgLabel, setOrgLabel] = useState('');  // display only
  const orgIdRef = useRef<string | null>(null);   // used by tests that need orgId

  const [autoTest,   setAutoTest]   = useState<TestState>(INIT);
  const [cameraTest, setCameraTest] = useState<TestState>(INIT);
  const [galleryTest,setGalleryTest]= useState<TestState>(INIT);
  const [docTest,    setDocTest]    = useState<TestState>(INIT);

  // Global log (all tests write here)
  const [globalLog, setGlobalLog] = useState('');
  const logLinesRef = useRef<string[]>([]);
  const scrollRef   = useRef<ScrollView>(null);

  const appendGlobal = useCallback((msg: string) => {
    logLinesRef.current.push(msg);
    setGlobalLog(logLinesRef.current.join('\n'));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
  }, []);

  const handleCopyLogs = useCallback(async () => {
    if (!globalLog) return;
    await Share.share({ message: globalLog });
  }, [globalLog]);

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    setLoginState('running');
    appendGlobal('⏳ Login ROPC…');
    try {
      await loginROPC(email, password);
      appendGlobal('  ✅ Tokens guardados en SecureStore');

      // Auto-fetch the user's first organisation so tests can pass orgId.
      const orgs = await getMyOrganizations();
      if (orgs.length > 0) {
        orgIdRef.current = orgs[0].id;
        setOrgLabel(`"🏢 ${orgs[0].name}"  (…${orgs[0].id.slice(-8)})`);
        appendGlobal(`  ✅ Org: ${orgs[0].name}  (${orgs[0].id})\n`);
      } else {
        setOrgLabel('(sin organizaciones — los tests con orgId fallarán)');
        appendGlobal('  ⚠️ Sin organizaciones. Tests que requieren orgId fallarán.\n');
      }

      setLoginState('ok');
    } catch (err) {
      setLoginState('fail');
      appendGlobal(`❌ Login fallido: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }, [email, password, appendGlobal]);

  // ── TEST 1: Auto — Synthesized 1×1 PNG ─────────────────────────────────────
  const runAutoTest = useCallback(async () => {
    setAutoTest({ status: 'running', detail: '' });
    const lines: string[] = [];
    const log = (msg: string) => {
      lines.push(msg);
      setAutoTest({ status: 'running', detail: lines.join('\n') });
      appendGlobal(msg);
    };

    const tempUri = (FileSystem.cacheDirectory ?? '') + 'regieart-test-auto.png';
    try {
      log('━━━ TEST AUTO — PNG sintetizado (1×1 px) ━━━');

      // Write the tiny PNG to disk
      log('  ⏳ Escribiendo archivo PNG de prueba en disco…');
      await FileSystem.writeAsStringAsync(tempUri, TINY_PNG_B64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      log('  ✅ Archivo PNG escrito en caché local');

      await runUploadCycle(
        log, tempUri, 'user-avatar', 'image/png',
        'regieart-test-auto.png',
        {},
      );

      log('  ✅ TEST AUTO COMPLETADO\n');
      setAutoTest({ status: 'ok', detail: lines.join('\n') });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`  ❌ ERROR: ${msg}\n`);
      setAutoTest({ status: 'fail', detail: lines.join('\n') });
    } finally {
      // Clean up temp file
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    }
  }, [appendGlobal]);

  // ── TEST 2: Camera ──────────────────────────────────────────────────────────
  const runCameraTest = useCallback(async () => {
    setCameraTest({ status: 'running', detail: '' });
    const lines: string[] = [];
    const log = (msg: string) => {
      lines.push(msg);
      setCameraTest({ status: 'running', detail: lines.join('\n') });
      appendGlobal(msg);
    };

    try {
      log('━━━ TEST CÁMARA — Foto en vivo ━━━');

      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        log('  ❌ Permiso de cámara denegado');
        setCameraTest({ status: 'fail', detail: lines.join('\n') });
        return;
      }
      log('  ✅ Permiso de cámara concedido');

      // Launch camera
      log('  📷 Abriendo cámara…');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) {
        log('  ⏸️ Captura cancelada por el usuario');
        setCameraTest({ status: 'idle', detail: lines.join('\n') });
        return;
      }

      const photo = result.assets[0];
      const mimeType = photo.mimeType ?? 'image/jpeg';
      log(`  ✅ Foto capturada: ${photo.width}×${photo.height}px  MIME: ${mimeType}`);

      await runUploadCycle(
        log, photo.uri, 'user-avatar', mimeType,
        `camera-photo-${Date.now()}.jpg`,
        {},
      );

      log('  ✅ TEST CÁMARA COMPLETADO\n');
      setCameraTest({ status: 'ok', detail: lines.join('\n') });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`  ❌ ERROR: ${msg}\n`);
      setCameraTest({ status: 'fail', detail: lines.join('\n') });
    }
  }, [appendGlobal]);

  // ── TEST 3: Gallery ─────────────────────────────────────────────────────────
  const runGalleryTest = useCallback(async () => {
    setGalleryTest({ status: 'running', detail: '' });
    const lines: string[] = [];
    const log = (msg: string) => {
      lines.push(msg);
      setGalleryTest({ status: 'running', detail: lines.join('\n') });
      appendGlobal(msg);
    };

    let finalStatus: TestStatus = 'idle';
    let tempEventId: string | null = null;
    try {
      log('━━━ TEST GALERÍA — Imagen / Video ━━━');

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        log('  ❌ Permiso de biblioteca multimedia denegado');
        setGalleryTest({ status: 'fail', detail: lines.join('\n') });
        return;
      }
      log('  ✅ Permiso de galería concedido');

      log('  🖼️ Abriendo galería…');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) {
        log('  ⏸️ Selección cancelada por el usuario');
        setGalleryTest({ status: 'idle', detail: lines.join('\n') });
        return;
      }

      const media = result.assets[0];
      const mimeType = media.mimeType ?? (media.type === 'video' ? 'video/mp4' : 'image/jpeg');
      const def = getAssetDef(mimeType);
      // For gallery images use user-banner specifically (to test a different type)
      const assetType: AssetType = media.type === 'video' ? def.type : 'user-banner';
      log(`  ✅ Seleccionado: ${mimeType}  (${media.type})  → assetType: ${assetType}`);

      const opts: { orgId?: string; songId?: string; eventId?: string } = {};

      if (media.type === 'video') {
        // reference-video needs orgId + eventId
        if (!orgIdRef.current) {
          log('  ❌ Video requiere orgId — haz login primero');
          setGalleryTest({ status: 'fail', detail: lines.join('\n') });
          return;
        }
        opts.orgId = orgIdRef.current;
        log('  ⏳ Creando evento temporal…');
        tempEventId = await createTempEvent(orgIdRef.current);
        opts.eventId = tempEventId;
        log(`  ✅ Evento temp: …${tempEventId.slice(-8)}`);
      } else {
        log('  ℹ️ Actualizará bannerUrl del usuario');
      }

      await runUploadCycle(
        log, media.uri, assetType, mimeType,
        `gallery-${Date.now()}.${mimeType.split('/')[1] ?? 'jpg'}`,
        opts,
      );

      log('  ✅ TEST GALERÍA COMPLETADO\n');
      finalStatus = 'ok';
      setGalleryTest({ status: 'ok', detail: lines.join('\n') });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`  ❌ ERROR: ${msg}\n`);
      finalStatus = 'fail';
      setGalleryTest({ status: 'fail', detail: lines.join('\n') });
    } finally {
      if (tempEventId) {
        try {
          await getHttpClient().delete(`events/${tempEventId}`);
          lines.push('  🗑️ Evento temporal eliminado');
          appendGlobal('  🗑️ Evento temporal eliminado');
        } catch { /* ignore cleanup error */ }
        setGalleryTest({ status: finalStatus, detail: lines.join('\n') });
      }
    }
  }, [appendGlobal]);

  // ── TEST 4: Document Picker ──────────────────────────────────────────────────
  const runDocTest = useCallback(async () => {
    setDocTest({ status: 'running', detail: '' });
    const lines: string[] = [];
    const log = (msg: string) => {
      lines.push(msg);
      setDocTest({ status: 'running', detail: lines.join('\n') });
      appendGlobal(msg);
    };

    let finalStatus: TestStatus = 'idle';
    let tempSongId: string | null = null;
    let tempEventId: string | null = null;
    try {
      log('━━━ TEST DOCUMENTO — Picker de archivos ━━━');
      log('  ℹ️ PDF→legal-document  audio→audio-track  video→reference-video  img→user-avatar');
      log('  ⏳ Abriendo selector de archivos…');

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        log('  ⏸️ Selección cancelada por el usuario');
        setDocTest({ status: 'idle', detail: lines.join('\n') });
        return;
      }

      const doc = result.assets[0];
      const mimeType = doc.mimeType ?? 'application/octet-stream';
      const def = getAssetDef(mimeType);
      log(`  ✅ Archivo: "${doc.name}"  ${fmtBytes(doc.size ?? 0)}`);
      log(`  ℹ️ MIME: ${mimeType}  → assetType: ${def.type}`);

      const opts: { orgId?: string; songId?: string; eventId?: string } = {};

      if (def.needsOrgId) {
        if (!orgIdRef.current) {
          log('  ❌ Este tipo requiere orgId — haz login primero');
          setDocTest({ status: 'fail', detail: lines.join('\n') });
          return;
        }
        opts.orgId = orgIdRef.current;
      }

      if (def.needsSongId) {
        log('  ⏳ Creando canción temporal…');
        tempSongId = await createTempSong(orgIdRef.current!);
        opts.songId = tempSongId;
        log(`  ✅ Canción temp: …${tempSongId.slice(-8)}`);
      }

      if (def.needsEventId) {
        log('  ⏳ Creando evento temporal…');
        tempEventId = await createTempEvent(orgIdRef.current!);
        opts.eventId = tempEventId;
        log(`  ✅ Evento temp: …${tempEventId.slice(-8)}`);
      }

      await runUploadCycle(log, doc.uri, def.type, mimeType, doc.name, opts);

      log('  ✅ TEST DOCUMENTO COMPLETADO\n');
      finalStatus = 'ok';
      setDocTest({ status: 'ok', detail: lines.join('\n') });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`  ❌ ERROR: ${msg}\n`);
      finalStatus = 'fail';
      setDocTest({ status: 'fail', detail: lines.join('\n') });
    } finally {
      const didCleanup = { any: false };
      if (tempSongId) {
        try {
          await getHttpClient().delete(`songs/${tempSongId}`);
          lines.push('  🗑️ Canción temp eliminada');
          appendGlobal('  🗑️ Canción temp eliminada');
          didCleanup.any = true;
        } catch { /* ignore */ }
      }
      if (tempEventId) {
        try {
          await getHttpClient().delete(`events/${tempEventId}`);
          lines.push('  🗑️ Evento temp eliminado');
          appendGlobal('  🗑️ Evento temp eliminado');
          didCleanup.any = true;
        } catch { /* ignore */ }
      }
      if (didCleanup.any) setDocTest({ status: finalStatus, detail: lines.join('\n') });
    }
  }, [appendGlobal]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.root} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.section}>
          <Text style={s.h1}>📦 Storage Suite</Text>
          <Text style={s.desc}>
            Flujo completo: presigned-upload → PUT directo a Cloudflare R2 → confirm-upload → get → delete.
            Sin proxy — React Native no tiene restricciones CORS.
          </Text>
        </View>

        {/* Login */}
        <View style={s.section}>
          <Text style={s.h2}>🔑 Login — paso previo obligatorio</Text>
          <Text style={s.fieldLabel}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={C.muted}
          />
          <Text style={s.fieldLabel}>Contraseña</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={C.muted}
          />
          <View style={[s.cardRow, { marginTop: 10 }]}>
            <Pressable
              style={[s.btn, loginState === 'running' && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loginState === 'running'}
            >
              {loginState === 'running'
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnText}>Iniciar sesión</Text>
              }
            </Pressable>
            {loginState !== 'idle' && (
              <Text style={[s.badge, { color: loginState === 'ok' ? C.ok : loginState === 'fail' ? C.fail : C.warn }]}>
                {loginState === 'ok' ? '✅ Autenticado' : loginState === 'fail' ? '❌ Error' : '🔄 …'}
              </Text>
            )}
          </View>
          {orgLabel ? <Text style={s.orgLabel}>{orgLabel}</Text> : null}
        </View>

        {/* Test 1 — Auto */}
        <TestCard
          title="🤖 Auto — PNG sintetizado"
          desc="Crea un PNG 1×1 px en código y lo sube como user-avatar. Completamente automatizado."
          state={autoTest}
          onRun={runAutoTest}
          btnLabel="Correr prueba automática"
        />

        {/* Test 2 — Camera */}
        <TestCard
          title="📷 Cámara — Foto en vivo"
          desc="Abre la cámara, toma una foto y la sube como user-avatar. Actualizará tu avatarUrl."
          state={cameraTest}
          onRun={runCameraTest}
          btnLabel="Abrir cámara y subir"
        />

        {/* Test 3 — Gallery */}
        <TestCard
          title="🖼️ Galería — Imagen o Video"
          desc="Selecciona desde la galería. Imagen → user-banner / Video → reference-video."
          state={galleryTest}
          onRun={runGalleryTest}
          btnLabel="Abrir galería y subir"
        />

        {/* Test 4 — Document */}
        <TestCard
          title="📄 Documento — Cualquier archivo"
          desc="Picker nativo de archivos. PDF→legal-document (orgId), audio→audio-track (orgId+canción temp), video→reference-video (orgId+evento temp), imagen→user-avatar."
          state={docTest}
          onRun={runDocTest}
          btnLabel="Seleccionar archivo y subir"
        />

        {/* Global log */}
        {globalLog ? (
          <View style={s.section}>
            <View style={s.logHeader}>
              <Text style={s.h2}>📋 Log global</Text>
              <Pressable style={s.copyBtn} onPress={handleCopyLogs}>
                <Text style={s.copyBtnText}>📋 Copiar todo</Text>
              </Pressable>
            </View>
            <ScrollView ref={scrollRef} style={s.logScroll} nestedScrollEnabled>
              <Text style={s.logText}>{globalLog}</Text>
            </ScrollView>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── TestCard sub-component ───────────────────────────────────────────────────

function statusColor(st: TestStatus): string {
  return st === 'ok' ? C.ok : st === 'fail' ? C.fail : st === 'running' ? C.warn : C.muted;
}
function statusLabel(st: TestStatus): string {
  return st === 'ok' ? '✅ OK' : st === 'fail' ? '❌ FALLÓ' : st === 'running' ? '🔄 …' : '';
}

interface TestCardProps {
  title: string;
  desc: string;
  state: TestState;
  onRun: () => void;
  btnLabel: string;
}

function TestCard({ title, desc, state, onRun, btnLabel }: TestCardProps) {
  const running = state.status === 'running';
  return (
    <View style={s.section}>
      <Text style={s.h2}>{title}</Text>
      <Text style={s.desc}>{desc}</Text>
      <View style={s.cardRow}>
        <Pressable
          style={[s.btn, running && s.btnDisabled]}
          onPress={onRun}
          disabled={running}
        >
          {running
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.btnText}>{btnLabel}</Text>
          }
        </Pressable>
        {state.status !== 'idle' && (
          <Text style={[s.badge, { color: statusColor(state.status) }]}>
            {statusLabel(state.status)}
          </Text>
        )}
      </View>
      {state.detail ? (
        <Text style={s.cardLog}>{state.detail}</Text>
      ) : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  root:       { flex: 1, paddingHorizontal: 14, paddingTop: 14 },
  section:    { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 14 },
  h1:         { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 6 },
  h2:         { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 },
  desc:       { fontSize: 12, color: C.muted, lineHeight: 18, marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: C.muted, marginBottom: 4, marginTop: 8 },
  input:      { backgroundColor: C.surface2, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  cardRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn:        { backgroundColor: C.info, borderRadius: 7, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  badge:      { fontSize: 13, fontWeight: '700' },
  cardLog:    { marginTop: 10, fontFamily: 'monospace', fontSize: 11, color: C.text, lineHeight: 17, backgroundColor: '#0a0f1e', borderRadius: 6, padding: 10 },
  logHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logScroll:  { maxHeight: 400 },
  logText:    { fontFamily: 'monospace', fontSize: 11, color: C.text, lineHeight: 17 },
  copyBtn:    { backgroundColor: '#1e3a5f', borderWidth: 1, borderColor: C.info, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  copyBtnText:{ color: C.info, fontSize: 12, fontWeight: '600' },
  orgLabel:   { marginTop: 8, fontSize: 11, color: C.ok, fontStyle: 'italic' },
});
