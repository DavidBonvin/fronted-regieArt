export interface ThemeColors {
  surfaceApp: string;
  surfaceCard: string;
  surfaceRaised: string;
  surfaceOverlay: string;
  surfaceHighlight: string;

  textHeading: string;
  textBody: string;
  textSecondary: string;
  textMuted: string;
  textOnAction: string;

  actionBrand: string;
  actionBrandDim: string;
  actionSecondary: string;
  actionDanger: string;

  borderDefault: string;
  borderSubtle: string;
  borderFocus: string;
  borderDanger: string;

  statusOk: string;
  statusOkSurface: string;
  statusPending: string;
  statusPendingSurface: string;
  statusError: string;
  statusErrorSurface: string;

  navBackground: string;
  navIconActive: string;
  navIconRest: string;
  navBorder: string;
  navFab: string;

  inputBackground: string;
  inputText: string;
  inputPlaceholder: string;
  inputBorder: string;
  inputBorderFocus: string;
}

export const darkTheme: ThemeColors = {
  surfaceApp:        '#181B1E',
  surfaceCard:       '#23272A',
  surfaceRaised:     '#2E3337',
  surfaceOverlay:    'rgba(24, 27, 30, 0.88)',
  surfaceHighlight:  '#2E3337',

  textHeading:       '#F6F8F9',
  textBody:          '#E9EDF0',
  textSecondary:     '#8C949B',
  textMuted:         '#565D63',
  textOnAction:      '#FFFFFF',

  actionBrand:       '#4A827E',
  actionBrandDim:    '#396866',
  actionSecondary:   '#2E3337',
  actionDanger:      '#E74C4C',

  borderDefault:     '#42484D',
  borderSubtle:      '#2E3337',
  borderFocus:       '#649D98',
  borderDanger:      '#E74C4C',

  statusOk:          '#4A827E',
  statusOkSurface:   '#1A2E2D',
  statusPending:     '#F59E0B',
  statusPendingSurface: '#2A1F00',
  statusError:       '#E74C4C',
  statusErrorSurface: '#3D1515',

  navBackground:     '#23272A',
  navIconActive:     '#649D98',
  navIconRest:       '#565D63',
  navBorder:         '#42484D',
  navFab:            '#4A827E',

  inputBackground:   '#2E3337',
  inputText:         '#F6F8F9',
  inputPlaceholder:  '#565D63',
  inputBorder:       '#42484D',
  inputBorderFocus:  '#649D98',
};

export const lightTheme: ThemeColors = {
  surfaceApp:        '#F4F2EE',
  surfaceCard:       '#FFFFFF',
  surfaceRaised:     '#ECE9E3',
  surfaceOverlay:    'rgba(244, 242, 238, 0.92)',
  surfaceHighlight:  '#ECE9E3',

  textHeading:       '#181B1E',
  textBody:          '#23272A',
  textSecondary:     '#42484D',
  textMuted:         '#5F676D',
  textOnAction:      '#FFFFFF',

  actionBrand:       '#4A827E',
  actionBrandDim:    '#396866',
  actionSecondary:   '#ECE9E3',
  actionDanger:      '#D32F2F',

  borderDefault:     '#D5D0C7',
  borderSubtle:      '#E5E1DA',
  borderFocus:       '#4A827E',
  borderDanger:      '#D32F2F',

  statusOk:          '#396866',
  statusOkSurface:   '#E2F1ED',
  statusPending:     '#B45309',
  statusPendingSurface: '#FEF3C7',
  statusError:       '#D32F2F',
  statusErrorSurface: '#FDE3E3',

  navBackground:     '#FFFFFF',
  navIconActive:     '#4A827E',
  navIconRest:       '#5F676D',
  navBorder:         '#E5E1DA',
  navFab:            '#4A827E',

  inputBackground:   '#FFFFFF',
  inputText:         '#181B1E',
  inputPlaceholder:  '#6B7379',
  inputBorder:       '#D5D0C7',
  inputBorderFocus:  '#4A827E',
};

export type ThemeMode = 'dark' | 'light';

export const themes: Record<ThemeMode, ThemeColors> = {
  dark: darkTheme,
  light: lightTheme,
};
