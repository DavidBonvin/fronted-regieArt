# RégieArt — Documentación de Tests de Producción & Playground

> **Fecha última actualización:** 2026-07-27  
> **Estado general:** ✅ Módulos core testeados | ✅ Storage completo end-to-end | ✅ Write Suite 11/11 (desktop + mobile) | ✅ Storage Suite mobile (todos los tipos) | ✅ DEV Tools mobile  
> **Playground desktop:** `http://host.docker.internal:3001/dev/playground` (Docker) / `http://localhost:5173/dev/playground` (dev local)  
> **DEV Tools mobile:** Botones en `OnboardingScreen` cuando `__DEV__ === true`  
> **Backend producción:** `https://regieart-backend-production.up.railway.app/api/v1`

---

## Índice

1. [Por qué se creó este playground](#1-por-qué-se-creó-este-playground)
2. [Stack técnico del frontend de tests](#2-stack-técnico-del-frontend-de-tests)
3. [Arquitectura del Playground](#3-arquitectura-del-playground)
4. [Autenticación — ROPC y token refresh](#4-autenticación--ropc-y-token-refresh)
5. [Módulos testeados y resultado](#5-módulos-testeados-y-resultado)
6. [Storage — El flujo completo explicado](#6-storage--el-flujo-completo-explicado)
7. [Problemas encontrados y soluciones aplicadas](#7-problemas-encontrados-y-soluciones-aplicadas)
8. [Estado de testing — completado y pendiente](#8-estado-de-testing--completado-y-pendiente)
9. [Referencia rápida: convenciones del backend](#9-referencia-rápida-convenciones-del-backend)
10. [IDs de referencia en producción](#10-ids-de-referencia-en-producción)
11. [Mobile — DEV Tools](#11-mobile--dev-tools)
12. [Write Suite — 11 fases CUD detalladas](#12-write-suite--11-fases-cud-detalladas)
13. [Storage Suite Mobile — resultados y arquitectura](#13-storage-suite-mobile--resultados-y-arquitectura)

---

## 1. Por qué se creó este playground

### El problema original

Al levantar el frontend con Docker, apareció el error:
```
No projects matched the filters in '/app'
```
El `docker-compose.yml` referenciaba nombres de packages que habían cambiado. Una vez resuelto, se decidió aprovechar el tiempo para crear una herramienta que permitiera **validar el backend de producción directamente desde el navegador**, sin depender de Postman ni de scripts Node.js externos.

### Motivación

Antes de construir el frontend real (cuya apariencia aún no está definida), necesitamos saber exactamente:
- Qué endpoints funcionan en producción
- Qué campos exactos acepta y devuelve cada DTO
- Cómo se comporta el flujo de Storage con archivos reales
- Qué errores del backend debemos manejar en el UI

El playground permite hacer todo esto de forma visual e iterativa, con logs de peticiones HTTP en tiempo real.

---

## 2. Stack técnico del frontend de tests

| Capa | Tecnología | Versión |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | pnpm 9.x |
| App desktop | React 18 + Vite 5 + TypeScript | – |
| HTTP client | `ky` (fetch-based, ESM) | 1.14.3 |
| Auth | Keycloak 23, RS256, Direct Access Grants | – |
| Storage | Cloudflare R2 (protocolo S3, PUT directo) | – |
| Estilos playground | CSS-in-JS inline (no depende de Tailwind) | – |
| Estado | `useState` + `useRef` + `useCallback` | – |

### Packages del monorepo que usa el playground

| Package | Descripción |
|---|---|
| `@regieart/api` | Funciones de alto nivel: `uploadFile`, `getAsset`, `deleteAsset`, etc. |
| `@regieart/types` | Tipos TypeScript de todos los DTOs y respuestas |
| `apps/desktop` | La app web donde vive el playground en `/dev/playground` |

---

## 3. Arquitectura del Playground

### Ruta

```
/dev/playground   →  solo existe en modo DEV (import.meta.env.DEV)
```

El router tiene un guard que redirige a `/` en producción:
```tsx
// apps/desktop/src/router/index.tsx
{ path: '/dev/playground', element: import.meta.env.DEV ? <ApiPlayground /> : <Navigate to="/" replace /> }
```

### Archivos principales

```
apps/desktop/src/features/dev/
├── ApiPlayground.tsx        # Componente raíz — tabs "API Suite" y "DevTools"
├── ApiSuiteTab.tsx          # Suite de tests: login, endpoints, storage
├── DevToolsTab.tsx          # Inspector: log de peticiones, JWT decoder, consola
└── useFetchInterceptor.ts   # Parchea window.fetch para interceptar y loggear
```

### Configuración del cliente HTTP

```
apps/desktop/src/shared/api/client.ts
```

Este archivo configura el cliente HTTP al inicio de la app. Incluye:
- `tokenAdapter`: guarda tokens en `sessionStorage` (no `localStorage` por seguridad)
- `fileReaderAdapter`: devuelve `Blob`/`File` directamente (no los convierte a base64)
- `putToPresignedUrl`: hace el PUT directo a R2 con timeout de 10 minutos
- Proxy de desarrollo `/r2-proxy` para evitar CORS en local
- `onSessionExpired`: callback cuando el token no se puede renovar

### Proxies de desarrollo en Vite

```typescript
// apps/desktop/vite.config.ts
'/api-prod': {
  target: 'https://regieart-backend-production.up.railway.app',
  changeOrigin: true, secure: true,
  rewrite: (path) => path.replace(/^\/api-prod/, '/api/v1'),
},
'/r2-proxy': {
  target: 'https://regieart-media-production.e0315a593d85e644262dc2eb21b26d6c.r2.cloudflarestorage.com',
  changeOrigin: true, secure: true,
  rewrite: (path) => path.replace(/^\/r2-proxy/, ''),
  timeout:      10 * 60 * 1000,   // 10 min — archivos grandes
  proxyTimeout: 10 * 60 * 1000,
},
```

> **¿Por qué el proxy R2?** Cloudflare R2 no permite CORS desde `localhost` para peticiones PUT. En producción el frontend llama directo a R2 sin proxy.

---

## 4. Autenticación — ROPC y token refresh

### Método: Resource Owner Password Credentials (ROPC)

El playground usa **Direct Access Grants** de Keycloak para obtener tokens sin redirigir a la pantalla de login. Esto es aceptable en un entorno de desarrollo/QA.

```typescript
// Obtener token
const res = await fetch(
  `${keycloakUrl}/realms/regieart/protocol/openid-connect/token`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id:  'regieart-mobile',
      username:   'teststorage@gmail.com',
      password:   'teststorage@gmail.com',
    }),
  }
);
const { access_token, refresh_token, expires_in } = await res.json();
// access_token válido ~300 segundos (5 minutos)
```

### Credenciales de prueba (producción/QA)

| Campo | Valor |
|---|---|
| `username` | `teststorage@gmail.com` |
| `password` | `teststorage@gmail.com` |
| `client_id` | `regieart-mobile` |
| `realm` | `regieart` |
| Keycloak producción | `https://keycloak-production-b2ce.up.railway.app` |

### Token refresh — problema y solución

**Problema detectado:** el refresh fetch no tenía timeout. Si Keycloak tardaba o caía, la petición quedaba pendiente indefinidamente. Esto bloqueaba toda la cola de peticiones HTTP, haciendo que la app se colgara sin error visible.

**Solución implementada:**
```typescript
// packages/api/src/auth/keycloak.ts
const signal = AbortSignal.timeout(15_000); // 15 segundos máximo
const response = await fetch(tokenUrl, { method: 'POST', body, signal });
```

Adicionalmente, las peticiones en la cola de espera tienen su propio timeout de 16 segundos para evitar que queden colgadas si el refresh falla:
```typescript
// packages/api/src/client/httpClient.ts
const timer = setTimeout(() => reject(new Error('Token refresh queue timeout')), 16_000);
failedQueue.push({ resolve: () => { clearTimeout(timer); resolve(); }, reject: ... });
```

### Test 401 Queue Coalescing

El playground incluye un test que verifica que cuando múltiples peticiones fallan con 401 simultáneamente, se hace **exactamente 1** refresh y no N refreshes paralelos:
1. Se expira el token manualmente
2. Se lanzan 4 peticiones en paralelo
3. Se verifica que el log muestra exactamente 1 llamada a Keycloak token

---

## 5. Módulos testeados y resultado

### Resumen rápido

| Módulo | Endpoint | Estado | Resultado |
|---|---|---|---|
| **Users** | `GET /users/me` | ✅ OK | Usuario + membresías |
| **Users** | `GET /users/search?q=a` | ✅ OK | Búsqueda libre en displayName |
| **Organizations** | `GET /organizations` | ✅ OK | 2 organizaciones |
| **Organizations** | `GET /organizations/:id` | ✅ OK | Detalle con miembros |
| **Organizations** | `GET /organizations/:id/members` | ✅ OK | 1 miembro, rol OWNER |
| **Songs** | `GET /songs?orgId=` | ✅ OK | Lista (puede estar vacía) |
| **Venues** | `GET /venues` | ✅ OK | 1 venue |
| **Events** | `GET /events?orgId=` | ✅ OK | Lista (puede estar vacía) |
| **DaySheet** | `GET /events/:id/daysheet` | ⏸️ SKIP | Se salta si no hay eventos |
| **Finance** | `GET /finance/categories?orgId=` | ✅ OK | Lista |
| **Finance** | `GET /finance/entries?orgId=` | ✅ OK | Lista |
| **Inventory** | `GET /instruments?orgId=` | ✅ OK | Lista |
| **Notifications** | `GET /notifications` | ✅ OK | 7 notificaciones pendientes |
| **Messages** | `GET /messages/conversations` | ✅ OK | Lista de conversaciones |
| **Storage** | Flujo completo | ✅ OK | Ver sección 6 |

### Detalle por módulo

#### Users (`/api/v1/users`)

```
GET  /users/me                     → usuario completo + membresías + skills
PATCH /users/me                    → actualizar perfil (probado conceptualmente)
GET  /users/search?q=texto         → búsqueda por displayName
GET  /users/:id                    → perfil público (sin email ni teléfono)
```

**Respuesta típica de `GET /users/me`:**
```json
{
  "id":          "cmqgqnin60000gx5b5mxsjfow",
  "email":       "teststorage@gmail.com",
  "displayName": "Jean-Pierre Leblanc",
  "city":        "Montréal",
  "country":     "CA",
  "avatarUrl":   null,
  "memberships": [{ "role": "OWNER", "organization": { "id": "...", "name": "Les Étoiles du Nord" } }]
}
```

> El `id` del usuario se usa en roster de eventos, asignaciones de instrumentos y pasajeros de vehículos.

#### Organizations (`/api/v1/organizations`)

```
GET  /organizations                → mis organizaciones
GET  /organizations/:id            → detalle + members
GET  /organizations/:id/members    → array con role, user.avatarUrl, user.phone
POST /organizations/:id/invite-links  → { token, role, expiresAt }
POST /organizations/join/:token    → unirse con token
```

**Roles disponibles:** `OWNER` > `ADMIN` > `MEMBER` > `EXTERNAL_TECH`

> El `orgId` de la primera organización se usa como referencia para todos los demás módulos.

#### Songs (`/api/v1/songs`)

```
GET  /songs?orgId=&search=&genre=  → lista paginada
GET  /songs/:id                    → detalle + assets vinculados (partituras, pistas)
POST /songs                        → crear canción (requiere ADMIN en la org)
```

**Nota importante:** `GET /songs/:id` devuelve un array `assets` con todos los archivos vinculados a esa canción (partituras PDF, pistas MP3). Esto es lo que hay que mostrar en la pantalla de detalle de repertorio.

#### Events + DaySheet (`/api/v1/events`)

```
GET  /events?orgId=&type=&status=  → lista paginada
GET  /events/:id                   → detalle completo
GET  /events/:id/daysheet          → TODO EN UNA LLAMADA (ver abajo)
GET  /events/:id/schedule          → cronograma del día
GET  /events/:id/vehicles          → vehículos + pasajeros + pickups GPS
GET  /events/:id/roster            → participantes con status de asistencia
```

**El endpoint `GET /events/:id/daysheet` es el más importante del módulo.** Devuelve en una sola llamada:
```json
{
  "event":    { "title", "type", "status", "startTime", "daysheetNotes", "itineraryNotes", "setlistNotes" },
  "venue":    { "name", "address", "latitude", "longitude", "parkingNotes", "loadInNotes" },
  "schedule": [ { "type", "title", "startTime", "endTime", "location", "withWho", "isCompleted" } ],
  "roster":   [ { "user": { "displayName", "avatarUrl", "phone" }, "role", "status" } ],
  "vehicles": [ { "name", "driverName", "plateNumber", "passengers": [...], "pickups": [...] } ],
  "finance":  { "cacheTotal", "perDiemAmount", "currency", "isPaid" },
  "weather":  { "conditionText", "maxTempC", "minTempC", "chanceOfRain", "sunrise", "sunset" },
  "meta":     { "totalScheduleItems", "completedItems", "confirmedAttendees", "isAdminView" }
}
```

> `finance` es `undefined` para rol `MEMBER` — solo visible para `ADMIN` y `OWNER`.

#### Finance (`/api/v1/finance`)

```
GET  /finance/categories?orgId=          → categorías de la banda
GET  /finance/entries?orgId=&eventId=    → gastos e ingresos filtrados
GET  /finance/reports?orgId=&from=&to=   → resumen (solo entradas APPROVED)
PUT  /events/:id/finance                  → upsert del resumen financiero del evento
```

> `amount` debe enviarse como **string decimal**: `"420.00"` — no como número.

#### Inventory (`/api/v1/instruments`)

```
GET  /instruments?orgId=&type=&status=   → lista con asignación activa
GET  /instruments/assignments?orgId=&eventId=  → equipaje para un show
POST /instruments/:id/assign             → asignar → dispara notificación
PATCH /instruments/:id/return            → devolver
```

#### Notifications (`/api/v1/notifications`)

```
GET  /notifications?isRead=false         → lista con unreadCount para el badge
PATCH /notifications/:id/read           → marcar una como leída
PATCH /notifications/read-all           → marcar todas
```

**Notificaciones que crea el backend automáticamente:**

| Tipo | Cuándo |
|---|---|
| `EVENT_ASSIGNED` | Al añadir músico al roster |
| `INVITE_ACCEPTED` | Cuando alguien usa un invite link |
| `ROLE_CHANGED` | Al cambiar rol de un miembro |
| `EXPENSE_APPROVED` / `EXPENSE_REJECTED` | Al aprobar/rechazar un gasto |
| `INSTRUMENT_ASSIGNED` | Al asignar instrumento |
| `MESSAGE_RECEIVED` | Al recibir un mensaje directo |

#### Messages (`/api/v1/messages`)

```
GET  /messages/conversations           → lista con último msg y unreadCount
GET  /messages/conversations/:userId   → historial paginado (marca leídos al abrir)
POST /messages                         → enviar { recipientId, body, orgId }
```

> **Limitación de prueba:** solo se testeó con un usuario. Los mensajes entre usuarios diferentes no se pudieron probar sin una segunda cuenta Keycloak.

---

## 6. Storage — El flujo completo explicado

### Arquitectura: el archivo NUNCA pasa por el backend

```
Usuario → POST /storage/presigned-upload (solo metadatos)
        ← { uploadUrl, key, assetId }

Usuario → PUT uploadUrl (el archivo va directo a Cloudflare R2)
        ← 200 OK (de R2)

Usuario → POST /storage/confirm-upload (solo key y metadatos técnicos)
        ← Asset CONFIRMED en PostgreSQL
```

### Paso 1: `POST /storage/presigned-upload`

**URL:** `/api/v1/storage/presigned-upload`  
**Campos que acepta el DTO (EXACTOS — backend usa `forbidNonWhitelisted: true`):**

```typescript
{
  assetType:    AssetType;      // obligatorio — ver tabla abajo
  contentType:  string;         // MIME type exacto — debe estar en la whitelist del tipo
  fileSizeBytes: number;        // tamaño en bytes — no "sizeBytes", no "size"
  orgId?:       string;         // obligatorio según el tipo
  songId?:      string;         // obligatorio para audio-track y music-score
  eventId?:     string;         // obligatorio para reference-video, financial-receipt, technical-file
  displayName?: string;         // nombre visible en la UI
  originalName?: string;        // nombre original del archivo en el dispositivo
  language?:    string;         // ISO 639-1: "fr", "es", "en"
  tags?:        string[];        // etiquetas libres
}
```

**Respuesta:**
```json
{
  "uploadUrl": "https://regieart-media-production.../presigned-url?X-Amz-Signature=...",
  "key":       "organizations/.../audio_tracks/1753498288123.mp3",
  "assetId":   "cms28feu200lf13llhcr10n4o"
}
```

> **Validar `assetId`:** debe ser un CUID (`/^c[a-z0-9]{19,}$/`). Si el backend devuelve `"pending-db-error"`, hay un error en PostgreSQL del servidor — verificar los logs de Railway.

### Paso 2: PUT directo a Cloudflare R2

```typescript
await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': contentType, // mismo MIME que se usó en presigned-upload
  },
  body: file, // el Blob/File directamente
  signal: AbortSignal.timeout(10 * 60 * 1000), // 10 min para archivos grandes
});
```

> **Importante:** NO enviar `Content-Length` explícito — el browser lo calcula solo. Enviarlo puede causar errores en algunos entornos.

> **CORS en desarrollo:** la URL de R2 no permite CORS desde localhost. Usar el proxy Vite `/r2-proxy` que reescribe la URL al bucket de Cloudflare.

### Paso 3: `POST /storage/confirm-upload`

**Campos que acepta el DTO (EXACTOS):**
```typescript
{
  key:             string;        // la "key" que devolvió presigned-upload
  assetType:       AssetType;     // mismo tipo que se usó en presigned-upload
  // Metadatos técnicos opcionales:
  durationSeconds?: number | null; // segundos — para audio y video
  bitrate?:         number | null; // kbps
  width?:           number | null; // píxeles
  height?:          number | null; // píxeles
  pageCount?:       number | null; // para PDFs
}
```

> **CRÍTICO:** el backend usa `forbidNonWhitelisted: true`. Cualquier campo extra (como `fileSizeBytes`, `orgId`, `songId`, `eventId`) en el cuerpo de `confirm-upload` causa `HTTP 400`. Solo los campos listados arriba son aceptados.

### Paso 4: Descargar un asset

```
GET /storage/assets/:assetId/download
```

Devuelve una URL firmada de Cloudflare R2 válida por **5 minutos**, cacheada en Redis por 4 minutos.

```json
{ "downloadUrl": "https://regieart-media-production.../key?X-Amz-Expires=300&X-Amz-Signature=..." }
```

> Siempre usar el `assetId` para descargar, nunca la `key` interna.

### Tipos de archivo disponibles

| `assetType` | MIME aceptados | Tamaño máx | Campos extra requeridos |
|---|---|---|---|
| `user-avatar` | `image/jpeg`, `image/png` | 2 MB | — |
| `user-banner` | `image/jpeg`, `image/png`, `image/webp` | 5 MB | — |
| `org-banner` | `image/jpeg`, `image/png` | 5 MB | `orgId` |
| `legal-document` | `application/pdf`, `image/jpeg` | 10 MB | `orgId` |
| `audio-track` | `audio/mpeg`, `audio/wav`, `audio/ogg` | 25 MB | `orgId`, `songId` |
| `music-score` | `application/pdf`, `image/svg+xml` | 10 MB | `orgId`, `songId` |
| `reference-video` | `video/mp4`, `video/quicktime` | 300 MB | `orgId`, `eventId` |
| `financial-receipt` | `image/jpeg`, `image/png`, `application/pdf` | 5 MB | `orgId`, `eventId` |
| `technical-file` | `application/xml`, `text/plain`, `application/octet-stream` | 8 MB | `orgId`, `eventId` |

> Archivos **> 50 MB** requieren el flujo **Multipart** (ver sección siguiente).

### Archivos grandes (> 50 MB) — Multipart

Para videos de más de 50 MB (como grabaciones de ensayos):

```
POST /storage/multipart/initiate     → { uploadId, key, assetId, parts: [...{ url, partNumber }] }
PUT  <cada partUrl> con su chunk     → cada parte devuelve ETag en el header
POST /storage/multipart/complete     → { parts: [{ partNumber, etag }] }  (para finalizar)
DELETE /storage/multipart/abort      → cancelar si algo falla
```

**Testeado en producción:** video de 257.77 MB dividido en 26 partes de ~10 MB cada una.

### Buscar assets

```
GET /storage/assets?orgId=&assetType=music-score&songId=&eventId=&page=1&limit=20
```

La respuesta incluye `total` y array de assets con su `status` (`CONFIRMED`, `READY`, etc.).

### Editar metadatos de un asset

```
PATCH /storage/assets/:id
Body: { displayName, description, tags, language }
```

### Eliminar un asset

```
DELETE /storage/assets/:id
```

Soft-delete en PostgreSQL + borrado real en Cloudflare R2.

---

## 7. Problemas encontrados y soluciones aplicadas

Esta sección documenta los problemas reales encontrados durante las pruebas para que no se repitan al construir el frontend.

### P1: Docker "No projects matched the filters"

**Causa:** `docker-compose.yml` referenciaba nombres de paquetes del monorepo que habían cambiado.  
**Solución:** Actualizar los nombres de los filtros de pnpm en el Dockerfile para usar los nombres actuales del `package.json`.

---

### P2: `initApiClient() must be called` al navegar al playground

**Causa:** el archivo `apps/desktop/src/shared/api/client.ts` que llama a `initApiClient()` no estaba importado en `main.tsx`.  
**Solución:**
```typescript
// apps/desktop/src/main.tsx
import './shared/api/client'; // ← importar para que initApiClient() se ejecute al inicio
```

---

### P3: "Failed to fetch" en todas las peticiones al backend

**Causa:** el singleton `ky` (`_client`) estaba cacheado apuntando a la URL local aunque se cambiara el entorno en la UI. Las peticiones directas a Railway fallaban por CORS.  
**Solución:** 
- Agregar `resetHttpClient()` al cambiar de entorno
- Usar el proxy Vite `/api-prod` para producción (el proxy reescribe las URLs, evitando CORS)
- Exportar `getHttpClient()` para usarlo directamente en el playground

---

### P4: `POST /storage/presigned-upload` devolvía 400

**Causa:** el DTO usaba `sizeBytes` como nombre del campo, pero el backend espera `fileSizeBytes`.  
**Solución:** corregir el tipo en `packages/types/src/storage.ts`:
```typescript
// Incorrecto:  sizeBytes: number
// Correcto:
fileSizeBytes: number;
```

---

### P5: PUT a R2 fallaba por CORS

**Causa:** Cloudflare R2 no permite CORS para peticiones PUT desde `localhost`.  
**Solución:** proxy Vite `/r2-proxy` que reescribe la URL al bucket:
```typescript
// apps/desktop/src/shared/api/client.ts — putToPresignedUrl()
if (import.meta.env.DEV) {
  const parsed = new URL(url);
  if (parsed.hostname.endsWith('r2.cloudflarestorage.com')) {
    effectiveUrl = `/r2-proxy${parsed.pathname}${parsed.search}`;
  }
}
```

---

### P6: `POST /storage/confirm-upload` devolvía 400

**Causa:** se enviaban campos extra en el body (`fileSizeBytes`, `orgId`, `songId`, etc.) que el backend rechaza porque usa `forbidNonWhitelisted: true`.  
**Solución:** el DTO de `confirm-upload` solo puede contener:
```typescript
{ key, assetType, durationSeconds?, bitrate?, width?, height?, pageCount? }
```

---

### P7: `assetId` devolvía `"pending-db-error"`

**Causa:** el backend tiene un error en PostgreSQL al crear el registro del asset. Ocurre cuando el `songId` o `eventId` proporcionado no existe o no pertenece a la organización correcta.  
**Detección:** validar que el `assetId` sea un CUID válido:
```typescript
if (!assetId || !/^c[a-z0-9]{19,}$/.test(assetId)) {
  throw new Error(`Backend DB error: assetId = "${assetId}"`);
}
```

---

### P8: Upload de PDF/Audio se colgaba sin error (token refresh freeze)

**Causa:** el fetch de Keycloak para renovar el token no tenía timeout. Si Keycloak tardaba, `isRefreshing` quedaba `true` indefinidamente, bloqueando toda la cola de peticiones.  
**Solución:**
1. `AbortSignal.timeout(15_000)` en el fetch de refresh
2. Timeout de 16 segundos en cada promesa de la cola

---

### P9: PUT a R2 de audio grande se colgaba sin timeout

**Causa:** el proxy Vite (`http-proxy`) cerraba la conexión silenciosamente para transferencias largas.  
**Solución:**
1. `AbortSignal.timeout(10 * 60 * 1000)` en el fetch del PUT
2. `timeout: 10 * 60 * 1000` y `proxyTimeout: 10 * 60 * 1000` en la config del proxy Vite

---

### P10: El Media File Test requería Song ID manual

**Causa:** para tipos como `audio-track` y `music-score` el backend requiere un `songId` válido. El usuario no siempre tiene un ID a mano.  
**Solución:** el playground ahora crea automáticamente una canción temporal cuando el campo está vacío, la usa para el upload, y la elimina al finalizar.

---

### P11: `AbortSignal.timeout` no existe en React Native (Hermes) ⚠️ CRÍTICO MOBILE

**Causa:** El motor JS de React Native es Hermes (no V8). Hermes no implementa `AbortSignal.timeout()`, que es una API Web estándar. El código de keycloak.ts usaba:
```ts
const response = await fetch(tokenUrl, { signal: AbortSignal.timeout(15_000) });
```
En runtime lanzaba un error. El interceptor de auth atrapaba ese error, lo interpretaba como falla de red y llamaba a `clearTokens()` — el usuario quedaba deslogueado silenciosamente en cada refresh.  
**Solución** (implementada en `packages/api/src/auth/keycloak.ts`):
```ts
// ✅ Funciona en todos los entornos JS
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 15_000);
try {
  response = await fetch(tokenUrl, { signal: controller.signal, ... });
} finally {
  clearTimeout(timer); // evitar memory leak
}
```
> Este fix afecta a `packages/api`, que es compartido por ambas plataformas. El desktop no sufría el bug porque V8 sí tiene `AbortSignal.timeout`, pero la corrección es compatible con ambos.

---

### P12: `expo-file-system` rompe en Expo SDK 54 ⚠️ CRÍTICO MOBILE

**Causa:** Expo SDK 54 rediseñó la API de `expo-file-system`. Al importar `expo-file-system` (sin sufijo), el paquete exporta la nueva API que **no es compatible** con `readAsStringAsync`, `getInfoAsync`, `EncodingType`, etc. En runtime lanza `TypeError: FileSystem.EncodingType is undefined` y similares — no hay error de TypeScript porque los tipos no cambiaron, solo el runtime.  
**Solución:**
```ts
// ✅ CORRECTO — API antigua explícita, estable en Expo 54
import * as FileSystem from 'expo-file-system/legacy';

// ❌ INCORRECTO — nueva API de Expo 54, incompatible
import * as FileSystem from 'expo-file-system';
```
El subfijo `/legacy` es el path oficial de Expo para mantener compatibilidad durante la migración. Se usa en `apps/mobile/src/shared/api/client.ts`.

---

### P13: `OutOfMemoryError` al subir videos en Android ⚠️ CRÍTICO MOBILE

**Causa:** el flujo de upload de `@regieart/api` siempre llamaba a `readAsBinary()` antes del PUT, lo que en mobile ejecuta:
```ts
// Lee TODA la data como string Base64 en el heap de JS
const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
const buffer = base64ToArrayBuffer(base64); // convierte a ArrayBuffer
await fetch(r2Url, { body: buffer }); // pone buffer en memoria
```
Un video de 49 MB genera ~65 MB de Base64 + ~49 MB de ArrayBuffer = **~114 MB simultáneos** en el heap de JS. Android limita el heap a ~268 MB total; con el runtime + app, no queda espacio → `java.lang.OutOfMemoryError`.

**Solución:** nuevo hook opcional `streamUploadToPresignedUrl` en la interfaz `FileReaderAdapter`:
```ts
// packages/api/src/storage/fileReader.ts — interfaz
streamUploadToPresignedUrl?(fileOrUri: string, url: string, contentType: string, sizeBytes: number): Promise<void>;

// packages/api/src/storage/storage.service.ts — se usa ANTES de readAsBinary
if (config.fileReaderAdapter.streamUploadToPresignedUrl && typeof fileOrUri === 'string') {
  await config.fileReaderAdapter.streamUploadToPresignedUrl(fileOrUri, uploadUrl, contentType, sizeBytes);
} else {
  const binary = await config.fileReaderAdapter.readAsBinary(fileOrUri); // camino normal
  // ...
}

// apps/mobile/src/shared/api/client.ts — implementación nativa
async streamUploadToPresignedUrl(fileOrUri, url, contentType, sizeBytes) {
  // FileSystem.uploadAsync usa OkHttp (Android) / URLSession (iOS)
  // El archivo NUNCA entra al heap de JavaScript
  const result = await FileSystem.uploadAsync(url, fileOrUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType, 'Content-Length': String(sizeBytes) },
  });
  if (result.status < 200 || result.status >= 300)
    throw new Error(`R2 PUT failed ${result.status}`);
}
```
Desktop no implementa este hook → sigue usando `readAsBinary` + `putToPresignedUrl` (proxy Vite). Mobile lo implementa → streaming nativo, sin límite práctico de tamaño.

---

## 8. Estado de testing — completado y pendiente

### ✅ Completado — Desktop (Playground `/dev/playground`)

| Feature | Plataforma | Estado |
|---------|------------|--------|
| Auth ROPC + token refresh automático | Desktop | ✅ |
| 401 queue coalescing (1 refresh para N peticiones paralelas) | Desktop | ✅ |
| Users: `getMe`, `searchUsers` | Desktop | ✅ |
| Organizations: listar, detalle, miembros | Desktop | ✅ |
| Songs: listar | Desktop | ✅ |
| Venues: listar | Desktop | ✅ |
| Events: listar | Desktop | ✅ |
| Finance: categorías, entradas | Desktop | ✅ |
| Inventory: instrumentos | Desktop | ✅ |
| Notifications: listar | Desktop | ✅ |
| Messages: conversaciones | Desktop | ✅ |
| Storage: SVG → music-score | Desktop | ✅ |
| Storage: MP3 → audio-track | Desktop | ✅ |
| Storage: video pequeño MP4 → reference-video | Desktop | ✅ |
| Storage: video grande multipart (257 MB) | Desktop | ✅ |
| Storage: .mscz → espera HTTP 400 | Desktop | ✅ |
| Storage: búsqueda de assets | Desktop | ✅ |
| Storage: URL de descarga | Desktop | ✅ |
| Storage: delete asset | Desktop | ✅ |

### ✅ Completado — Write Suite (Desktop + Mobile, 11/11 fases)

> La Write Suite es la suite de tests CUD (Create/Update/Delete) con 2 usuarios.
> Disponible en desktop (`WriteSuiteTab.tsx`) y mobile (`WriteSuiteScreen.tsx`).
> Ver [Sección 12](#12-write-suite--11-fases-cud-detalladas) para detalle de cada fase.

| Feature | Plataforma | Estado |
|---------|------------|--------|
| Crear/eliminar organización | Desktop + Mobile | ✅ |
| Crear/eliminar canción | Desktop + Mobile | ✅ |
| Crear venue + evento (fechas dinámicas +3 días) | Desktop + Mobile | ✅ |
| DaySheet: schedule, contact, transport | Desktop + Mobile | ✅ |
| Finance: budget, expense, per-diem (`userId`) | Desktop + Mobile | ✅ |
| Habilidades de usuario | Desktop + Mobile | ✅ |
| Inventario: crear/asignar/devolver instrumento | Desktop + Mobile | ✅ |
| Login User 2 + invite a org + PATCH role (con `OrganizationMember.id`) | Desktop + Mobile | ✅ |
| Limpieza completa (delete evento, canción, org) | Desktop + Mobile | ✅ |
| Upload user-avatar (actualiza `avatarUrl`) | Desktop + Mobile | ✅ |
| Upload user-banner (actualiza `bannerUrl`) | Desktop + Mobile | ✅ |

### ✅ Completado — Storage Suite Mobile

> Ver [Sección 13](#13-storage-suite-mobile--resultados-y-arquitectura) para detalle completo.

| AssetType | Archivo de prueba | Estado |
|-----------|-------------------|--------|
| `user-avatar` | PNG sintetizado 1×1 px | ✅ |
| `user-avatar` | Foto de cámara (3000×4000, 623 KB) | ✅ |
| `user-banner` | Imagen de galería (251 KB JPEG) | ✅ |
| `reference-video` | Video MP4 galería (37 MB, streaming nativo) | ✅ |
| `legal-document` | PDF desde picker (70 KB) | ✅ |
| `audio-track` | MP3 desde picker (4.57 MB) | ✅ |

---

### 🔲 Pendiente — alta prioridad

#### 1. Flujo social con segunda cuenta

Con `testuserinvitado1@gmail.com` como User 2 ya existe la segunda cuenta (usada en Write Suite), pero falta testear:
- Mensajes directos entre usuarios reales (Write Suite no los prueba)
- Notificaciones cruzadas en tiempo real (`EVENT_ASSIGNED`, `INVITE_ACCEPTED`)
- `GET /messages/conversations` con historial real entre 2 usuarios

#### 2. DaySheet en vivo (tracking móvil)

```
PATCH /events/:id/schedule/:itemId/complete
```

Toggle sin body. Para cualquier MEMBER. No testeado — es la función principal del día del show.

#### 3. Pronóstico meteorológico explícito

```
GET /events/:id/weather
```

Se incluye automáticamente en el master daysheet pero no se ha testeado de forma aislada ni verificado que `WEATHER_API_KEY` esté activo en Railway.

#### 4. Editar metadatos de asset

```
PATCH /storage/assets/:id  →  { displayName, description, tags, language }
```

Funcionalidad de librería de medios, no testeada.

#### 5. Reporte financiero

```
GET /finance/reports?orgId=&from=&to=
```

Devuelve resumen de entradas `APPROVED` por período. No testeado.

---

### 🔲 Pendiente — media prioridad

| Feature | Por qué importa al frontend |
|---------|----------------------------|
| Per diem (`POST /finance/per-diem`) | Pantalla de viáticos por músico |
| Reporte financiero (`GET /finance/reports`) | Dashboard de finanzas de la banda |
| Perfil público (`GET /users/:id`) | Pantalla de perfil de otros músicos |
| Habilidades (`GET /skill-categories`, `POST /users/me/skills`) | Pantalla de edición de perfil |
| Lista de equipaje (`GET /instruments/assignments?eventId=`) | Equipaje del show en DaySheet |
| `GET /events/:id/roster` | Lista de asistentes en detalle de evento |
| Multipart upload desde la UI mobile | Videos grandes subidos por el usuario (>50 MB) |

---

## 9. Referencia rápida: convenciones del backend

### Convención de respuesta

```json
// Éxito (objeto)
{ "success": true,  "data": { ... } }

// Éxito (lista paginada)
{ "success": true,  "data": [ ... ], "meta": { "total": 42, "page": 1, "limit": 20 } }

// Error
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Song not found" } }
```

### Códigos HTTP

| Código | Causa típica |
|---|---|
| `400` | DTO inválido — campo extra, tipo incorrecto, campo requerido faltante |
| `401` | Sin token o token expirado |
| `403` | Sin permisos (rol insuficiente) |
| `404` | Recurso no encontrado |
| `409` | Conflicto — recurso duplicado (habilidad ya existente, ya es miembro, etc.) |
| `429` | Rate limit: 60 req/min global, 10 req/min presigned-upload |

### Rate limits

| Endpoint | Límite |
|---|---|
| Global | 60 req/min por IP |
| `POST /storage/presigned-upload` | 10 req/min por usuario |
| `POST /storage/multipart/initiate` | 5 req/min por usuario |

### Lazy provisioning de usuarios

La primera llamada autenticada a cualquier endpoint crea automáticamente el usuario en PostgreSQL usando los datos del JWT de Keycloak. No hay endpoint de registro separado.

### `amount` en finanzas

Siempre enviar como **string decimal**:
```json
{ "amount": "420.00" }   ✅ correcto
{ "amount": 420.00 }     ❌ falla con 400
```

### `forbidNonWhitelisted: true`

El backend usa `ValidationPipe` con esta opción. Cualquier campo extra en el body de una petición causa `400 Bad Request`. Los campos deben coincidir exactamente con el DTO del endpoint.

### IDs — CUID

Todos los IDs son [CUID](https://github.com/paralleldrive/cuid) (ej: `cms28feae00l913llkhp4lxsr`). Pattern: `^c[a-z0-9]{19,}$`.

---

## 10. IDs de referencia en producción

Datos reales del entorno de producción con la cuenta de prueba.

```
userId:   cmqgqnin60000gx5b5mxsjfow  (Jean-Pierre Leblanc — teststorage@gmail.com)
orgId:    cmq6fv13k000oforicucsb0pp  (organización principal)
venueId:  cmruzeaqj000affozzsplph5v  (Salle Wilfrid-Pelletier, Montreal)

Songs en producción:
  cmrvsdmr2001313llhw43q4x5  Le Petit Pêcheur
  cmrvsdn26001613llrw4slkyz  Bésame Mucho
  cmrvsdn7n001913llsbpfv8rn  La Bamba
  cmrvsdnbc001c13llouu903ar  Summertime

Skill Categories (catálogo global):
  cmrvsc8zi000213llghinu444  Trompette         (INSTRUMENT)
  cmrvsc9a7000413llucbmfr2q  Basse électrique  (INSTRUMENT)
  cmrvsc9ij000613llintsvlio  Batterie          (INSTRUMENT)
  cmrvsc9o3000813llw8v19ycq  Piano / Claviers  (INSTRUMENT)
  cmrvsc9ry000a13lleqijmh95  Saxophone         (INSTRUMENT)
  cmrvsc9vz000c13ll2jc9gr4b  Violon            (INSTRUMENT)
  cmrvsc9zq000e13lleqyvg3nk  Technicien FOH    (TECHNICAL)
  cmrvsca3p000g13ll87pu62xk  Technicien Lumières (TECHNICAL)
  cmrvsca7f000i13llpmpzv4ed  Tour Manager      (MANAGEMENT)
  cmrvscadq000k13ll4dbrsp99  Directeur Musical (MANAGEMENT)
```

### Archivos de test para Storage (`MediasTest/`)

| Archivo | Tipo sugerido | MIME | Tamaño |
|---|---|---|---|
| `afiche-produccion.svg` | `music-score` | `image/svg+xml` | ~1.3 MB |
| `produccion-Le Petit Pêcheur-BanderaRoja.mp3` | `audio-track` | `audio/mpeg` | ~8.4 MB |
| `video.mp4` | `reference-video` | `video/mp4` | ~584 KB |
| `cai en la trampa.mp4` | `reference-video` | `video/mp4` | ~270 MB (multipart) |
| `PobreSoy_Piano.mscz` | — | `application/zip` | pequeño |

> `.mscz` (MuseScore) es `application/zip` internamente, que no está en ninguna whitelist. El backend debe devolver `400` al intentar subirlo — esto se usa para testear el rechazo de tipos no permitidos.

---

## Apéndice: cómo usar el playground

### Requisitos

1. Docker corriendo con el frontend: `docker compose up`
2. O en desarrollo local: `pnpm dev` desde `apps/desktop`

### Pasos básicos

1. Ir a `http://host.docker.internal:3001/dev/playground` (Docker) o `http://localhost:5173/dev/playground`
2. En la sección **ROPC Login**, ingresar las credenciales de prueba y hacer clic en "Iniciar sesión"
3. Hacer clic en **▶ Run Full Suite** para correr los 14 endpoints de la suite principal
4. Para testear Storage, seleccionar un archivo en **Storage R2 — Media File Test** y hacer clic en **▶ Test Upload Flow**
5. Para la suite completa de Storage, usar la sección **Storage Suite — Todos los formatos**

### Tab DevTools

- **Request Log:** todas las peticiones HTTP interceptadas con status, duración y headers
- **JWT Decoder:** decodifica el token actual y muestra los claims
- **Consola:** output de errores del playground

---

## 11. Mobile — DEV Tools

Las herramientas de desarrollo mobile se acceden desde `OnboardingScreen` cuando `__DEV__ === true`.
Hay 3 botones visibles solo en desarrollo:

```
┌─────────────────────────────────────┐
│  ✍️  Write Suite   (azul)           │
│  🛠️  DevTools      (verde)          │
│  📦  Storage Suite (naranja)        │
└─────────────────────────────────────┘
```

### Archivos

```
apps/mobile/src/features/dev/
├── index.ts              ← re-exporta las 3 pantallas
├── WriteSuiteScreen.tsx  ← suite CUD 11 fases (ver Sección 12)
├── DevToolsScreen.tsx    ← log de requests + contador de refreshes
└── StorageSuiteScreen.tsx← storage end-to-end (ver Sección 13)
```

### Cómo funciona el interceptor de requests

El interceptor se instala en el entry point:

```ts
// apps/mobile/src/entry/index.tsx
if (__DEV__) installFetchInterceptor();  // desde features/dev/requestLog.ts
```

`requestLog.ts` monkey-patchea `global.fetch` para capturar todas las peticiones.
Almacena en un store reactivo: método, URL, status, duración, si usó Bearer token.
Cuenta separadamente las llamadas a Keycloak (refreshes de token).

### DevToolsScreen

Muestra una tabla scrollable con las últimas peticiones:

| Tiempo | Método | URL (recortada) | Status | Duración | Auth |
|--------|--------|-----------------|--------|----------|------|
| 00:42:05 | DELETE | .../storage/assets/cms1... | 200 | 142ms | 🔑 |
| 00:42:04 | POST | .../storage/presigned-upload | 200 | 136ms | 🔑 |
| 00:42:02 | POST | keycloak.../token | 200 | 275ms | — |

Contador de Keycloak refreshes visible en la parte superior.

### Navegación mobile (RootStack)

```
apps/mobile/src/navigation/index.tsx

RootStack
├── Onboarding         ← muestra botones DEV cuando __DEV__
├── Login
├── Dashboard
├── (feature screens…)
├── DevPlayground      → WriteSuiteScreen
├── DevTools           → DevToolsScreen
└── StorageSuite       → StorageSuiteScreen
```

### `shared/api/client.ts` — inicialización mobile

```ts
// apps/mobile/src/shared/api/client.ts
// Se importa como side-effect en entry/index.tsx

initApiClient({
  apiBaseUrl:   process.env.EXPO_PUBLIC_API_BASE_URL,
  keycloakUrl:  process.env.EXPO_PUBLIC_KEYCLOAK_URL,
  realm:        process.env.EXPO_PUBLIC_KEYCLOAK_REALM,
  clientId:     process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID,
  tokenAdapter,      // SecureStore (expo-secure-store)
  fileReaderAdapter, // expo-file-system/legacy + streamUploadToPresignedUrl
});

// Exporta:
export async function storeUserTokens(
  accessToken: string, refreshToken: string,
  expiresIn: number, refreshExpiresIn: number,
): Promise<void>
```

`storeUserTokens` construye el objeto `StoredTokens` con los timestamps calculados
(`expiresAt = Date.now() + expiresIn * 1000`) y lo guarda vía el tokenAdapter.
Se llama después de un login ROPC manual, seguido de `resetHttpClient()`.

---

## 12. Write Suite — 11 fases CUD detalladas

Disponible en:
- **Desktop:** `apps/desktop/src/features/dev/WriteSuiteTab.tsx`
- **Mobile:** `apps/mobile/src/features/dev/WriteSuiteScreen.tsx`

Usa 2 usuarios:
- **User 1:** `teststorage@gmail.com` (owner, crea todos los recursos)
- **User 2:** `testuserinvitado1@gmail.com` (invitado, se une a la org)

### Fases

| Fase | Descripción | Endpoints |
|------|-------------|-----------|
| **1** | Login User 1 (ROPC) | `POST /realms/regieart/.../token` |
| **2** | Crear organización | `POST /organizations` |
| **3** | Crear canción | `POST /songs` `{ orgId, title, composer }` |
| **4** | Crear venue + evento | `POST /venues`, `POST /events` (fecha dinámica: `Date.now() + 3 días`) |
| **5** | DaySheet | `POST /events/:id/schedule`, `PATCH /events/:id/contact`, `POST /events/:id/vehicles` |
| **6** | Finanzas | `PUT /events/:id/finance`, `POST /finance/entries`, `POST /finance/per-diem` |
| **7** | Habilidades de usuario | `GET /skill-categories`, `POST /users/me/skills` |
| **8** | Inventario | `POST /instruments`, `POST /instruments/:id/assign`, `PATCH /instruments/:id/return` |
| **9** | Login User 2 + invite | Login User 2 ROPC, `POST /organizations/:id/invite-links`, `POST /organizations/join/:token` |
| **10** | Cambiar rol de User 2 | `PATCH /organizations/:orgId/members/:memberId/role` — **`memberId` = OrganizationMember.id (join table), NO userId** |
| **11** | Limpieza total | DELETE evento, canción, org |

### Gotchas críticos (errores 400 comunes)

| Campo | Incorrecto | Correcto |
|-------|------------|---------|
| `amount` en finanzas | `420` (número) | `"420.00"` (string decimal) |
| ID para PATCH role | `userId` del usuario | `id` del registro `OrganizationMember` (del response de invite/members) |
| Fechas del evento | fecha fija en octubre 2026 | `new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()` (WeatherAPI tiene ventana de 14 días) |
| Per-diem recipient | `recipientId` | `userId` (el backend no acepta `recipientId`) |

---

## 13. Storage Suite Mobile — resultados y arquitectura

### Archivo

`apps/mobile/src/features/dev/StorageSuiteScreen.tsx`

### Flujo de la pantalla

```
1. Login ROPC → storeUserTokens → resetHttpClient
           ↓
2. getMyOrganizations() → guarda orgId en orgIdRef (useRef, no state)
           ↓
3. Tests independientes (cada botón es autónomo):
   ├─ Auto      → PNG 1×1 sintetizado → user-avatar (sin IDs)
   ├─ Cámara    → foto nativa → user-avatar (sin IDs)
   ├─ Galería   → imagen → user-banner (sin IDs)
   │             video  → reference-video (crea evento temp con orgId)
   └─ Documento → MIME detect → AssetType → crea song/event temp si necesario → upload → cleanup
```

### Tabla MIME → AssetType (implementada en `MIME_TO_ASSET`)

| MIME | AssetType | Recursos temporales |
|------|-----------|---------------------|
| `image/jpeg`, `image/png`, `image/webp` | `user-avatar` | ninguno |
| `audio/mpeg`, `audio/wav`, `audio/ogg` | `audio-track` | canción temp (`orgId` requerido) |
| `video/mp4`, `video/quicktime` | `reference-video` | evento temp (`orgId` requerido) |
| `application/pdf` | `legal-document` | ninguno (solo `orgId`) |
| (fallback) | `legal-document` | ninguno (solo `orgId`) |

### Recursos temporales — patrón

```ts
// Canción temporal (para audio-track)
const song = await createSong({
  orgId,
  title: `[DEV Storage Test] ${Date.now()}`,
  composer: 'StorageSuite',
});
tempSongId = song.id;
// → cleanup en finally: await getHttpClient().delete(`songs/${tempSongId}`)

// Evento temporal (para reference-video)
await getHttpClient().post('events', { json: {
  orgId,
  title: `[DEV Storage Test] ${Date.now()}`,
  type: 'CONCERT',
  startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  endTime:   new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  isPublic: false,
}});
tempEventId = evRes.data.id;
// → cleanup en finally: await getHttpClient().delete(`events/${tempEventId}`)
```

### Fix del estado del botón (finalStatus)

El `log(msg)` de cada test siempre fuerza `status: 'running'` (es su diseño para mostrar progreso en vivo).
Cuando el bloque `finally` llamaba a `log('🗑️ Evento eliminado')`, revertía el estado 'ok' a 'running'.

**Solución implementada:** `finalStatus` trackea el estado final antes de entrar al `finally`.
Los mensajes de limpieza usan `lines.push` + `appendGlobal` directamente (sin `log`).
Al final del `finally`, se re-aplica `finalStatus` explícitamente:

```ts
let finalStatus: TestStatus = 'idle';
try {
  // ...upload...
  finalStatus = 'ok';
  setGalleryTest({ status: 'ok', detail: lines.join('\n') });
} catch (err) {
  finalStatus = 'fail';
  setGalleryTest({ status: 'fail', detail: lines.join('\n') });
} finally {
  if (tempEventId) {
    try {
      await getHttpClient().delete(`events/${tempEventId}`);
      lines.push('  🗑️ Evento temporal eliminado');    // ← NO usa log()
      appendGlobal('  🗑️ Evento temporal eliminado');
    } catch { /* ignore */ }
    setGalleryTest({ status: finalStatus, detail: lines.join('\n') }); // ← re-aplica
  }
}
```

### Resultados reales confirmados (2026-07-27)

```
✅ user-avatar  — PNG 1×1 px sintetizado        70 B    → CONFIRMED  USER_AVATAR
✅ user-avatar  — Foto cámara 3000×4000 JPEG   623 KB  → CONFIRMED  USER_AVATAR
✅ user-banner  — Imagen galería JPEG           251 KB  → CONFIRMED  USER_BANNER
✅ reference-video — Video MP4 galería           37 MB  → CONFIRMED  REFERENCE_VIDEO  (streaming nativo)
✅ legal-document  — PDF picker                  70 KB  → CONFIRMED  LEGAL_DOCUMENT
✅ audio-track     — MP3 picker                 4.57 MB → CONFIRMED  AUDIO_TRACK
```

Keycloak refresh count durante toda la suite: **1** (un solo refresh automático para los 6 tests).
