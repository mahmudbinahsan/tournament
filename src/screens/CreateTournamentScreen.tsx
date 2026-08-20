import { useState, useMemo } from 'react';
import { ChevronLeft, Plus, Shuffle, Check, ChevronRight, Users, Search, Zap } from 'lucide-react';
import type { Screen, Team, Tournament, TournamentSettings, TournamentFormat, QualifyCount } from '../core/models/types';
import { TOURNAMENT_THEMES } from '../core/models/types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { TeamListRow, TeamList } from '../components/team/TeamListRow';
import { SortChips } from '../components/ui/SortChips';
import { IconButton } from '../components/ui/IconButton';
import { NumberStepper } from '../components/ui/NumberStepper';
import { EmptyState } from '../components/ui/EmptyState';
import { useTeams } from '../hooks/useTeams';
import { sortTeams, type TeamSortKey } from '../core/display/teamSort';
import { loadLastGroupConfig, saveLastGroupConfig } from '../core/storage/storage';

interface CreateTournamentScreenProps {
  onNavigate: (screen: Screen) => void;
  onCreate: (
    name: string,
    description: string,
    theme: string,
    teams: Team[],
    settings: TournamentSettings,
  ) => void;
  seasonFromId?: string;
  tournaments?: Tournament[];
}

type Step = 'setup' | 'teams' | 'assign' | 'settings' | 'group-config' | 'preview';

const FORMAT_OPTIONS: { id: TournamentFormat; label: string; desc: string; minTeams: number }[] = [
  { id: 'single-elimination', label: 'Single Elimination', desc: 'Lose once and you\'re out. Fast and dramatic.', minTeams: 2 },
  { id: 'round-robin', label: 'Round Robin', desc: 'Everyone plays everyone. Best overall record wins.', minTeams: 3 },
  { id: 'group-stage', label: 'Group Stage + Knockout', desc: 'Round robin groups feed into a playoff bracket.', minTeams: 4 },
  { id: 'double-elimination', label: 'Double Elimination', desc: 'Two losses to eliminate. More chances to fight back.', minTeams: 4 },
];

export function CreateTournamentScreen({ onNavigate, onCreate, seasonFromId, tournaments }: CreateTournamentScreenProps) {
  const { teams: allTeams } = useTeams();

  const seasonFrom = seasonFromId && tournaments ? tournaments.find((t) => t.id === seasonFromId) : undefined;

  // For New Season, resolve the freshest live team data instead of using the
  // stale snapshots embedded in the previous tournament. This ensures career
  // stats reflect everything that happened during the previous season.
  const liveTeamsById = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of allTeams) m.set(t.id, t);
    return m;
  }, [allTeams]);
  const seasonTeamsLive = useMemo<Team[]>(() => {
    if (!seasonFrom) return [];
    return seasonFrom.teams
      .map((t) => liveTeamsById.get(t.id) ?? t)
      .filter(Boolean);
  }, [seasonFrom, liveTeamsById]);

  const [step, setStep] = useState<Step>('setup');
  const [name, setName] = useState(seasonFrom?.name ?? '');
  const [description, setDescription] = useState(seasonFrom?.description ?? '');
  const [theme, setTheme] = useState(seasonFrom?.theme ?? 'custom');
  const [selectedTeams, setSelectedTeams] = useState<Team[]>(seasonTeamsLive);
  const [directGroupTeamIds, setDirectGroupTeamIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<TournamentFormat>(seasonFrom?.settings.format ?? 'single-elimination');
  const [thirdPlace, setThirdPlace] = useState(seasonFrom?.settings.thirdPlaceMatch ?? false);
  const lastGroupConfig = seasonFrom ? loadLastGroupConfig() : null;
  const [numGroups, setNumGroups] = useState(() => seasonFrom?.settings.numGroups ?? lastGroupConfig?.numGroups ?? 2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(() => seasonFrom?.settings.teamsPerGroup ?? lastGroupConfig?.teamsPerGroup ?? 4);
  const [qualifyPerGroup, setQualifyPerGroup] = useState<QualifyCount>(() => seasonFrom?.settings.qualifyPerGroup ?? lastGroupConfig?.qualifyPerGroup ?? 2);
  const [encountersPerOpponent, setEncountersPerOpponent] = useState(() => seasonFrom?.settings.encountersPerOpponent ?? 1);
  const [qualifyingEnabled, setQualifyingEnabled] = useState(() => seasonFrom?.settings.qualifying?.enabled ?? false);
  const [balancedDraw, setBalancedDraw] = useState(() => seasonFrom?.settings.balancedDraw ?? false);
  const [useSeeding, setUseSeeding] = useState(() => seasonFrom?.settings.useSeeding ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const groupSlots = numGroups * teamsPerGroup;

  // Steps array is dynamic: 'assign' only appears when qualifying is enabled.
  // It comes AFTER settings, since the qualifying toggle lives in Settings.
  const steps: Step[] = qualifyingEnabled
    ? ['setup', 'teams', 'settings', 'assign', 'group-config', 'preview']
    : ['setup', 'teams', 'settings', 'preview'];

  function validateSetup(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Tournament name is required';
    if (name.trim().length > 50) e.name = 'Max 50 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateTeams(): boolean {
    const fmt = FORMAT_OPTIONS.find((f) => f.id === format);
    const min = fmt?.minTeams ?? 2;
    if (selectedTeams.length < min) {
      setErrors({ teams: `This format requires at least ${min} teams` });
      return false;
    }
    if (format === 'group-stage') {
      const needed = numGroups * teamsPerGroup;
      if (qualifyingEnabled) {
        // When qualifying is enabled, exact team counts are validated later
        // in the assignment and group-config steps, after the Group Stage
        // configuration is set. Only enforce the format minimum here.
      } else {
        if (selectedTeams.length < needed) {
          setErrors({ teams: `Not enough teams. This configuration needs ${needed} (${numGroups}×${teamsPerGroup}). You have ${selectedTeams.length}.` });
          return false;
        }
        if (selectedTeams.length > needed) {
          setErrors({ teams: `Too many teams. This configuration needs exactly ${needed} (${numGroups}×${teamsPerGroup}). You have ${selectedTeams.length}.` });
          return false;
        }
        if (qualifyPerGroup >= teamsPerGroup) {
          setErrors({ teams: `Qualifying teams (${qualifyPerGroup}) must be less than teams per group (${teamsPerGroup}).` });
          return false;
        }
      }
    }
    setErrors({});
    return true;
  }

  function validateAssignment(): boolean {
    const e: Record<string, string> = {};
    const directCount = directGroupTeamIds.size;
    const qualifyingCount = selectedTeams.length - directCount;

    if (qualifyingCount < 2) {
      e.assign = `Qualifying needs at least 2 teams. You have ${qualifyingCount}.`;
    }
    if (qualifyingCount % 2 !== 0) {
      e.assign = `Qualifying teams (${qualifyingCount}) must be an even number (each match has 2 teams).`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateSettings(): boolean {
    if (format !== 'group-stage') { setErrors({}); return true; }
    if (qualifyingEnabled) { setErrors({}); return true; }
    const e: Record<string, string> = {};
    if (numGroups < 1) e.numGroups = 'At least 1 group';
    if (teamsPerGroup < 2) e.teamsPerGroup = 'At least 2 teams';
    if (qualifyPerGroup < 1) e.qualifyPerGroup = 'Minimum 1';
    if (qualifyPerGroup > 4) e.qualifyPerGroup = 'Maximum 4';
    if (qualifyPerGroup >= teamsPerGroup) e.qualifyPerGroup = `Must be less than ${teamsPerGroup}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateGroupConfig(): boolean {
    const e: Record<string, string> = {};
    const directCount = directGroupTeamIds.size;
    const qualifyingCount = selectedTeams.length - directCount;
    const expectedQWinners = qualifyingCount > 0 ? Math.floor(qualifyingCount / 2) : 0;
    const finalGroupTeams = directCount + expectedQWinners;
    const groupSlots = numGroups * teamsPerGroup;

    if (numGroups < 1) e.numGroups = 'At least 1 group';
    if (teamsPerGroup < 2) e.teamsPerGroup = 'At least 2 teams';
    if (qualifyPerGroup < 1) e.qualifyPerGroup = 'Minimum 1';
    if (qualifyPerGroup > 4) e.qualifyPerGroup = 'Maximum 4';
    if (qualifyPerGroup >= teamsPerGroup) e.qualifyPerGroup = `Must be less than ${teamsPerGroup}`;
    if (finalGroupTeams !== groupSlots) {
      e.groupConfig = `Final Group Stage Teams (${directCount} direct + ${expectedQWinners} qualifying winners = ${finalGroupTeams}) must equal ${groupSlots} (${numGroups}×${teamsPerGroup}).`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (step === 'setup' && !validateSetup()) return;
    if (step === 'teams' && !validateTeams()) return;
    if (step === 'assign' && !validateAssignment()) return;
    if (step === 'settings' && !validateSettings()) return;
    if (step === 'group-config' && !validateGroupConfig()) return;
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  }

  function back() {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    else onNavigate({ name: 'home' });
  }

  function toggleTeam(team: Team) {
    setSelectedTeams((prev) =>
      prev.find((t) => t.id === team.id)
        ? prev.filter((t) => t.id !== team.id)
        : [...prev, team],
    );
    setErrors({});
  }

  function shuffleTeams() {
    setSelectedTeams((prev) => [...prev].sort(() => Math.random() - 0.5));
  }

  function selectAllTeams() {
    setSelectedTeams([...allTeams]);
    setErrors({});
  }

  function clearAllTeams() {
    setSelectedTeams([]);
    setErrors({});
  }

  function toggleDirectGroup(team: Team) {
    setDirectGroupTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(team.id)) next.delete(team.id);
      else next.add(team.id);
      return next;
    });
    setErrors({});
  }

  function autoAssign() {
    // Replicates the previous automatic behavior: first N teams go to qualifying,
    // remaining teams go directly to the group stage.
    const directCount = Math.max(0, selectedTeams.length - groupSlots);
    setDirectGroupTeamIds(new Set(selectedTeams.slice(0, directCount).map((t) => t.id)));
    setErrors({});
  }

  // Derived assignment values
  const directGroupTeams = selectedTeams.filter((t) => directGroupTeamIds.has(t.id));
  const qualifyingTeams = selectedTeams.filter((t) => !directGroupTeamIds.has(t.id));
  const expectedQWinners = qualifyingTeams.length > 0 ? Math.floor(qualifyingTeams.length / 2) : 0;

  function handleCreate() {
    let teamsForTournament: Team[] = selectedTeams;
    let qualifyingSettings: TournamentSettings['qualifying'];

    if (format === 'group-stage' && qualifyingEnabled) {
      // Qualifying engine expects teams ordered: [qualifying teams..., direct group teams]
      teamsForTournament = [...qualifyingTeams, ...directGroupTeams];
      qualifyingSettings = {
        enabled: true,
        teamsEntering: qualifyingTeams.length,
        teamsQualifying: expectedQWinners,
      };
    }

    const settings: TournamentSettings = {
      format,
      thirdPlaceMatch: thirdPlace,
      simulationSpeed: 'normal',
      maxTeams: teamsForTournament.length,
      ...(format === 'group-stage' || format === 'round-robin'
        ? { encountersPerOpponent: encountersPerOpponent }
        : {}),
      ...(format === 'group-stage' ? { numGroups, teamsPerGroup, qualifyPerGroup } : {}),
      ...(format === 'group-stage' ? { balancedDraw, useSeeding } : {}),
      ...(qualifyingSettings ? { qualifying: qualifyingSettings } : {}),
    };
    if (format === 'group-stage') {
      saveLastGroupConfig({ numGroups, teamsPerGroup, qualifyPerGroup });
    }
    onCreate(name.trim(), description.trim(), theme, teamsForTournament, settings);
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pb-3 bg-app-solid-2 border-b border-app-border" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)' }}>
        <div className="flex items-center gap-3">
          <IconButton onClick={back}>
            <ChevronLeft size={20} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-ink truncate tracking-tight">New Tournament</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              {steps.map((s, i) => {
                const stepIdx = steps.indexOf(step);
                const isCurrent = s === step;
                const isPast = i < stepIdx;
                return (
                  <div
                    key={s}
                    className={[
                      'h-1 rounded-full transition-all duration-300 ease-out',
                      isCurrent ? 'w-6 accent-gradient' : isPast ? 'w-4 bg-gold-400/60' : 'w-4 bg-app-solid-3',
                    ].join(' ')}
                  />
                );
              })}
            </div>
          </div>
          {step === 'preview' ? (
            <Button onClick={handleCreate} size="sm" icon={<Check size={15} />} className="shrink-0">
              Create
            </Button>
          ) : (
            <Button onClick={next} size="sm" iconRight={<ChevronRight size={15} />} className="shrink-0">
              Continue
            </Button>
          )}
        </div>
      </div>

      {/* Steps */}
      {step === 'setup' && (
        <SetupStep
          name={name} setName={setName}
          description={description} setDescription={setDescription}
          theme={theme} setTheme={setTheme}
          errors={errors}
        />
      )}

      {step === 'teams' && (
        <TeamsStep
          allTeams={allTeams}
          selectedTeams={selectedTeams}
          toggleTeam={toggleTeam}
          shuffle={shuffleTeams}
          onSelectAll={selectAllTeams}
          onClearAll={clearAllTeams}
          errors={errors}
          onCreateTeam={() => onNavigate({ name: 'teams' })}
        />
      )}

      {step === 'assign' && (
        <AssignmentStep
          allSelectedTeams={selectedTeams}
          directGroupTeamIds={directGroupTeamIds}
          toggleDirectGroup={toggleDirectGroup}
          onAutoAssign={autoAssign}
          directCount={directGroupTeams.length}
          qualifyingCount={qualifyingTeams.length}
          expectedQWinners={expectedQWinners}
          errors={errors}
        />
      )}

      {step === 'settings' && (
        <SettingsStep
          format={format} setFormat={setFormat}
          thirdPlace={thirdPlace} setThirdPlace={setThirdPlace}
          teamCount={selectedTeams.length}
          numGroups={numGroups} setNumGroups={setNumGroups}
          teamsPerGroup={teamsPerGroup} setTeamsPerGroup={setTeamsPerGroup}
          qualifyPerGroup={qualifyPerGroup} setQualifyPerGroup={setQualifyPerGroup}
          encountersPerOpponent={encountersPerOpponent} setEncountersPerOpponent={setEncountersPerOpponent}
          qualifyingEnabled={qualifyingEnabled} setQualifyingEnabled={setQualifyingEnabled}
          balancedDraw={balancedDraw} setBalancedDraw={setBalancedDraw}
          useSeeding={useSeeding} setUseSeeding={setUseSeeding}
          errors={errors} setErrors={setErrors}
        />
      )}

      {step === 'group-config' && (
        <GroupConfigStep
          numGroups={numGroups} setNumGroups={setNumGroups}
          teamsPerGroup={teamsPerGroup} setTeamsPerGroup={setTeamsPerGroup}
          qualifyPerGroup={qualifyPerGroup} setQualifyPerGroup={setQualifyPerGroup}
          directCount={directGroupTeams.length}
          expectedQWinners={expectedQWinners}
          errors={errors} setErrors={setErrors}
        />
      )}

      {step === 'preview' && (
        <PreviewStep
          name={name} theme={theme} format={format}
          teams={selectedTeams} thirdPlace={thirdPlace}
          numGroups={numGroups} teamsPerGroup={teamsPerGroup} qualifyPerGroup={qualifyPerGroup}
          encountersPerOpponent={encountersPerOpponent}
          qualifyingEnabled={qualifyingEnabled}
          qualifyingTeamsEntering={qualifyingTeams.length}
          qualifyingTeamsQualifying={expectedQWinners}
          directGroupTeams={directGroupTeams}
          qualifyingTeams={qualifyingTeams}
          balancedDraw={balancedDraw}
          useSeeding={useSeeding}
        />
      )}
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function SetupStep({
  name, setName, description, setDescription, theme, setTheme, errors,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  theme: string; setTheme: (v: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Tournament Name"
        placeholder="e.g. World Dragon Cup, Robot Rumble..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        maxLength={50}
      />
      <Textarea
        label="Description (optional)"
        placeholder="What's the story behind this tournament?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
      <div>
        <p className="text-sm font-medium text-ink-muted mb-2">Theme</p>
        <div className="grid grid-cols-2 gap-2">
          {TOURNAMENT_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={[
                'flex items-center gap-2.5 rounded-xl p-3 text-left transition-all duration-150 ease-out',
                theme === t.id
                  ? 'bg-gold-500/20 border border-gold-400/50 text-ink'
                  : 'bg-app-solid-2 border border-app-border text-ink-muted hover:text-ink hover:bg-app-solid-3',
              ].join(' ')}
            >
              <span className="text-xl">{t.emoji}</span>
              <span className="text-sm font-semibold">{t.label}</span>
              {theme === t.id && <Check size={14} className="ml-auto text-gold-400 shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamsStep({
  allTeams, selectedTeams, toggleTeam, shuffle, onSelectAll, onClearAll, errors, onCreateTeam,
}: {
  allTeams: Team[];
  selectedTeams: Team[];
  toggleTeam: (t: Team) => void;
  shuffle: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  errors: Record<string, string>;
  onCreateTeam: () => void;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<TeamSortKey>('strongest');

  const filtered = allTeams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );
  const sorted = sortTeams(filtered, sortKey);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-muted">
            <span className="text-ink font-bold">{selectedTeams.length}</span> selected
          </p>
          {errors.teams && <p className="text-xs text-danger-400 mt-0.5">{errors.teams}</p>}
        </div>
        <div className="flex gap-2">
          {allTeams.length > 0 && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onClearAll()}>Clear All</Button>
              <Button size="sm" variant="ghost" onClick={() => onSelectAll()}>Select All</Button>
            </>
          )}
          {selectedTeams.length > 1 && (
            <Button size="sm" variant="ghost" icon={<Shuffle size={14} />} onClick={shuffle}>
              Shuffle
            </Button>
          )}
        </div>
      </div>

      {allTeams.length === 0 ? (
        <EmptyState
          icon={<Users size={32} className="mx-auto mb-3 text-ink-faint" />}
          description="You haven't created any teams yet."
          action={<Button onClick={onCreateTeam} size="sm" icon={<Plus size={14} />}>Create Teams</Button>}
        />
      ) : (
        <>
          {/* Search */}
          {allTeams.length > 3 && (
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
              <input
                type="text"
                placeholder="Search teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-app-surface-2 border border-app-border/50 rounded-xl text-sm text-ink placeholder-ink-faint/40 outline-none focus:border-gold-400/40 focus:bg-app-surface-3 transition-all duration-200 ease-out"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, color-mix(in srgb, var(--accent-500) 4%, transparent) 0%, transparent 60%)',
                }}
              />
            </div>
          )}

          {/* Sort chips */}
          {sorted.length > 1 && (
            <SortChips active={sortKey} onChange={setSortKey} />
          )}

          <TeamList>
            {sorted.map((team, index) => (
              <TeamListRow
                key={team.id}
                team={team}
                rank={index + 1}
                onClick={() => toggleTeam(team)}
                selected={!!selectedTeams.find((t) => t.id === team.id)}
                selectionMode
                onToggleSelect={() => toggleTeam(team)}
              />
            ))}
          </TeamList>

          {sorted.length === 0 && search && (
            <EmptyState variant="medium" description={<>No teams match "{search}"</>} />
          )}
        </>
      )}
    </div>
  );
}

function AssignmentStep({
  allSelectedTeams, directGroupTeamIds, toggleDirectGroup, onAutoAssign,
  directCount, qualifyingCount, expectedQWinners, errors,
}: {
  allSelectedTeams: Team[];
  directGroupTeamIds: Set<string>;
  toggleDirectGroup: (t: Team) => void;
  onAutoAssign: () => void;
  directCount: number;
  qualifyingCount: number;
  expectedQWinners: number;
  errors: Record<string, string>;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<TeamSortKey>('strongest');

  const filtered = allSelectedTeams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );
  const sorted = sortTeams(filtered, sortKey);

  const qualifyingValid = qualifyingCount >= 2 && qualifyingCount % 2 === 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Explanation */}
      <div className="glass card-shadow rounded-2xl p-4">
        <p className="text-sm font-bold text-ink">Assign Teams to Stages</p>
        <p className="text-xs text-ink-muted mt-1">
          Select the teams that go <span className="text-gold-300 font-semibold">directly to the Group Stage</span>.
          All remaining teams automatically enter the <span className="text-gold-300 font-semibold">Qualifying Stage</span>.
          You'll configure the Group Stage size in the next step.
        </p>
      </div>

      {/* Live counters */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass card-shadow rounded-2xl p-4 ring-1 ring-gold-400/30">
          <p className="text-[10px] text-ink-faint font-bold uppercase tracking-wider">Direct Group Teams</p>
          <p className="text-2xl font-black text-ink tabular-nums mt-1">{directCount}</p>
        </div>
        <div className={[
          'glass card-shadow rounded-2xl p-4 transition-all duration-200 ease-out',
          qualifyingValid ? 'ring-1 ring-success-400/50' : 'ring-1 ring-warning-400/40',
        ].join(' ')}>
          <p className="text-[10px] text-ink-faint font-bold uppercase tracking-wider">Qualifying Teams</p>
          <p className="text-2xl font-black text-ink tabular-nums mt-1">{qualifyingCount}</p>
          <p className="text-xs text-ink-faint mt-1 font-medium">
            {qualifyingCount > 0 ? `${expectedQWinners} winners expected` : 'No qualifying teams'}
          </p>
        </div>
      </div>

      {/* Validation error */}
      {errors.assign && (
        <div className="rounded-xl p-3 bg-danger-500/10 border border-danger-400/30">
          <p className="text-xs text-danger-400 font-medium">{errors.assign}</p>
        </div>
      )}

      {/* Auto Assign */}
      <Button variant="secondary" size="sm" icon={<Zap size={14} />} onClick={onAutoAssign} className="self-start">
        Auto Assign
      </Button>

      {/* Search */}
      {allSelectedTeams.length > 3 && (
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-app-surface-2 border border-app-border/50 rounded-xl text-sm text-ink placeholder-ink-faint/40 outline-none focus:border-gold-400/40 focus:bg-app-surface-3 transition-all duration-200 ease-out"
            style={{
              backgroundImage:
                'linear-gradient(180deg, color-mix(in srgb, var(--accent-500) 4%, transparent) 0%, transparent 60%)',
            }}
          />
        </div>
      )}

      {/* Sort chips */}
      {sorted.length > 1 && (
        <SortChips active={sortKey} onChange={setSortKey} />
      )}

      {/* Team list */}
      <TeamList>
        {sorted.map((team, index) => {
          const isDirect = directGroupTeamIds.has(team.id);
          return (
            <TeamListRow
              key={team.id}
              team={team}
              rank={index + 1}
              onClick={() => toggleDirectGroup(team)}
              selected={isDirect}
              selectionMode
              onToggleSelect={() => toggleDirectGroup(team)}
              trailing={
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${isDirect ? 'text-gold-300 bg-gold-500/20' : 'text-ink-faint bg-app-surface-3'}`}>
                  {isDirect ? 'Group' : 'Qual'}
                </span>
              }
            />
          );
        })}
      </TeamList>
    </div>
  );
}

function SettingsStep({
  format, setFormat, thirdPlace, setThirdPlace, teamCount,
  numGroups, setNumGroups, teamsPerGroup, setTeamsPerGroup,
  qualifyPerGroup, setQualifyPerGroup, encountersPerOpponent, setEncountersPerOpponent,
  qualifyingEnabled, setQualifyingEnabled,
  balancedDraw, setBalancedDraw,
  useSeeding, setUseSeeding,
  errors, setErrors,
}: {
  format: TournamentFormat; setFormat: (f: TournamentFormat) => void;
  thirdPlace: boolean; setThirdPlace: (v: boolean) => void;
  teamCount: number;
  numGroups: number; setNumGroups: (v: number) => void;
  teamsPerGroup: number; setTeamsPerGroup: (v: number) => void;
  qualifyPerGroup: QualifyCount; setQualifyPerGroup: (v: QualifyCount) => void;
  encountersPerOpponent: number; setEncountersPerOpponent: (v: number) => void;
  qualifyingEnabled: boolean; setQualifyingEnabled: (v: boolean) => void;
  balancedDraw: boolean; setBalancedDraw: (v: boolean) => void;
  useSeeding: boolean; setUseSeeding: (v: boolean) => void;
  errors: Record<string, string>;
  setErrors: (e: Record<string, string>) => void;
}) {
  const totalNeeded = numGroups * teamsPerGroup;
  const knockoutTeams = numGroups * qualifyPerGroup;

  const handleNumGroups = (v: number) => { setNumGroups(v); setErrors({}); };
  const handleTeamsPerGroup = (v: number) => {
    setTeamsPerGroup(v);
    if (qualifyPerGroup >= v) setQualifyPerGroup(Math.max(1, Math.min(4, v - 1)));
    setErrors({});
  };
  const handleQualifyPerGroup = (v: number) => {
    setQualifyPerGroup(Math.max(1, Math.min(4, v)));
    setErrors({});
  };
  const handleEncounters = (v: number) => {
    setEncountersPerOpponent(Math.max(1, Math.min(4, v)));
    setErrors({});
  };
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-ink-muted mb-2">Format</p>
        <div className="flex flex-col gap-2">
          {FORMAT_OPTIONS.map((opt) => {
            const disabled = teamCount < opt.minTeams;
            return (
              <button
                key={opt.id}
                onClick={() => !disabled && setFormat(opt.id)}
                disabled={disabled}
                className={[
                  'text-left rounded-xl p-4 transition-all duration-150 ease-out',
                  format === opt.id
                    ? 'bg-gold-500/20 border border-gold-400/50'
                    : 'bg-app-solid-2 border border-app-border',
                  disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-app-solid-3',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink">{opt.label}</p>
                  {format === opt.id && <Check size={15} className="text-gold-400 shrink-0" />}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">{opt.desc}</p>
                {disabled && (
                  <p className="text-xs text-gold-400 mt-1">Requires {opt.minTeams}+ teams</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {format === 'group-stage' && !qualifyingEnabled && (
        <div className="flex flex-col gap-4 glass card-shadow rounded-2xl p-4">
          <p className="text-sm font-bold text-ink">Group Stage Configuration</p>

          <NumberStepper
            label="Number of Groups"
            value={numGroups}
            min={1}
            onChange={handleNumGroups}
            error={errors.numGroups}
          />
          <NumberStepper
            label="Teams per Group"
            value={teamsPerGroup}
            min={2}
            onChange={handleTeamsPerGroup}
            error={errors.teamsPerGroup}
          />
          <NumberStepper
            label="Teams Qualifying per Group"
            value={qualifyPerGroup}
            min={1}
            max={4}
            onChange={handleQualifyPerGroup}
            error={errors.qualifyPerGroup}
          />

          {/* Live Summary */}
          <div className="flex flex-col gap-2 pt-3 border-t border-app-border">
            <p className="text-xs font-bold text-ink-faint uppercase tracking-widest">Live Summary</p>
            <SummaryRow label="Groups" value={numGroups} />
            <SummaryRow label="Teams per Group" value={teamsPerGroup} />
            <SummaryRow
              label="Total Teams Required"
              value={totalNeeded}
              tone={teamCount === totalNeeded ? 'ok' : 'warn'}
            />
            <SummaryRow label="Teams Qualifying per Group" value={qualifyPerGroup} />
            <SummaryRow label="Total Qualified Teams" value={knockoutTeams} />
            <SummaryRow label="Encounters per Opponent" value={encountersPerOpponent} />
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-faint">Knockout starts from</span>
              <span className="text-ink font-bold">{knockoutStartLabel(knockoutTeams)}</span>
            </div>
          </div>
        </div>
      )}

      {format === 'group-stage' && (
        <div className="glass card-shadow rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Qualifying Stage</p>
              <p className="text-xs text-ink-faint mt-0.5">
                Add a single-round Qualifying Stage before the Group Stage. You'll manually assign teams in the next step.
              </p>
            </div>
            <button
              onClick={() => setQualifyingEnabled(!qualifyingEnabled)}
              className={[
                'w-12 h-6 rounded-full transition-all duration-200 relative shrink-0',
                qualifyingEnabled ? 'accent-gradient' : '',
              ].join(' ')}
              style={qualifyingEnabled ? undefined : { background: 'var(--toggle-inactive-track, rgba(255,255,255,0.15))' }}
            >
              <span
                className={[
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ease-out',
                  qualifyingEnabled ? 'left-6' : 'left-0.5',
                ].join(' ')}
              />
            </button>
          </div>
          {qualifyingEnabled && (
            <p className="text-xs text-gold-300/80 font-medium pt-1 border-t border-app-border">
              Continue to the next step to assign teams to the Qualifying and Group Stages.
            </p>
          )}
        </div>
      )}

      {format === 'group-stage' && (
        <div className="glass card-shadow rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Balanced Group Draw</p>
              <p className="text-xs text-ink-faint mt-0.5">
                Seed teams by career strength into 4 pots and draw one team per pot into each group for balanced, unique groups.
              </p>
            </div>
            <button
              onClick={() => setBalancedDraw(!balancedDraw)}
              className={[
                'w-12 h-6 rounded-full transition-all duration-200 relative shrink-0',
                balancedDraw ? 'accent-gradient' : '',
              ].join(' ')}
              style={balancedDraw ? undefined : { background: 'var(--toggle-inactive-track, rgba(255,255,255,0.15))' }}
            >
              <span
                className={[
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ease-out',
                  balancedDraw ? 'left-6' : 'left-0.5',
                ].join(' ')}
              />
            </button>
          </div>
          {balancedDraw && (
            <p className="text-xs text-gold-300/80 font-medium pt-1 border-t border-app-border">
              Falls back to the standard random draw if the team count doesn't allow 4 balanced pots.
            </p>
          )}
        </div>
      )}

      {format === 'group-stage' && (
        <div className="glass card-shadow rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Use Seeding</p>
              <p className="text-xs text-ink-faint mt-0.5">
                Rank teams by career strength and distribute them into pots by ranking before the draw, so the strongest teams are spread one-per-group.
              </p>
            </div>
            <button
              onClick={() => setUseSeeding(!useSeeding)}
              className={[
                'w-12 h-6 rounded-full transition-all duration-200 relative shrink-0',
                useSeeding ? 'accent-gradient' : '',
              ].join(' ')}
              style={useSeeding ? undefined : { background: 'var(--toggle-inactive-track, rgba(255,255,255,0.15))' }}
            >
              <span
                className={[
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ease-out',
                  useSeeding ? 'left-6' : 'left-0.5',
                ].join(' ')}
              />
            </button>
          </div>
          {useSeeding && (
            <p className="text-xs text-gold-300/80 font-medium pt-1 border-t border-app-border">
              Ranking → Seeding → Pot Assignment → Tournament Draw. Pots hold the highest-ranked teams first, then the next tier, and so on.
            </p>
          )}
        </div>
      )}

      {(format === 'group-stage' || format === 'round-robin') && (
        <div className="glass card-shadow rounded-2xl p-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Encounters per Opponent</p>
            <p className="text-xs text-ink-faint mt-0.5">
              {format === 'group-stage'
                ? 'How many times each team plays every other team in their group.'
                : 'How many times each team plays every other team in the league.'}
            </p>
          </div>
          <NumberStepper
            value={encountersPerOpponent}
            min={1}
            max={4}
            onChange={handleEncounters}
            size="sm"
            hint={
              <span className="text-xs text-ink-faint ml-1">
                {encountersPerOpponent === 1 ? 'Single round-robin' : `${encountersPerOpponent}× round-robin`}
              </span>
            }
          />
        </div>
      )}

      {(format === 'single-elimination' || format === 'group-stage') && teamCount >= 4 && (
        <div className="flex items-center justify-between glass card-shadow rounded-2xl p-4">
          <div>
            <p className="text-sm font-bold text-ink">3rd Place Match</p>
            <p className="text-xs text-ink-faint">Play a consolation final</p>
          </div>
          <button
            onClick={() => setThirdPlace(!thirdPlace)}
            className={[
              'w-12 h-6 rounded-full transition-all duration-200 relative',
              thirdPlace ? 'accent-gradient' : '',
            ].join(' ')}
            style={thirdPlace ? undefined : { background: 'var(--toggle-inactive-track, rgba(255,255,255,0.15))' }}
          >
            <span
              className={[
                'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ease-out',
                thirdPlace ? 'left-6' : 'left-0.5',
              ].join(' ')}
            />
          </button>
        </div>
      )}
    </div>
  );
}

function GroupConfigStep({
  numGroups, setNumGroups, teamsPerGroup, setTeamsPerGroup,
  qualifyPerGroup, setQualifyPerGroup,
  directCount, expectedQWinners,
  errors, setErrors,
}: {
  numGroups: number; setNumGroups: (v: number) => void;
  teamsPerGroup: number; setTeamsPerGroup: (v: number) => void;
  qualifyPerGroup: QualifyCount; setQualifyPerGroup: (v: QualifyCount) => void;
  directCount: number;
  expectedQWinners: number;
  errors: Record<string, string>;
  setErrors: (e: Record<string, string>) => void;
}) {
  const totalNeeded = numGroups * teamsPerGroup;
  const knockoutTeams = numGroups * qualifyPerGroup;
  const finalGroupTeams = directCount + expectedQWinners;
  const finalMeets = finalGroupTeams === totalNeeded;

  const handleNumGroups = (v: number) => { setNumGroups(v); setErrors({}); };
  const handleTeamsPerGroup = (v: number) => {
    setTeamsPerGroup(v);
    if (qualifyPerGroup >= v) setQualifyPerGroup(Math.max(1, Math.min(4, v - 1)));
    setErrors({});
  };
  const handleQualifyPerGroup = (v: number) => {
    setQualifyPerGroup(Math.max(1, Math.min(4, v)));
    setErrors({});
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Info Summary */}
      <div className="glass card-shadow rounded-2xl p-4">
        <p className="text-sm font-bold text-ink">Group Stage Team Summary</p>
        <div className="flex flex-col gap-2 mt-3">
          <SummaryRow label="Direct Group Teams" value={directCount} />
          <SummaryRow label="Expected Qualifying Winners" value={expectedQWinners} />
          <SummaryRow label="Final Group Stage Teams" value={finalGroupTeams} tone={finalMeets ? 'ok' : 'warn'} />
        </div>
      </div>

      {/* Group Stage Configuration */}
      <div className="flex flex-col gap-4 glass card-shadow rounded-2xl p-4">
        <p className="text-sm font-bold text-ink">Group Stage Configuration</p>

        <NumberStepper
          label="Number of Groups"
          value={numGroups}
          min={1}
          onChange={handleNumGroups}
          error={errors.numGroups}
        />
        <NumberStepper
          label="Teams per Group"
          value={teamsPerGroup}
          min={2}
          onChange={handleTeamsPerGroup}
          error={errors.teamsPerGroup}
        />
        <NumberStepper
          label="Teams Qualifying per Group"
          value={qualifyPerGroup}
          min={1}
          max={4}
          onChange={handleQualifyPerGroup}
          error={errors.qualifyPerGroup}
        />

        {/* Live Summary */}
        <div className="flex flex-col gap-2 pt-3 border-t border-app-border">
          <p className="text-xs font-bold text-ink-faint uppercase tracking-widest">Live Summary</p>
          <SummaryRow label="Groups" value={numGroups} />
          <SummaryRow label="Teams per Group" value={teamsPerGroup} />
          <SummaryRow
            label="Total Group Stage Slots"
            value={totalNeeded}
            tone={finalMeets ? 'ok' : 'warn'}
          />
          <SummaryRow label="Teams Qualifying per Group" value={qualifyPerGroup} />
          <SummaryRow label="Total Qualified Teams" value={knockoutTeams} />
          <div className="flex justify-between items-center text-xs">
            <span className="text-ink-faint">Knockout starts from</span>
            <span className="text-ink font-bold">{knockoutStartLabel(knockoutTeams)}</span>
          </div>
        </div>
      </div>

      {/* Validation error */}
      {errors.groupConfig && (
        <div className="rounded-xl p-3 bg-danger-500/10 border border-danger-400/30">
          <p className="text-xs text-danger-400 font-medium">{errors.groupConfig}</p>
        </div>
      )}
    </div>
  );
}

function PreviewStep({
  name, theme, format, teams, thirdPlace,
  numGroups, teamsPerGroup, qualifyPerGroup, encountersPerOpponent,
  qualifyingEnabled, qualifyingTeamsEntering, qualifyingTeamsQualifying,
  directGroupTeams, qualifyingTeams,
  balancedDraw, useSeeding,
}: {
  name: string; theme: string; format: TournamentFormat;
  teams: Team[]; thirdPlace: boolean;
  numGroups: number; teamsPerGroup: number; qualifyPerGroup: QualifyCount;
  encountersPerOpponent: number;
  qualifyingEnabled: boolean;
  qualifyingTeamsEntering: number;
  qualifyingTeamsQualifying: number;
  directGroupTeams: Team[];
  qualifyingTeams: Team[];
  balancedDraw: boolean;
  useSeeding: boolean;
}) {
  const themeObj = TOURNAMENT_THEMES.find((t) => t.id === theme);
  const formatObj = FORMAT_OPTIONS.find((f) => f.id === format);

  return (
    <div className="flex flex-col gap-5">
      <div className="glass card-shadow rounded-2xl p-5 text-center">
        <div className="text-4xl mb-2">{themeObj?.emoji ?? '🏅'}</div>
        <h2 className="text-2xl font-black text-ink">{name}</h2>
        <p className="text-sm text-ink-muted mt-1">{formatObj?.label}</p>
      </div>

      <div className="glass card-shadow rounded-2xl overflow-hidden">
        <PreviewRow label="Teams" value={String(teams.length)} />
        <PreviewRow label="Format" value={formatObj?.label ?? ''} />
        {format === 'group-stage' && (
          <>
            {qualifyingEnabled && (
              <>
                <PreviewRow label="Qualifying Stage" value={`${qualifyingTeamsEntering} → ${qualifyingTeamsQualifying} teams`} />
                <PreviewRow label="Direct to Groups" value={String(directGroupTeams.length)} />
              </>
            )}
            <PreviewRow label="Groups" value={`${numGroups} × ${teamsPerGroup} teams`} />
            <PreviewRow label="Qualifiers" value={`Top ${qualifyPerGroup} per group → ${numGroups * qualifyPerGroup} in knockout`} />
            <PreviewRow label="Encounters per Opponent" value={`${encountersPerOpponent}× (group stage)`} />
            <PreviewRow label="Balanced Group Draw" value={balancedDraw ? 'Yes' : 'No'} />
            <PreviewRow label="Use Seeding" value={useSeeding ? 'Yes' : 'No'} />
          </>
        )}
        {format === 'round-robin' && (
          <PreviewRow label="Encounters per Opponent" value={`${encountersPerOpponent}×`} />
        )}
        {thirdPlace && (
          <PreviewRow label="3rd Place Match" value="Yes" />
        )}
      </div>

      {/* Qualifying teams roster */}
      {qualifyingEnabled && qualifyingTeams.length > 0 && (
        <div>
          <p className="text-xs text-ink-faint uppercase tracking-widest font-semibold mb-2">Qualifying Teams</p>
          <div className="flex flex-wrap gap-2">
            {qualifyingTeams.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-ink"
                style={{ background: `${t.color}20`, border: `1px solid ${t.color}40` }}
              >
                <span>{t.emoji}</span>
                <span>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct group teams roster */}
      {qualifyingEnabled && directGroupTeams.length > 0 && (
        <div>
          <p className="text-xs text-ink-faint uppercase tracking-widest font-semibold mb-2">Direct Group Teams</p>
          <div className="flex flex-wrap gap-2">
            {directGroupTeams.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-ink"
                style={{ background: `${t.color}20`, border: `1px solid ${t.color}40` }}
              >
                <span>{t.emoji}</span>
                <span>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full roster (non-qualifying or all teams) */}
      {(!qualifyingEnabled || (qualifyingEnabled && directGroupTeams.length === 0 && qualifyingTeams.length === 0)) && (
        <div>
          <p className="text-xs text-ink-faint uppercase tracking-widest font-semibold mb-2">Roster</p>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-ink"
                style={{ background: `${t.color}20`, border: `1px solid ${t.color}40` }}
              >
                <span>{t.emoji}</span>
                <span>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-app-border last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm font-bold text-ink text-right">{value}</span>
    </div>
  );
}

// ─── Group Config Helpers ─────────────────────────────────────────────────────

function SummaryRow({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-ink-faint">{label}</span>
      <span className={['font-bold tabular-nums', tone === 'warn' ? 'text-gold-400' : 'text-ink'].join(' ')}>
        {value}
      </span>
    </div>
  );
}

function knockoutStartLabel(knockoutTeams: number): string {
  let p = 1;
  while (p < knockoutTeams) p *= 2;
  switch (p) {
    case 2: return 'Final';
    case 4: return 'Semi-final';
    case 8: return 'Quarter-final';
    case 16: return 'Round of 16';
    case 32: return 'Round of 32';
    case 64: return 'Round of 64';
    case 128: return 'Round of 128';
    default: return `Round of ${p}`;
  }
}
