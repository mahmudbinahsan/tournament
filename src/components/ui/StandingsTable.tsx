import { Trophy } from 'lucide-react';
import type { RoundRobinStanding } from '../../core/models/types';


interface StandingsTableProps {
  standings: RoundRobinStanding[];
  qualifyPerGroup?: number;
  onTeamClick?: (teamId: string) => void;
  density?: 'regular' | 'compact';
}

export function StandingsTable({
  standings,
  qualifyPerGroup,
  onTeamClick,
  density = 'regular',
}: StandingsTableProps) {
  const compact = density === 'compact';

  if (standings.length === 0) {
    return (
      <div className={compact ? 'px-4 py-3 text-center text-xs text-ink-faint' : 'px-4 py-6 text-center text-sm text-ink-muted'}>
        Standings will appear after matches are played.
      </div>
    );
  }

  const col = compact
    ? { rank: 'w-5', p: 'w-5', w: 'w-5', l: 'w-5', diff: 'w-7', pts: 'w-7' }
    : { rank: 'w-6', p: 'w-8', w: 'w-8', l: 'w-8', diff: 'w-8', pts: 'w-8' };
  const rowPad = compact ? 'px-3 py-2.5' : 'px-3 py-3';
  const nameClass = compact ? 'text-xs font-semibold' : 'text-sm font-semibold';
  const avatarSize = compact ? 'small' : 'medium';
  const cellClass = compact ? 'text-xs' : 'text-sm';

  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-app-border bg-app-solid">
        <span className={`${col.rank} text-[11px] text-ink-faint font-bold tracking-tight`}>#</span>
        <span className="flex-1 text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em]">Team</span>
        <span className={`${col.p} text-[11px] text-ink-faint font-bold text-center`}>P</span>
        <span className={`${col.w} text-[11px] text-ink-faint font-bold text-center`}>W</span>
        <span className={`${col.l} text-[11px] text-ink-faint font-bold text-center`}>L</span>
        <span className={`${col.diff} text-[11px] text-ink-faint font-bold text-center`}>Diff</span>
        <span className={`${col.pts} text-[11px] text-ink-faint font-bold text-center`}>Pts</span>
      </div>
      {standings.map((s, idx) => {
        const qualifies = qualifyPerGroup != null && idx < qualifyPerGroup;
        const isFirst = !qualifyPerGroup && idx === 0;
        const zebra = idx % 2 === 1;
        return (
          <div
            key={s.team.id}
            className={[
              `flex items-center gap-1.5 ${rowPad} border-b border-app-border last:border-0 transition-colors duration-150 ease-out`, 
              qualifies ? 'bg-success-500/[0.06]' : zebra ? 'bg-app-zebra-card' : '',
              isFirst ? 'bg-gold-500/[0.08]' : '',
            ].join(' ')}
          >
            <span className={`${col.rank} ${cellClass} font-bold tabular-nums text-ink-faint`}>{idx + 1}</span>
            <div className={`flex-1 flex items-center ${compact ? 'gap-1.5' : 'gap-2'} min-w-0`}>
              <span
                className={`${nameClass} text-ink truncate`}
                onClick={onTeamClick ? (e) => { e.stopPropagation(); onTeamClick(s.team.id); } : undefined}
                role={onTeamClick ? 'button' : undefined}
                style={onTeamClick ? { cursor: 'pointer' } : undefined}
              >
                {s.team.name}
              </span>
              {qualifies && <Trophy size={12} className="text-success-400 shrink-0" />}
              {isFirst && <Trophy size={14} className="text-gold-400 shrink-0" />}
            </div>
            <span className={`${col.p} ${cellClass} text-ink-muted text-center tabular-nums`}>{s.played}</span>
            <span className={`${col.w} ${cellClass} text-ink-muted text-center tabular-nums`}>{s.wins}</span>
            <span className={`${col.l} ${cellClass} text-ink-muted text-center tabular-nums`}>{s.losses}</span>
            <span className={`${col.diff} ${cellClass} text-ink-muted text-center tabular-nums`}>{s.difference > 0 ? '+' : ''}{s.difference}</span>
            <span className={`${col.pts} ${cellClass} font-bold text-ink text-center tabular-nums`}>{s.points}</span>
          </div>
        );
      })}
    </div>
  );
}
