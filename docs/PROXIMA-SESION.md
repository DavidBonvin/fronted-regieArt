# RégieArt — Prompt de continuación para próxima sesión

> Copia este documento completo y pégalo al inicio de un nuevo chat de Claude.
> Contiene todo el contexto necesario para continuar el desarrollo sin repasar el historial.

---

## Contexto del proyecto

Monorepo frontend para **RégieArt**, plataforma de gestión para músicos y bandas.
- **Gestor de paquetes:** pnpm 9.x + Turborepo
- **Desktop:** React 18 + Vite 5 + TypeScript — `apps/desktop` — package `@regieart/desktop`
- **Mobile:** Expo SDK 54 + React Native 0.77.0 + Hermes — `apps/mobile` — package `@regieart/mobile`
- **Shared API client:** `packages/api` — ky v1.14.3, auto-refresh Keycloak, storage Cloudflare R2
- **Shared types:** `packages/types`

## URLs de producción

```
API backend:    https://regieart-backend-production.up.railway.app/api/v1
Keycloak:       https://keycloak-production-b2ce.up.railway.app
Realm:          regieart
Client ID:      regieart-mobile
```

## Credenciales de prueba

```
User 1:  teststorage@gmail.com   / teststorage@gmail.com   (userId: cmqgqnin60000gx5b5mxsjfow)
User 2:  testuserinvitado1@gmail.com / testuserinvitado1@gmail.com (userId: cms2aehbe00lz13llu32h0t32)
```

---

## Estado actual — qué está 100% implementado y funcionando

### `packages/api` — cliente HTTP compartido
- Singleton `ky` con auto-refresh de tokens Keycloak (cola de peticiones, 1 solo refresh)
- `initApiClient({ apiBaseUrl, keycloakUrl, realm, clientId, tokenAdapter, fileReaderAdapter })`
- `getHttpClient()` / `resetHttpClient()` / `getConfig()`
- `uploadFile(uri, assetType, contentType, options?)` — presigned-upload → PUT R2 → confirm (todo en uno)
- `getAsset`, `deleteAsset`, `searchAssets`, `getDownloadUrl`
- `getMyOrganizations`, `createSong`, y todos los servicios de dominio
- Hook `streamUploadToPresignedUrl` en `FileReaderAdapter` para streaming nativo en mobile

### Desktop — `apps/desktop/src/features/dev/`
- `/dev/playground` (solo en DEV) con 2 tabs:
  - **WriteSuiteTab:** 11 fases CUD con User 1 + User 2 — todas pasan ✅
  - **ApiSuiteTab:** Storage suite — todos los AssetTypes pasan ✅
- Request interceptor en `useFetchInterceptor.ts`

### Mobile — `apps/mobile/src/features/dev/`
- **WriteSuiteScreen:** 11 fases CUD — todas pasan ✅
- **DevToolsScreen:** log global de requests + contador de Keycloak refreshes
- **StorageSuiteScreen:** user-avatar, user-banner, reference-video (37MB), legal-document, audio-track — todos pasan ✅
- Entry: `apps/mobile/src/entry/index.tsx` instala el interceptor fetch si `__DEV__`
- Navegación: `apps/mobile/src/navigation/index.tsx` (rutas: DevPlayground, DevTools, StorageSuite)

---

## Reglas técnicas críticas — NO romper

```
1. packages/api/src/auth/keycloak.ts:
   USAR:   AbortController + setTimeout (Hermes no tiene AbortSignal.timeout)
   NUNCA:  AbortSignal.timeout(ms)

2. apps/mobile/src/shared/api/client.ts:
   USAR:   import * as FileSystem from 'expo-file-system/legacy'
   NUNCA:  import * as FileSystem from 'expo-file-system'   ← rompe en Expo 54

3. packages/api/src/storage/storage.service.ts — confirm-upload DTO:
   SOLO acepta: { key, assetType, durationSeconds?, bitrate?, width?, height?, pageCount? }
   NUNCA enviar: fileSizeBytes, orgId, songId, eventId (backend: forbidNonWhitelisted: true → 400)

4. amount en finanzas:  "420.00" (string)  — no 420 (número)

5. PATCH role de miembro: usar OrganizationMember.id (id del join table),  NO userId

6. Fechas de eventos: siempre dinámicas → Date.now() + N días
   (WeatherAPI tiene ventana de 14 días; fechas fijas en el futuro lejano devuelven weather vacío)

7. Per-diem: campo userId (no recipientId — el backend no acepta recipientId)

8. Desktop PUT a R2: pasar por proxy Vite /r2-proxy (CORS). Mobile: directo sin proxy.

9. StoredTokens shape:
   { accessToken, refreshToken,
     expiresAt:        Date.now() + expires_in * 1000,
     refreshExpiresAt: Date.now() + refresh_expires_in * 1000 }
```

---

## Convenciones del backend

```
Respuesta éxito:  { success: true,  data: {...} }
Respuesta lista:  { success: true,  data: [...], meta: { total, page, limit } }
Respuesta error:  { success: false, error: { code, message } }

IDs: CUID  →  /^c[a-z0-9]{19,}$/
HTTP 400:  campo extra, tipo incorrecto o campo requerido faltante
HTTP 401:  token expirado o inválido
HTTP 403:  rol insuficiente
HTTP 409:  duplicado

Rate limits: 60 req/min global | 10 req/min POST /storage/presigned-upload
```

---

## AssetType — requisitos de contexto

| AssetType | orgId | songId | eventId | MIMEs aceptados |
|-----------|-------|--------|---------|-----------------|
| `user-avatar` | ❌ | ❌ | ❌ | image/jpeg, image/png, image/webp |
| `user-banner` | ❌ | ❌ | ❌ | image/jpeg, image/png, image/webp |
| `org-banner` | ✅ | ❌ | ❌ | image/jpeg, image/png |
| `legal-document` | ✅ | ❌ | ❌ | application/pdf, image/jpeg |
| `audio-track` | ✅ | ✅ | ❌ | audio/mpeg, audio/wav, audio/ogg |
| `music-score` | ✅ | ✅ | ❌ | application/pdf, image/svg+xml |
| `reference-video` | ✅ | ❌ | ✅ | video/mp4, video/quicktime |
| `financial-receipt` | ✅ | ❌ | ✅ | image/jpeg, image/png, application/pdf |
| `technical-file` | ✅ | ❌ | ✅ | application/xml, text/plain, application/octet-stream |

---

## Documentación de referencia

- `README.md` — arquitectura general, design system, packages
- `docs/README-testproduccion.md` — todos los endpoints, flujo storage, problemas resueltos, estado de testing
- `docs/README-backend.md` — backend completo (NestJS, Prisma, todos los DTOs)
- `docs/StorageModule.md` — storage module detallado

---

## TAREAS PENDIENTES — objetivo de esta sesión

### Alta prioridad

#### 1. Test de mensajería entre 2 usuarios reales
Añadir a la **Write Suite** (desktop + mobile) una fase que pruebe:
```
User 1 → POST /messages  { recipientId: User2.id, body: "Hola", orgId }
User 2 (switch) → GET /messages/conversations
User 2 → GET /messages/conversations/:user1Id   ← marca como leídos
Verificar: unreadCount baja a 0
```
Usar las mismas credenciales de User 1 y User 2 que ya están en la Write Suite.

#### 2. DaySheet live tracking — test en mobile
En `StorageSuiteScreen` o en una nueva pantalla DEV, probar:
```
POST /events/:id/schedule  { type, title, startTime, endTime }   → scheduleItemId
PATCH /events/:id/schedule/:scheduleItemId/complete              → toggle isCompleted
GET /events/:id/daysheet  → verificar meta.completedItems sube
```
Este endpoint es el núcleo de la app el día del show.

#### 3. Reporte financiero + per-diem — añadir a Write Suite (fase 6)
La fase 6 actual crea budget + expense. Añadir:
```
POST /finance/per-diem  { eventId, userId: User1.id, amount: "50.00", currency: "CAD" }
GET  /finance/reports?orgId=&from=ISO_DATE&to=ISO_DATE   → verificar totales
PATCH /finance/entries/:id/approve   (desde User 1 como OWNER)
```

#### 4. Habilidades — completar fase 7 de Write Suite
La fase 7 actualmente solo lista categorías. Añadir:
```
GET  /skill-categories                                  → listar categorías globales
POST /users/me/skills  { skillCategoryId, proficiencyLevel: "ADVANCED" }  → añadir skill
GET  /users/me  → verificar que skills aparece en el response
DELETE /users/me/skills/:skillId                        → limpiar
```

#### 5. Test de weather explícito
```
POST /events  con venue que tenga latitude y longitude
GET  /events/:id/weather   → verificar conditionText, maxTempC, chanceOfRain
```
Verificar que `WEATHER_API_KEY` está configurado en Railway (puede estar vacío).

#### 6. Storage — editar metadatos (PATCH)
Añadir al final de `runUploadCycle` en ambas suites:
```
PATCH /storage/assets/:assetId  { displayName: "Nuevo nombre", tags: ["prueba"] }
GET   /storage/assets/:assetId  → verificar displayName actualizado
DELETE /storage/assets/:assetId
```

### Media prioridad

#### 7. Multipart upload mobile (videos > 50 MB)
Añadir botón en `StorageSuiteScreen` para videos grandes:
```
POST /storage/multipart/initiate  { assetType: 'reference-video', orgId, eventId, contentType, fileSizeBytes }
→ { uploadId, key, assetId, parts: [{ url, partNumber }] }

Para cada parte (chunks de 10 MB):
  const chunk = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64', position: start, length: chunkSize })
  PUT partUrl  body: chunk

POST /storage/multipart/complete  { uploadId, key, parts: [{ partNumber, etag }] }
```
Testeado en desktop con 257 MB — los ETags vienen en el header de cada PUT (`etag`).

#### 8. Notificaciones cruzadas
En Write Suite fase 9 (invite User 2), verificar:
```
Cambiar a tokens de User 2
GET /notifications?isRead=false  → debe haber INVITE_ACCEPTED
PATCH /notifications/read-all
GET /notifications?isRead=false  → unreadCount debe ser 0
```

---

## Patrón de login ROPC (para cualquier pantalla DEV)

```typescript
async function loginROPC(username: string, password: string): Promise<void> {
  const cfg = getConfig();
  const url = `${cfg.keycloakUrl}/realms/${cfg.realm}/protocol/openid-connect/token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password', client_id: cfg.clientId, username, password,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Keycloak ${res.status}`);
  const data = await res.json();
  await storeUserTokens(data.access_token, data.refresh_token, data.expires_in, data.refresh_expires_in);
  resetHttpClient();
}
// storeUserTokens se importa de: apps/mobile/src/shared/api/client.ts
```

## Patrón de recursos temporales (para tests que necesitan IDs)

```typescript
// Canción temporal
const song = await createSong({ orgId, title: `[DEV Test] ${Date.now()}`, composer: 'Test' });
try {
  // ... usar song.id ...
} finally {
  await getHttpClient().delete(`songs/${song.id}`);
}

// Evento temporal
const evRes = await getHttpClient().post('events', { json: {
  orgId, title: `[DEV Test] ${Date.now()}`, type: 'CONCERT',
  startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  endTime:   new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  isPublic: false,
}}).json<{ success: boolean; data: { id: string } }>();
const tempEventId = evRes.data.id;
```
