/**
 * Typography system — app-wide font switching.
 *
 * Fonts are loaded via Google Fonts (or the system stack for SF Pro Display,
 * which is only present on Apple devices). The active font is stored as a
 * setting and applied by setting `--app-font-family` on the document root;
 * the Tailwind `font-sans` utility and the `html` element both reference this
 * variable, so the entire app re-fonts without any component changes.
 */

export type FontId =
  | 'inter'
  | 'sf-pro'
  | 'manrope'
  | 'plus-jakarta'
  | 'outfit'
  | 'general-sans';

export interface FontMeta {
  id: FontId;
  name: string;
  /** Full CSS font-family stack applied to the document root. */
  stack: string;
  /** Google Fonts URL fragment, or null for system-only fonts. */
  googleUrl: string | null;
  /**
   * One-line note shown under the font name in the picker. For SF Pro Display
   * we note it is only available on Apple devices and falls back gracefully.
   */
  note: string;
}

export const FONTS: FontMeta[] = [
  {
    id: 'inter',
    name: 'Inter',
    stack:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
    note: 'The default — clean, neutral, highly readable.',
  },
  {
    id: 'sf-pro',
    name: 'SF Pro Display',
    stack:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
    googleUrl: null,
    note: 'Native Apple font. Falls back automatically on non-Apple devices.',
  },
  {
    id: 'manrope',
    name: 'Manrope',
    stack:
      "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
    note: 'Geometric, slightly rounded — modern and friendly.',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    stack:
      "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    note: 'Soft, expressive — premium editorial feel.',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    stack:
      "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap',
    note: 'Techno-geometric — bold and confident.',
  },
  {
    id: 'general-sans',
    name: 'General Sans',
    stack:
      "'General Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=General+Sans:wght@400;500;600;700&display=swap',
    note: 'Slightly condensed — sleek and sophisticated.',
  },
];

export const DEFAULT_FONT: FontId = 'inter';

const VALID_FONT_IDS = new Set<FontId>(FONTS.map((f) => f.id));

export function isFontId(v: unknown): v is FontId {
  return typeof v === 'string' && VALID_FONT_IDS.has(v as FontId);
}

export function getFontMeta(id: FontId): FontMeta {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

/**
 * Applies a font by writing its family stack to the `--app-font-family` CSS
 * variable on `:root`. The Tailwind `font-sans` token and the `html` element
 * both reference this variable, so the entire app re-fonts instantly. Also
 * injects the matching Google Fonts <link> if the font requires one and it
 * has not already been injected.
 */
export type FontSizeId = 'small' | 'default' | 'large' | 'extra-large';

export const FONT_SIZES: { id: FontSizeId; name: string; scale: number }[] = [
  { id: 'small', name: 'Small', scale: 0.95 },
  { id: 'default', name: 'Default', scale: 1.05 },
  { id: 'large', name: 'Large', scale: 1.15 },
  { id: 'extra-large', name: 'Extra Large', scale: 1.25 },
];

export const DEFAULT_FONT_SIZE: FontSizeId = 'default';

const VALID_FONT_SIZE_IDS = new Set<FontSizeId>(FONT_SIZES.map((f) => f.id));

export function isFontSizeId(v: unknown): v is FontSizeId {
  return typeof v === 'string' && VALID_FONT_SIZE_IDS.has(v as FontSizeId);
}

export function getFontSizeMeta(id: FontSizeId): { id: FontSizeId; name: string; scale: number } {
  return FONT_SIZES.find((f) => f.id === id) ?? FONT_SIZES[1];
}

export function applyFontSize(id: FontSizeId): void {
  const meta = getFontSizeMeta(id);
  const root = document.documentElement;
  if (meta.scale === 1) {
    root.style.removeProperty('zoom');
  } else {
    (root.style as CSSStyleDeclaration).zoom = String(meta.scale);
  }
}

export function applyFont(fontId: FontId): void {
  const meta = getFontMeta(fontId);
  const root = document.documentElement;

  root.style.setProperty('--app-font-family', meta.stack);

  if (meta.googleUrl) {
    const linkId = 'app-font-link';
    const existing = document.getElementById(linkId);
    if (existing) {
      if (existing.getAttribute('href') !== meta.googleUrl) {
        existing.setAttribute('href', meta.googleUrl);
      }
    } else {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = meta.googleUrl;
      document.head.appendChild(link);
    }
  }
}
