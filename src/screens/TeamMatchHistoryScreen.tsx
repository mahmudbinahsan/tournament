import { useState, useMemo } from 'react';
import { ChevronLeft, ArrowUpDown, Filter, X } from 'lucide-react';
import type { Screen, Team, Match, Tournament } from '../core/models/types';
import { getTeamById, loadTournaments } from '../core/storage/storage';
import { getMatchStageLine } from '../core/display/matchDisplay';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { MatchCard } from '../components/tournament/MatchCard';

interface TeamMatchHistoryScreenProps {
  teamId: string;
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
  dataVersion?: number;
}

type SortMode = 'newest' | 'oldest';

interface MatchInfo {
  match: Match;
  tournament: Tournament;
  opponent: Team;
  won: boolean;
  stage: string;
  order: number;
}

export function TeamMatchHistoryScreen({ teamId, onNavigate, onBack, dataVersion }: TeamMatchHistoryScreenProps) {
  const team = useMemo(() => getTeamById(teamId), [teamId, dataVersion]);

  const allMatches = useMemo<MatchInfo[]>(() => {
    if (!team) return [];
    const tournaments = loadTournaments();
    const results: MatchInfo[] = [];
    for (const t of tournaments) {
      for (const m of t.matches) {
        if (m.status !== 'completed' || m.isBye || !m.teamA || !m.teamB || !m.winner) continue;
        if (m.teamA.id !== teamId && m.teamB.id !== teamId) continue;
        const isA = m.teamA.id === teamId;
        const opponent = isA ? m.teamB! : m.teamA!;
        const won = m.winner.id === teamId;
        const stage = getMatchStageLine(m, t);
        const order = new Date(t.completedAt ?? t.createdAt).getTime();
        results.push({ match: m, tournament: t, opponent, won, stage, order });
      }
    }
    results.sort((a, b) => b.order - a.order || b.match.round - a.match.round || b.match.position - a.match.position);
    return results;
  }, [teamId, team, dataVersion]);

  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [tournamentFilter, setTournamentFilter] = useState<string>('all');
  const [opponentFilter, setOpponentFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const tournamentOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const m of allMatches) set.set(m.tournament.id, m.tournament.name);
    return Array.from(set.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allMatches]);

  const opponentOptions = useMemo(() => {
    const set = new Map<string, Team>();
    for (const m of allMatches) set.set(m.opponent.id, m.opponent);
    return Array.from(set.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allMatches]);

  const stageOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of allMatches) set.add(m.stage);
    return Array.from(set).sort();
  }, [allMatches]);

  const filteredMatches = useMemo(() => {
    let result = allMatches;
    if (tournamentFilter !== 'all') result = result.filter((m) => m.tournament.id === tournamentFilter);
    if (opponentFilter !== 'all') result = result.filter((m) => m.opponent.id === opponentFilter);
    if (stageFilter !== 'all') result = result.filter((m) => m.stage === stageFilter);
    const sorted = [...result];
    if (sortMode === 'newest') {
      sorted.sort((a, b) => b.order - a.order || b.match.round - a.match.round || b.match.position - a.match.position);
    } else {
      sorted.sort((a, b) => a.order - b.order || a.match.round - b.match.round || a.match.position - b.match.position);
    }
    return sorted;
  }, [allMatches, tournamentFilter, opponentFilter, stageFilter, sortMode]);

  const hasActiveFilters = tournamentFilter !== 'all' || opponentFilter !== 'all' || stageFilter !== 'all';

  function clearAllFilters() {
    setTournamentFilter('all');
    setOpponentFilter('all');
    setStageFilter('all');
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass card-shadow rounded-2xl p-8 text-center">
          <p className="text-ink-muted font-semibold">Team not found.</p>
          <button onClick={() => onNavigate({ name: 'teams' })} className="mt-4 text-gold-400 font-bold text-sm">
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-4 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pb-3 bg-app-solid-2 border-b border-app-border" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)' }}>
        <div className="flex items-center gap-3">
          <IconButton onClick={onBack}>
            <ChevronLeft size={20} strokeWidth={2.2} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-ink truncate tracking-tight">Match History</h1>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-ink truncate">{team.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Sort + Filter toggle */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-app-solid-2 border border-app-border rounded-xl">
            {([
              { id: 'newest', label: 'Newest First' },
              { id: 'oldest', label: 'Oldest First' },
            ] as { id: SortMode; label: string }[]).map((s) => (
              <button
                key={s.id}
                onClick={() => setSortMode(s.id)}
                className={[
                  'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ease-out',
                  sortMode === s.id ? 'accent-gradient text-gold-50 shadow-md shadow-gold-500/30' : 'text-ink-faint hover:text-ink-muted',
                ].join(' ')}
              >
                <ArrowUpDown size={11} />
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={[
              'px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ease-out flex items-center gap-1.5 shrink-0 active:scale-95',
              showFilters || hasActiveFilters
                ? 'accent-gradient text-gold-50 shadow-lg shadow-gold-500/30'
                : 'bg-app-solid-2 border border-app-border text-ink-muted hover:text-ink hover:bg-app-solid-3',
            ].join(' ')}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-warning-400" />}
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="glass card-shadow rounded-2xl p-4 flex flex-col gap-3 animate-fade-in-soft">
            <div>
              <label className="text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em] mb-1.5 block">Tournament</label>
              <select
                value={tournamentFilter}
                onChange={(e) => setTournamentFilter(e.target.value)}
                className="w-full px-4 py-3 bg-app-surface-2 border border-app-border rounded-xl text-sm text-ink outline-none focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200 ease-out"
              >
                <option value="all" className="bg-app-surface-3">All Tournaments</option>
                {tournamentOptions.map(([id, name]) => (
                  <option key={id} value={id} className="bg-app-surface-3">{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em] mb-1.5 block">Opponent</label>
              <select
                value={opponentFilter}
                onChange={(e) => setOpponentFilter(e.target.value)}
                className="w-full px-4 py-3 bg-app-surface-2 border border-app-border rounded-xl text-sm text-ink outline-none focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200 ease-out"
              >
                <option value="all" className="bg-app-surface-3">All Opponents</option>
                {opponentOptions.map((t) => (
                  <option key={t.id} value={t.id} className="bg-app-surface-3">{t.emoji} {t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em] mb-1.5 block">Match Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="w-full px-4 py-3 bg-app-surface-2 border border-app-border rounded-xl text-sm text-ink outline-none focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200 ease-out"
              >
                <option value="all" className="bg-app-surface-3">All Stages</option>
                {stageOptions.map((s) => (
                  <option key={s} value={s} className="bg-app-surface-3">{s}</option>
                ))}
              </select>
            </div>
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

        {/* Count */}
        <div className="flex items-center px-1">
          <span className="text-xs text-ink-faint">
            {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {/* Match list */}
        {filteredMatches.length === 0 ? (
          <EmptyState variant="medium" description="No matches found." />
        ) : (
          <div className="flex flex-col gap-3 stagger">
            {filteredMatches.map((info, i) => (
              <MatchCard
                key={info.match.id}
                match={info.match}
                tournament={info.tournament}
                onTeamClick={(id) => onNavigate({ name: 'team-details', teamId: id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
