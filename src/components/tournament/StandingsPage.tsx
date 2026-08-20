import { Trophy, Crown, Medal } from 'lucide-react';
import type { Tournament, Team } from '../../core/models/types';
import { StandingsTable } from '../ui/StandingsTable';

import { getKnockoutQualifiers } from '../../core/display/matchDisplay';

interface StandingsPageProps {
  tournament: Tournament;
  onTeamClick?: (teamId: string) => void;
}

export function StandingsPage({ tournament, onTeamClick }: StandingsPageProps) {
  const { settings } = tournament;

  if (settings.format === 'group-stage') {
    const groups = tournament.groups ?? [];
    const qualifierStages = getKnockoutQualifiers(tournament);
    return (
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.id} className="glass card-shadow rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-app-border bg-app-solid">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em]">{group.name}</h3>
                <span className="text-xs text-ink-faint">{group.teams.length} teams</span>
              </div>
            </div>
            <StandingsTable
              standings={group.standings}
              qualifyPerGroup={settings.qualifyPerGroup ?? 2}
              onTeamClick={onTeamClick}
            />
          </div>
        ))}

        {qualifierStages.length > 0 && (
          <div className="flex flex-col gap-3 pt-1">
            <h3 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em] px-1">
              Knockout Progress
            </h3>
            {qualifierStages.map((stage) => (
              <QualifierTable
                key={stage.key}
                label={stage.label}
                teams={stage.teams}
                onTeamClick={onTeamClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (settings.format === 'round-robin') {
    return (
      <div className="glass card-shadow rounded-2xl overflow-hidden">
        <StandingsTable standings={tournament.standings} onTeamClick={onTeamClick} />
      </div>
    );
  }

  // Single elimination — show overall results ladder plus per-stage qualifiers.
  const completedMatches = tournament.matches
    .filter((m) => m.status === 'completed' && !m.isBye)
    .sort((a, b) => b.round - a.round || a.position - b.position);

  const qualifierStages = getKnockoutQualifiers(tournament);

  if (completedMatches.length === 0 && qualifierStages.length === 0) {
    return (
      <div className="glass card-shadow rounded-2xl px-4 py-8 text-center">
        <p className="text-sm text-ink-faint">Standings will appear after matches are played.</p>
      </div>
    );
  }

  const resultsByTeam = new Map<string, { wins: number; losses: number; difference: number; team: Team }>();
  for (const team of tournament.teams) {
    resultsByTeam.set(team.id, { wins: 0, losses: 0, difference: 0, team });
  }
  for (const m of completedMatches) {
    if (m.winner) resultsByTeam.get(m.winner.id)!.wins++;
    if (m.loser) resultsByTeam.get(m.loser.id)!.losses++;
    if (m.teamA && m.teamB) {
      const scoreA = m.scoreA ?? 0;
      const scoreB = m.scoreB ?? 0;
      const a = resultsByTeam.get(m.teamA.id);
      const b = resultsByTeam.get(m.teamB.id);
      if (a) a.difference += scoreA - scoreB;
      if (b) b.difference += scoreB - scoreA;
    }
  }

  const sorted = [...resultsByTeam.values()].sort((a, b) => b.wins - a.wins || b.difference - a.difference || a.losses - b.losses);

  return (
    <div className="flex flex-col gap-5">
      <div className="glass card-shadow rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border bg-app-solid">
          <h3 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em]">Overall Standings</h3>
        </div>
        <div>
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-app-border bg-app-solid">
            <span className="w-6 text-[11px] text-ink-faint font-bold">#</span>
            <span className="flex-1 text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em]">Team</span>
            <span className="w-8 text-[11px] text-ink-faint font-bold text-center">W</span>
            <span className="w-8 text-[11px] text-ink-faint font-bold text-center">L</span>
            <span className="w-8 text-[11px] text-ink-faint font-bold text-center">Diff</span>
          </div>
          {sorted.map((s, idx) => (
            <div
              key={s.team.id}
              className={[
                'flex items-center gap-1.5 px-3 py-3 border-b border-app-border last:border-0 transition-colors duration-150 ease-out',
                idx === 0 ? 'bg-gold-500/[0.08]' : idx % 2 === 1 ? 'bg-app-zebra-card' : '',
              ].join(' ')}
            >
              <span className="w-6 text-sm font-bold tabular-nums text-ink-muted">{idx + 1}</span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span
                  className="text-sm font-semibold text-ink truncate"
                  onClick={onTeamClick ? (e) => { e.stopPropagation(); onTeamClick(s.team.id); } : undefined}
                  role={onTeamClick ? 'button' : undefined}
                  style={onTeamClick ? { cursor: 'pointer' } : undefined}
                >
                  {s.team.name}
                </span>
                {idx === 0 && <Trophy size={14} className="text-gold-400 shrink-0" />}
              </div>
              <span className="w-8 text-sm text-ink-muted text-center tabular-nums">{s.wins}</span>
              <span className="w-8 text-sm text-ink-muted text-center tabular-nums">{s.losses}</span>
              <span className="w-8 text-sm text-ink-muted text-center tabular-nums">{s.difference > 0 ? '+' : ''}{s.difference}</span>
            </div>
          ))}
        </div>
      </div>

      {qualifierStages.length > 0 && (
        <div className="flex flex-col gap-3 pt-1">
          <h3 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em] px-1">
            Knockout Progress
          </h3>
          {qualifierStages.map((stage) => (
            <QualifierTable
              key={stage.key}
              label={stage.label}
              teams={stage.teams}
              onTeamClick={onTeamClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Qualifier Table ──────────────────────────────────────────────────────────

function QualifierTable({
  label,
  teams,
  onTeamClick,
}: {
  label: string;
  teams: Team[];
  onTeamClick?: (teamId: string) => void;
}) {
  const isFinalists = label === 'Finalists';

  return (
    <div className="glass card-shadow rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-app-border bg-app-solid flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em]">{label}</h4>
        <span className="text-xs text-ink-faint">{teams.length}</span>
      </div>
      <div>
        {teams.map((team, idx) => {
          const icon = isFinalists && idx === 0 ? (
            <Crown size={13} className="text-gold-400 shrink-0" />
          ) : isFinalists && idx === 1 ? (
            <Medal size={13} className="text-ink-faint shrink-0" />
          ) : isFinalists && idx === 2 ? (
            <Medal size={13} className="text-warning-400/70 shrink-0" />
          ) : null;
          return (
            <div
              key={team.id}
              className={[
                'flex items-center gap-2 px-3 py-2.5 border-b border-app-border last:border-0 transition-colors duration-150 ease-out',
                isFinalists && idx === 0 ? 'bg-gold-500/[0.08]' : idx % 2 === 1 ? 'bg-app-zebra-card' : '',
              ].join(' ')}
            >
              <span className="w-5 text-xs font-bold tabular-nums text-ink-faint">{idx + 1}</span>
              <span
                className="text-sm font-semibold text-ink truncate flex-1 min-w-0"
                onClick={onTeamClick ? (e) => { e.stopPropagation(); onTeamClick(team.id); } : undefined}
                role={onTeamClick ? 'button' : undefined}
                style={onTeamClick ? { cursor: 'pointer' } : undefined}
              >
                {team.name}
              </span>
              {icon}
            </div>
          );
        })}
      </div>
    </div>
  );
}
