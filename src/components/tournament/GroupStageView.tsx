import type { Tournament, Match, Group } from '../../core/models/types';
import { MatchCard } from './MatchCard';
import { StandingsTable } from '../ui/StandingsTable';
import { StageHeader } from '../ui/StageHeader';

interface GroupStageViewProps {
  tournament: Tournament;
  onMatchClick?: (match: Match) => void;
  onTeamClick?: (teamId: string) => void;
}

export function GroupStageView({ tournament, onMatchClick, onTeamClick }: GroupStageViewProps) {
  const groups = tournament.groups ?? [];
  const groupMatches = tournament.matches.filter(m => m.phase === 'group');
  const qualifyPerGroup = tournament.settings.qualifyPerGroup ?? 2;

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const matches = groupMatches
          .filter(m => m.groupId === group.id)
          .sort((a, b) => a.round - b.round || a.position - b.position);

        return (
          <GroupCard
            key={group.id}
            tournament={tournament}
            group={group}
            matches={matches}
            qualifyPerGroup={qualifyPerGroup}
            onMatchClick={onMatchClick}
            onTeamClick={onTeamClick}
          />
        );
      })}
    </div>
  );
}

function GroupCard({
  tournament, group, matches, qualifyPerGroup, onMatchClick, onTeamClick,
}: {
  tournament: Tournament;
  group: Group;
  matches: Match[];
  qualifyPerGroup: number;
  onMatchClick?: (match: Match) => void;
  onTeamClick?: (teamId: string) => void;
}) {
  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

  return (
    <div className="glass card-shadow rounded-2xl overflow-hidden">
      {/* Group header */}
      <div className="px-4 py-3 border-b border-app-border bg-app-surface">
        <div className="flex items-center justify-between">
          <StageHeader label={group.name} />
          <span className="text-xs text-ink-faint">{group.teams.length} teams</span>
        </div>
      </div>

      {/* Standings table */}
      <StandingsTable standings={group.standings} qualifyPerGroup={qualifyPerGroup} onTeamClick={onTeamClick} density="compact" />

      {/* Matches */}
      <div className="p-3 flex flex-col gap-3 border-t border-app-border">
        {rounds.map(round => {
          const roundMatches = matches.filter(m => m.round === round);
          return (
            <div key={round} className="flex flex-col gap-3">
              <StageHeader label={`Round ${round}`} accent="gold" className="px-1" />
              <div className="flex flex-col gap-4">
                {roundMatches.map((match, i) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    tournament={tournament}
                    onClick={onMatchClick ? () => onMatchClick(match) : undefined}
                    compact
                    onTeamClick={onTeamClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
