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
