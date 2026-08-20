import { Swords, Dot, Radio } from 'lucide-react';
import type { Match, Tournament } from '../../core/models/types';
import { Flag } from '../ui/Flag';
import { getMatchStageLine, getMatchStatusLabel } from '../../core/display/matchDisplay';
import { useSimulation } from '../../hooks/useSimulationContext';

interface MatchCardProps {
  match: Match;
  tournament?: Tournament;
  onClick?: () => void;
  compact?: boolean;
  onTeamClick?: (teamId: string) => void;
}

export function MatchCard({
  match,
  tournament,
  onClick,
  onTeamClick,
}: MatchCardProps) {
  const { isMatchSimulating, getLiveScore } = useSimulation();

  const isSimulating = isMatchSimulating(match.id);
  const liveScore = getLiveScore(match.id);

  if (match.isBye) {
    const byeTeam = match.teamA ?? match.teamB;
    return (
      <div className="flex items-center gap-3 px-4 py-4 opacity-45 glass card-shadow rounded-2xl">
        <span
          className="w-[3px] self-stretch rounded-full"
          style={{ background: byeTeam?.color ?? 'var(--app-border)' }}
        />
        <Flag emoji={byeTeam?.emoji ?? '—'} size="xlarge" />
        <span className="text-sm text-ink font-semibold truncate flex-1">
          {byeTeam?.name ?? '—'}
        </span>
        <span className="text-[10px] text-ink-muted font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-full bg-app-solid-2 border border-app-border">
          Bye
        </span>
      </div>
    );
  }

  const showWinner = match.status === 'completed' && match.winner;
  const isAWinner = showWinner && match.winner!.id === match.teamA?.id;
  const isBWinner = showWinner && match.winner!.id === match.teamB?.id;
  const bothKnown = !!(match.teamA && match.teamB);
  const stageLabel = tournament ? getMatchStageLine(match, tournament) : null;
  const statusLabel = isSimulating ? 'Live' : getMatchStatusLabel(match);
  const isCompleted = match.status === 'completed';
  const isUpcoming = match.status === 'pending' && bothKnown;

  // Final score from match data (the actual Best-of-7 result, e.g. 4–2).
  const finalScoreA = match.scoreA ?? 0;
  const finalScoreB = match.scoreB ?? 0;
  // Live score during simulation.
  const displayScoreA = isSimulating ? (liveScore?.a ?? 0) : finalScoreA;
  const displayScoreB = isSimulating ? (liveScore?.b ?? 0) : finalScoreB;

  const handleTeamClick = (e: React.MouseEvent, teamId: string | undefined) => {
    if (!onTeamClick || !teamId) return;
    e.stopPropagation();
    onTeamClick(teamId);
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={[
        'flex flex-col gap-2 px-4 py-3.5 glass card-shadow rounded-2xl transition-colors duration-150 ease-out',
        onClick ? 'cursor-pointer hover:bg-app-surface-2 active:bg-app-surface-3' : '',
        isSimulating ? 'ring-1 ring-accent-400/30' : '',
      ].join(' ')}
    >
      {/* Meta strip — stage on the left, status on the right */}
      <div className="flex items-center justify-between min-w-0">
        {stageLabel ? (
          <span className="text-[10px] text-ink font-bold uppercase tracking-[0.14em] truncate">
            {stageLabel}
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-0.5 shrink-0">
          {isSimulating ? (
            <Radio size={11} className="text-accent-400 animate-pulse" />
          ) : (
            <Dot
              size={12}
              className={
                isCompleted
                  ? 'text-success-400'
                  : isUpcoming
                    ? 'text-accent-400'
                    : 'text-ink-faint/50'
              }
            />
          )}
          <span
            className={[
              'text-[10px] font-semibold uppercase tracking-[0.1em]',
              isSimulating ? 'text-accent-400' : 'text-ink',
            ].join(' ')}
          >
            {statusLabel}
          </span>
        </span>
      </div>

      {/* Matchup — vertical stack with score on the right */}
      <div className="flex items-stretch gap-3">
        <div className="flex-1 flex flex-col">
          <TeamRow
            team={match.teamA}
            isWinner={isAWinner}
            isLoser={showWinner && !isAWinner}
            score={displayScoreA}
            simulating={isSimulating}
            showScore={isSimulating || showWinner || isCompleted}
            onClick={onTeamClick ? (e) => handleTeamClick(e, match.teamA?.id) : undefined}
          />
          <div className="h-px bg-app-border/50 my-0.5" />
          <TeamRow
            team={match.teamB}
            isWinner={isBWinner}
            isLoser={showWinner && !isBWinner}
            score={displayScoreB}
            simulating={isSimulating}
            showScore={isSimulating || showWinner || isCompleted}
            onClick={onTeamClick ? (e) => handleTeamClick(e, match.teamB?.id) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Team row ────────────────────────────────────────────────────────────────

interface TeamRowProps {
  team: Match['teamA'];
  isWinner: boolean;
  isLoser: boolean;
  score: number;
  simulating: boolean;
  showScore: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function TeamRow({ team, isWinner, isLoser, score, simulating, showScore, onClick }: TeamRowProps) {
  const color = team?.color;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={[
        'relative flex items-center gap-2.5 min-w-0 py-2 px-2.5 rounded-xl transition-all duration-200 ease-out',
        onClick ? 'hover:bg-app-surface-3/60' : '',
      ].join(' ')}
    >
      {/* Team color accent bar */}
      <span
        className="w-[3px] self-stretch rounded-full shrink-0"
        style={{ background: color ?? 'var(--app-border)' }}
      />

      <Flag
        emoji={team?.emoji ?? '—'}
        size="large"
        className={isLoser ? 'opacity-70' : ''}
      />

      <span
        className={[
          'min-w-0 truncate flex-1 text-left text-[13px] tracking-tight',
          isWinner
            ? 'font-bold text-ink'
            : isLoser
              ? 'font-semibold text-ink-muted opacity-90'
              : 'font-semibold text-ink',
        ].join(' ')}
      >
        {team?.name ?? 'TBD'}
      </span>

      {/* Score */}
      <span
        className={[
          'shrink-0 tabular-nums leading-none transition-all duration-200 ease-out',
          isWinner
            ? 'text-2xl font-black text-ink'
            : isLoser
              ? 'text-xl font-bold text-ink-muted opacity-90'
              : simulating
                ? 'text-2xl font-black text-ink'
                : showScore
                  ? 'text-2xl font-black text-ink-muted/60'
                  : 'text-2xl font-black text-ink-muted/50',
        ].join(' ')}
      >
        {showScore ? score : '–'}
      </span>
    </button>
  );
}
