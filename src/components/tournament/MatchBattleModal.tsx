import { useMemo } from 'react';
import { Swords, X, Trophy, Medal, TrendingUp, Zap, Crown, Radio, Activity } from 'lucide-react';
import type { Match, Tournament, Team } from '../../core/models/types';
import { teamStrength, strengthLabel, isUnproven, winRate } from '../../core/models/types';
import { getMatchStageLine, getMatchNumber } from '../../core/display/matchDisplay';
import { loadTeams } from '../../core/storage/storage';
import { sortTeams } from '../../core/display/teamSort';
import { useDataVersion } from '../../hooks/useDataVersion';
import { useSimulation } from '../../hooks/useSimulationContext';
import { Flag } from '../ui/Flag';
import { Button } from '../ui/Button';

interface MatchBattleModalProps {
  open: boolean;
  match: Match | null;
  tournament: Tournament;
  onClose: () => void;
  /** Persist a match result (winnerId) into the tournament engine. */
  onSimulate: (matchId: string, winnerId: string) => void;
  /** Start the shared background simulation for this match. */
  onStartSimulation: (matchId: string) => void;
}

export function MatchBattleModal({
  open,
  match,
  tournament,
  onClose,
  onSimulate,
  onStartSimulation,
}: MatchBattleModalProps) {
  const { isMatchSimulating, getMatchState } = useSimulation();
  const dataVersion = useDataVersion();

  const liveTeams = useMemo(() => loadTeams(), [dataVersion]);
  const liveTeamMap = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of liveTeams) m.set(t.id, t);
    return m;
  }, [liveTeams]);

  const rankingMap = useMemo(() => {
    const sorted = sortTeams(liveTeams, 'strongest');
    const m = new Map<string, number>();
    sorted.forEach((t, i) => m.set(t.id, i + 1));
    return m;
  }, [liveTeams]);

  const resolveLive = (t: Team | null): Team | null => {
    if (!t) return null;
    return liveTeamMap.get(t.id) ?? t;
  };

  const teamA = resolveLive(match?.teamA ?? null);
  const teamB = resolveLive(match?.teamB ?? null);

  // Determine the match display state from the shared simulation context.
  const simState = match ? getMatchState(match.id) : null;
  const isSimulating = match ? isMatchSimulating(match.id) : false;
  const isCompleted = match?.status === 'completed';

  // The match phase: 'ready' | 'live' | 'completed'
  const phase: 'ready' | 'live' | 'completed' = isCompleted
    ? 'completed'
    : isSimulating
      ? 'live'
      : 'ready';

  // Live scores from shared context, or final scores from match data.
  const scoreA = isSimulating && simState ? simState.scoreA : (match?.scoreA ?? 0);
  const scoreB = isSimulating && simState ? simState.scoreB : (match?.scoreB ?? 0);

  // Progress within live simulation (0–100%).
  const liveProgress = isSimulating && simState && simState.steps.length > 0
    ? Math.round(((simState.stepIndex + 1) / simState.steps.length) * 100)
    : 0;

  if (!open || !match) return null;

  const stageLine = getMatchStageLine(match, tournament);
  const matchNo = getMatchNumber(match, tournament);
  const winner = match.winner;
  const winnerIsA = winner && teamA && winner.id === teamA.id;
  const winnerIsB = winner && teamB && winner.id === teamB.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md animate-fade-in-soft" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-app-card border border-app-border rounded-3xl overflow-hidden animate-slide-up shadow-2xl shadow-black/50">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-app-solid-2/80 backdrop-blur border border-app-border text-ink-muted hover:text-ink hover:bg-app-solid-3 transition-colors duration-200 ease-out active:scale-95"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Header — match context */}
        <div className="px-5 pt-6 pb-2 text-center">
          <p className="text-[10px] text-ink-faint font-bold uppercase tracking-[0.22em]">
            {tournament.name}
          </p>
          <p className="text-[13px] text-ink-muted font-semibold mt-1">
            {matchNo > 0 && <span className="text-accent-400">#{matchNo} · </span>}
            {stageLine}
          </p>
        </div>

        {/* Status badge */}
        <div className="flex justify-center px-5 pb-3">
          {phase === 'ready' && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-app-solid-3 border border-app-border">
              <Activity size={11} className="text-ink-faint" />
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-[0.18em]">Ready</span>
            </span>
          )}
          {phase === 'live' && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger-500/15 border border-danger-500/30">
              <Radio size={11} className="text-danger-400 animate-pulse" />
              <span className="text-[10px] font-black text-danger-300 uppercase tracking-[0.18em]">Live</span>
            </span>
          )}
          {phase === 'completed' && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-500/15 border border-success-500/30">
              <Trophy size={11} className="text-success-400" />
              <span className="text-[10px] font-black text-success-300 uppercase tracking-[0.18em]">Final</span>
            </span>
          )}
        </div>

        {/* Teams face-off with score */}
        {teamA && teamB && (
          <div className="px-5 pt-1 pb-4">
            <div className="flex items-stretch gap-3">
              {/* Team A */}
              <TeamPanel
                team={teamA}
                score={scoreA}
                isWinner={!!winnerIsA}
                isLoser={!!winnerIsB}
                phase={phase}
                ranking={rankingMap.get(teamA.id) ?? null}
              />

              {/* VS divider */}
              <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                <span className="text-[10px] text-ink-faint font-black uppercase tracking-[0.22em]">VS</span>
              </div>

              {/* Team B */}
              <TeamPanel
                team={teamB}
                score={scoreB}
                isWinner={!!winnerIsB}
                isLoser={!!winnerIsA}
                phase={phase}
                ranking={rankingMap.get(teamB.id) ?? null}
              />
            </div>
          </div>
        )}

        {/* Live progress bar */}
        {phase === 'live' && (
          <div className="px-5 pb-3">
            <div className="h-1 rounded-full bg-app-solid-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-400 transition-all duration-300 ease-out"
                style={{ width: `${liveProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Winner banner for completed matches */}
        {phase === 'completed' && winner && (
          <div className="px-5 pb-4 animate-fade-in-soft">
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-500/[0.08] border border-accent-400/20">
              <Crown size={16} className="text-accent-300" />
              <p className="text-[14px] font-bold">
                <span className="text-ink">{winner.name}</span>{' '}
                <span className="text-accent-300">wins</span>
              </p>
            </div>
          </div>
        )}

        {/* Action area */}
        <div className="px-5 py-5 border-t border-app-border">
          {phase === 'ready' && (
            <Button
              fullWidth
              icon={<Swords size={18} />}
              onClick={() => onStartSimulation(match.id)}
            >
              Simulate Match
            </Button>
          )}
          {phase === 'live' && (
            <Button fullWidth variant="secondary" disabled onClick={onClose}>
              Simulating…
            </Button>
          )}
          {phase === 'completed' && (
            <Button fullWidth variant="secondary" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Team panel ──────────────────────────────────────────────────────────────

function TeamPanel({
  team,
  score,
  isWinner,
  isLoser,
  phase,
  ranking,
}: {
  team: Team;
  score: number;
  isWinner: boolean;
  isLoser: boolean;
  phase: 'ready' | 'live' | 'completed';
  ranking: number | null;
}) {
  const unproven = isUnproven(team);
  const strength = teamStrength(team);
  const wr = winRate(team.career);
  const titles = team.career.championships;

  return (
    <div
      className={[
        'flex-1 flex flex-col items-center gap-2.5 rounded-2xl p-4 transition-all duration-300 ease-out',
        isWinner
          ? 'bg-accent-500/[0.06] border border-accent-400/25'
          : isLoser
            ? 'bg-app-surface-2 border border-app-border opacity-80'
            : 'bg-app-surface-2 border border-app-border',
      ].join(' ')}
    >
      {/* Flag + name */}
      <Flag emoji={team.emoji} size="hero" className={isLoser ? 'opacity-75' : ''} />
      <div className="text-center min-w-0 w-full">
        <p className={[
          'text-[14px] font-bold truncate leading-tight',
          isWinner ? 'text-accent-200' : isLoser ? 'text-ink-muted' : 'text-ink',
        ].join(' ')}>
          {team.name}
        </p>
      </div>

      {/* Score */}
      <div className={[
        'tabular-nums font-black leading-none transition-all duration-200',
        isWinner ? 'text-4xl text-accent-200' : isLoser ? 'text-3xl text-ink-muted' : 'text-4xl text-ink',
      ].join(' ')}>
        {phase === 'ready' ? <span className="text-ink-faint/30">–</span> : score}
      </div>

      {/* Stats grid */}
      <div className="w-full flex flex-col gap-1.5 mt-1">
        <StatRow
          icon={<Zap size={11} className="text-accent-400" />}
          label="Strength"
          value={unproven ? '???' : String(strength)}
        />
        <StatRow
          icon={<Medal size={11} className="text-accent-secondary-400" />}
          label="Ranking"
          value={ranking ? `#${ranking}` : '—'}
        />
        <StatRow
          icon={<TrendingUp size={11} className="text-success-400" />}
          label="Win Rate"
          value={team.career.totalBattles > 0 ? `${wr}%` : '—'}
        />
        <StatRow
          icon={<Trophy size={11} className="text-accent-300" />}
          label="Titles"
          value={titles > 0 ? String(titles) : '0'}
        />
      </div>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="flex items-center gap-1.5 text-ink-faint font-medium">
        {icon}
        {label}
      </span>
      <span className="font-bold text-ink-muted tabular-nums">{value}</span>
    </div>
  );
}
