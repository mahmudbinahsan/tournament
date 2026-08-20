import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import {
  ChevronLeft, Play, Grid3x3,
  BarChart2, Swords, Clock, RotateCcw,
  Trophy, Users, Calendar, Flame, Check,
} from 'lucide-react';
import { TournamentOverflowMenu } from '../components/tournament/TournamentOverflowMenu';
import type { Screen, Tournament, Match, Team } from '../core/models/types';
import { Button } from '../components/ui/Button';
import { MatchCard } from '../components/tournament/MatchCard';
import { MatchBattleModal } from '../components/tournament/MatchBattleModal';
import { StandingsPage } from '../components/tournament/StandingsPage';
import { MatchesPage, type MatchTab } from '../components/tournament/MatchesPage';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { TeamListRow, TeamList } from '../components/team/TeamListRow';
import { sortTeams } from '../core/display/teamSort';
import {
  getTournamentStageLabel,
  computeProgressStats,
} from '../core/display/matchDisplay';
import { scrollRegistry, tabStateRegistry } from '../hooks/useScrollRestoration';
import { useSimulation, type MatchResult } from '../hooks/useSimulationContext';

interface TournamentScreenProps {
  tournament: Tournament;
  onNavigate: (screen: Screen) => void;
  onStart: (id: string) => void;
  onSimulateRound: (id: string) => Tournament | null;
  onSimulateAll: (id: string) => Tournament | null;
  onSimulateMatch: (id: string, matchId: string) => Tournament | null;
  onApplyMatchResult: (id: string, matchId: string, winnerId: string) => Tournament | null;
  onApplyMatchResults: (id: string, results: MatchResult[]) => Tournament | null;
  onSimulateGroup: (id: string, groupId: string) => Tournament | null;
  onSimulateGroupStage: (id: string) => Tournament | null;
  onSimulateKnockoutRound: (id: string) => Tournament | null;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onNewSeason: (id: string) => void;
  onTeamClick: (teamId: string) => void;
}

type Tab = 'overview' | 'standings' | 'matches';

export function TournamentScreen({
  tournament: initialTournament,
  onNavigate,
  onStart,
  onSimulateRound,
  onSimulateAll,
  onSimulateMatch,
  onApplyMatchResult,
  onApplyMatchResults,
  onSimulateGroup,
  onSimulateGroupStage,
  onSimulateKnockoutRound,
  onDelete,
  onRename,
  onNewSeason,
  onTeamClick,
}: TournamentScreenProps) {
  const { isSimulating, startSimulation } = useSimulation();

  const [tournament, setTournament] = useState(initialTournament);
  const savedTabState = tabStateRegistry.get(initialTournament.id);
  const [tab, setTab] = useState<Tab>((savedTabState?.tab as Tab) ?? 'overview');
  const [matchesSubTab, setMatchesSubTab] = useState<MatchTab>((savedTabState?.subTab as MatchTab) ?? 'all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmNewSeason, setConfirmNewSeason] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerH, setHeaderH] = useState(0);

  const tabKey = `tournament:${tournament.id}:tab:${tab}`;
  useEffect(() => {
    if (tab === 'matches') return;
    scrollRegistry.restore(tabKey);
  }, [tabKey]);

  useEffect(() => {
    tabStateRegistry.set(tournament.id, { tab, subTab: matchesSubTab });
  }, [tournament.id, tab, matchesSubTab]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Close search/filter when switching tabs.
  useEffect(() => {
    setShowSearch(false);
    setShowFilters(false);
  }, [tab]);

  const isGroupStage = tournament.settings.format === 'group-stage';
  const isCompleted = tournament.status === 'completed';
  const isActive = tournament.status === 'active';
  const isDraft = tournament.status === 'draft';

  function runProgressive(
    matches: Match[],
    flagId: string,
    applySync: (results: MatchResult[]) => Tournament | null,
  ) {
    startSimulation(matches, flagId, applySync, (updated) => {
      if (updated) setTournament(updated);
    });
  }

  function handleStart() {
    onStart(tournament.id);
    const updated = { ...tournament, status: 'active' as const, startedAt: new Date().toISOString(), currentRound: 1 };
    setTournament(updated);
  }

  function handleSimAll() {
    runProgressive(tournament.matches, 'all', (results) => onApplyMatchResults(tournament.id, results));
  }

  function handleSimGroup(groupId: string) {
    const groupMatches = tournament.matches.filter((m) => m.groupId === groupId);
    runProgressive(groupMatches, `group:${groupId}`, (results) => onApplyMatchResults(tournament.id, results));
  }

  function handleSimGroupStage() {
    runProgressive(tournament.matches, 'group-stage', (results) => onApplyMatchResults(tournament.id, results));
  }

  function handleSimKnockoutRound() {
    runProgressive(tournament.matches, 'ko-round', (results) => onApplyMatchResults(tournament.id, results));
  }

  function handleSimMatch(matchId: string) {
    const match = tournament.matches.find((m) => m.id === matchId);
    if (!match) return;
    runProgressive([match], matchId, (results) => onApplyMatchResults(tournament.id, results));
  }

  function handleBattleResult(matchId: string, winnerId: string) {
    const updated = onApplyMatchResult(tournament.id, matchId, winnerId);
    if (updated) setTournament(updated);
  }

  function handleDelete() {
    onDelete(tournament.id);
    onNavigate({ name: 'home' });
  }

  const tabs: { id: Tab; label: string; icon: typeof Grid3x3 }[] = [
    { id: 'overview', label: 'Overview', icon: Grid3x3 },
    { id: 'matches', label: 'Matches', icon: Swords },
    { id: 'standings', label: 'Standings', icon: BarChart2 },
  ];

  return (
    <div className="flex flex-col gap-5 pb-nav">
      {/* Header */}
      <div ref={headerRef} className="sticky top-0 z-30 -mx-4 px-4 pb-2 bg-app-solid-2 border-b border-app-border" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)' }}>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate({ name: 'home' })}
            aria-label="Back to home"
            className="w-9 h-9 rounded-xl bg-app-solid-2 border border-app-border flex items-center justify-center text-ink-muted hover:text-ink hover:bg-app-solid-3 hover:border-app-border-strong active:scale-95 transition-all duration-200 ease-out shrink-0"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-ink truncate leading-tight tracking-tight">{tournament.name}</h1>
            <p className="text-xs text-ink-faint mt-0.5 font-medium">
              {isCompleted ? 'Completed' : getTournamentStageLabel(tournament)}
            </p>
          </div>
          <TournamentOverflowMenu
            tournament={tournament}
            simulating={isSimulating}
            simulatingMatchId={null}
            onSimulateAll={handleSimAll}
            onSimulateGroupStage={handleSimGroupStage}
            onSimulateKnockoutRound={handleSimKnockoutRound}
            onRename={() => { setRenameValue(tournament.name); setRenaming(true); }}
            onNewSeason={() => setConfirmNewSeason(true)}
            onToggleSearch={() => { setShowFilters(false); setShowSearch((v) => !v); }}
            onToggleFilters={() => { setShowSearch(false); setShowFilters((v) => !v); }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      {!isCompleted && isDraft && (
        <Button fullWidth icon={<Play size={16} />} onClick={handleStart}>
          Start Tournament
        </Button>
      )}

      {/* Tab Content */}
      {tab === 'overview' && (
        <OverviewTab
          tournament={tournament}
          onMatchClick={setSelectedMatch}
          onTeamClick={onTeamClick}
        />
      )}
      {tab === 'matches' && (
        <MatchesPage
          tournament={tournament}
          onMatchClick={setSelectedMatch}
          onTeamClick={onTeamClick}
          stickyOffset={headerH}
          tab={matchesSubTab}
          onTabChange={setMatchesSubTab}
          tournamentId={tournament.id}
          showSearch={showSearch}
          showFilters={showFilters}
        />
      )}
      {tab === 'standings' && (
        <StandingsPage tournament={tournament} onTeamClick={onTeamClick} />
      )}

      {/* Danger zone */}
      <div className="mt-2 pb-2">
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-xs text-danger-400/60 hover:text-danger-400 transition-colors duration-200 ease-out"
        >
          Delete tournament
        </button>
      </div>

      {/* Tournament tabs — bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-xl bg-app-solid-2 border-t border-app-border px-2.5 pt-2 shadow-nav-premium" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)' }}>
          <div className="flex items-center justify-around">
            {tabs.map((t) => {
              const Icon = t.icon;
              const tabActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.id !== tab) {
                      if (tab === 'matches') {
                        scrollRegistry.save(`tournament:${tournament.id}:matches:${matchesSubTab}`);
                      } else {
                        scrollRegistry.save(tabKey);
                      }
                      setTab(t.id);
                    }
                  }}
                  aria-label={t.label}
                  aria-current={tabActive ? 'page' : undefined}
                  className={[
                    'group relative flex flex-col items-center justify-center gap-1.5 rounded-xl transition-all duration-300 ease-out',
                    tabActive ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
                  ].join(' ')}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <span
                    className={[
                      'relative flex items-center justify-center rounded-xl transition-all duration-300 ease-out',
                      tabActive ? 'accent-gradient shadow-lg shadow-gold-500/30' : 'group-hover:bg-app-solid-3',
                    ].join(' ')}
                    style={{ width: 38, height: 38 }}
                  >
                    {tabActive && (
                      <span className="absolute inset-0 rounded-xl accent-gradient opacity-30 blur-md" aria-hidden />
                    )}
                    <Icon
                      size={20}
                      strokeWidth={tabActive ? 2.4 : 1.85}
                      className={['relative transition-colors duration-300', tabActive ? 'text-gold-50' : ''].join(' ')}
                    />
                  </span>
                  <span
                    className={[
                      'text-[10px] font-bold tracking-[0.01em] leading-none transition-all duration-300',
                      tabActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-70',
                    ].join(' ')}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Match battle modal */}
      <MatchBattleModal
        open={!!selectedMatch}
        match={selectedMatch}
        tournament={tournament}
        onClose={() => setSelectedMatch(null)}
        onSimulate={handleBattleResult}
        onStartSimulation={handleSimMatch}
      />

      {/* Delete confirm */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Tournament">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Are you sure you want to delete <strong className="text-ink">{tournament.name}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={handleDelete} className="flex-1">Delete</Button>
          </div>
        </div>
      </Modal>

      {/* New Season confirm */}
      <Modal open={confirmNewSeason} onClose={() => setConfirmNewSeason(false)} title="New Season">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Start a new season? You'll be taken to the tournament setup form with all settings pre-filled from this season. You can edit the name and adjust any settings before creating the new season.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmNewSeason(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" icon={<RotateCcw size={16} />} onClick={() => { setConfirmNewSeason(false); onNewSeason(tournament.id); }} className="flex-1">Set Up New Season</Button>
          </div>
        </div>
      </Modal>

      {/* Rename tournament */}
      <Modal open={renaming} onClose={() => setRenaming(false)} title="Rename Tournament">
        <div className="flex flex-col gap-4">
          <Input
            label="Tournament Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renameValue.trim()) {
                onRename(tournament.id, renameValue.trim());
                setTournament((prev) => ({ ...prev, name: renameValue.trim() }));
                setRenaming(false);
              }
            }}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setRenaming(false)} className="flex-1">Cancel</Button>
            <Button
              variant="primary"
              icon={<Check size={16} />}
              disabled={!renameValue.trim() || renameValue.trim() === tournament.name}
              onClick={() => {
                const newName = renameValue.trim();
                onRename(tournament.id, newName);
                setTournament((prev) => ({ ...prev, name: newName }));
                setRenaming(false);
              }}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  tournament,
  onMatchClick,
  onTeamClick,
}: {
  tournament: Tournament;
  onMatchClick: (m: Match) => void;
  onTeamClick: (teamId: string) => void;
}) {
  const recentMatches = [...tournament.matches]
    .filter((m) => m.status === 'completed')
    .reverse()
    .slice(0, 5);

  const upcomingMatches = tournament.matches
    .filter((m) => m.status === 'pending' && m.teamA && m.teamB && !m.isBye)
    .slice(0, 5);

  const stageLabel = getTournamentStageLabel(tournament);
  const progress = computeProgressStats(tournament);
  const isCompleted = tournament.status === 'completed';
  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  // Derive fourth place from match data without recalculating standings.
  // The semifinal loser that did NOT advance to the third-place match is fourth.
  const fourthPlace = useMemo(() => {
    if (!isCompleted || !tournament.thirdPlace) return null;
    const semifinals = tournament.matches.filter(
      (m) => m.status === 'completed' && !m.isBye && !m.isThirdPlace &&
        (m.phase === 'knockout' || (!m.phase && tournament.settings.format !== 'round-robin')),
    );
    // Find the round before the final (semifinals)
    const finalMatch = semifinals.find((m) => m.round === tournament.totalRounds);
    if (!finalMatch) return null;
    const semiRound = finalMatch.round - 1;
    const semis = semifinals.filter((m) => m.round === semiRound);
    const semiLosers = semis.map((m) => m.loser).filter((t): t is Team => t !== null);
    // The third-place winner is known; the other semi loser is fourth
    const thirdWinner = tournament.thirdPlace;
    const fourth = semiLosers.find((t) => t.id !== thirdWinner?.id);
    return fourth ?? null;
  }, [isCompleted, tournament]);

  return (
    <div className="flex flex-col gap-5">
      {/* Tournament Status */}
      <div className="glass card-shadow rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={16} className="text-gold-400" />
          <h3 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em]">Tournament Status</h3>
        </div>

        {tournament.settings.qualifying?.enabled && tournament.settings.format === 'group-stage' && (
          <TournamentStagesFlow tournament={tournament} />
        )}

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-xl bg-app-solid-2 border border-app-border p-3">
            <p className="text-[11px] text-ink-faint mb-1">Current Stage</p>
            <p className="text-sm font-bold text-ink">{stageLabel}</p>
          </div>
          <div className="rounded-xl bg-app-solid-2 border border-app-border p-3">
            <p className="text-[11px] text-ink-faint mb-1">Teams Remaining</p>
            <p className="text-sm font-bold text-ink flex items-center gap-1.5">
              <Users size={14} className="text-gold-400" />
              {progress.teamsRemaining}
              <span className="text-ink-faint font-normal text-xs">of {tournament.teams.length}</span>
            </p>
          </div>
          <div className="rounded-xl bg-app-solid-2 border border-app-border p-3">
            <p className="text-[11px] text-ink-faint mb-1">Matches Completed</p>
            <p className="text-sm font-bold text-ink">
              {progress.completed} <span className="text-ink-faint font-normal">of {progress.total}</span>
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-app-solid-3 overflow-hidden">
              <div
                className="h-full rounded-full accent-gradient transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl bg-app-solid-2 border border-app-border p-3">
            <p className="text-[11px] text-ink-faint mb-1">Matches Remaining</p>
            <p className="text-sm font-bold text-ink flex items-center gap-1.5">
              <Calendar size={14} className="text-gold-400" />
              {progress.matchesRemaining}
            </p>
          </div>
        </div>
      </div>

      {/* Tournament Results — Champion, Runner-up, Third, Fourth */}
      {isCompleted && (tournament.winner || tournament.runnerUp || tournament.thirdPlace) && (
        <div className="glass card-shadow rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-gold-400" />
            <h3 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em]">Tournament Results</h3>
          </div>

          <div className="flex flex-col gap-2.5">
            {tournament.winner && (
              <ResultRow rank={1} team={tournament.winner} onTeamClick={onTeamClick} />
            )}
            {tournament.runnerUp && (
              <ResultRow rank={2} team={tournament.runnerUp} onTeamClick={onTeamClick} />
            )}
            {tournament.thirdPlace && (
              <ResultRow rank={3} team={tournament.thirdPlace} onTeamClick={onTeamClick} />
            )}
            {fourthPlace && (
              <ResultRow rank={4} team={fourthPlace} onTeamClick={onTeamClick} />
            )}
          </div>
        </div>
      )}

      {/* Team roster */}
      <div>
        <p className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em] mb-2">Competing Teams</p>
        <TeamList>
          {sortTeams(tournament.teams).map((t, i) => (
            <TeamListRow
              key={t.id}
              team={t}
              rank={i + 1}
              onClick={() => onTeamClick(t.id)}
            />
          ))}
        </TeamList>
      </div>

      {/* Upcoming */}
      {upcomingMatches.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em] mb-2">Up Next</p>
          <div className="flex flex-col gap-3">
            {upcomingMatches.map((m, i) => {
              return (
              <MatchCard
                key={m.id}
                match={m}
                tournament={tournament}
                onClick={() => onMatchClick(m)}
                compact
                onTeamClick={onTeamClick}
              />
              );
            })}
          </div>
        </div>
      )}

      {/* Recent results */}
      {recentMatches.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em] mb-2">Recent Results</p>
          <div className="flex flex-col gap-3">
            {recentMatches.map((m, i) => {
              return (
              <MatchCard
                key={m.id}
                match={m}
                tournament={tournament}
                onClick={() => onMatchClick(m)}
                compact
                onTeamClick={onTeamClick}
              />
              );
            })}
          </div>
        </div>
      )}

      {recentMatches.length === 0 && upcomingMatches.length === 0 && tournament.status === 'draft' && (
        <EmptyState
          variant="medium"
          icon={<Clock size={32} className="mx-auto mb-3 text-ink-faint" />}
          description="Start the tournament to begin simulations."
        />
      )}
    </div>
  );
}

// ─── Overview helper components ──────────────────────────────────────────────

const RESULT_MEDALS: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '🥇', label: 'Champion', color: 'text-gold-400' },
  2: { emoji: '🥈', label: 'Runner-up', color: 'text-slate-300' },
  3: { emoji: '🥉', label: 'Third Place', color: 'text-third-400' },
  4: { emoji: '4️⃣', label: 'Fourth Place', color: 'text-ink-faint' },
};

function ResultRow({ rank, team, onTeamClick }: { rank: number; team: Tournament['teams'][number]; onTeamClick?: (teamId: string) => void; }) {
  const medal = RESULT_MEDALS[rank];
  return (
    <div className="flex items-center gap-3 rounded-xl bg-app-solid-2 border border-app-border p-3">
      <span className="text-2xl">{medal.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${medal.color}`}>{medal.label}</p>
        <div className="flex items-center gap-1.5">
          <span
            className="text-sm font-bold text-ink truncate"
            onClick={onTeamClick ? () => onTeamClick(team.id) : undefined}
            role={onTeamClick ? 'button' : undefined}
            style={onTeamClick ? { cursor: 'pointer' } : undefined}
          >
            {team.name}
          </span>
        </div>
      </div>
    </div>
  );
}

function TournamentStagesFlow({ tournament }: { tournament: Tournament }) {
  const stages: { id: string; label: string; icon: ReactNode }[] = [
    { id: 'qualifying', label: 'Qualifying', icon: <Flame size={14} /> },
    { id: 'group', label: 'Group Stage', icon: <Grid3x3 size={14} /> },
    { id: 'knockout', label: 'Knockout', icon: <Trophy size={14} /> },
  ];

  const currentPhase = tournament.phase ?? 'group';
  const phaseOrder: Record<string, number> = { qualifying: 0, group: 1, knockout: 2, finished: 3 };
  const currentIdx = phaseOrder[currentPhase] ?? 1;

  return (
    <div className="flex items-center gap-1.5 mb-3">
      {stages.map((stage, i) => {
        const isActive = i === currentIdx;
        const isPast = i < currentIdx;
        const isComplete = isPast || (tournament.status === 'completed');
        return (
          <div key={stage.id} className="flex items-center gap-1.5 flex-1">
            <div
              className={[
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex-1',
                isActive
                  ? 'bg-gold-500/20 text-gold-300 border border-gold-400/40'
                  : isComplete
                    ? 'bg-success-500/10 text-success-400/80 border border-success-500/25'
                    : 'bg-app-solid-2 text-ink-faint border border-app-border',
              ].join(' ')}
            >
              {stage.icon}
              <span>{stage.label}</span>
            </div>
            {i < stages.length - 1 && (
              <div className={[
                'w-3 h-px shrink-0',
                isPast ? 'bg-success-500/30' : 'bg-app-solid-3',
              ].join(' ')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
