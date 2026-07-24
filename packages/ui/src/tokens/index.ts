// Color tokens — synced with packages/ui/src/theme/colors.scss
// Web/Desktop: use CSS custom properties via var(--color-brand-500) (global after global.scss import)
// Mobile (React Native): use these JS values directly in StyleSheet objects

export const colors = {
  base: {
    white: '#FFFFFF',
  },
  brand: {
    50:  '#F3FAF8',
    100: '#E2F1ED',
    200: '#BFDCD5',
    300: '#8FC0B7',
    400: '#649D98',
    500: '#4A827E',
    600: '#396866',
    700: '#315452',
    800: '#2A4544',
    900: '#263B3A',
    950: '#122021',
  },
  secondary: {
    50:  '#F4F7FA',
    100: '#E6ECF3',
    200: '#D3DEEA',
    300: '#B5C8DB',
    400: '#92ABC8',
    500: '#7793BA',
    600: '#596D9C',
    700: '#4B587D',
    800: '#414C67',
    900: '#2B3140',
    950: '#1C1F26',
  },
  tertiary: {
    50:  '#FDF3F3',
    100: '#FDE3E3',
    200: '#FCCCCC',
    300: '#F8A9A9',
    400: '#F27C7C',
    500: '#E74C4C',
    600: '#D32F2F',
    700: '#B12424',
    800: '#932121',
    900: '#7A2222',
    950: '#420D0D',
  },
  neutral: {
    50:  '#F6F8F9',
    100: '#E9EDF0',
    200: '#D2D8DD',
    300: '#B5BCC2',
    400: '#8C949B',
    500: '#6B7379',
    600: '#565D63',
    700: '#42484D',
    800: '#2E3337',
    900: '#23272A',
    950: '#181B1E',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const typography = {
  fontFamily: {
    sans: 'Archivo, system-ui, sans-serif',
    mono: 'JetBrains Mono, Courier New, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    xxl: '2rem',
    xxxl: '2.5rem',
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
  },
};

export const radius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const shadow = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.10)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
};

export const transition = {
  fast: '100ms ease',
  normal: '200ms ease',
  slow: '350ms ease',
};
