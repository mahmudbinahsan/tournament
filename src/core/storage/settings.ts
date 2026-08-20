import { DEFAULT_THEME, type ThemeId } from '../theme/themes';
import { DEFAULT_FONT, isFontId, type FontId, DEFAULT_FONT_SIZE, isFontSizeId, type FontSizeId } from '../theme/fonts';

/**
 * App-wide user preferences (Settings). Stored under the existing
 * `tournamentverse_settings` localStorage key so it round-trips through the
 * existing backup/restore pipeline without any change to that code.
 */

const SETTINGS_KEY = 'tournamentverse_settings';

export const DEFAULT_K_VALUE = 0.075;

export type SimDuration = 'instant' | 'live';

export const SIM_DURATIONS: { id: SimDuration; label: string; ms: number }[] = [
  { id: 'instant', label: 'Instant', ms: 0 },
  { id: 'live', label: 'Live', ms: 12_000 },
];

export const DEFAULT_SIM_DURATION: SimDuration = 'live';

function isSimDuration(v: unknown): v is SimDuration {
  return v === 'instant' || v === 'live';
}

export interface AppSettings {
  theme: ThemeId;
  kValue: number;
  font: FontId;
  fontSize: FontSizeId;
  simDuration: SimDuration;
}

const VALID_THEMES = new Set<ThemeId>([
  'electric-blue',
  'slate-arena',
  'night-league',
]);

function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && VALID_THEMES.has(v as ThemeId);
}

function loadRaw(): unknown {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadSettings(): AppSettings {
  const raw = loadRaw();
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const theme = isThemeId(obj.theme) ? obj.theme : DEFAULT_THEME;
    const kValue =
      typeof obj.kValue === 'number' && Number.isFinite(obj.kValue) && obj.kValue > 0
        ? obj.kValue
        : DEFAULT_K_VALUE;
    const font = isFontId(obj.font) ? obj.font : DEFAULT_FONT;
    const fontSize = isFontSizeId(obj.fontSize) ? obj.fontSize : DEFAULT_FONT_SIZE;
    const simDuration = isSimDuration(obj.simDuration) ? obj.simDuration : DEFAULT_SIM_DURATION;
    return { theme, kValue, font, fontSize, simDuration };
  }
  return { theme: DEFAULT_THEME, kValue: DEFAULT_K_VALUE, font: DEFAULT_FONT, fontSize: DEFAULT_FONT_SIZE, simDuration: DEFAULT_SIM_DURATION };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...patch };
  saveSettings(next);
  return next;
}

export function getKValue(): number {
  return loadSettings().kValue;
}
