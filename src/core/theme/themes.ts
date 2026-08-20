/**
 * Centralized theme token system.
 *
 * Each theme defines the same set of design tokens (background, surface, card,
 * border, text hierarchy, accent ramp, shadows, gradients). The active theme is
 * applied by setting CSS variables on the document root; the existing Tailwind
 * color tokens (`app.*`, `gold.*`, `ink.*`) reference these variables, so every
 * component that uses the existing class names re-skins automatically.
 *
 * Champion Elite is the default theme. New themes are additive only — no
 * existing token names are removed or renamed.
 *
 * Design philosophy:
 *  - Every theme is a refined palette tuned for premium, native-feeling mobile
 *    UI (especially iPhone). No Material, no glass, no neumorphism.
 *  - Depth ramp: bg → surface (+3-4%) → card (+3-4%). Cards read as elevated
 *    panels; controls sit slightly recessed.
 *  - Borders are crisp 1px hairlines at low opacity — never glows.
 *  - Shadows are soft, downward-only elevation. No blur halos.
 *  - Accent ramps span 50–700 so the same UI works across every theme.
 *  - Dark themes use light ink on dark surfaces; light themes use dark ink on
 *    light surfaces. Both share the exact same token vocabulary so components
 *    re-skin without any conditional logic.
 */

export type ThemeId =
  | 'aurora-noir'
  | 'champion-elite'
  | 'obsidian-black'
  | 'emerald-elite'
  | 'midnight-royal'
  | 'crimson-legacy'
  | 'electric-blue'
  | 'rose-gold'
  | 'arctic-frost'
  | 'sand-dune'
  | 'linen-white'
  | 'porcelain'
  | 'sage-mist'
  | 'blush-ivory'
  | 'graphite-mist'
  | 'liquid-glass'
  | 'light-lavender'
  | 'stadium-night'
  | 'phantom-copper'
  | 'slate-arena'
  | 'night-league'
  | 'carbon-forge'
  | 'ironclad'
  | 'war-room';

export type ThemeMode = 'dark' | 'light';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  swatch: string[];
  mode: ThemeMode;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    description: 'Deep navy & electric cyan — high-energy modern.',
    swatch: ['#040814', '#0B1426', '#0EA5E9', '#7DD3FC'],
    mode: 'dark',
  },
  {
    id: 'slate-arena',
    name: 'Slate Arena',
    description: 'Refined dark slate with vivid yellow accent.',
    swatch: ['#131320', '#2F3148', '#FFD400', '#89BFF7'],
    mode: 'dark',
  },
  {
    id: 'night-league',
    name: 'Night League',
    description: 'Deep graphite-navy, broadcast slate, sky blue, and soft gold.',
    swatch: ['#101013', '#2A2B33', '#8CC8F4', '#F0D400'],
    mode: 'dark',
  },
  {
    id: 'carbon-forge',
    name: 'Carbon Forge',
    description: 'Industrial dark carbon with molten-orange accent.',
    swatch: ['#0A0A0C', '#1A1A1E', '#FF6B35', '#FFA15B'],
    mode: 'dark',
  },
  {
    id: 'ironclad',
    name: 'Ironclad',
    description: 'Gunmetal dark with steel-silver accent — battle-tested.',
    swatch: ['#08090B', '#1C1D22', '#A0AEC0', '#E2E8F0'],
    mode: 'dark',
  },
  {
    id: 'war-room',
    name: 'War Room',
    description: 'Tactical dark with olive-green accent and amber alerts.',
    swatch: ['#0B0C0A', '#181C14', '#84CC16', '#FACC15'],
    mode: 'dark',
  },
];

export const DEFAULT_THEME: ThemeId = 'electric-blue';

/**
 * Token values per theme. Every theme MUST define every key. Keys map 1:1 to
 * CSS custom properties consumed by the Tailwind color config and component
 * utility classes (see `index.css`).
 */
export const THEME_TOKENS: Record<ThemeId, ThemeTokens> = {
  'aurora-noir': {
    // Aurora Noir — the flagship premium theme. A deep blue-black canvas with
    // a two-tone identity: aurora teal as the primary accent and warm amber as
    // the secondary accent. Surfaces carry a cool blue undertone with a rich
    // elevated panel for premium depth. Shadows are deeper and more
    // atmospheric than other dark themes. The signature aurora gradient
    // (teal → amber) is exposed via the secondary gradient tokens.
    bg: '#060912',
    surface: '#0B1019',
    surface2: '#0F1521',
    surface3: '#141B2A',
    card: '#0D1320',
    cardHover: '#121A2B',
    zebraCard: '#10172A',
    zebraCardHover: '#162032',
    surfaceElevated: '#101830',
    surfaceElevatedHover: '#162038',
    border: 'rgba(94,234,212,0.10)',
    borderStrong: 'rgba(94,234,212,0.22)',
    ink: '#EEF4F8',
    inkMuted: '#94A8BC',
    inkFaint: '#8FA4B8',
    accent50: '#ECFEFF',
    accent100: '#CFFAFE',
    accent200: '#A5F3FC',
    accent300: '#5EEAD4',
    accent400: '#2DD4BF',
    accent500: '#14B8A6',
    accent600: '#0D9488',
    accent700: '#0F766E',
    accentSecondary300: '#FCD34D',
    accentSecondary400: '#FBBF24',
    accentSecondary500: '#F59E0B',
    accentSecondary600: '#D97706',
    shadowCard:
      '0 1px 0 0 rgba(255,255,255,0.04), 0 1px 3px 0 rgba(0,0,0,0.40), 0 8px 24px -6px rgba(0,0,0,0.56), 0 20px 48px -16px rgba(0,0,0,0.52)',
    shadowCardHover:
      '0 1px 0 0 rgba(255,255,255,0.06), 0 2px 8px 0 rgba(0,0,0,0.48), 0 14px 36px -8px rgba(0,0,0,0.64), 0 28px 64px -20px rgba(0,0,0,0.60)',
    shadowAccent: '0 8px 28px -4px rgba(20,184,166,0.45)',
    gradientFrom: '#5EEAD4',
    gradientTo: '#14B8A6',
    gradientSecondaryFrom: '#5EEAD4',
    gradientSecondaryTo: '#F59E0B',
    glowRgba: 'rgba(20,184,166,0.35)',
  },
  'champion-elite': {
    // Warm dark graphite (not blue-grey). Depth ramp:
    //   bg #0E0E11 → surface #141417 (+~4%) → card #1B1B1F (+~4%).
    bg: '#0E0E11',
    surface: '#141417',
    surface2: '#18181B',
    surface3: '#1D1D21',
    card: '#1B1B1F',
    cardHover: '#212125',
    zebraCard: '#1F1F23',
    zebraCardHover: '#252529',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.14)',
    ink: '#F4F6FA',
    inkMuted: '#A9B2C2',
    inkFaint: '#9BA8BC',
    accent50: '#FBF6EC',
    accent100: '#F5EAD0',
    accent200: '#EAD29A',
    accent300: '#DCB866',
    accent400: '#CDA23E',
    accent500: '#B88A2A',
    accent600: '#9A7220',
    accent700: '#7A5A1C',
    shadowCard:
      '0 1px 0 0 rgba(255,255,255,0.03), 0 1px 2px 0 rgba(0,0,0,0.36), 0 6px 16px -6px rgba(0,0,0,0.48)',
    shadowCardHover:
      '0 1px 0 0 rgba(255,255,255,0.05), 0 2px 6px 0 rgba(0,0,0,0.42), 0 12px 28px -8px rgba(0,0,0,0.56)',
    shadowAccent: '0 6px 20px -4px rgba(184,138,42,0.40)',
    gradientFrom: '#EAD29A',
    gradientTo: '#B88A2A',
    glowRgba: 'rgba(184,138,42,0.30)',
  },
  'obsidian-black': {
    bg: '#000000',
    surface: '#0C0C0F',
    surface2: '#141418',
    surface3: '#1C1C22',
    card: '#16161A',
    cardHover: '#1F1F24',
    zebraCard: '#1A1A1E',
    zebraCardHover: '#232328',
    border: 'rgba(255,255,255,0.10)',
    borderStrong: 'rgba(255,255,255,0.18)',
    ink: '#F5F5F7',
    inkMuted: '#A1A1AA',
    inkFaint: '#9A9AA3',
    accent50: '#F4F4F6',
    accent100: '#E5E7EB',
    accent200: '#D1D5DB',
    accent300: '#9CA3AF',
    accent400: '#7C828B',
    accent500: '#5C6168',
    accent600: '#3F434A',
    accent700: '#2A2D33',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.50), 0 8px 20px -4px rgba(0,0,0,0.55), 0 16px 36px -12px rgba(0,0,0,0.50)',
    shadowCardHover:
      '0 2px 4px 0 rgba(0,0,0,0.55), 0 12px 32px -4px rgba(0,0,0,0.60), 0 24px 56px -16px rgba(0,0,0,0.55)',
    shadowAccent: '0 6px 20px -4px rgba(229,231,235,0.22)',
    gradientFrom: '#F4F4F6',
    gradientTo: '#9CA3AF',
    glowRgba: 'rgba(229,231,235,0.25)',
  },
  'emerald-elite': {
    bg: '#06120C',
    surface: '#0B1B12',
    surface2: '#0F1F17',
    surface3: '#163024',
    card: '#0F1F17',
    cardHover: '#163024',
    zebraCard: '#13251B',
    zebraCardHover: '#1A3829',
    border: 'rgba(110,231,183,0.12)',
    borderStrong: 'rgba(110,231,183,0.20)',
    ink: '#ECFDF5',
    inkMuted: '#9FBEAE',
    inkFaint: '#8DBCA4',
    accent50: '#ECFDF5',
    accent100: '#D1FAE5',
    accent200: '#A7F3D0',
    accent300: '#6EE7B7',
    accent400: '#34D399',
    accent500: '#10B981',
    accent600: '#059669',
    accent700: '#047857',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.32), 0 8px 20px -4px rgba(0,0,0,0.46), 0 16px 36px -12px rgba(0,0,0,0.42)',
    shadowCardHover:
      '0 2px 4px 0 rgba(0,0,0,0.38), 0 12px 32px -4px rgba(0,0,0,0.54), 0 24px 56px -16px rgba(0,0,0,0.48)',
    shadowAccent: '0 6px 20px -4px rgba(16,185,129,0.40)',
    gradientFrom: '#6EE7B7',
    gradientTo: '#10B981',
    glowRgba: 'rgba(16,185,129,0.30)',
  },
  'midnight-royal': {
    bg: '#0A0B1E',
    surface: '#11132B',
    surface2: '#161A35',
    surface3: '#1E2350',
    card: '#161A35',
    cardHover: '#1E2350',
    zebraCard: '#1A1E3B',
    zebraCardHover: '#222756',
    border: 'rgba(147,197,253,0.14)',
    borderStrong: 'rgba(147,197,253,0.22)',
    ink: '#EEF2FF',
    inkMuted: '#A6B0D8',
    inkFaint: '#9099C8',
    accent50: '#EEF2FF',
    accent100: '#E0E7FF',
    accent200: '#C7D2FE',
    accent300: '#93C5FD',
    accent400: '#60A5FA',
    accent500: '#3B82F6',
    accent600: '#2563EB',
    accent700: '#1D4ED8',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.32), 0 8px 20px -4px rgba(0,0,0,0.46), 0 16px 36px -12px rgba(0,0,0,0.42)',
    shadowCardHover:
      '0 2px 4px 0 rgba(0,0,0,0.38), 0 12px 32px -4px rgba(0,0,0,0.54), 0 24px 56px -16px rgba(0,0,0,0.48)',
    shadowAccent: '0 6px 20px -4px rgba(59,130,246,0.40)',
    gradientFrom: '#93C5FD',
    gradientTo: '#3B82F6',
    glowRgba: 'rgba(59,130,246,0.30)',
  },
  'crimson-legacy': {
    bg: '#100707',
    surface: '#1A0E0E',
    surface2: '#1F1414',
    surface3: '#2B1818',
    card: '#1F1414',
    cardHover: '#2B1818',
    zebraCard: '#241717',
    zebraCardHover: '#301C1C',
    border: 'rgba(252,165,165,0.14)',
    borderStrong: 'rgba(252,165,165,0.22)',
    ink: '#FFF1F1',
    inkMuted: '#D8B0B0',
    inkFaint: '#BC8E8E',
    accent50: '#FFF1F1',
    accent100: '#FFE4E6',
    accent200: '#FECDD3',
    accent300: '#FCA5A5',
    accent400: '#F87171',
    accent500: '#DC2626',
    accent600: '#B91C1C',
    accent700: '#991B1B',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.36), 0 8px 20px -4px rgba(0,0,0,0.48), 0 16px 36px -12px rgba(0,0,0,0.44)',
    shadowCardHover:
      '0 2px 4px 0 rgba(0,0,0,0.42), 0 12px 32px -4px rgba(0,0,0,0.54), 0 24px 56px -16px rgba(0,0,0,0.50)',
    shadowAccent: '0 6px 20px -4px rgba(220,38,38,0.40)',
    gradientFrom: '#FCA5A5',
    gradientTo: '#DC2626',
    glowRgba: 'rgba(220,38,38,0.30)',
  },
  'electric-blue': {
    bg: '#040814',
    surface: '#0A1120',
    surface2: '#0B1426',
    surface3: '#13203B',
    card: '#0B1426',
    cardHover: '#13203B',
    zebraCard: '#0F1830',
    zebraCardHover: '#172544',
    border: 'rgba(125,211,252,0.14)',
    borderStrong: 'rgba(125,211,252,0.24)',
    ink: '#F0F9FF',
    inkMuted: '#9DB4CC',
    inkFaint: '#90A7C4',
    accent50: '#F0F9FF',
    accent100: '#E0F2FE',
    accent200: '#BAE6FD',
    accent300: '#5BB8E8',
    accent400: '#2AA4D6',
    accent500: '#0E94C9',
    accent600: '#0379A8',
    accent700: '#0369A1',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.40), 0 8px 22px -4px rgba(0,0,0,0.52), 0 18px 40px -12px rgba(0,0,0,0.48)',
    shadowCardHover:
      '0 2px 4px 0 rgba(0,0,0,0.46), 0 12px 34px -4px rgba(0,0,0,0.58), 0 26px 60px -16px rgba(0,0,0,0.54)',
    shadowAccent: '0 8px 24px -4px rgba(14,148,201,0.30)',
    gradientFrom: '#5BB8E8',
    gradientTo: '#0E94C9',
    glowRgba: 'rgba(14,148,201,0.22)',
  },
  'rose-gold': {
    bg: '#120C0D',
    surface: '#1A1212',
    surface2: '#1F1714',
    surface3: '#2A1F1B',
    card: '#1F1714',
    cardHover: '#2A1F1B',
    zebraCard: '#241B17',
    zebraCardHover: '#302320',
    border: 'rgba(244,208,184,0.12)',
    borderStrong: 'rgba(244,208,184,0.22)',
    ink: '#FBF1EC',
    inkMuted: '#C9AE9F',
    inkFaint: '#BCA390',
    accent50: '#FBF1EC',
    accent100: '#F8E2D4',
    accent200: '#F4D0B8',
    accent300: '#E8B89A',
    accent400: '#D89878',
    accent500: '#C07F5E',
    accent600: '#9F6447',
    accent700: '#7D4D34',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.36), 0 8px 20px -4px rgba(0,0,0,0.48), 0 16px 36px -12px rgba(0,0,0,0.44)',
    shadowCardHover:
      '0 2px 4px 0 rgba(0,0,0,0.42), 0 12px 32px -4px rgba(0,0,0,0.54), 0 24px 56px -16px rgba(0,0,0,0.50)',
    shadowAccent: '0 6px 20px -4px rgba(192,127,94,0.40)',
    gradientFrom: '#F4D0B8',
    gradientTo: '#C07F5E',
    glowRgba: 'rgba(192,127,94,0.30)',
  },
  'arctic-frost': {
    bg: '#0A1014',
    surface: '#101820',
    surface2: '#121A22',
    surface3: '#1A2632',
    card: '#121A22',
    cardHover: '#1A2632',
    zebraCard: '#161E29',
    zebraCardHover: '#1E2B39',
    border: 'rgba(165,243,252,0.12)',
    borderStrong: 'rgba(165,243,252,0.22)',
    ink: '#ECFEFF',
    inkMuted: '#9CC4D0',
    inkFaint: '#90B4C4',
    accent50: '#ECFEFF',
    accent100: '#CFFAFE',
    accent200: '#A5F3FC',
    accent300: '#67E8F9',
    accent400: '#22D3EE',
    accent500: '#06B6D4',
    accent600: '#0891B2',
    accent700: '#0E7490',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.34), 0 8px 20px -4px rgba(0,0,0,0.46), 0 16px 36px -12px rgba(0,0,0,0.42)',
    shadowCardHover:
      '0 2px 4px 0 rgba(0,0,0,0.40), 0 12px 32px -4px rgba(0,0,0,0.54), 0 24px 56px -16px rgba(0,0,0,0.48)',
    shadowAccent: '0 6px 20px -4px rgba(34,211,238,0.40)',
    gradientFrom: '#A5F3FC',
    gradientTo: '#22D3EE',
    glowRgba: 'rgba(34,211,238,0.30)',
  },
  'sand-dune': {
    bg: '#120F0A',
    surface: '#1A1610',
    surface2: '#1F1A12',
    surface3: '#2A2317',
    card: '#1F1A12',
    cardHover: '#2A2317',
    zebraCard: '#241F15',
    zebraCardHover: '#2F281C',
    border: 'rgba(252,211,77,0.12)',
    borderStrong: 'rgba(252,211,77,0.22)',
    ink: '#FEFCE8',
    inkMuted: '#C9BC97',
    inkFaint: '#BCAD8C',
    accent50: '#FEFCE8',
    accent100: '#FEF3C7',
    accent200: '#FDE68A',
    accent300: '#FCD34D',
    accent400: '#FBBF24',
    accent500: '#D97706',
    accent600: '#B45309',
    accent700: '#92400E',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.36), 0 8px 20px -4px rgba(0,0,0,0.48), 0 16px 36px -12px rgba(0,0,0,0.44)',
    shadowCardHover:
      '0 2px 4px 0 rgba(0,0,0,0.42), 0 12px 32px -4px rgba(0,0,0,0.54), 0 24px 56px -16px rgba(0,0,0,0.50)',
    shadowAccent: '0 6px 20px -4px rgba(217,119,6,0.40)',
    gradientFrom: '#FCD34D',
    gradientTo: '#D97706',
    glowRgba: 'rgba(217,119,6,0.30)',
  },
  'linen-white': {
    // Warm linen: soft off-white background, pure white cards, champagne gold
    // accent. Depth ramp: bg #F5F3EF → surface #FFFFFF (card lifts above bg)
    // → card #FFFFFF. Borders are dark hairlines at low opacity.
    bg: '#F5F3EF',
    surface: '#EFEBE4',
    surface2: '#FFFFFF',
    surface3: '#F9F7F2',
    card: '#FFFFFF',
    cardHover: '#FBF9F4',
    zebraCard: '#F8F6F0',
    zebraCardHover: '#F2F0EA',
    border: 'rgba(60,50,35,0.10)',
    borderStrong: 'rgba(60,50,35,0.18)',
    ink: '#1F1B16',
    inkMuted: '#6B6358',
    inkFaint: '#A89E8F',
    accent50: '#FBF6EC',
    accent100: '#F5EAD0',
    accent200: '#EAD29A',
    accent300: '#B88A2A',
    accent400: '#A07620',
    accent500: '#8A6618',
    accent600: '#705311',
    accent700: '#5A4210',
    shadowCard:
      '0 1px 2px 0 rgba(60,50,35,0.06), 0 1px 3px 0 rgba(60,50,35,0.04), 0 6px 16px -6px rgba(60,50,35,0.10)',
    shadowCardHover:
      '0 1px 2px 0 rgba(60,50,35,0.08), 0 4px 10px 0 rgba(60,50,35,0.06), 0 12px 28px -8px rgba(60,50,35,0.14)',
    shadowAccent: '0 6px 20px -4px rgba(184,138,42,0.28)',
    gradientFrom: '#EAD29A',
    gradientTo: '#B88A2A',
    glowRgba: 'rgba(184,138,42,0.20)',
  },
  'porcelain': {
    // Cool white: crisp blue-white background, pure white cards, sapphire blue
    // accent. Clean, modern, airy.
    bg: '#F4F6FB',
    surface: '#EDF0F7',
    surface2: '#FFFFFF',
    surface3: '#F8FAFF',
    card: '#FFFFFF',
    cardHover: '#F8FAFF',
    zebraCard: '#F4F7FD',
    zebraCardHover: '#EDF1FA',
    border: 'rgba(30,40,80,0.10)',
    borderStrong: 'rgba(30,40,80,0.18)',
    ink: '#1A1F2E',
    inkMuted: '#5C6578',
    inkFaint: '#9FA8BA',
    accent50: '#EEF2FF',
    accent100: '#E0E7FF',
    accent200: '#C7D2FE',
    accent300: '#3B82F6',
    accent400: '#2563EB',
    accent500: '#1D4ED8',
    accent600: '#1E40AF',
    accent700: '#1E3A8A',
    shadowCard:
      '0 1px 2px 0 rgba(30,40,80,0.06), 0 1px 3px 0 rgba(30,40,80,0.04), 0 6px 16px -6px rgba(30,40,80,0.10)',
    shadowCardHover:
      '0 1px 2px 0 rgba(30,40,80,0.08), 0 4px 10px 0 rgba(30,40,80,0.06), 0 12px 28px -8px rgba(30,40,80,0.14)',
    shadowAccent: '0 6px 20px -4px rgba(37,99,235,0.28)',
    gradientFrom: '#60A5FA',
    gradientTo: '#2563EB',
    glowRgba: 'rgba(37,99,235,0.20)',
  },
  'sage-mist': {
    // Pale sage: soft green-grey background, white cards, jade accent.
    // Fresh, calm, natural.
    bg: '#F1F5F0',
    surface: '#E8EFE6',
    surface2: '#FFFFFF',
    surface3: '#F5F9F4',
    card: '#FFFFFF',
    cardHover: '#F8FBF7',
    zebraCard: '#F5F8F4',
    zebraCardHover: '#EDF2EC',
    border: 'rgba(30,60,40,0.10)',
    borderStrong: 'rgba(30,60,40,0.18)',
    ink: '#1A2A20',
    inkMuted: '#5A6B5F',
    inkFaint: '#99A88E',
    accent50: '#ECFDF5',
    accent100: '#D1FAE5',
    accent200: '#A7F3D0',
    accent300: '#059669',
    accent400: '#047857',
    accent500: '#065F46',
    accent600: '#064E3B',
    accent700: '#053E2E',
    shadowCard:
      '0 1px 2px 0 rgba(30,60,40,0.06), 0 1px 3px 0 rgba(30,60,40,0.04), 0 6px 16px -6px rgba(30,60,40,0.10)',
    shadowCardHover:
      '0 1px 2px 0 rgba(30,60,40,0.08), 0 4px 10px 0 rgba(30,60,40,0.06), 0 12px 28px -8px rgba(30,60,40,0.14)',
    shadowAccent: '0 6px 20px -4px rgba(5,150,105,0.28)',
    gradientFrom: '#34D399',
    gradientTo: '#059669',
    glowRgba: 'rgba(5,150,105,0.20)',
  },
  'blush-ivory': {
    // Warm ivory: soft warm white background, white cards, rose accent.
    // Soft, elegant, warm.
    bg: '#FBF5F3',
    surface: '#F4EAE7',
    surface2: '#FFFFFF',
    surface3: '#FDFAF9',
    card: '#FFFFFF',
    cardHover: '#FDF8F7',
    zebraCard: '#F8F4F3',
    zebraCardHover: '#F2EEED',
    border: 'rgba(80,40,50,0.10)',
    borderStrong: 'rgba(80,40,50,0.18)',
    ink: '#2A1A20',
    inkMuted: '#705A60',
    inkFaint: '#AD989D',
    accent50: '#FDF2F6',
    accent100: '#FCE7EF',
    accent200: '#FBCFE0',
    accent300: '#BE5A7E',
    accent400: '#A14A6A',
    accent500: '#843A56',
    accent600: '#6B2F45',
    accent700: '#522536',
    shadowCard:
      '0 1px 2px 0 rgba(80,40,50,0.06), 0 1px 3px 0 rgba(80,40,50,0.04), 0 6px 16px -6px rgba(80,40,50,0.10)',
    shadowCardHover:
      '0 1px 2px 0 rgba(80,40,50,0.08), 0 4px 10px 0 rgba(80,40,50,0.06), 0 12px 28px -8px rgba(80,40,50,0.14)',
    shadowAccent: '0 6px 20px -4px rgba(190,90,126,0.28)',
    gradientFrom: '#E89BAB',
    gradientTo: '#BE5A7E',
    glowRgba: 'rgba(190,90,126,0.20)',
  },
  'graphite-mist': {
    // Premium light grey with a subtle purple tint. Surfaces and cards carry
    // the faintest lavender cast so the palette reads as cool and refined
    // rather than flat neutral grey.
    bg: '#EDECEF',
    surface: '#E5E6E9',
    surface2: '#FFFFFF',
    surface3: '#F4F3F6',
    card: '#FFFFFF',
    cardHover: '#F6F5F8',
    zebraCard: '#F4F3F7',
    zebraCardHover: '#EDECF1',
    border: 'rgba(70,60,90,0.10)',
    borderStrong: 'rgba(70,60,90,0.18)',
    ink: '#2A2733',
    inkMuted: '#6B6577',
    inkFaint: '#A199AC',
    accent50: '#F4F1F8',
    accent100: '#E6E0F0',
    accent200: '#CFC4DC',
    accent300: '#A89BBA',
    accent400: '#8C7CA0',
    accent500: '#7C6F94',
    accent600: '#635679',
    accent700: '#4E4360',
    shadowCard:
      '0 1px 2px 0 rgba(70,60,90,0.06), 0 1px 3px 0 rgba(70,60,90,0.04), 0 6px 16px -6px rgba(70,60,90,0.10)',
    shadowCardHover:
      '0 1px 2px 0 rgba(70,60,90,0.08), 0 4px 10px 0 rgba(70,60,90,0.06), 0 12px 28px -8px rgba(70,60,90,0.14)',
    shadowAccent: '0 6px 20px -4px rgba(124,111,148,0.28)',
    gradientFrom: '#A89BBA',
    gradientTo: '#7C6F94',
    glowRgba: 'rgba(124,111,148,0.22)',
  },
  'liquid-glass': {
    // Liquid Glass: a self-contained dark theme expressed entirely through its
    // own tokens. Surfaces use translucent layered fills so cards read as
    // frosted glass panels floating above a deep aurora-like background. The
    // accent ramp is an icy cyan-to-sky-blue, with luminous highlights.
    bg: '#0B0F14',
    surface: 'rgba(22, 29, 38, 0.72)',
    surface2: 'rgba(28, 36, 48, 0.78)',
    surface3: 'rgba(36, 46, 60, 0.82)',
    card: 'rgba(24, 32, 44, 0.62)',
    cardHover: 'rgba(30, 40, 54, 0.72)',
    zebraCard: 'rgba(27, 36, 49, 0.66)',
    zebraCardHover: 'rgba(33, 44, 59, 0.76)',
    border: 'rgba(125, 211, 252, 0.18)',
    borderStrong: 'rgba(125, 211, 252, 0.32)',
    ink: '#F0F9FF',
    inkMuted: '#A9C4D8',
    inkFaint: '#A2BDD2',
    accent50: '#ECFEFF',
    accent100: '#CFFAFE',
    accent200: '#A5F3FC',
    accent300: '#7DD3FC',
    accent400: '#38BDF8',
    accent500: '#0EA5E9',
    accent600: '#0284C7',
    accent700: '#0369A1',
    shadowCard:
      '0 1px 0 0 rgba(255,255,255,0.06), 0 1px 2px 0 rgba(0,0,0,0.40), 0 12px 32px -8px rgba(0,0,0,0.56), inset 0 1px 0 0 rgba(255,255,255,0.06)',
    shadowCardHover:
      '0 1px 0 0 rgba(255,255,255,0.08), 0 2px 6px 0 rgba(0,0,0,0.46), 0 18px 44px -10px rgba(0,0,0,0.62), inset 0 1px 0 0 rgba(255,255,255,0.08)',
    shadowAccent: '0 8px 28px -4px rgba(125,211,252,0.45)',
    gradientFrom: '#A5F3FC',
    gradientTo: '#0EA5E9',
    glowRgba: 'rgba(125,211,252,0.35)',
  },
  'light-lavender': {
    // Premium Light Lavender: soft lavender-tinted background, light surfaces
    // and cards with a subtle lavender cast, grey-lavender controls, and
    // grey-lavender Match Cards that read as visually distinct from every
    // other card in the app. All other cards stay light with only a whisper
    // of lavender.
    bg: '#F4F1F8',
    surface: '#EDE9F4',
    surface2: '#FFFFFF',
    surface3: '#F8F5FD',
    card: '#FFFFFF',
    cardHover: '#FBF9FE',
    zebraCard: '#F9F6FD',
    zebraCardHover: '#F2EFF9',
    border: 'rgba(80,60,110,0.10)',
    borderStrong: 'rgba(80,60,110,0.18)',
    ink: '#2A2438',
    inkMuted: '#6B5E84',
    inkFaint: '#A199B4',
    accent50: '#F6F2FB',
    accent100: '#ECE4F4',
    accent200: '#D6C7E6',
    accent300: '#B9A4D2',
    accent400: '#9A86B8',
    accent500: '#8A7CA6',
    accent600: '#6F5F8C',
    accent700: '#574A70',
    shadowCard:
      '0 1px 2px 0 rgba(80,60,110,0.06), 0 1px 3px 0 rgba(80,60,110,0.04), 0 6px 16px -6px rgba(80,60,110,0.10)',
    shadowCardHover:
      '0 1px 2px 0 rgba(80,60,110,0.08), 0 4px 10px 0 rgba(80,60,110,0.06), 0 12px 28px -8px rgba(80,60,110,0.14)',
    shadowAccent: '0 6px 20px -4px rgba(138,124,166,0.28)',
    gradientFrom: '#B9A4D2',
    gradientTo: '#8A7CA6',
    glowRgba: 'rgba(138,124,166,0.22)',
    // Match Cards use a grey-lavender surface so they stand out from the
    // otherwise light, subtly-lavender-tinted cards across the rest of the app.
    matchCard: '#E3DCEF',
    matchCardHover: '#DAD3EA',
    matchCardBorder: 'rgba(80,60,110,0.16)',
    matchCardBorderStrong: 'rgba(80,60,110,0.26)',
  },
  'stadium-night': {
    // Stadium Night — a premium dark theme inspired by modern sports broadcast
    // applications. Deep navy-black canvas with slate-blue / blue-grey surfaces
    // and cards. The top and bottom navigation bars use a dark slate-blue so
    // they read as one seamless surface. The primary accent is a bright
    // stadium-light yellow; the secondary accent is a soft sky-blue. Text is
    // off-white with cool light-grey for secondary copy. Borders are very
    // subtle cool-grey hairlines. Clean, modern, tournament-focused — no
    // excessive gradients, glow, or flashy effects.
    bg: '#080D18',
    surface: '#0D1422',
    surface2: '#111827',
    surface3: '#1B2438',
    card: '#111827',
    cardHover: '#1B2438',
    zebraCard: '#151C2E',
    zebraCardHover: '#1F2942',
    surfaceElevated: '#16203A',
    surfaceElevatedHover: '#1E2A48',
    border: 'rgba(148,163,184,0.10)',
    borderStrong: 'rgba(148,163,184,0.20)',
    ink: '#F1F5F9',
    inkMuted: '#94A3B8',
    inkFaint: '#98A8BC',
    accent50: '#FEFCE8',
    accent100: '#FEF9C3',
    accent200: '#FEF08A',
    accent300: '#FDE047',
    accent400: '#FACC15',
    accent500: '#EAB308',
    accent600: '#CA8A04',
    accent700: '#A16207',
    accentSecondary300: '#7DD3FC',
    accentSecondary400: '#38BDF8',
    accentSecondary500: '#0EA5E9',
    accentSecondary600: '#0284C7',
    shadowCard:
      '0 1px 0 0 rgba(255,255,255,0.03), 0 1px 2px 0 rgba(0,0,0,0.40), 0 6px 16px -6px rgba(0,0,0,0.50)',
    shadowCardHover:
      '0 1px 0 0 rgba(255,255,255,0.05), 0 2px 6px 0 rgba(0,0,0,0.46), 0 12px 28px -8px rgba(0,0,0,0.58)',
    shadowAccent: '0 6px 20px -4px rgba(250,204,21,0.35)',
    gradientFrom: '#FDE047',
    gradientTo: '#EAB308',
    gradientSecondaryFrom: '#7DD3FC',
    gradientSecondaryTo: '#0EA5E9',
    glowRgba: 'rgba(250,204,21,0.25)',
  },
  'phantom-copper': {
    // Phantom Copper — the flagship premium theme. A deep obsidian canvas with
    // warm undertone, elevated panels in rich charcoal, and a burnished copper
    // primary accent. A muted teal serves as the secondary accent for
    // two-tone depth. Warm sand neutrals anchor the ink ramp for a softer,
    // more editorial feel than the other dark themes. Subtle cool borders,
    // layered atmospheric shadows, and a dual gradient (copper → teal) give
    // the theme a noticeably different identity while remaining fully
    // compatible with the existing token architecture.
    bg: '#07060A',
    surface: '#0E0C13',
    surface2: '#121017',
    surface3: '#1A1620',
    card: '#121017',
    cardHover: '#1A1620',
    zebraCard: '#16131C',
    zebraCardHover: '#1E1A25',
    surfaceElevated: '#18141E',
    surfaceElevatedHover: '#221C2A',
    border: 'rgba(199,123,74,0.10)',
    borderStrong: 'rgba(199,123,74,0.22)',
    ink: '#F5EFE9',
    inkMuted: '#A89B91',
    inkFaint: '#A2968C',
    accent50: '#FDF6F0',
    accent100: '#F5E6D6',
    accent200: '#E8C9A8',
    accent300: '#D6A578',
    accent400: '#C77B4A',
    accent500: '#B06535',
    accent600: '#8F5028',
    accent700: '#6E3E1F',
    accentSecondary300: '#5EE2D5',
    accentSecondary400: '#3FA89B',
    accentSecondary500: '#2D8A7E',
    accentSecondary600: '#1F6B62',
    shadowCard:
      '0 1px 0 0 rgba(255,255,255,0.03), 0 1px 3px 0 rgba(0,0,0,0.42), 0 8px 24px -6px rgba(0,0,0,0.58), 0 20px 48px -16px rgba(0,0,0,0.50)',
    shadowCardHover:
      '0 1px 0 0 rgba(255,255,255,0.05), 0 2px 8px 0 rgba(0,0,0,0.50), 0 14px 36px -8px rgba(0,0,0,0.64), 0 28px 64px -20px rgba(0,0,0,0.56)',
    shadowAccent: '0 8px 28px -4px rgba(199,123,74,0.40)',
    gradientFrom: '#D6A578',
    gradientTo: '#B06535',
    gradientSecondaryFrom: '#5EE2D5',
    gradientSecondaryTo: '#2D8A7E',
    glowRgba: 'rgba(199,123,74,0.30)',
  },
  'night-league': {
    // Night League — shifted from blue-navy toward graphite/neutral. The
    // background and surfaces now carry a graphite-charcoal undertone rather
    // than the previous cool blue cast, while the sky-blue secondary and
    // gold primary accent preserve the broadcast identity.
    bg: '#101013',
    surface: '#1E1E24',
    surface2: '#26262E',
    surface3: '#303038',
    card: '#28282F',
    cardHover: '#303038',
    zebraCard: '#2A2A31',
    zebraCardHover: '#33333B',
    surfaceElevated: '#2E2E36',
    surfaceElevatedHover: '#383840',
    border: 'rgba(168,172,180,0.16)',
    borderStrong: 'rgba(184,190,200,0.28)',
    ink: '#F4F5F8',
    inkMuted: '#C0C4CE',
    inkFaint: '#9CA0AC',
    accent50: '#FFFCE6',
    accent100: '#FFF5A8',
    accent200: '#F9E866',
    accent300: '#F5DA25',
    accent400: '#F0D400',
    accent500: '#D7BC00',
    accent600: '#B79E00',
    accent700: '#8C7900',
    accentSecondary300: '#C7E7FF',
    accentSecondary400: '#8CC8F4',
    accentSecondary500: '#5CA7DD',
    accentSecondary600: '#3D82B9',
    shadowCard: '0 1px 2px 0 rgba(0,0,0,0.30), 0 5px 16px -5px rgba(0,0,0,0.38), 0 12px 28px -12px rgba(0,0,0,0.32)',
    shadowCardHover: '0 1px 3px 0 rgba(0,0,0,0.34), 0 7px 20px -5px rgba(0,0,0,0.44), 0 16px 36px -12px rgba(0,0,0,0.38)',
    shadowAccent: '0 4px 16px -6px rgba(240,212,0,0.20)',
    gradientFrom: '#F5DA25',
    gradientTo: '#D7BC00',
    gradientSecondaryFrom: '#C7E7FF',
    gradientSecondaryTo: '#5CA7DD',
    glowRgba: 'rgba(240,212,0,0.14)',
  },
  'slate-arena': {
    // Slate Arena — refined from blue-slate toward graphite-slate. Surfaces
    // now carry a neutral graphite undertone with only a whisper of cool blue
    // instead of the previous saturated blue-slate. The warm-gold accent and
    // sky-blue secondary remain untouched, preserving the theme's identity.
    bg: '#131316',
    surface: '#1B1B20',
    surface2: '#222228',
    surface3: '#2A2A31',
    card: '#26262C',
    cardHover: '#2E2E35',
    zebraCard: '#2C2C33',
    zebraCardHover: '#34343D',
    surfaceElevated: '#2A2A31',
    surfaceElevatedHover: '#33333B',
    border: 'rgba(120,122,135,0.20)',
    borderStrong: 'rgba(140,142,158,0.34)',
    ink: '#F0F2F6',
    inkMuted: '#C2C6D2',
    inkFaint: '#9CA1B0',
    accent50: '#FAF5E0',
    accent100: '#F5EDC4',
    accent200: '#EDE0A0',
    accent300: '#E4D37E',
    accent400: '#DFC15C',
    accent500: '#CDA838',
    accent600: '#AE8E2C',
    accent700: '#897222',
    accentSecondary300: '#A9CBEF',
    accentSecondary400: '#82B4E8',
    accentSecondary500: '#5B98DD',
    accentSecondary600: '#3D7EC9',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.26), 0 4px 12px -4px rgba(0,0,0,0.34), 0 10px 24px -10px rgba(0,0,0,0.28)',
    shadowCardHover:
      '0 1px 3px 0 rgba(0,0,0,0.30), 0 6px 18px -4px rgba(0,0,0,0.38), 0 14px 32px -10px rgba(0,0,0,0.32)',
    shadowAccent: '0 3px 12px -6px rgba(223,193,92,0.16)',
    gradientFrom: '#E4D37E',
    gradientTo: '#CDA838',
    glowRgba: 'rgba(223,193,92,0.12)',
  },
  'carbon-forge': {
    // Carbon Forge — an industrial dark theme for a battle arena. Deep carbon
    // canvas with near-black surfaces, charcoal cards, and a molten-orange
    // primary accent. A warm amber secondary provides two-tone depth. Neutral
    // cool-grey borders keep it grounded. The vibe is forge/foundry: dark,
    // serious, with fire accents.
    bg: '#0A0A0C',
    surface: '#121214',
    surface2: '#18181B',
    surface3: '#202024',
    card: '#1A1A1E',
    cardHover: '#222227',
    zebraCard: '#1E1E22',
    zebraCardHover: '#26262C',
    surfaceElevated: '#202024',
    surfaceElevatedHover: '#28282E',
    border: 'rgba(130,130,140,0.14)',
    borderStrong: 'rgba(150,150,162,0.26)',
    ink: '#F2F3F5',
    inkMuted: '#ACB0BA',
    inkFaint: '#9095A2',
    accent50: '#FFF7ED',
    accent100: '#FFEDD5',
    accent200: '#FED7AA',
    accent300: '#FDBA74',
    accent400: '#FF8C42',
    accent500: '#FF6B35',
    accent600: '#E85D2A',
    accent700: '#C44A20',
    accentSecondary300: '#FCD34D',
    accentSecondary400: '#FBBF24',
    accentSecondary500: '#F59E0B',
    accentSecondary600: '#D97706',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.40), 0 6px 16px -4px rgba(0,0,0,0.50), 0 14px 32px -10px rgba(0,0,0,0.44)',
    shadowCardHover:
      '0 1px 3px 0 rgba(0,0,0,0.44), 0 8px 22px -4px rgba(0,0,0,0.56), 0 20px 44px -12px rgba(0,0,0,0.50)',
    shadowAccent: '0 6px 20px -4px rgba(255,107,53,0.40)',
    gradientFrom: '#FDBA74',
    gradientTo: '#FF6B35',
    gradientSecondaryFrom: '#FCD34D',
    gradientSecondaryTo: '#F59E0B',
    glowRgba: 'rgba(255,107,53,0.30)',
  },
  'ironclad': {
    // Ironclad — a gunmetal dark theme with a steel-silver accent. Deep
    // near-black canvas, cool gunmetal surfaces and cards, and a refined
    // silver-to-light-steel accent ramp. Borders are cool-grey hairlines.
    // Monochrome and serious — a battle simulator that feels armored and
    // unyielding. No secondary accent; the single steel ramp carries the
    // entire identity.
    bg: '#08090B',
    surface: '#101114',
    surface2: '#16181C',
    surface3: '#1C1F24',
    card: '#181B20',
    cardHover: '#20242A',
    zebraCard: '#1B1E23',
    zebraCardHover: '#23272E',
    surfaceElevated: '#1E2228',
    surfaceElevatedHover: '#262B32',
    border: 'rgba(140,148,160,0.14)',
    borderStrong: 'rgba(160,170,184,0.26)',
    ink: '#EDF0F4',
    inkMuted: '#A8B0BC',
    inkFaint: '#8C95A4',
    accent50: '#F8FAFC',
    accent100: '#F1F5F9',
    accent200: '#E2E8F0',
    accent300: '#CBD5E1',
    accent400: '#A0AEC0',
    accent500: '#7B8794',
    accent600: '#5F6B7A',
    accent700: '#475569',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.40), 0 6px 16px -4px rgba(0,0,0,0.48), 0 14px 32px -10px rgba(0,0,0,0.42)',
    shadowCardHover:
      '0 1px 3px 0 rgba(0,0,0,0.44), 0 8px 22px -4px rgba(0,0,0,0.54), 0 20px 44px -12px rgba(0,0,0,0.48)',
    shadowAccent: '0 6px 20px -4px rgba(160,174,192,0.30)',
    gradientFrom: '#CBD5E1',
    gradientTo: '#7B8794',
    glowRgba: 'rgba(160,174,192,0.22)',
  },
  'war-room': {
    // War Room — a tactical dark theme with olive-green primary accent and
    // amber secondary. Deep dark-olive/black canvas, muted olive-tinged
    // surfaces and cards, and a vivid lime-green accent for a command-center
    // / tactical-map feel. Amber alerts serve as the secondary accent for
    // two-tone warmth. Distinct from every other dark theme in the app.
    bg: '#0B0C0A',
    surface: '#121410',
    surface2: '#181C14',
    surface3: '#20251A',
    card: '#1A1E16',
    cardHover: '#222820',
    zebraCard: '#1E231A',
    zebraCardHover: '#262C22',
    surfaceElevated: '#20251A',
    surfaceElevatedHover: '#282E22',
    border: 'rgba(132,204,22,0.10)',
    borderStrong: 'rgba(132,204,22,0.20)',
    ink: '#EFF1EC',
    inkMuted: '#A8B098',
    inkFaint: '#8C9678',
    accent50: '#F7FEE7',
    accent100: '#ECFCCB',
    accent200: '#D9F99D',
    accent300: '#BEF264',
    accent400: '#A3E635',
    accent500: '#84CC16',
    accent600: '#65A30D',
    accent700: '#4D7C0F',
    accentSecondary300: '#FDE68A',
    accentSecondary400: '#FACC15',
    accentSecondary500: '#EAB308',
    accentSecondary600: '#CA8A04',
    shadowCard:
      '0 1px 2px 0 rgba(0,0,0,0.38), 0 6px 16px -4px rgba(0,0,0,0.48), 0 14px 32px -10px rgba(0,0,0,0.42)',
    shadowCardHover:
      '0 1px 3px 0 rgba(0,0,0,0.42), 0 8px 22px -4px rgba(0,0,0,0.54), 0 20px 44px -12px rgba(0,0,0,0.48)',
    shadowAccent: '0 6px 20px -4px rgba(132,204,22,0.35)',
    gradientFrom: '#BEF264',
    gradientTo: '#84CC16',
    gradientSecondaryFrom: '#FDE68A',
    gradientSecondaryTo: '#EAB308',
    glowRgba: 'rgba(132,204,22,0.25)',
  },
};

export interface ThemeTokens {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  card: string;
  cardHover: string;
  border: string;
  borderStrong: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  accent50: string;
  accent100: string;
  accent200: string;
  accent300: string;
  accent400: string;
  accent500: string;
  accent600: string;
  accent700: string;
  shadowCard: string;
  shadowCardHover: string;
  shadowAccent: string;
  gradientFrom: string;
  gradientTo: string;
  glowRgba: string;
  /**
   * Optional override surface for Match Cards. When omitted, Match Cards use
   * the regular card token. The Light Lavender theme sets this to a
   * grey-lavender tone so Match Cards read as visually distinct from every
   * other card in the app. No other theme defines this token, so Match Cards
   * everywhere else are unaffected.
   */
  matchCard?: string;
  matchCardHover?: string;
  matchCardBorder?: string;
  matchCardBorderStrong?: string;
  /**
   * Optional zebra card surface — a subtly different shade used to alternate
   * the background of consecutive cards in a vertical list (odd vs even).
   * The difference should be ~3-5% brightness. When omitted, zebra lists fall
   * back to the regular card surface so there is no visible striping.
   */
  zebraCard?: string;
  zebraCardHover?: string;
  /** Optional secondary accent ramp — enables two-tone themes (e.g. Aurora Noir). */
  accentSecondary300?: string;
  accentSecondary400?: string;
  accentSecondary500?: string;
  accentSecondary600?: string;
  /** Optional elevated card surface — a richer panel for premium depth. */
  surfaceElevated?: string;
  surfaceElevatedHover?: string;
  /** Optional secondary gradient — enables dual-gradient themes. */
  gradientSecondaryFrom?: string;
  gradientSecondaryTo?: string;
}

/**
 * Apply a theme by writing its tokens as CSS variables on `:root`. Existing
 * Tailwind color tokens and component utility classes reference these vars,
 * so the entire app re-skins without any component changes.
 */
export function applyTheme(themeId: ThemeId): void {
  const tokens = THEME_TOKENS[themeId] ?? THEME_TOKENS[DEFAULT_THEME];
  const meta = getThemeMeta(themeId);
  const root = document.documentElement;
  // Briefly enable cross-fade transitions so the palette swap feels smooth
  // rather than instantaneous. The class is removed once the transition settles.
  root.classList.add('theme-switching');
  root.style.setProperty('--app-bg', tokens.bg);
  root.style.setProperty('--app-surface', tokens.surface);
  root.style.setProperty('--app-surface-2', tokens.surface2);
  root.style.setProperty('--app-surface-3', tokens.surface3);
  root.style.setProperty('--app-card', tokens.card);
  root.style.setProperty('--app-card-hover', tokens.cardHover);
  root.style.setProperty('--app-border', tokens.border);
  root.style.setProperty('--app-border-strong', tokens.borderStrong);
  root.style.setProperty('--ink', tokens.ink);
  root.style.setProperty('--ink-muted', tokens.inkMuted);
  root.style.setProperty('--ink-faint', tokens.inkFaint);
  root.style.setProperty('--accent-50', tokens.accent50);
  root.style.setProperty('--accent-100', tokens.accent100);
  root.style.setProperty('--accent-200', tokens.accent200);
  root.style.setProperty('--accent-300', tokens.accent300);
  root.style.setProperty('--accent-400', tokens.accent400);
  root.style.setProperty('--accent-500', tokens.accent500);
  root.style.setProperty('--accent-600', tokens.accent600);
  root.style.setProperty('--accent-700', tokens.accent700);
  root.style.setProperty('--shadow-card', tokens.shadowCard);
  root.style.setProperty('--shadow-card-hover', tokens.shadowCardHover);
  root.style.setProperty('--shadow-accent', tokens.shadowAccent);
  root.style.setProperty('--gradient-from', tokens.gradientFrom);
  root.style.setProperty('--gradient-to', tokens.gradientTo);
  root.style.setProperty('--glow-rgba', tokens.glowRgba);
  // Match Card surface override. Only the Light Lavender theme defines these
  // tokens; for every other theme they are unset, so Match Cards fall back to
  // the regular card surface and remain visually identical to other cards.
  if (tokens.matchCard) {
    root.style.setProperty('--app-match-card', tokens.matchCard);
    root.style.setProperty('--app-match-card-hover', tokens.matchCardHover ?? tokens.matchCard);
    root.style.setProperty('--app-match-border', tokens.matchCardBorder ?? tokens.border);
    root.style.setProperty('--app-match-border-strong', tokens.matchCardBorderStrong ?? tokens.borderStrong);
  } else {
    root.style.removeProperty('--app-match-card');
    root.style.removeProperty('--app-match-card-hover');
    root.style.removeProperty('--app-match-border');
    root.style.removeProperty('--app-match-border-strong');
  }
  // Secondary accent ramp. Only themes with a two-tone identity define these;
  // for every other theme they are unset so components fall back to the
  // primary accent.
  if (tokens.accentSecondary300) {
    root.style.setProperty('--accent-secondary-300', tokens.accentSecondary300);
    root.style.setProperty('--accent-secondary-400', tokens.accentSecondary400 ?? tokens.accentSecondary300);
    root.style.setProperty('--accent-secondary-500', tokens.accentSecondary500 ?? tokens.accentSecondary300);
    root.style.setProperty('--accent-secondary-600', tokens.accentSecondary600 ?? tokens.accentSecondary300);
  } else {
    root.style.removeProperty('--accent-secondary-300');
    root.style.removeProperty('--accent-secondary-400');
    root.style.removeProperty('--accent-secondary-500');
    root.style.removeProperty('--accent-secondary-600');
  }
  // Zebra card surface — subtle alternating shade for vertical card lists.
  // When unset, zebra classes fall back to the regular card surface (no striping).
  if (tokens.zebraCard) {
    root.style.setProperty('--app-zebra-card', tokens.zebraCard);
    root.style.setProperty('--app-zebra-card-hover', tokens.zebraCardHover ?? tokens.zebraCard);
  } else {
    root.style.removeProperty('--app-zebra-card');
    root.style.removeProperty('--app-zebra-card-hover');
  }
  // Elevated surface. Only themes that define a premium elevated panel set
  // this; for every other theme it is unset so the elevated class falls back
  // to the regular card surface.
  if (tokens.surfaceElevated) {
    root.style.setProperty('--app-surface-elevated', tokens.surfaceElevated);
    root.style.setProperty('--app-surface-elevated-hover', tokens.surfaceElevatedHover ?? tokens.surfaceElevated);
  } else {
    root.style.removeProperty('--app-surface-elevated');
    root.style.removeProperty('--app-surface-elevated-hover');
  }
  // Secondary gradient. Only themes with a dual-gradient identity set this.
  if (tokens.gradientSecondaryFrom) {
    root.style.setProperty('--gradient-secondary-from', tokens.gradientSecondaryFrom);
    root.style.setProperty('--gradient-secondary-to', tokens.gradientSecondaryTo ?? tokens.gradientSecondaryFrom);
  } else {
    root.style.removeProperty('--gradient-secondary-from');
    root.style.removeProperty('--gradient-secondary-to');
  }
  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-theme-mode', meta.mode);
  // Remove the cross-fade class after the transition settles so it never
  // interferes with everyday hover/active transitions elsewhere.
  window.setTimeout(() => root.classList.remove('theme-switching'), 240);
}

export function getThemeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * Returns the default team color for a given theme — the theme's accent-500
 * token. Used by the New Team / Edit Team screens so every new team
 * automatically inherits a color that matches the active app theme. Users can
 * still override the color manually.
 */
export function getDefaultTeamColor(themeId: ThemeId): string {
  const tokens = THEME_TOKENS[themeId] ?? THEME_TOKENS[DEFAULT_THEME];
  return tokens.accent500;
}
