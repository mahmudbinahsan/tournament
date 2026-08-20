import { useState, useEffect, useRef } from 'react';
import { Plus, Search, CheckCircle, Trash2, X, MoreVertical, Swords } from 'lucide-react';
import type { Screen, Team } from '../core/models/types';
import { TEAM_COLORS as COLORS, teamStrength, winRate, isUnproven } from '../core/models/types';
import { COUNTRY_FLAGS, flagForCountryName } from '../core/models/countries';
import { TeamListRow, TeamList } from '../components/team/TeamListRow';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SortChips } from '../components/ui/SortChips';
import { Flag } from '../components/ui/Flag';
import { useTeams } from '../hooks/useTeams';
import { sortTeams, type TeamSortKey } from '../core/display/teamSort';
import { loadSettings } from '../core/storage/settings';
import { getDefaultTeamColor } from '../core/theme/themes';

function teamValueForSort(team: Team, key: TeamSortKey): string {
  switch (key) {
    case 'strongest':
      return isUnproven(team) ? '—' : String(teamStrength(team));
    case 'az':
      return isUnproven(team) ? '—' : String(teamStrength(team));
    case 'championships':
      return String(team.career.championships);
    case 'winpct':
      return `${winRate(team.career)}%`;
    case 'wins':
      return String(team.career.wins);
    case 'matches':
      return String(team.career.totalBattles);
    default:
      return String(teamStrength(team));
  }
}

interface TeamsScreenProps {
  onNavigate: (screen: Screen) => void;
  editTeamId?: string;
}

export function TeamsScreen({ onNavigate, editTeamId }: TeamsScreenProps) {
  const { teams, createTeam, updateTeam, removeTeam } = useTeams();
  const [search, setSearch] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [sortKey, setSortKey] = useState<TeamSortKey>('strongest');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    if (editTeamId) {
      const team = teams.find((t) => t.id === editTeamId);
      if (team) openEdit(team);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTeamId, teams]);

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );
  const sorted = sortTeams(filtered, sortKey);

  const selectedCount = selectedIds.size;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function enterSelectMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }

  function exitSelectMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function handleDeleteSelected() {
    selectedIds.forEach((id) => removeTeam(id));
    exitSelectMode();
    setConfirmDelete(false);
  }

  function openEdit(team: Team) {
    setEditingTeam(team);
    setShowBuilder(true);
  }

  function openDetails(team: Team) {
    onNavigate({ name: 'team-details', teamId: team.id });
  }

  function openNew() {
    setEditingTeam(null);
    setShowBuilder(true);
  }

  function handleSave(data: Omit<Team, 'id' | 'wins' | 'losses' | 'draws' | 'createdAt'>) {
    if (editingTeam) {
      updateTeam({ ...editingTeam, ...data });
    } else {
      createTeam(data);
    }
    setShowBuilder(false);
    setEditingTeam(null);
  }

  return (
    <div className="flex flex-col gap-5 pb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">Teams</h1>
          <p className="text-sm text-ink-faint">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {!selectionMode && (
            <>
              <Button size="sm" variant="secondary" icon={<CheckCircle size={15} />} onClick={enterSelectMode}>Select</Button>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-app-surface-2 border border-app-border hover:bg-app-surface-3 transition-colors duration-200 ease-out active:scale-95"
                  aria-label="More options"
                >
                  <MoreVertical size={16} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 glass card-shadow rounded-xl border border-app-border overflow-hidden z-50 animate-fade-in-soft">
                    <button
                      onClick={() => { setShowMenu(false); onNavigate({ name: 'head-to-head' }); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-ink hover:bg-app-solid-2 transition-colors duration-150 ease-out"
                    >
                      <Swords size={16} className="text-gold-400" />
                      Head-to-Head
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          <Button size="sm" icon={<Plus size={15} />} onClick={openNew}>New Team</Button>
        </div>
      </div>

      {/* Selection mode bar */}
      {selectionMode && (
        <div className="flex items-center justify-between gap-3 glass rounded-2xl p-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <button
              onClick={exitSelectMode}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-app-surface-2 border border-app-border hover:bg-app-surface-3 transition-colors duration-200 ease-out active:scale-95"
              aria-label="Exit select mode"
            >
              <X size={16} />
            </button>
            <span className="text-sm font-semibold text-ink-muted">
              {selectedCount === 0 ? 'Tap teams to select' : `${selectedCount} selected`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 size={15} />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      {teams.length > 3 && (
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

      {/* Sort chips — only when there are teams to sort */}
      {teams.length > 1 && sorted.length > 0 && (
        <SortChips active={sortKey} onChange={setSortKey} />
      )}

      {/* Empty state */}
      {teams.length === 0 && (
        <EmptyState
          icon="👥"
          title="No Teams Yet"
          description="Build your roster — teams can be anything from armies to animals."
          action={
            <Button onClick={openNew} icon={<Plus size={16} />}>Create First Team</Button>
          }
        />
      )}

      {/* No search results */}
      {sorted.length === 0 && teams.length > 0 && (
        <div className="glass card-shadow rounded-2xl p-6 text-center text-ink-faint">
          No teams match "{search}"
        </div>
      )}

      {/* Team list */}
      {sorted.length > 0 && (
        <TeamList className="stagger">
          {sorted.map((team, index) => (
            <TeamListRow
              key={team.id}
              team={team}
              rank={index + 1}
              onClick={() => openDetails(team)}
              selectionMode={selectionMode}
              selected={selectedIds.has(team.id)}
              onToggleSelect={() => toggleSelect(team.id)}
              trailing={
                <span className="text-xs font-medium text-ink-faint tabular-nums shrink-0">
                  {teamValueForSort(team, sortKey)}
                </span>
              }
            />
          ))}
        </TeamList>
      )}

      {/* Delete confirmation */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Teams">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Are you sure you want to delete <strong className="text-ink">{selectedCount} team{selectedCount !== 1 ? 's' : ''}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={handleDeleteSelected} className="flex-1">Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Builder Modal — full screen so it feels like a normal page */}
      <Modal
        open={showBuilder}
        onClose={() => { setShowBuilder(false); setEditingTeam(null); }}
        title={editingTeam ? 'Edit Team' : 'Create Team'}
        fullScreen
      >
        <TeamBuilderForm
          initial={editingTeam}
          existingTeams={teams}
          onSave={handleSave}
          onCancel={() => { setShowBuilder(false); setEditingTeam(null); }}
        />
      </Modal>

    </div>
  );
}

// ─── TeamBuilderForm ──────────────────────────────────────────────────────────

interface TeamBuilderFormProps {
  initial: Team | null;
  existingTeams: Team[];
  onSave: (data: Omit<Team, 'id' | 'wins' | 'losses' | 'draws' | 'createdAt'>) => void;
  onCancel: () => void;
}

function TeamBuilderForm({ initial, existingTeams, onSave, onCancel }: TeamBuilderFormProps) {
  const [name, setName]   = useState(initial?.name  ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🏴');
  const [color, setColor] = useState(initial?.color ?? getDefaultTeamColor(loadSettings().theme));
  const [error, setError] = useState('');
  const [flagSearch, setFlagSearch] = useState('');
  const [userPickedFlag, setUserPickedFlag] = useState(!!initial?.emoji);

  const filteredFlags = COUNTRY_FLAGS.filter((c) => {
    const q = flagSearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const matchedCountry = flagForCountryName(name);
  const effectiveEmoji = (!userPickedFlag && matchedCountry) ? matchedCountry.emoji : emoji;

  function handleNameChange(value: string) {
    setName(value);
    setError('');
    setUserPickedFlag(false);
  }

  function handlePickFlag(value: string) {
    setEmoji(value);
    setUserPickedFlag(true);
  }

  function handleSubmit() {
    if (!name.trim()) { setError('Team name is required'); return; }
    if (name.trim().length > 30) { setError('Name must be 30 characters or less'); return; }
    const trimmedLower = name.trim().toLowerCase();
    const duplicate = existingTeams.some(
      (t) => t.id !== initial?.id && t.name.trim().toLowerCase() === trimmedLower,
    );
    if (duplicate) { setError('A team with this name already exists'); return; }
    onSave({ name: name.trim(), emoji: effectiveEmoji, color });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Actions at top — always visible before scrolling */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSubmit} className="flex-1">
          {initial ? 'Save Changes' : 'Create Team'}
        </Button>
      </div>

      {/* Preview */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: `${color}14`, border: `1px solid ${color}33` }}
      >
        <span className="text-2xl">{effectiveEmoji}</span>
        <div className="min-w-0">
          <p className="text-lg font-black text-ink truncate tracking-tight">{name || 'Your Team'}</p>
          <p className="text-sm text-ink-faint">
            Strength emerges from career history
          </p>
        </div>
      </div>

      {/* Name */}
      <Input
        label="Team Name"
        placeholder="e.g. Iron Dragons, Red Hawks..."
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        error={error}
        maxLength={30}
      />

      {/* Country flag picker */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-medium text-ink-muted">Country Flag</p>
          {matchedCountry && !userPickedFlag && (
            <span className="text-xs text-gold-300 font-medium">
              Auto: {matchedCountry.name}
            </span>
          )}
        </div>
        <Input
          placeholder="Search countries..."
          value={flagSearch}
          onChange={(e) => setFlagSearch(e.target.value)}
          icon={<Search size={14} />}
        />
        <div className="grid grid-cols-8 gap-1.5 mt-2 max-h-44 overflow-y-auto no-scrollbar">
          {filteredFlags.map((c) => (
            <button
              key={c.code}
              title={c.name}
              onClick={() => handlePickFlag(c.emoji)}
              className={[
                'aspect-square rounded-xl flex items-center justify-center transition-all duration-150 ease-out active:scale-95',
                effectiveEmoji === c.emoji
                  ? 'bg-gold-500/25 ring-2 ring-gold-400 scale-110'
                  : 'bg-app-solid-2 border border-app-border hover:bg-app-solid-3',
              ].join(' ')}
            >
              <Flag emoji={c.emoji} size="small" />
            </button>
          ))}
          {filteredFlags.length === 0 && (
            <p className="col-span-8 text-sm text-ink-faint text-center py-4">
              No countries match "{flagSearch}"
            </p>
          )}
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="text-[13px] font-medium text-ink-muted mb-2">Color</p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={[
                'w-8 h-8 rounded-xl border-2 transition-all duration-150 ease-out active:scale-95',
                color === c ? 'scale-125 border-white' : 'border-transparent hover:scale-110',
              ].join(' ')}
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: `${color}08`, border: `1px solid ${color}22` }}
      >
        <p className="text-sm text-ink-muted leading-relaxed">
          A team's strength is not set manually — it emerges naturally from its career history.
          New teams start as <span className="text-ink font-semibold">Unproven</span> and become
          more reliable as they play more matches. Win rate and experience together determine
          how they perform in future battles.
        </p>
      </div>
    </div>
  );
}
