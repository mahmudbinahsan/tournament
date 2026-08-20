import type { Tournament, Match } from '../../core/models/types';
import { MatchCard } from './MatchCard';
import { getRoundLabel, getKnockoutRoundLabel } from '../../core/engine/bracketEngine';
import { StageHeader } from '../ui/StageHeader';

interface BracketViewProps {
  tournament: Tournament;
  onMatchClick?: (match: Match) => void;
  onTeamClick?: (teamId: string) => void;
}

export function BracketView({ tournament, onMatchClick, onTeamClick }: BracketViewProps) {
  const { matches, settings, totalRounds } = tournament;

  if (settings.format === 'round-robin') {
    return (
      <RoundRobinBracket
        tournament={tournament}
        onMatchClick={onMatchClick}
        onTeamClick={onTeamClick}
      />
    );
  }

  const isGroupStage = settings.format === 'group-stage';

  const bracketMatches = matches.filter(m =>
    isGroupStage
      ? m.phase === 'knockout' && !m.isThirdPlace
      : !m.isThirdPlace,
  );
  const thirdPlaceMatch = matches.find(m => m.isThirdPlace);

  const rounds = Array.from(new Set(bracketMatches.map((m) => m.round))).sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
      <div className="flex gap-4 min-w-max">
        {rounds.map((round) => {
          const roundMatches = bracketMatches
            .filter((m) => m.round === round)
            .sort((a, b) => a.position - b.position);
          const label = isGroupStage
            ? getKnockoutRoundLabel(roundMatches.length)
            : getRoundLabel(round, totalRounds, settings.format);

          return (
            <div key={round} className="flex flex-col gap-3 w-60">
              <StageHeader label={label} align="center" className="py-1.5" />
              <div className="flex flex-col gap-5">
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

        {thirdPlaceMatch && (
          <div className="flex flex-col gap-3 w-60">
            <StageHeader label="Third Place Match" accent="gold" align="center" className="py-1.5" />
            <div className="flex flex-col gap-5">
              <MatchCard
                match={thirdPlaceMatch}
                tournament={tournament}
                onClick={onMatchClick ? () => onMatchClick(thirdPlaceMatch) : undefined}
                compact
                onTeamClick={onTeamClick}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoundRobinBracket({ tournament, onMatchClick, onTeamClick }: BracketViewProps) {
  const { matches, totalRounds, settings } = tournament;
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-5">
      {rounds.map((round) => {
        const roundMatches = matches
          .filter((m) => m.round === round)
          .sort((a, b) => a.position - b.position);
        const label = getRoundLabel(round, totalRounds, settings.format);

        return (
          <div key={round}>
            <StageHeader label={label} className="mb-3 px-1" />
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
  );
}
