import React from 'react';
import { MuIcon } from '@regieart/ui';
import styles from './IconsPage.module.scss';

type Swatch = { step: string; cssVar: string; hex: string };

const PALETTE: { name: string; color: string; swatches: Swatch[] }[] = [
  {
    name: 'Brand',
    color: 'brand',
    swatches: [
      { step: '50',  cssVar: '--color-brand-50',  hex: '#F3FAF8' },
      { step: '100', cssVar: '--color-brand-100', hex: '#E2F1ED' },
      { step: '200', cssVar: '--color-brand-200', hex: '#BFDCD5' },
      { step: '300', cssVar: '--color-brand-300', hex: '#8FC0B7' },
      { step: '400', cssVar: '--color-brand-400', hex: '#649D98' },
      { step: '500', cssVar: '--color-brand-500', hex: '#4A827E' },
      { step: '600', cssVar: '--color-brand-600', hex: '#396866' },
      { step: '700', cssVar: '--color-brand-700', hex: '#315452' },
      { step: '800', cssVar: '--color-brand-800', hex: '#2A4544' },
      { step: '900', cssVar: '--color-brand-900', hex: '#263B3A' },
      { step: '950', cssVar: '--color-brand-950', hex: '#122021' },
    ],
  },
  {
    name: 'Secondary',
    color: 'secondary',
    swatches: [
      { step: '50',  cssVar: '--color-secondary-50',  hex: '#F4F7FA' },
      { step: '100', cssVar: '--color-secondary-100', hex: '#E6ECF3' },
      { step: '200', cssVar: '--color-secondary-200', hex: '#D3DEEA' },
      { step: '300', cssVar: '--color-secondary-300', hex: '#B5C8DB' },
      { step: '400', cssVar: '--color-secondary-400', hex: '#92ABC8' },
      { step: '500', cssVar: '--color-secondary-500', hex: '#7793BA' },
      { step: '600', cssVar: '--color-secondary-600', hex: '#596D9C' },
      { step: '700', cssVar: '--color-secondary-700', hex: '#4B587D' },
      { step: '800', cssVar: '--color-secondary-800', hex: '#414C67' },
      { step: '900', cssVar: '--color-secondary-900', hex: '#2B3140' },
      { step: '950', cssVar: '--color-secondary-950', hex: '#1C1F26' },
    ],
  },
  {
    name: 'Tertiary',
    color: 'tertiary',
    swatches: [
      { step: '50',  cssVar: '--color-tertiary-50',  hex: '#FDF3F3' },
      { step: '100', cssVar: '--color-tertiary-100', hex: '#FDE3E3' },
      { step: '200', cssVar: '--color-tertiary-200', hex: '#FCCCCC' },
      { step: '300', cssVar: '--color-tertiary-300', hex: '#F8A9A9' },
      { step: '400', cssVar: '--color-tertiary-400', hex: '#F27C7C' },
      { step: '500', cssVar: '--color-tertiary-500', hex: '#E74C4C' },
      { step: '600', cssVar: '--color-tertiary-600', hex: '#D32F2F' },
      { step: '700', cssVar: '--color-tertiary-700', hex: '#B12424' },
      { step: '800', cssVar: '--color-tertiary-800', hex: '#932121' },
      { step: '900', cssVar: '--color-tertiary-900', hex: '#7A2222' },
      { step: '950', cssVar: '--color-tertiary-950', hex: '#420D0D' },
    ],
  },
  {
    name: 'Neutral',
    color: 'neutral',
    swatches: [
      { step: '50',  cssVar: '--color-neutral-50',  hex: '#F6F8F9' },
      { step: '100', cssVar: '--color-neutral-100', hex: '#E9EDF0' },
      { step: '200', cssVar: '--color-neutral-200', hex: '#D2D8DD' },
      { step: '300', cssVar: '--color-neutral-300', hex: '#B5BCC2' },
      { step: '400', cssVar: '--color-neutral-400', hex: '#8C949B' },
      { step: '500', cssVar: '--color-neutral-500', hex: '#6B7379' },
      { step: '600', cssVar: '--color-neutral-600', hex: '#565D63' },
      { step: '700', cssVar: '--color-neutral-700', hex: '#42484D' },
      { step: '800', cssVar: '--color-neutral-800', hex: '#2E3337' },
      { step: '900', cssVar: '--color-neutral-900', hex: '#23272A' },
      { step: '950', cssVar: '--color-neutral-950', hex: '#181B1E' },
    ],
  },
];

type FontRow = { label: string; cssWeight: number; italic?: boolean };

const FONT_ROWS: FontRow[] = [
  { label: 'Thin',        cssWeight: 100 },
  { label: 'Thin',        cssWeight: 100, italic: true },
  { label: 'ExtraLight',  cssWeight: 200 },
  { label: 'ExtraLight',  cssWeight: 200, italic: true },
  { label: 'Light',       cssWeight: 300 },
  { label: 'Light',       cssWeight: 300, italic: true },
  { label: 'Regular',     cssWeight: 400 },
  { label: 'Regular',     cssWeight: 400, italic: true },
  { label: 'Medium',      cssWeight: 500 },
  { label: 'Medium',      cssWeight: 500, italic: true },
  { label: 'SemiBold',    cssWeight: 600 },
  { label: 'SemiBold',    cssWeight: 600, italic: true },
  { label: 'Bold',        cssWeight: 700 },
  { label: 'Bold',        cssWeight: 700, italic: true },
  { label: 'ExtraBold',   cssWeight: 800 },
  { label: 'ExtraBold',   cssWeight: 800, italic: true },
];

const DEMO_ICONS = [
  'Activity', 'Add', 'AddCircle', 'AddSquare', 'Alarm',
  'Airplane', 'AlignLeft', 'AlignRight', 'Archive', 'ArchiveAdd',
  'Arrow2', 'ArrowBottom',
] as const;

const IconsPage: React.FC = () => (
  <div className={styles.page}>
    <h1 className={styles.title}>Design System</h1>
    <p className={styles.subtitle}>{'var(--color-brand-500)  ·  @use \'theme\''}</p>

    {PALETTE.map(({ name, swatches }) => (
      <section key={name} className={styles.section}>
        <p className={styles.sectionTitle}>{name}</p>
        <div className={styles.swatches}>
          {swatches.map(({ step, cssVar, hex }) => (
            <div key={step} className={styles.swatch}>
              <div
                className={styles.swatchColor}
                style={{ backgroundColor: `var(${cssVar})` }}
              />
              <div className={styles.swatchLabel}>
                <span>{step}</span>
                {hex}
              </div>
            </div>
          ))}
        </div>
      </section>
    ))}

    <hr className={styles.divider} />

    <section className={styles.fontSection}>
      <p className={styles.sectionTitle}>Archivo — Typeface</p>
      <div className={styles.fontRows}>
        {FONT_ROWS.map(({ label, cssWeight, italic }) => (
          <div key={`${cssWeight}-${italic ? 'i' : 'n'}`} className={styles.fontRow}>
            <div className={styles.fontMeta}>
              <span className={styles.fontName}>
                {label}{italic ? ' Italic' : ''}
              </span>
              <span className={styles.fontWeight}>
                weight: {cssWeight}{italic ? ' · italic' : ''}
              </span>
            </div>
            <span
              className={`${styles.fontSample}${italic ? ' ' + styles.italic : ''}`}
              style={{ fontWeight: cssWeight }}
            >
              The quick brown fox jumps over the lazy dog
            </span>
          </div>
        ))}
      </div>
    </section>

    <hr className={styles.divider} />

    <section className={styles.iconSection}>
      <p className={styles.sectionTitle}>Icons</p>
      <div className={styles.icons}>
        {DEMO_ICONS.map((name) => (
          <div key={name} className={styles.icon}>
            <MuIcon svgName={name} />
            <span>{name}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default IconsPage;

