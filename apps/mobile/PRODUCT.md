# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive — React Native + Expo SDK 54 (mobile: ios/android) | React 18 + Vite 5 (desktop: web)

## Stack

Monorepo: pnpm workspaces + Turborepo + Node 20+
Mobile: React Native + Expo SDK 54, Metro bundler, expo-file-system/legacy, expo-secure-store
Desktop: React 18 + Vite 5 + TypeScript + SCSS Modules
Shared: @regieart/api (ky v1.14.3 + Keycloak 23 ROPC), @regieart/types (NestJS DTOs), @regieart/ui (tokens, fonts)
Auth: Keycloak 23 RS256, Direct Access Grants (ROPC), auto-refresh with AbortController (NOT AbortSignal.timeout — Hermes incompatible)
Storage: Cloudflare R2 via presigned PUT URLs, streaming upload for large files (>20MB OOM prevention)
Backend: NestJS + PostgreSQL + Redis on Railway

## Users

**Primary:** Professional musicians, band directors, and touring artists who use the app *on the day of a show* — loading in gear, checking the schedule on stage, coordinating transport, approving expenses from the van, reading scores backstage. One hand free, high stress, low light.

**Secondary:** Tour managers and technical directors (ADMIN/OWNER role) who create events, manage rosters, assign equipment, and oversee finances from backstage or the rehearsal room.

**Tertiary:** External technicians (EXTERNAL_TECH role) — FOH engineers, lighting techs — who need read-only access to venue notes, technical riders, and their assigned equipment.

## Product Purpose

RégieArt centralizes the entire operational logistics of a live music act:
- **DaySheet**: single-call master view of the day (schedule, venue, weather, roster, finance summary)
- **Convoy**: vehicle routing with GPS pickups, passenger manifests
- **Repertoire**: song library with PDF score viewer and audio reference playback
- **Inventory**: equipment tracking with QR scan check-in/check-out
- **Finance**: expense capture via camera receipt, per-diem tracking, approval workflow
- **Messaging**: band chat + direct messages, with notification badges
- **Organizations**: multi-band support with role-based access (OWNER/ADMIN/MEMBER/EXTERNAL_TECH)

Success = the band arrives on time, everyone knows their cue, equipment is accounted for, and receipts are filed — all from one app.

## Positioning

The only logistics tool built specifically for the production realities of live music bands, not adapted from generic project management. The DaySheet master endpoint delivers the entire operational picture of a show in one API call. Storage is asset-first: PDF scores, audio tracks, and video references live alongside the event data they belong to.

## Visual Direction

**Dark mode only.** The app is used in stage environments — dark venues, dimly lit vans, backstage corridors. High contrast is not a preference, it is a safety requirement.

**Design language:** Precise, professional, minimal. The Operate mode. Brand color: teal (#4A827E / brand-500). No decorative gradients. No purple. No generic "SaaS blue". Every pixel earns its place.

**Typography:** Archivo (all weights 100–800 available via archivoFonts from @regieart/ui/fonts/native)

**Token palette (dark theme mapping):**
- Background: neutral-950 (#181B1E)
- Surface/Card: neutral-900 (#23272A)
- Surface elevated: neutral-800 (#2E3337)
- Text primary: neutral-50 (#F6F8F9)
- Text secondary: neutral-400 (#8C949B)
- Brand action: brand-500 (#4A827E)
- Brand hover/active: brand-400 (#649D98)
- Danger: tertiary-500 (#E74C4C)
- Success: brand-500 (same as brand — green-teal)
- Border: neutral-700 (#42484D)

## Navigation (mobile)

Flow: Onboarding → Login → OrgSelector (NEW) → Dashboard (tab shell)

Tab bar (5 items): Home/Dashboard | Repertoire | [+] Action Sheet | Chat | Profile

**Missing from current navigation (needs adding):**
- `OrgSelector` — screen after login when user has multiple organizations

## Critical Runtime Constraints

- NEVER use `AbortSignal.timeout()` — crashes Hermes engine
- ALWAYS import `expo-file-system/legacy` (not `expo-file-system`) in Expo 54
- Videos >20MB MUST use `streamUploadToPresignedUrl` (FileSystem.uploadAsync) to avoid OOM
- `amount` in finance endpoints is always string decimal: "420.00" (not number)
- `@regieart/ui` Button/Card/Input/Typography are web-only — mobile needs native RN implementations using tokens
