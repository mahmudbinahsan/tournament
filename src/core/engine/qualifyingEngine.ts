import type { Tournament, Match, Team } from '../models/types';
import { buildGroupStage, getGroupStageTotalRounds } from './bracketEngine';
import { simulateMatch } from './simulationEngine';

/**
 * Qualifying Stage — optional single-round pre-stage for group-stage tournaments.
 *
 * Each team entering Qualifying plays exactly ONE match.
 *   Winner  → qualifies for the Group Stage.
 *   Loser   → eliminated.
 *
 * No additional rounds (no quarter-final / semi-final / final / third-place).
 * After every Qualifying match finishes, the tournament auto-transitions to
 * the existing Group Stage.
 */

/** Build single-round qualifying matches: pair teams sequentially. */
export function buildQualifyingStage(tournamentId: string, teams: Team[]): Match[] {
  const matches: Match[] = [];
  for (let i = 0; i < teams.length; i += 2) {
    const teamA = teams[i];
    const teamB = teams[i + 1];

    if (!teamB) {
      // Odd team out gets a bye (auto-qualifies).
      matches.push({
        id: `${tournamentId}-q-${i}`,
        tournamentId,
        round: 1,
        position: i / 2,
        teamA,
        teamB: null,
        winner: teamA,
        loser: null,
        events: [],
        status: 'bye',
        isBye: true,
        phase: 'qualifying',
      });
    } else {
      matches.push({
        id: `${tournamentId}-q-${i}`,
        tournamentId,
        round: 1,
        position: i / 2,
        teamA,
        teamB,
        winner: null,
        loser: null,
        events: [],
        status: 'pending',
        isBye: false,
        phase: 'qualifying',
      });
    }
  }
  return matches;
}

/** Extract up to N winners from completed qualifying matches, in order. */
export function getQualifyingWinners(matches: Match[], n: number): Team[] {
  const qMatches = matches
    .filter((m) => m.phase === 'qualifying')
    .sort((a, b) => a.position - b.position);
  const winners: Team[] = [];
  for (const m of qMatches) {
    if (m.winner) winners.push(m.winner);
  }
  return winners.slice(0, n);
}

/** True when every qualifying match is completed or a bye. */
export function isQualifyingComplete(matches: Match[]): boolean {
  const qMatches = matches.filter((m) => m.phase === 'qualifying');
  if (qMatches.length === 0) return true;
  return qMatches.every((m) => m.status === 'completed' || m.isBye);
}

/**
 * Build initial tournament matches when qualifying is enabled.
 * Returns null when qualifying is disabled (caller falls back to existing path).
 */
export function buildTournamentWithQualifying(
  tournamentId: string,
  teams: Team[],
  settings: Tournament['settings'],
): { matches: Match[]; groups: undefined; totalRounds: number; phase: 'qualifying' } | null {
  if (!settings.qualifying?.enabled) return null;

  const entering = settings.qualifying.teamsEntering;
  const teamsForQ = teams.slice(0, entering);
  const qMatches = buildQualifyingStage(tournamentId, teamsForQ);

  return { matches: qMatches, groups: undefined, totalRounds: 1, phase: 'qualifying' };
}

/**
 * Transition from completed qualifying to the group stage.
 * Qualified winners + auto-qualified (non-entering) teams feed into buildGroupStage.
 */
export function transitionToGroupStage(tournament: Tournament): Tournament {
  if (!tournament.settings.qualifying?.enabled) return tournament;
  if (tournament.phase !== 'qualifying') return tournament;
  if (!isQualifyingComplete(tournament.matches)) return tournament;

  const qWinners = getQualifyingWinners(
    tournament.matches,
    tournament.settings.qualifying.teamsQualifying,
  );

  // Teams that never entered qualifying auto-advance to the group stage.
  const qTeamIds = new Set(
    tournament.matches
      .filter((m) => m.phase === 'qualifying')
      .flatMap((m) => [m.teamA?.id, m.teamB?.id].filter(Boolean) as string[]),
  );
  const autoQualified = tournament.teams.filter((t) => !qTeamIds.has(t.id));
  const groupTeams = [...qWinners, ...autoQualified];

  const numGroups = tournament.settings.numGroups ?? 2;
  const teamsPerGroup = tournament.settings.teamsPerGroup ?? 4;
  const qualifyPerGroup = tournament.settings.qualifyPerGroup ?? 2;
  const thirdPlace = tournament.settings.thirdPlaceMatch;
  const encounters = tournament.settings.encountersPerOpponent ?? 1;

  const gs = buildGroupStage(
    tournament.id,
    groupTeams,
    numGroups,
    teamsPerGroup,
    qualifyPerGroup,
    thirdPlace,
    encounters,
    tournament.settings.balancedDraw ?? false,
    tournament.settings.useSeeding ?? false,
  );
  const totalRounds = getGroupStageTotalRounds(
    numGroups,
    teamsPerGroup,
    qualifyPerGroup,
    thirdPlace,
    encounters,
  );

  const qualifyingMatches = tournament.matches.filter((m) => m.phase === 'qualifying');

  return {
    ...tournament,
    teams: groupTeams,
    matches: [...qualifyingMatches, ...gs.matches],
    groups: gs.groups,
    phase: 'group',
    totalRounds,
    currentRound: 1,
  };
}

/** Simulate all pending qualifying matches (single round), then transition. */
export function advanceQualifyingRound(tournament: Tournament): Tournament {
  if (tournament.phase !== 'qualifying') return tournament;

  const pending = tournament.matches.filter(
    (m) => m.phase === 'qualifying' && m.status === 'pending' && m.teamA && m.teamB && !m.isBye,
  );

  if (pending.length === 0) {
    return isQualifyingComplete(tournament.matches)
      ? transitionToGroupStage(tournament)
      : tournament;
  }

  const updatedMatches = tournament.matches.map((m) => {
    if (
      m.phase !== 'qualifying' ||
      m.status !== 'pending' ||
      !m.teamA ||
      !m.teamB ||
      m.isBye
    ) {
      return m;
    }
    const result = simulateMatch(m.teamA, m.teamB);
    return {
      ...m,
      winner: result.winner,
      loser: result.loser,
      scoreA: result.scoreA,
      scoreB: result.scoreB,
      events: [],
      status: 'completed' as const,
    };
  });

  const updated: Tournament = { ...tournament, matches: updatedMatches };

  return isQualifyingComplete(updated.matches)
    ? transitionToGroupStage(updated)
    : updated;
}

/** Simulate all remaining qualifying matches, then transition to group stage. */
export function simulateAllQualifying(tournament: Tournament): Tournament {
  return advanceQualifyingRound(tournament);
}
