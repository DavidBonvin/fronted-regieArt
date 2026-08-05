---
name: RégieArt Mobile
description: Dark-first logistics app for professional musicians and touring bands
colors:
  # Brand (teal)
  brand-500: "#4A827E"
  brand-400: "#649D98"
  brand-300: "#8FC0B7"
  brand-200: "#BFDCD5"
  brand-600: "#396866"
  # Neutrals (dark surface hierarchy)
  neutral-950: "#181B1E"
  neutral-900: "#23272A"
  neutral-800: "#2E3337"
  neutral-700: "#42484D"
  neutral-600: "#565D63"
  neutral-500: "#6B7379"
  neutral-400: "#8C949B"
  neutral-300: "#B5BCC2"
  neutral-200: "#D2D8DD"
  neutral-100: "#E9EDF0"
  neutral-50: "#F6F8F9"
  # Status
  danger: "#E74C4C"
  danger-bg: "#3D1515"
  success: "#4A827E"
  warning: "#F59E0B"
  warning-bg: "#2A1F00"
  # Base
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Archivo-Bold, system-ui"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
  heading:
    fontFamily: "Archivo-SemiBold, system-ui"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Archivo-Regular, system-ui"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo-Medium, system-ui"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Archivo-Regular, system-ui"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  btn-primary:
    backgroundColor: "{colors.brand-500}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "14px 24px"
    height: "52px"
  btn-secondary:
    backgroundColor: "{colors.neutral-800}"
    textColor: "{colors.neutral-100}"
    rounded: "{rounded.lg}"
    padding: "14px 24px"
    height: "52px"
  btn-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.brand-400}"
    rounded: "{rounded.lg}"
    padding: "14px 24px"
  card-surface:
    backgroundColor: "{colors.neutral-900}"
    rounded: "{rounded.xl}"
    padding: "16px"
  card-elevated:
    backgroundColor: "{colors.neutral-800}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input-field:
    backgroundColor: "{colors.neutral-800}"
    textColor: "{colors.neutral-50}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: "52px"
  tab-bar:
    backgroundColor: "{colors.neutral-900}"
    height: "80px"
  status-bar:
    backgroundColor: "{colors.neutral-950}"
    height: "44px"
  top-bar:
    backgroundColor: "{colors.neutral-900}"
    height: "56px"
---

## Overview

RégieArt is a **dark-first, Operate-mode** app for professional musicians. It is used in stage environments: low light, one hand free, high cognitive load. Every design decision serves legibility, speed of access, and operational clarity.

The visual language is precise, restrained, and professional. No decorative gradients. No purple. No generic startup blue. Brand color is teal (`#4A827E`) — confident without being aggressive. The typography is Archivo throughout; weight carries hierarchy.

## Colors

**Background hierarchy (darkest to lightest surface):**
- `neutral-950` (`#181B1E`) — app background, absolute floor
- `neutral-900` (`#23272A`) — primary surface (cards, sheets, nav bars)
- `neutral-800` (`#2E3337`) — elevated surface, inputs, secondary cards
- `neutral-700` (`#42484D`) — borders, dividers, inactive tracks

**Brand:** `brand-500` (`#4A827E`) teal — used for active states, CTAs, progress indicators, selected tabs. `brand-400` for icons and lighter accent uses.

**Text:** `neutral-50` primary body, `neutral-400` secondary/muted, `neutral-600` placeholder.

**Status:** `danger` (#E74C4C) for errors and destructive actions. `warning` (#F59E0B) for pending states. `brand-500` doubles as success.

## Typography

Font: **Archivo** (all weights via `archivoFonts` from `@regieart/ui/fonts/native`)  
React Native font names: `Archivo-Regular`, `Archivo-Medium`, `Archivo-SemiBold`, `Archivo-Bold`, `Archivo-ExtraBold`

Hierarchy:
- **Display (32px Bold):** screen titles, balance amounts, large numerics
- **Heading (20px SemiBold):** section headers, card titles
- **Body (15px Regular):** primary content, list items
- **Label (13px Medium):** badges, metadata, secondary labels
- **Caption (11px Regular):** timestamps, sub-labels, help text

Letter spacing on ALL_CAPS section labels: `1.5px`. Never use less than 13px for tap targets.

## Layout

Mobile canvas: 393 × 852px (iPhone 15 reference). Safe area insets respected via `react-native-safe-area-context`.

**Vertical rhythm (top to bottom):**
1. Status Bar: 44px — `neutral-950`
2. Top Bar: 56px — `neutral-900` with 1px `neutral-700` border-bottom
3. Sub-nav tabs (when present): 40px
4. Content scroll area: flex-fill
5. Tab Bar: 80px — `neutral-900` with 1px `neutral-700` border-top

**Horizontal:** 16px edge padding everywhere. Cards span full width minus 2×16px = 361px.

**Touch targets:** minimum 44×44px. List items minimum 64px height. Bottom navigation icons 28px.

**Bottom Tab Bar (5 items):** Home | Repertoire | [+] FAB | Chat | Profile. The center [+] is a floating action button raised 8px above the bar with `brand-500` background.

## Elevation & Depth

No box shadows on dark backgrounds (invisible). Elevation is communicated through **surface color steps** only:
- Floor: `neutral-950`
- Base cards: `neutral-900`
- Elevated cards / inputs: `neutral-800`
- Modal sheets: `neutral-900` with `neutral-700` top border + backdrop blur overlay

## Shapes

- Cards, modals, bottom sheets: `border-radius: 20px` (xl)
- Buttons: `border-radius: 14px` (lg)
- Inputs, chips: `border-radius: 10px` (md)
- Badges, tags: `border-radius: 6px` (sm)
- Avatars, status dots, FAB: `border-radius: 9999px` (full)

## Components

**BottomTabBar:** Fixed at bottom. 5 icons. Active tab: `brand-400` tint + `brand-500` underline dot 4px. Inactive: `neutral-600`. Center FAB: 56px circle, `brand-500` bg, white `+` icon, elevated 4px above bar.

**TopBar:** `neutral-900` background. Left: back arrow or logo. Right: icon actions (max 2). Title: 16px SemiBold, `neutral-50`, centered. 1px `neutral-700` bottom border.

**Cards:** `neutral-900` bg, `border-radius: 20px`. No border by default. 16px internal padding. Use `neutral-800` for nested/elevated cards within a card.

**List Items:** 64px min-height. 16px horizontal padding. Left slot: 40×40px icon container with `neutral-800` bg and 10px radius. Title: 15px SemiBold `neutral-50`. Subtitle: 13px `neutral-400`. Right: status badge or chevron.

**Badges/Status Chips:** Pill shape (full radius). Text 11px SemiBold uppercase. Colors: Approved=`brand-500` bg+white text; Pending=`warning` bg+`neutral-950` text; Rejected=`danger` bg+white text.

**Bottom Sheet / Modal:** Slides up from bottom. `neutral-900` bg. 20px radius top-left/top-right only. 4px drag handle bar `neutral-700`, centered. Backdrop: `neutral-950` at 70% opacity.

**Timeline Items:** Vertical line `neutral-700` 2px. Completed: filled `brand-500` circle 12px. In-progress: filled `warning` circle. Pending: `neutral-700` outline circle. Text: completed `neutral-400` strikethrough, in-progress `neutral-50` Bold, pending `neutral-300`.

## Do's and Don'ts

**Do:**
- Use surface color steps (950→900→800) to show depth, never drop-shadows
- Keep section labels in ALL_CAPS with `neutral-500` color and 1.5px letter-spacing
- Reserve `brand-500` for exactly one primary action per screen
- Show status always: loading skeleton → content → error state (never just blank)
- Use `neutral-400` for secondary metadata (timestamps, subtitles)

**Don't:**
- Add decorative gradients (the only exception is the Finance balance card: subtle linear from `neutral-800` to `neutral-900`)
- Use white text on anything lighter than `neutral-700`
- Stack more than 3 levels of surface nesting
- Use `brand-500` for decorative purposes — it signals "tap here"
- Render lists without empty states
