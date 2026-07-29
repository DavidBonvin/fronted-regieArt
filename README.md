# RégieArt — Frontend Monorepo

Frontend monorepo para la plataforma RégieArt, una herramienta de gestión para músicos y equipos de producción (day sheets, convoy, inventario, finanzas, mensajería).

---

## Estructura del repositorio

```
fronted-regieArt/
├── apps/
│   ├── desktop/          # React 18 + Vite — aplicación web
│   └── mobile/           # React Native + Expo 54 — aplicación móvil
├── packages/
│   ├── ui/               # Design system compartido (componentes, iconos, tema, fuentes)
│   ├── types/            # Tipos TypeScript compartidos entre apps
│   └── config/           # Configuraciones base (ESLint, Tailwind, TSConfig)
├── turbo.json            # Configuración Turborepo
├── pnpm-workspace.yaml   # Definición del workspace pnpm
└── package.json          # Scripts raíz
```

**Gestor de paquetes:** `pnpm` con workspaces  
**Build orchestrator:** Turborepo  
**Node mínimo:** 20

---

## Primeros pasos

```bash
# Instalar dependencias
pnpm install

# Desarrollo — desktop (http://localhost:5173)
pnpm dev:desktop

# Desarrollo — mobile (Expo)
pnpm dev:mobile

# Ambas apps en paralelo
pnpm dev

# Type-check
pnpm typecheck

# Build de producción
pnpm build
```

---

## Design System — `@regiart/ui`

Todo lo visual compartido vive en `packages/ui`. Las apps lo consumen como workspace dependency.

```json
// En cualquier app/package.json
"@regiart/ui": "workspace:*"
```

### Árbol del paquete

```
packages/ui/src/
├── components/
│   ├── Button/           # Variantes: primary | secondary | ghost | danger
│   ├── Card/             # Variantes: elevated | outlined | flat
│   ├── Input/            # Con label, error, hint, iconos
│   ├── Typography/       # h1-h4, body1-2, caption, overline, label
│   ├── MuIcon/           # Componente universal de iconos
│   └── MuSvg/            # Wrapper SVG base
├── icons/                # +700 SVGs exportados como React components
├── fonts/                # Familia tipográfica Archivo (16 variantes)
│   ├── index.scss        # @font-face declarations (web)
│   └── native.ts         # Asset map para expo-font (mobile)
├── theme/
│   ├── colors.scss       # Paleta primitiva como CSS custom properties
│   ├── light.scss        # Tema semántico light
│   └── index.scss        # @forward de ambos
├── tokens/
│   └── index.ts          # Tokens JS (colores, spacing, tipografía, radius, sombras)
└── Types/
    └── common.ts         # SvgrComponent y tipos compartidos
```

---

## Iconos

El sistema de iconos usa `vite-plugin-svgr` para transformar SVGs en React components.
Hay más de 700 iconos disponibles (Iconsax).

### Uso en cualquier componente

```tsx
import { MuIcon } from '@regiart/ui';

// Por nombre (autocompletado TypeScript con todos los nombres disponibles)
<MuIcon svgName="Activity" />
<MuIcon svgName="Calendar" />
<MuIcon svgName="MessageText" />

// Pasando el componente directamente
import { Icons } from '@regiart/ui';
<MuIcon svg={Icons.Heart} />

// Con clase CSS
<MuIcon svgName="Settings" className="icon-lg" />
```

### Todos los nombres disponibles

```ts
import { Icons } from '@regiart/ui';
type IconName = keyof typeof Icons; // TypeScript sugiere todos los nombres
```

Los SVGs están en `packages/ui/src/icons/` y se exportan desde `packages/ui/src/icons/index.ts`.  
Cada import usa el sufijo `?react` para la transformación SVGR:

```ts
// packages/ui/src/icons/index.ts
export { default as Activity } from './activity.svg?react';
export { default as Calendar } from './calendar.svg?react';
// ...+700 más
```

> **Importante:** El archivo `index.ts` es la fuente de verdad de los nombres de los iconos.
> No usar `svgs.ts` (formato alternativo no activo).

---

## Colores

El sistema de colores usa **CSS custom properties** definidas como mixins SCSS en `packages/ui/src/theme/`.

### Paleta primitiva

| Escala | Descripción |
|--------|-------------|
| `--color-brand-*` | Verde teal — color principal de la marca (50→950) |
| `--color-secondary-*` | Azul acero — color secundario (50→950) |
| `--color-tertiary-*` | Rojo — estados de error / alerta (50→950) |
| `--color-neutral-*` | Grises — textos, bordes, fondos (50→950) |
| `--color-opacity-brand-*` | Brand con distintas opacidades (0→80) |
| `--color-opacity-secondary-*` | Secondary con distintas opacidades |

### Cómo funcionan

El archivo `apps/desktop/src/styles/global.scss` es importado **una sola vez** en `main.tsx` y aplica todos los CSS custom properties al `:root`. Después de eso, **ningún archivo SCSS necesita importar nada** para usar los colores:

```scss
/* Cualquier archivo .scss en la app */
.mi-componente {
  background-color: var(--color-brand-500);
  border-color: var(--color-neutral-200);
  color: var(--color-neutral-800);
}
```

### Uso en React Native (tokens JS)

Para mobile, los colores están disponibles como objetos JavaScript en `tokens`:

```ts
import { tokens } from '@regiart/ui';

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.brand[500],   // '#4A827E'
    borderColor: tokens.colors.neutral[200],
  },
});
```

### Importar el tema SCSS (si necesitas usar los mixins)

Si en algún archivo SCSS necesitas usar el mixin directamente (casos especiales):

```scss
/* No necesitas ruta relativa gracias al loadPaths configurado en vite.config.ts */
@use 'theme' as theme;

.mi-contenedor {
  @include theme.palette;
}
```

---

## Tipografía

La fuente principal de la app es **Archivo** (Google Fonts), incluida localmente en `packages/ui/src/fonts/`.

### Variantes disponibles

| Peso CSS | Nombre |
|----------|--------|
| 100 | Thin / Thin Italic |
| 200 | ExtraLight / ExtraLight Italic |
| 300 | Light / Light Italic |
| 400 | Regular / Italic |
| 500 | Medium / Medium Italic |
| 600 | SemiBold / SemiBold Italic |
| 700 | Bold / Bold Italic |
| 800 | ExtraBold / ExtraBold Italic |

### Uso en web (desktop)

La fuente ya está registrada globalmente. Basta con usarla en CSS:

```scss
/* En cualquier .scss — sin imports */
.titulo {
  font-family: 'Archivo', system-ui, sans-serif;
  font-weight: 700;
}
```

El `font-family: 'Archivo'` también está aplicado al `:root` por defecto, por lo que todos los elementos lo heredan automáticamente.

### Uso en React Native (mobile)

```tsx
import { useFonts } from 'expo-font';
import { archivoFonts } from '@regiart/ui/fonts/native';

export default function App() {
  const [fontsLoaded] = useFonts(archivoFonts);
  if (!fontsLoaded) return null;

  return (
    <Text style={{ fontFamily: 'Archivo-SemiBold' }}>
      Hola RégieArt
    </Text>
  );
}
```

---

## Tokens de diseño (JS)

Los tokens están disponibles desde `@regiart/ui` para uso en código JS/TS:

```ts
import { tokens } from '@regiart/ui';

tokens.colors.brand[500]          // '#4A827E'
tokens.colors.neutral[100]        // '#E9EDF0'
tokens.spacing.md                 // 16
tokens.radius.lg                  // '12px'
tokens.shadow.md                  // '0 4px 12px rgba(0,0,0,0.10)'
tokens.transition.normal          // '200ms ease'
tokens.typography.fontWeight.bold // '700'
```

---

## SCSS sin rutas relativas

El `vite.config.ts` de desktop configura `loadPaths` apuntando a `packages/ui/src`:

```ts
// apps/desktop/vite.config.ts
css: {
  preprocessorOptions: {
    scss: {
      loadPaths: [resolve(__dirname, '../../packages/ui/src')],
    },
  },
},
```

Esto permite en cualquier `.scss` de la app:

```scss
@use 'theme';          /* → packages/ui/src/theme/index.scss */
@use 'theme/colors';   /* → packages/ui/src/theme/colors.scss */
@use 'fonts';          /* → packages/ui/src/fonts/index.scss  */
```

También se puede importar por nombre de paquete (para tooling externo):

```scss
@use '@regiart/ui/theme';
@use '@regiart/ui/fonts';
```

---

## Exports del paquete `@regiart/ui`

```json
{
  ".":              "./src/index.ts",
  "./theme":        "./src/theme/index.scss",
  "./theme/*":      "./src/theme/*.scss",
  "./fonts":        "./src/fonts/index.scss",
  "./fonts/native": "./src/fonts/native.ts"
}
```

---

## Scripts útiles

```bash
# Solo desktop en desarrollo
pnpm dev:desktop

# Solo mobile
pnpm dev:mobile

# Type-check de todas las apps y packages
pnpm typecheck

# Type-check solo desktop
pnpm --filter @regiart/desktop exec tsc --noEmit

# Build solo packages UI y types
pnpm build:packages
```

---

## Configuración de apps

### Desktop (`@regiart/desktop`)
- **Framework:** React 18 + React Router 6
- **Bundler:** Vite 5
- **Estilos:** SCSS con CSS Modules (`*.module.scss`) + global CSS vars
- **SVGs:** `vite-plugin-svgr` — importados como React components con sufijo `?react`
- **Puerto dev:** `5173`

### Mobile (`@regiart/mobile`)
- **Framework:** React Native + Expo SDK 54
- **Bundler:** Metro
- **Estilos:** `StyleSheet` de React Native + tokens JS de `@regiart/ui`
- **Fuentes:** `expo-font` con `archivoFonts` de `@regiart/ui/fonts/native`

---

## Convenciones

- Los **nombres de iconos** usan PascalCase: `Activity`, `CalendarAdd`, `MessageText`
- Los **CSS custom properties** siguen el patrón `--color-{escala}-{peso}`: `--color-brand-500`
- Los **componentes** se exportan con nombre: `import { Button, Card } from '@regiart/ui'`
- Los **SCSS modules** se nombran `ComponentName.module.scss`
- Las **rutas relativas en SCSS están prohibidas** — siempre usar `@use 'theme'` sin path

---

---

# Parte 2 — API, Auth, Storage y DEV Tools

> Esta sección documenta todo lo implementado en las sesiones de desarrollo de julio 2026.
> Incluye el package `@regieart/api`, el flujo de autenticación con Keycloak, el módulo de
> almacenamiento en Cloudflare R2 y las herramientas de desarrollo (DEV tools) para mobile y desktop.

---

## Package `packages/api` — Cliente HTTP

El paquete `@regieart/api` encapsula toda la lógica de red de la aplicación. Es consumido por
`apps/desktop` y `apps/mobile`.

### Stack interno

| Capa | Tecnología |
|------|------------|
| HTTP client | `ky` v1.14.3 (fetch-based) |
| Auth | Keycloak 23 RS256, auto-refresh de tokens |
| Storage | Cloudflare R2 vía presigned URLs (protocolo S3) |
| File reading | Adaptador por plataforma (`FileReaderAdapter`) |
| Token storage | Adaptador por plataforma (`TokenStorageAdapter`) |

### Inicialización

Cada app llama a `initApiClient` una vez en su entry point con sus adaptadores específicos:

```ts
// apps/mobile/src/shared/api/client.ts  (o  apps/desktop/src/shared/api/client.ts)
import { initApiClient } from '@regieart/api';

initApiClient({
  apiBaseUrl:   'https://regieart-backend-production.up.railway.app/api/v1',
  keycloakUrl:  'https://keycloak-production-b2ce.up.railway.app',
  realm:        'regieart',
  clientId:     'regieart-mobile',
  tokenAdapter,     // lectura/escritura de tokens (SecureStore en mobile, localStorage en desktop)
  fileReaderAdapter, // lectura de archivos para uploads
});
```

### Exports principales

```ts
import {
  // Config & client
  initApiClient, getConfig, getHttpClient, resetHttpClient,

  // Auth
  storeUserTokens,   // guarda tokens después de ROPC login

  // Módulos de dominio
  getMyOrganizations, createOrganization, deleteOrganization,
  createSong, updateSong, deleteSong,
  // ... (todos los servicios del dominio)

  // Storage
  uploadFile,         // presigned-upload → PUT R2 → confirm-upload (todo en uno)
  getAsset, deleteAsset, searchAssets, getDownloadUrl,
} from '@regieart/api';
```

### Estructura de archivos

```
packages/api/src/
├── index.ts                    # Barrel — re-exporta todo
├── client.ts                   # Singleton ky + initApiClient + getHttpClient
├── config.ts                   # getConfig() — URL base, keycloak, adaptadores
├── auth/
│   └── keycloak.ts             # Auto-refresh de token Keycloak (con AbortController)
├── storage/
│   ├── fileReader.ts           # Interface FileReaderAdapter (readAsBinary, readChunk, getSize, streamUploadToPresignedUrl)
│   └── storage.service.ts      # uploadFile, getAsset, deleteAsset, etc.
└── services/
    ├── orgs.service.ts         # getMyOrganizations, createOrganization, ...
    ├── songs.service.ts        # createSong, ...
    ├── events.service.ts       # createEvent, ...
    └── ... (un archivo por módulo de dominio)
```

---

## Variables de entorno

### Desktop — `apps/desktop/.env`

```env
VITE_API_BASE_URL=https://regieart-backend-production.up.railway.app/api/v1
VITE_KEYCLOAK_URL=https://keycloak-production-b2ce.up.railway.app
VITE_KEYCLOAK_REALM=regieart
VITE_KEYCLOAK_CLIENT_ID=regieart-mobile
```

### Mobile — `apps/mobile/.env`

```env
EXPO_PUBLIC_API_BASE_URL=https://regieart-backend-production.up.railway.app/api/v1
EXPO_PUBLIC_KEYCLOAK_URL=https://keycloak-production-b2ce.up.railway.app
EXPO_PUBLIC_KEYCLOAK_REALM=regieart
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=regieart-mobile
```

---

## Autenticación — Keycloak ROPC

El frontend usa Resource Owner Password Credentials (ROPC) directamente.
El auto-refresh está implementado en `packages/api/src/auth/keycloak.ts`.

### Flow

```
1. Login manual → POST /realms/regieart/protocol/openid-connect/token
   body: grant_type=password, client_id, username, password
   → devuelve: access_token, refresh_token, expires_in, refresh_expires_in

2. Guardar tokens → storeUserTokens(access_token, refresh_token, expires_in, refresh_expires_in)
   → persiste en SecureStore (mobile) / localStorage (desktop)
   → StoredTokens shape: { accessToken, refreshToken, expiresAt: Date.now()+expires_in*1000, refreshExpiresAt: ... }

3. resetHttpClient() → fuerza al cliente ky a usar los nuevos tokens

4. Auto-refresh automático:  packages/api/src/auth/keycloak.ts intercepta cada request
   y renueva el token con refreshToken si expiresAt < Date.now()
```

### Credenciales de prueba (producción)

| Campo | Valor |
|-------|-------|
| **User 1 email** | `teststorage@gmail.com` |
| **User 1 password** | `teststorage@gmail.com` |
| **User 1 userId** | `cmqgqnin60000gx5b5mxsjfow` |
| **User 1 orgId** | se obtiene con `getMyOrganizations()` (no hardcodear) |
| **User 2 email** | `testuserinvitado1@gmail.com` |
| **User 2 password** | `testuserinvitado1@gmail.com` |
| **User 2 userId** | `cms2aehbe00lz13llu32h0t32` |
| **Client ID** | `regieart-mobile` |
| **Realm** | `regieart` |

### CRÍTICO — `AbortSignal.timeout` no existe en Hermes (React Native)

El motor JS de React Native (Hermes) no implementa `AbortSignal.timeout()`.
El fix está en `packages/api/src/auth/keycloak.ts`:

```ts
// ✅ CORRECTO (ya implementado)
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(new Error('Token refresh timed out')), 15_000);
try {
  response = await fetch(tokenUrl, { signal: controller.signal, ... });
} finally {
  clearTimeout(timer);
}

// ❌ INCORRECTO — CRASHEA en React Native
const response = await fetch(tokenUrl, { signal: AbortSignal.timeout(15_000), ... });
```

---

## Storage — Cloudflare R2

### Flujo completo de upload

```
App                         Backend                      Cloudflare R2
 |                              |                               |
 |-- POST /storage/presigned-upload (con assetType, mime, ...) |
 |   { orgId?, songId?, eventId?, displayName, fileSizeBytes }  |
 |                              |-- crea asset en DB (PENDING) |
 |                              |-- genera presigned PUT URL   |
 |<-- { uploadUrl, key, assetId } ----------------------------|
 |                              |                               |
 |-- PUT {uploadUrl} (binario directo, sin proxy) ------------>|
 |<-- 200 OK ---------------------------------------------------
 |                              |                               |
 |-- POST /storage/confirm-upload { key, assetType } -------->|
 |                              |-- asset.status = CONFIRMED  |
 |<-- 200 OK --------------------------------------------------|
```

La función `uploadFile()` de `@regieart/api` hace todo esto internamente.

### `uploadFile` — firma

```ts
uploadFile(
  fileOrUri: string,      // URI del archivo (en mobile: file:// URI)
  assetType: AssetType,   // 'user-avatar', 'legal-document', 'audio-track', etc.
  contentType: string,    // MIME type: 'image/jpeg', 'audio/mpeg', etc.
  options?: {
    orgId?: string;
    songId?: string;
    eventId?: string;
    displayName?: string;
    originalName?: string;
    durationSeconds?: number;
    bitrate?: number;
    pageCount?: number;
  }
): Promise<string>        // → assetId (CUID)
```

### Requisitos de contexto por AssetType

> ⚠️ El backend usa `ValidationPipe` con `forbidNonWhitelisted: true` — pasar IDs que no
> corresponden al tipo devuelve 400. No pasar los IDs requeridos también devuelve 400.

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

### CRÍTICO — Uploads de archivos grandes en React Native (OOM)

En mobile, `readAsStringAsync` de expo-file-system carga el archivo entero en memoria como
Base64, lo que causa `java.lang.OutOfMemoryError` en archivos grandes (ej: videos >20 MB).

**La solución ya está implementada** en `FileReaderAdapter` vía `streamUploadToPresignedUrl`:

```ts
// packages/api/src/storage/fileReader.ts
interface FileReaderAdapter {
  // ... otros métodos
  streamUploadToPresignedUrl?(
    fileOrUri: string,
    url: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<void>;
}

// apps/mobile/src/shared/api/client.ts — implementación
async streamUploadToPresignedUrl(fileOrUri, url, contentType, sizeBytes) {
  const result = await FileSystem.uploadAsync(url, fileOrUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType, 'Content-Length': String(sizeBytes) },
  });
  if (result.status < 200 || result.status >= 300) throw new Error(`R2 PUT failed ${result.status}`);
}
```

`storage.service.ts` detecta este método y lo usa **en lugar de** `readAsBinary` cuando
`fileOrUri` es un string URI. Esto usa el stack HTTP nativo de Android/iOS para streaming.

### CRÍTICO — `expo-file-system/legacy` en Expo 54

Expo SDK 54 depreca la API antigua de `expo-file-system`. La API nueva lanza errores en runtime.
**Siempre importar la versión legacy en mobile:**

```ts
// ✅ CORRECTO
import * as FileSystem from 'expo-file-system/legacy';

// ❌ INCORRECTO — lanza deprecation errors en runtime en Expo 54
import * as FileSystem from 'expo-file-system';
```

---

## DEV Tools — Herramientas de desarrollo

Existen en ambas plataformas para testear la integración con el backend sin necesidad de
una UI completa.

### Desktop — `apps/desktop/src/features/dev/`

Acceso: `/dev/playground` (solo en `import.meta.env.DEV`)

| Archivo | Descripción |
|---------|-------------|
| `ApiPlaygroundPage.tsx` | Página principal con tabs |
| `WriteSuiteTab.tsx` | 11 fases de test CUD (Create/Update/Delete) |
| `ApiSuiteTab.tsx` | Test de storage con todos los AssetTypes |
| `requestLog.ts` | Interceptor fetch para loggear todas las peticiones |

### Mobile — `apps/mobile/src/features/dev/`

Acceso: Botones en `OnboardingScreen` cuando `__DEV__ === true`

| Archivo | Pantalla | Descripción |
|---------|----------|-------------|
| `WriteSuiteScreen.tsx` | ✍️ Write Suite | 11 fases CUD — dos usuarios, roles, permisos |
| `DevToolsScreen.tsx` | 🛠️ DevTools | Log global de requests + contador de Keycloak refreshes |
| `StorageSuiteScreen.tsx` | 📦 Storage Suite | Upload completo de todos los tipos de archivo |
| `index.ts` | — | Re-exporta las 3 pantallas |

El interceptor fetch se instala en `apps/mobile/src/entry/index.tsx`:
```ts
if (__DEV__) installFetchInterceptor();
```

---

## Write Suite — 11 fases

La Write Suite prueba el ciclo completo de CUD con dos usuarios (User 1 = owner, User 2 = invitado).

| Fase | Descripción |
|------|-------------|
| 1 | Login User 1 (ROPC) |
| 2 | Crear organización |
| 3 | Crear canción |
| 4 | Crear venue + evento (fecha dinámica: `Date.now() + 3 días` para ventana de 14 días de WeatherAPI) |
| 5 | DaySheet: Schedule, Contact, Transport (convoy) |
| 6 | Finanzas: Budget, Expense, PerDiem — **`userId`** (no `recipientId`, el backend no acepta recipientId) |
| 7 | Habilidades de usuario |
| 8 | Inventario |
| 9 | Login User 2 + invitar a la org |
| 10 | PATCH role de User 2 — necesita el **ID del OrganizationMember** (join table), no el userId |
| 11 | Limpiar: eliminar evento, canción, organización |

**Consideraciones clave:**
- `amount` en finanzas: siempre string decimal `"420.00"` (no número)
- Fechas de eventos: `new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()` (dinámico)
- PATCH role: obtener `OrganizationMember.id` del response de invite, no usar `userId` directamente

---

## Storage Suite — mobile

Archivo: `apps/mobile/src/features/dev/StorageSuiteScreen.tsx`

### Flujo

1. **Login**: ROPC → guarda tokens → llama `getMyOrganizations()` → guarda `orgId` en `orgIdRef`
2. **Test Auto**: Sintetiza PNG 1×1 en memoria → sube como `user-avatar` (no necesita IDs)
3. **Test Cámara**: Abre cámara nativa → sube foto como `user-avatar`
4. **Test Galería**: Imagen → `user-banner`, Video → `reference-video` (crea evento temp con `orgId`)
5. **Test Documento**: Picker de archivos → detecta MIME → determina AssetType → crea recursos
   temporales si los necesita (song para audio, event para video) → sube → limpia

### Recursos temporales

Los tests que necesitan `songId` o `eventId` crean recursos temporales:

```ts
// Canción temporal (para audio-track, music-score)
const song = await createSong({ orgId, title: '[DEV Storage Test] ...', composer: 'StorageSuite' });
// Evento temporal (para reference-video, financial-receipt, technical-file)
await getHttpClient().post('events', { json: {
  orgId, title: '[DEV Storage Test] ...', type: 'CONCERT',
  startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  endTime:   new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  isPublic: false,
}});
```

La limpieza ocurre en bloques `finally`. El `finalStatus` se trackea explícitamente para
que el `finally` no resetee el estado del botón a `'running'` al llamar `log()`.

---

## Navegación mobile

Archivo: `apps/mobile/src/navigation/index.tsx`

```
RootStack
├── Onboarding        ← pantalla inicial, muestra botones DEV cuando __DEV__
├── Login
├── Dashboard
├── (feature screens...)
├── DevPlayground     → WriteSuiteScreen
├── DevTools          → DevToolsScreen
└── StorageSuite      → StorageSuiteScreen
```

### Entry point

`apps/mobile/src/entry/index.tsx`:
- Importa `'../shared/api/client'` (side-effect: llama `initApiClient`)
- Instala el interceptor fetch si `__DEV__`
- Renderiza la app con el navigator

---

## URLs de producción

| Servicio | URL |
|----------|-----|
| **API backend** | `https://regieart-backend-production.up.railway.app/api/v1` |
| **Keycloak** | `https://keycloak-production-b2ce.up.railway.app` |
| **Realm** | `regieart` |
| **Cloudflare R2** (uploads directos) | `https://regieart-media-production.*.r2.cloudflarestorage.com` |

---

## Estado de implementación (julio 2026)

### ✅ Completado

| Plataforma | Feature | Estado |
|------------|---------|--------|
| Desktop | Ruta `/dev/playground` con ApiPlayground | ✅ |
| Desktop | Write Suite — 11/11 fases CUD | ✅ |
| Desktop | Storage Suite — todos los AssetTypes | ✅ |
| Mobile | `packages/api` — cliente HTTP compartido | ✅ |
| Mobile | `shared/api/client.ts` — TokenAdapter + FileReaderAdapter | ✅ |
| Mobile | Write Suite — 11/11 fases CUD | ✅ |
| Mobile | DevTools — request log + Keycloak refresh counter | ✅ |
| Mobile | Storage Suite — user-avatar (auto PNG + cámara) | ✅ |
| Mobile | Storage Suite — user-banner (galería imagen) | ✅ |
| Mobile | Storage Suite — reference-video (galería video, 37 MB) | ✅ |
| Mobile | Storage Suite — legal-document (PDF) | ✅ |
| Mobile | Storage Suite — audio-track (MP3) | ✅ |
| Fix | `AbortSignal.timeout` → `AbortController + setTimeout` | ✅ |
| Fix | `expo-file-system` → `expo-file-system/legacy` | ✅ |
| Fix | Streaming upload para archivos grandes (OOM fix) | ✅ |

### 🔲 Pendiente

- Implementar pantallas de features reales (Auth, Dashboard, Convoy, Songs, etc.)
- Integrar `packages/api` en las pantallas de usuario (no solo DEV tools)
- Tests unitarios y de integración
- Push notifications (Keycloak + expo-notifications)
- Offline support / cache

---

## Arquitectura de packages

```
packages/api/src/
├── index.ts             ← todo se re-exporta aquí
├── client.ts            ← getHttpClient(), resetHttpClient(), getConfig()
├── config.ts            ← initApiClient(), ApiConfig interface
├── types.ts             ← StoredTokens, ApiRes<T>
├── auth/
│   └── keycloak.ts      ← refreshTokens() — con AbortController (NO AbortSignal.timeout)
├── storage/
│   ├── fileReader.ts    ← FileReaderAdapter interface
│   └── storage.service.ts ← uploadFile, uploadLargeFile, getAsset, deleteAsset, ...
└── services/
    ├── orgs.service.ts       ← getMyOrganizations, createOrganization, deleteOrganization
    ├── songs.service.ts      ← createSong (CreateSongDto: { orgId, title, composer? })
    ├── events.service.ts     ← createEvent, deleteEvent
    ├── finance.service.ts
    ├── inventory.service.ts
    ├── messages.service.ts
    └── ...
```
