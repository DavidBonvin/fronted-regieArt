declare function require(module: string): any;

export const archivoFonts = {
  'Archivo-Thin':               require('./Archivo-Thin.ttf'),
  'Archivo-ThinItalic':         require('./Archivo-ThinItalic.ttf'),
  'Archivo-ExtraLight':         require('./Archivo-ExtraLight.ttf'),
  'Archivo-ExtraLightItalic':   require('./Archivo-ExtraLightItalic.ttf'),
  'Archivo-Light':              require('./Archivo-Light.ttf'),
  'Archivo-LightItalic':        require('./Archivo-LightItalic.ttf'),
  'Archivo-Regular':            require('./Archivo-Regular.ttf'),
  'Archivo-Italic':             require('./Archivo-Italic.ttf'),
  'Archivo-Medium':             require('./Archivo-Medium.ttf'),
  'Archivo-MediumItalic':       require('./Archivo-MediumItalic.ttf'),
  'Archivo-SemiBold':           require('./Archivo-SemiBold.ttf'),
  'Archivo-SemiBoldItalic':     require('./Archivo-SemiBoldItalic.ttf'),
  'Archivo-Bold':               require('./Archivo-Bold.ttf'),
  'Archivo-BoldItalic':         require('./Archivo-BoldItalic.ttf'),
  'Archivo-ExtraBold':          require('./Archivo-ExtraBold.ttf'),
  'Archivo-ExtraBoldItalic':    require('./Archivo-ExtraBoldItalic.ttf'),
} as const;

export type ArchivoFontKey = keyof typeof archivoFonts;
