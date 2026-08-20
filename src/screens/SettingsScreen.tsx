import { useRef, useState } from 'react';
import {
  Palette, Sliders, Database, Info, Download, Upload, AlertTriangle,
  Check, RotateCcw, Trophy, Zap, ChevronDown, Type,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  THEMES,
  getThemeMeta,
  type ThemeId,
} from '../core/theme/themes';
import {
  FONTS,
  getFontMeta,
  applyFont,
  type FontId,
  FONT_SIZES,
  getFontSizeMeta,
  applyFontSize,
  type FontSizeId,
} from '../core/theme/fonts';
import {
  DEFAULT_K_VALUE,
  loadSettings,
  saveSettings,
  SIM_DURATIONS,
  type SimDuration,
} from '../core/storage/settings';
import {
  exportBackup,
  validateBackup,
  restoreBackup,
  type AppBackup,
} from '../core/storage/storage';

const APP_VERSION = '1.0.0';
const K_VALUE_MIN = 0.01;
const K_VALUE_MAX = 0.2;
const K_VALUE_STEP = 0.005;

interface SettingsScreenProps {
  onNavigate?: (screen: Screen) => void;
  onRestore?: () => void;
  onThemeChange?: (theme: ThemeId) => void;
  onFontChange?: (font: FontId) => void;
  onFontSizeChange?: (fontSize: FontSizeId) => void;
}

export function SettingsScreen({ onRestore, onThemeChange, onFontChange, onFontSizeChange }: SettingsScreenProps) {
  const initial = loadSettings();
  const [theme, setTheme] = useState<ThemeId>(initial.theme);
  const [font, setFont] = useState<FontId>(initial.font);
  const [fontSize, setFontSize] = useState<FontSizeId>(initial.fontSize);
  const [kValue, setKValue] = useState<number>(initial.kValue);
  const [simDuration, setSimDuration] = useState<SimDuration>(initial.simDuration);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<AppBackup | null>(null);
  const [backupError, setBackupError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [kDirty, setKDirty] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  function selectTheme(id: ThemeId) {
    if (id === theme) return;
    setTheme(id);
    saveSettings({ theme: id, kValue, font, fontSize, simDuration });
    onThemeChange?.(id);
  }

  function selectFont(id: FontId) {
    if (id === font) return;
    setFont(id);
    saveSettings({ theme, kValue, font: id, fontSize, simDuration });
    applyFont(id);
    onFontChange?.(id);
  }

  function selectFontSize(id: FontSizeId) {
    if (id === fontSize) return;
    setFontSize(id);
    saveSettings({ theme, kValue, font, fontSize: id, simDuration });
    applyFontSize(id);
    onFontSizeChange?.(id);
  }

  function commitKValue(v: number) {
    const clamped = Math.max(K_VALUE_MIN, Math.min(K_VALUE_MAX, v));
    setKValue(clamped);
    setKDirty(clamped !== initial.kValue);
  }

  function saveKValue() {
    saveSettings({ theme, kValue, font, fontSize, simDuration });
    setKDirty(false);
  }

  function resetKValue() {
    setKValue(DEFAULT_K_VALUE);
    saveSettings({ theme, kValue: DEFAULT_K_VALUE, font, fontSize, simDuration });
    setKDirty(false);
  }

  function selectSimDuration(id: SimDuration) {
    if (id === simDuration) return;
    setSimDuration(id);
    saveSettings({ theme, kValue, font, fontSize, simDuration: id });
  }

  function handleExport() {
    try {
      const backup = exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tournamentverse-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (navigator.share) {
        navigator
          .share({
            title: 'TournamentVerse Backup',
            text: `Backup exported ${backup.exportedAt}`,
            files: [new File([blob], a.download, { type: 'application/json' })],
          })
          .catch(() => {});
      }
    } catch {
      setBackupError('Could not export data. Please try again.');
    }
  }

  function handleImportClick() {
    setBackupError('');
    setRestoreSuccess(false);
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBackupError('');
    setRestoreSuccess(false);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const result = validateBackup(parsed);
        if (!result.ok) {
          setBackupError(result.error);
          return;
        }
        setPendingBackup(result.backup);
      } catch {
        setBackupError('Could not read file. Make sure it is a valid JSON backup.');
      }
    };
    reader.onerror = () => setBackupError('Could not read file.');
    reader.readAsText(file);
  }

  async function confirmRestore() {
    if (!pendingBackup) return;
    try {
      await restoreBackup(pendingBackup);
      setPendingBackup(null);
      setRestoreSuccess(true);
      onRestore?.();
    } catch {
      setBackupError('Import failed. The backup could not be restored.');
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-ink tracking-tight">Settings</h1>
        <p className="text-sm text-ink-faint">Personalize TournamentVerse</p>
      </div>

      {/* Appearance — collapsible. Only the row is visible initially; tap to
          expand/collapse the theme list with a smooth height + fade animation. */}
      <section className="glass card-shadow rounded-2xl overflow-hidden">
        <button
          onClick={() => setAppearanceOpen((v) => !v)}
          className="w-full flex items-start gap-3 p-4 text-left transition-colors duration-200 ease-out hover:bg-app-solid-2/40 active:scale-[0.99]"
          aria-expanded={appearanceOpen}
        >
          <div className="w-8 h-8 rounded-xl bg-app-solid-2 border border-app-border flex items-center justify-center shrink-0">
            <Palette size={16} className="text-gold-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-ink tracking-tight">Appearance</h2>
            <p className="text-xs text-ink-faint mt-0.5">
              {appearanceOpen
                ? 'Tap to hide themes'
                : `${getThemeMeta(theme).name} — tap to choose a theme`}
            </p>
          </div>
          <ChevronDown
            size={18}
            className={[
              'shrink-0 mt-1 text-ink-faint transition-transform duration-300 ease-out',
              appearanceOpen ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
          style={{
            maxHeight: appearanceOpen ? '1200px' : '0px',
            opacity: appearanceOpen ? 1 : 0,
          }}
        >
          <div className="px-4 pb-4 flex flex-col gap-2.5">
            {THEMES.map((t) => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t.id)}
                  className={[
                    'flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 ease-out active:scale-[0.99]',
                    isActive
                      ? 'bg-gold-500/12 border border-gold-400/50'
                      : 'bg-app-solid-2 border border-app-border hover:bg-app-solid-3 hover:border-app-border-strong',
                  ].join(' ')}
                >
                  <div className="flex shrink-0">
                    {t.swatch.map((c, i) => (
                      <span
                        key={i}
                        className="w-6 h-6 rounded-full border-2 border-app-card -ml-2 first:ml-0"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink tracking-tight">{t.name}</p>
                    <p className="text-xs text-ink-muted truncate">{t.description}</p>
                  </div>
                  {isActive && <Check size={18} className="text-gold-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Typography — font selector, nested inside the Appearance flow. */}
      <SettingsSection
        icon={<Type size={16} className="text-gold-400" />}
        title="Typography"
        subtitle="Choose the app's typeface."
      >
        <div className="flex flex-col gap-2.5">
          {FONTS.map((f) => {
            const isActive = f.id === font;
            return (
              <button
                key={f.id}
                onClick={() => selectFont(f.id)}
                style={{ fontFamily: f.stack }}
                className={[
                  'flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 ease-out active:scale-[0.99]',
                  isActive
                    ? 'bg-gold-500/12 border border-gold-400/50'
                    : 'bg-app-solid-2 border border-app-border hover:bg-app-solid-3 hover:border-app-border-strong',
                ].join(' ')}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink tracking-tight">{f.name}</p>
                  <p className="text-xs text-ink-muted truncate">{f.note}</p>
                </div>
                {isActive && <Check size={18} className="text-gold-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* Font Size — nested inside the Appearance flow. */}
      <SettingsSection
        icon={<Type size={16} className="text-gold-400" />}
        title="Font Size"
        subtitle="Scale text across the app for readability."
      >
        <div className="grid grid-cols-2 gap-2.5">
          {FONT_SIZES.map((fs) => {
            const isActive = fs.id === fontSize;
            return (
              <button
                key={fs.id}
                onClick={() => selectFontSize(fs.id)}
                className={[
                  'flex items-center justify-between rounded-xl p-3 text-left transition-all duration-200 ease-out active:scale-[0.99]',
                  isActive
                    ? 'bg-gold-500/12 border border-gold-400/50'
                    : 'bg-app-solid-2 border border-app-border hover:bg-app-solid-3 hover:border-app-border-strong',
                ].join(' ')}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-ink tracking-tight"
                    style={{ fontSize: `${0.875 * fs.scale}rem`, lineHeight: 1.2 }}
                  >
                    {fs.name}
                  </p>
                  <p
                    className="text-ink-muted"
                    style={{ fontSize: `${0.75 * fs.scale}rem` }}
                  >
                    Aa Bb Cc
                  </p>
                </div>
                {isActive && <Check size={18} className="text-gold-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* Simulation */}
      <SettingsSection
        icon={<Sliders size={16} className="text-gold-400" />}
        title="Simulation"
        subtitle="Tune how match outcomes are decided."
      >
        <div className="flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-bold text-ink">K Value</p>
                <p className="text-xs text-ink-faint mt-0.5">
                  Controls how steeply strength gaps translate into win probability. Higher K = fewer upsets.
                </p>
              </div>
              <span className="text-lg font-black text-gold-300 tabular-nums shrink-0 ml-3">
                {kValue.toFixed(3)}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-app-solid-3 mt-3 overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full accent-gradient transition-all duration-200 ease-out"
                style={{
                  width: `${((kValue - K_VALUE_MIN) / (K_VALUE_MAX - K_VALUE_MIN)) * 100}%`,
                }}
              />
              <input
                type="range"
                min={K_VALUE_MIN}
                max={K_VALUE_MAX}
                step={K_VALUE_STEP}
                value={kValue}
                onChange={(e) => commitKValue(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink-faint mt-1.5 tabular-nums">
              <span>{K_VALUE_MIN.toFixed(3)} (upsets)</span>
              <span>Default {DEFAULT_K_VALUE.toFixed(3)}</span>
              <span>{K_VALUE_MAX.toFixed(3)} (predictable)</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={resetKValue}
            >
              Reset to Default
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Check size={14} />}
              onClick={saveKValue}
              disabled={!kDirty}
              className="flex-1"
            >
              {kDirty ? 'Save K Value' : 'Saved'}
            </Button>
          </div>

          {/* Simulation Mode */}
          <div className="pt-2 border-t border-app-border">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-bold text-ink">Simulation Mode</p>
                <p className="text-xs text-ink-faint mt-0.5">
                  Instant resolves matches immediately. Live resolves battles one at a time — first to 4 wins ends the match.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {SIM_DURATIONS.map((d) => {
                const isActive = d.id === simDuration;
                return (
                  <button
                    key={d.id}
                    onClick={() => selectSimDuration(d.id)}
                    className={[
                      'flex items-center justify-center rounded-xl p-3 text-left transition-all duration-200 ease-out active:scale-[0.99]',
                      isActive
                        ? 'bg-gold-500/12 border border-gold-400/50'
                        : 'bg-app-solid-2 border border-app-border hover:bg-app-solid-3 hover:border-app-border-strong',
                    ].join(' ')}
                  >
                    <span className={[
                      'text-sm font-bold tracking-tight',
                      isActive ? 'text-gold-300' : 'text-ink',
                    ].join(' ')}>
                      {d.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Data */}
      <SettingsSection
        icon={<Database size={16} className="text-gold-400" />}
        title="Data"
        subtitle="Back up or restore your tournaments and teams."
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted leading-relaxed">
            Export all your tournaments, teams, and match history to a single file, or restore from a previous backup.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              icon={<Download size={16} />}
              onClick={handleExport}
              className="flex-1"
            >
              Export Data
            </Button>
            <Button
              variant="secondary"
              icon={<Upload size={16} />}
              onClick={handleImportClick}
              className="flex-1"
            >
              Import Data
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileSelected}
          />
          {backupError && (
            <div className="rounded-xl p-3 text-sm text-danger-300 bg-danger-500/10 border border-danger-400/30">
              {backupError}
            </div>
          )}
          {restoreSuccess && (
            <div className="rounded-xl p-3 text-sm text-success-300 bg-success-500/10 border border-success-400/30 flex items-center justify-between gap-3">
              <span>Backup restored successfully.</span>
              <button
                onClick={() => setRestoreSuccess(false)}
                className="text-ink-faint hover:text-ink text-xs shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* About */}
      <SettingsSection
        icon={<Info size={16} className="text-gold-400" />}
        title="About"
        subtitle="App information"
      >
        <div className="flex flex-col gap-2.5">
          <AboutRow label="App Name" value="TournamentVerse" />
          <AboutRow label="Version" value={APP_VERSION} />
          <AboutRow label="Default Theme" value={getThemeMeta(theme).name} />
          <div className="flex items-center gap-2 pt-2 mt-1 border-t border-app-border text-xs text-ink-faint">
            <Trophy size={12} className="text-gold-400" />
            <span>Create epic tournaments for any team, faction, or force.</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            <Zap size={12} className="text-gold-400" />
            <span>Simulate battles, run brackets, crown champions.</span>
          </div>
        </div>
      </SettingsSection>

      {/* Import confirmation modal */}
      <Modal
        open={!!pendingBackup}
        onClose={() => setPendingBackup(null)}
        title="Restore Backup?"
      >
        {pendingBackup && (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl p-4 bg-gold-500/10 border border-gold-400/30 flex items-start gap-3">
              <AlertTriangle size={20} className="text-gold-400 shrink-0 mt-0.5" />
              <div className="text-sm text-ink leading-relaxed">
                <p className="font-bold text-ink mb-1">All current data will be replaced</p>
                <p>
                  This will overwrite all existing tournaments, teams, and match history with the contents of the backup file. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="glass card-shadow rounded-2xl p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Tournaments</span>
                <span className="text-ink font-bold tabular-nums">{pendingBackup.data.tournaments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Teams</span>
                <span className="text-ink font-bold tabular-nums">{pendingBackup.data.teams.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Exported</span>
                <span className="text-ink font-bold">
                  {new Date(pendingBackup.exportedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPendingBackup(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmRestore} className="flex-1">
                Replace & Restore
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass card-shadow rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-app-solid-2 border border-app-border flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-ink tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-ink-faint mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink font-bold">{value}</span>
    </div>
  );
}
