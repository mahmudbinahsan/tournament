import { useState, useMemo, useRef, useEffect } from 'react';
import { X, ArrowUpDown } from 'lucide-react';
import type { Tournament, Match } from '../../core/models/types';
import { MatchCard } from './MatchCard';
import { EmptyState } from '../ui/EmptyState';
import { SearchInput } from '../ui/SearchInput';
import { getRoundLabel, getKnockoutRoundLabel } from '../../core/engine/bracketEngine';
import { scrollRegistry } from '../../hooks/useScrollRestoration';
import { StageHeader } from '../ui/StageHeader';

interface MatchesPageProps {
  tournament: Tournament;
  onMatchClick?: (match: Match) => void;
  onTeamClick?: (teamId: string) => void;
  stickyOffset?: number;
  tab: MatchTab;
  onTabChange: (tab: MatchTab) => void;
  tournamentId: string;
  showSearch: boolean;
  showFilters: boolean;
}

export type MatchTab = 'all' | 'qualifying' | 'group' | 'knockout' | 'league';
type SortMode = 'tournament' | 'newest' | 'oldest';
type StatusFilter = 'all' | 'completed' | 'upcoming';

export function MatchesPage({
  tournament,
  onMatchClick,
  onTeamClick,
  stickyOffset,
  tab,
  onTabChange,
  tournamentId,
  showSearch,
  showFilters,
}: MatchesPageProps) {
  const { settings, matches, groups, teams } = tournament;
  const subTabKey = `tournament:${tournamentId}:matches:${tab}`;

  // Stage tabs
  const tabs: { id: MatchTab; label: string }[] = [{ id: 'all', label: 'All' }];
  if (settings.format === 'group-stage') {
    if (settings.qualifying?.enabled) tabs.push({ id: 'qualifying', label: 'Qualifying' });
    tabs.push({ id: 'group', label: 'Group Stage' });
    tabs.push({ id: 'knockout', label: 'Knockout Stage' });
  } else if (settings.format === 'round-robin') {
    tabs.push({ id: 'league', label: 'League Matches' });
  } else {
    tabs.push({ id: 'knockout', label: 'Knockout Stage' });
  }

  const [search, setSearch] = useState('');

  // Restore scroll position when this page mounts or the sub-tab changes.
  useEffect(() => {
    scrollRegistry.restore(subTabKey);
  }, [subTabKey]);

  const handleTabChange = (next: MatchTab) => {
    if (next === tab) return;
    // Save current scroll BEFORE swapping content.
    scrollRegistry.save(subTabKey);
    onTabChange(next);
  };
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [roundFilter, setRoundFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('tournament');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Available rounds for the round filter
  const availableRounds = useMemo(
    () => Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b),
    [matches],
  );

  // Apply all filters for the normal match list
  const filteredMatches = useMemo(() => {
    let result = matches;

    // Stage tab
    if (tab === 'qualifying') result = result.filter((m) => m.phase === 'qualifying');
    else if (tab === 'group') result = result.filter((m) => m.phase === 'group');
    else if (tab === 'knockout')
      result = result.filter((m) => m.phase === 'knockout' || (!m.phase && settings.format !== 'round-robin' && !m.phase));

    // Group filter
    if (groupFilter !== 'all') result = result.filter((m) => m.groupId === groupFilter);

    // Round filter
    if (roundFilter !== 'all') result = result.filter((m) => String(m.round) === roundFilter);

    // Team filter
    if (teamFilter !== 'all')
      result = result.filter((m) => m.teamA?.id === teamFilter || m.teamB?.id === teamFilter);

    // Status filter
    if (statusFilter === 'completed') result = result.filter((m) => m.status === 'completed');
    else if (statusFilter === 'upcoming')
      result = result.filter((m) => m.status === 'pending' && m.teamA && m.teamB && !m.isBye);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.teamA?.name.toLowerCase().includes(q) ||
          m.teamB?.name.toLowerCase().includes(q),
      );
    }

    // Sort
    const sorted = [...result];
    if (sortMode === 'tournament') {
      sorted.sort((a, b) => a.round - b.round || a.position - b.position);
    } else if (sortMode === 'newest') {
      sorted.sort((a, b) => b.round - a.round || b.position - a.position);
    } else {
      sorted.sort((a, b) => a.round - b.round || a.position - b.position);
    }

    return sorted;
  }, [matches, tab, groupFilter, roundFilter, teamFilter, statusFilter, sortMode, search, settings.format]);

  const hasActiveFilters =
    groupFilter !== 'all' ||
    roundFilter !== 'all' ||
    teamFilter !== 'all' ||
    statusFilter !== 'all' ||
    search.trim() !== '';

  function clearAllFilters() {
    setGroupFilter('all');
    setRoundFilter('all');
    setTeamFilter('all');
    setStatusFilter('all');
    setSearch('');
  }

  function handleMatchClick(match: Match) {
    setSelectedMatch(match);
    onMatchClick?.(match);
  }

  // Group by round for display (only in tournament sort mode)
  const isGrouped = sortMode === 'tournament';
  const nonThirdPlace = filteredMatches.filter((m) => !m.isThirdPlace);
  const thirdPlaceMatches = filteredMatches.filter((m) => m.isThirdPlace);
  const displayRounds = isGrouped
    ? Array.from(new Set(nonThirdPlace.map((m) => m.round))).sort((a, b) => a - b)
    : [];

  function getRoundHeaderLabel(round: number, roundMatches: Match[]): string {
    if (settings.format === 'round-robin') {
      return getRoundLabel(round, tournament.totalRounds, settings.format);
    } else if (settings.format === 'group-stage') {
      const isQualifying = roundMatches.some((m) => m.phase === 'qualifying');
      if (isQualifying) {
        return 'Qualifying Round';
      }
      const isGroup = roundMatches.some((m) => m.phase === 'group');
      return isGroup ? `Round ${round}` : getKnockoutRoundLabel(roundMatches.length);
    }
    return getRoundLabel(round, tournament.totalRounds, settings.format);
  }

  const showGroupFilter = settings.format === 'group-stage' && groups && groups.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Sticky search & filter */}
      <div
        className="sticky z-10 -mx-4 px-4 bg-app-solid-2 border-b border-app-border"
        style={{ top: stickyOffset ?? 0 }}
      >
      {/* Stage tabs — single outer border, accent outline on active tab only */}
      {tabs.length > 1 && (
        <div className="flex gap-1 p-1 pt-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={[
                'flex-1 flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ease-out border',
                tab === t.id
                  ? 'accent-gradient text-gold-50 border-transparent'
                  : 'border-app-border text-ink-muted hover:text-ink hover:bg-app-solid-3',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Search bar — shown when the user toggles Search from the overflow menu */}
      {showSearch && (
        <div className="flex gap-2 pt-3 pb-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search teams..."
            className="flex-1 min-w-0"
          />
        </div>
      )}
      </div>

      {/* Filters panel — shown when the user toggles Filter from the overflow menu */}
      {showFilters && (
        <div className="glass card-shadow rounded-2xl p-4 flex flex-col gap-4 animate-fade-in-soft">
          {/* Row 1: Status + Sort */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em] mb-1.5 block">Status</label>
              <div className="flex gap-1 p-1 bg-app-solid rounded-xl">
                {([
                  { id: 'all', label: 'All' },
                  { id: 'completed', label: 'Done' },
                  { id: 'upcoming', label: 'Upcoming' },
                ] as { id: StatusFilter; label: string }[]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={[
                      'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ease-out',
                      statusFilter === s.id ? 'accent-gradient text-gold-50' : 'text-ink-faint hover:text-ink-muted',
                    ].join(' ')}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em] mb-1.5 block flex items-center gap-1">
                <ArrowUpDown size={11} /> Sort
              </label>
              <div className="flex gap-1 p-1 bg-app-solid rounded-xl">
                {([
                  { id: 'tournament', label: 'Tournament' },
                  { id: 'newest', label: 'Newest' },
                  { id: 'oldest', label: 'Oldest' },
                ] as { id: SortMode; label: string }[]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSortMode(s.id)}
                    className={[
                      'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ease-out',
                      sortMode === s.id ? 'accent-gradient text-gold-50' : 'text-ink-faint hover:text-ink-muted',
                    ].join(' ')}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Group + Round */}
          <div className="grid grid-cols-2 gap-3">
            {showGroupFilter ? (
              <div>
                <label className="text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em] mb-1.5 block">Group</label>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-app-surface-2 border border-app-border rounded-xl text-sm text-ink outline-none focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200 ease-out"
                >
                  <option value="all" className="bg-app-surface-3">All Groups</option>
                  {groups!.map((g) => (
                    <option key={g.id} value={g.id} className="bg-app-surface-3">{g.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div />
            )}
            <div>
              <label className="text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em] mb-1.5 block">Round</label>
              <select
                value={roundFilter}
                onChange={(e) => setRoundFilter(e.target.value)}
                className="w-full px-4 py-3 bg-app-surface-2 border border-app-border rounded-xl text-sm text-ink outline-none focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200 ease-out"
              >
                <option value="all" className="bg-app-surface-3">All Rounds</option>
                {availableRounds.map((r) => (
                  <option key={r} value={String(r)} className="bg-app-surface-3">Round {r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Team filter */}
          <div>
            <label className="text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em] mb-1.5 block">Team</label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full px-4 py-3 bg-app-surface-2 border border-app-border rounded-xl text-sm text-ink outline-none focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200 ease-out"
            >
              <option value="all" className="bg-app-surface-3">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id} className="bg-app-surface-3">{t.emoji} {t.name}</option>
              ))}
            </select>
          </div>

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink hover:bg-app-solid-2 transition-all duration-200 ease-out"
            >
              <X size={14} /> Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Match list */}
      {filteredMatches.length === 0 ? (
        <EmptyState variant="medium" description="No matches found." />
      ) : isGrouped ? (
        <div className="flex flex-col gap-5">
          {displayRounds.map((round) => {
            const roundMatches = nonThirdPlace.filter((m) => m.round === round);
            const label = getRoundHeaderLabel(round, roundMatches);
            return (
              <div key={round}>
                <StageHeader label={label} className="mb-3 px-1" />
                <div className="flex flex-col gap-3">
                  {roundMatches.map((match, i) => {
                    return (
                    <MatchCard
                      key={match.id}
                      match={match}
                      tournament={tournament}
                      onClick={() => handleMatchClick(match)}
                      compact
                      onTeamClick={onTeamClick}
                    />
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* Third Place Match — always its own group, never grouped with Final */}
          {thirdPlaceMatches.length > 0 && (
            <div>
              <StageHeader label="Third Place Match" accent="gold" className="mb-3 px-1" />
              <div className="flex flex-col gap-3">
                {thirdPlaceMatches.map((match, i) => {
                  return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    tournament={tournament}
                    onClick={() => handleMatchClick(match)}
                    compact
                    onTeamClick={onTeamClick}
                  />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredMatches.map((match, i) => {
            return (
            <MatchCard
              key={match.id}
              match={match}
              tournament={tournament}
              onClick={() => handleMatchClick(match)}
              compact
              onTeamClick={onTeamClick}
            />
            );
          })}
        </div>
      )}
    </div>
  );
}


