import type { Tournament, Match, Team } from '../models/types';

/**
 * Safe knockout round labeling — never shows "Round of 1/0.5/0.125".
 * Falls back to the largest valid power-of-two label ≤ the round's match count.
 */
export function safeKnockoutRoundLabel(matchesInRound: number): string {
  if (matchesInRound <= 0) return 'Knockout';
  const teams = matchesInRound * 2;
  const valid: { teams: number; label: string }[] = [
    { teams: 2, label: 'Final' },
    { teams: 4, label: 'Semi-final' },
    { teams: 8, label: 'Quarter-final' },
    { teams: 16, label: 'Round of 16' },
    { teams: 32, label: 'Round of 32' },
    { teams: 64, label: 'Round of 64' },
    { teams: 128, label: 'Round of 128' },
  ];
  // Exact match
  const exact = valid.find((v) => v.teams === teams);
  if (exact) return exact.label;
  // Floor fallback for odd sizes (shouldn't normally happen)
  const floor = valid.filter((v) => v.teams <= teams).pop();
  return floor ? floor.label : 'Knockout';
}

/** Resolve group name for a match given its parent tournament. */
export function getMatchGroupName(tournament: Tournament, match: Match): string | null {
  if (!match.groupId) return null;
  const group = tournament.groups?.find((g) => g.id === match.groupId);
  return group?.name ?? null;
}

/**
 * Qualifying is always a single round.
 */
function getQualifyingRoundLabel(): string {
  return 'Qualifying Round';
}

/**
 * Compute the secondary stage line shown above a match's teams:
 *  - Qualifying:   "Qualifying Round"
 *  - Group stage:  "Group A — Match 1", "Group A — Match 2", etc.
 *  - Knockout:     "Quarterfinal 1" | "Semifinal 1" | "Final" | "Third Place Match"
 *  - Round-robin:  "Round 5"
 */
export function getMatchStageLine(match: Match, tournament: Tournament): string {
  const { format } = tournament.settings;

  if (match.isThirdPlace) return 'Third Place Match';

  if (match.phase === 'qualifying') {
    return getQualifyingRoundLabel();
  }

  if (format === 'round-robin') {
    return `Round ${match.round}`;
  }

  if (format === 'group-stage') {
    if (match.phase === 'group') {
      const groupName = getMatchGroupName(tournament, match);
      // Compute match number within this group (1-based, ordered by round then position)
      const groupMatches = tournament.matches
        .filter(m => m.groupId === match.groupId && m.phase === 'group' && !m.isBye)
        .sort((a, b) => a.round - b.round || a.position - b.position);
      const matchIdx = groupMatches.findIndex(m => m.id === match.id);
      const matchNum = matchIdx >= 0 ? matchIdx + 1 : 0;
      return groupName ? `${groupName} — Match ${matchNum}` : `Match ${matchNum}`;
    }
    // Knockout phase within group-stage format
    return getKnockoutMatchLabel(match, tournament);
  }

  // single/double elimination
  return getKnockoutMatchLabel(match, tournament);
}

/**
 * Label a knockout match with its round name and position number.
 * e.g. "Quarterfinal 1", "Quarterfinal 2", "Semifinal 1", "Final".
 */
function getKnockoutMatchLabel(match: Match, tournament: Tournament): string {
  const isGroupStage = tournament.settings.format === 'group-stage';
  const koMatches = tournament.matches.filter(
    m => (isGroupStage ? m.phase === 'knockout' : true) && !m.isThirdPlace,
  );
  const sameRound = koMatches.filter(m => m.round === match.round);
  const roundLabel = safeKnockoutRoundLabel(sameRound.length);

  // For the Final (only 1 match), don't append a number
  if (sameRound.length <= 1) return roundLabel;

  // Append position number (1-based)
  const sortedRound = [...sameRound].sort((a, b) => a.position - b.position);
  const posIdx = sortedRound.findIndex(m => m.id === match.id);
  const matchNum = posIdx >= 0 ? posIdx + 1 : 1;

  return `${roundLabel} ${matchNum}`;
}

/** Human-readable status label for a match. */
export function getMatchStatusLabel(match: Match): string {
  if (match.isBye) return 'Bye';
  if (match.status === 'completed') return 'Completed';
  if (match.status === 'live') return 'In Progress';
  if (match.status === 'pending') {
    if (match.teamA && match.teamB) return 'Upcoming';
    return 'Scheduled';
  }
  return 'Upcoming';
}

export type StatusBadgeVariant = 'info' | 'success' | 'warning' | 'muted';

/** Badge variant matching a match status. */
export function getMatchStatusVariant(match: Match): StatusBadgeVariant {
  if (match.isBye) return 'muted';
  if (match.status === 'completed') return 'success';
  if (match.status === 'live') return 'warning';
  return 'info';
}

/**
 * Compute a stable, 1-based "Match #" across the whole tournament.
 * Ordering: round → position, with third-place matches appended last.
 */
export function getMatchNumber(match: Match, tournament: Tournament): number {
  const ordered = [...tournament.matches]
    .filter((m) => !m.isBye)
    .sort((a, b) => {
      if (a.isThirdPlace !== b.isThirdPlace) return a.isThirdPlace ? 1 : -1;
      return a.round - b.round || a.position - b.position;
    });
  const idx = ordered.findIndex((m) => m.id === match.id);
  return idx >= 0 ? idx + 1 : 0;
}

// ─── Tournament-level stage label ──────────────────────────────────────────────

export function getTournamentStageLabel(tournament: Tournament): string {
  if (tournament.status === 'completed') return 'Completed';
  if (tournament.status === 'draft') return 'Not Started';

  const { format } = tournament.settings;

  if (format === 'round-robin') {
    return `Round ${tournament.currentRound} of ${tournament.totalRounds}`;
  }

  if (format === 'group-stage') {
    if (tournament.phase === 'qualifying') {
      return getQualifyingRoundLabel();
    }
    if (tournament.phase === 'group') {
      return 'Group Stage';
    }
    if (tournament.phase === 'knockout' || tournament.phase === 'finished') {
      const koMatches = tournament.matches.filter(
        (m) => m.phase === 'knockout' && !m.isThirdPlace,
      );
      const currentKoRound = koMatches
        .filter((m) => m.status === 'pending' && m.teamA && m.teamB)
        .map((m) => m.round)
        .sort((a, b) => a - b)[0];
      if (currentKoRound) {
        const inRound = koMatches.filter((m) => m.round === currentKoRound).length;
        return safeKnockoutRoundLabel(inRound);
      }
      const maxCompletedRound = koMatches
        .filter((m) => m.status === 'completed')
        .map((m) => m.round)
        .sort((a, b) => b - a)[0];
      if (maxCompletedRound) {
        const inRound = koMatches.filter((m) => m.round === maxCompletedRound).length;
        return safeKnockoutRoundLabel(inRound);
      }
      return 'Knockout Stage';
    }
    return 'Group Stage';
  }

  // single / double elimination
  const koMatches = tournament.matches.filter((m) => !m.isThirdPlace);
  const currentRound = koMatches
    .filter((m) => m.status === 'pending' && m.teamA && m.teamB)
    .map((m) => m.round)
    .sort((a, b) => a - b)[0];
  if (currentRound) {
    const inRound = koMatches.filter((m) => m.round === currentRound).length;
    return safeKnockoutRoundLabel(inRound);
  }
  const maxCompletedRound = koMatches
    .filter((m) => m.status === 'completed')
    .map((m) => m.round)
    .sort((a, b) => b - a)[0];
  if (maxCompletedRound) {
    const inRound = koMatches.filter((m) => m.round === maxCompletedRound).length;
    return safeKnockoutRoundLabel(inRound);
  }
  return 'Round 1';
}

// ─── Highlights ────────────────────────────────────────────────────────────────

export interface HighlightResult {
  latestCompleted: { match: Match } | null;
}

export function computeHighlights(tournament: Tournament): HighlightResult {
  const completed = tournament.matches.filter(
    (m) => m.status === 'completed' && !m.isBye && m.teamA && m.teamB,
  );

  let latestCompleted: HighlightResult['latestCompleted'] = null;
  let latestRound = -1;
  let latestPos = -1;

  for (const m of completed) {
    if (m.round > latestRound || (m.round === latestRound && m.position > latestPos)) {
      latestRound = m.round;
      latestPos = m.position;
      latestCompleted = { match: m };
    }
  }

  return { latestCompleted };
}

// ─── Tournament progress stats ─────────────────────────────────────────────────

export interface ProgressStats {
  completed: number;
  total: number;
  teamsRemaining: number;
  matchesRemaining: number;
}

export function computeProgressStats(tournament: Tournament): ProgressStats {
  const playable = tournament.matches.filter((m) => !m.isBye);
  const completed = playable.filter((m) => m.status === 'completed');
  const matchesRemaining = playable.length - completed.length;

  // Teams remaining: teams that haven't been eliminated in knockout,
  // or all teams if still in group/round-robin phase.
  let teamsRemaining: number;
  const format = tournament.settings.format;

  if (tournament.status === 'completed') {
    teamsRemaining = 1;
  } else if (tournament.status === 'draft') {
    teamsRemaining = tournament.teams.length;
  } else if (format === 'round-robin') {
    teamsRemaining = tournament.teams.length;
  } else if (format === 'group-stage') {
    if (tournament.phase === 'group') {
      teamsRemaining = tournament.teams.length;
    } else {
      const koMatches = tournament.matches.filter(
        (m) => m.phase === 'knockout' && !m.isThirdPlace,
      );
      const currentRound = koMatches
        .filter((m) => m.status === 'pending' && m.teamA && m.teamB)
        .map((m) => m.round)
        .sort((a, b) => a - b)[0];
      if (currentRound) {
        teamsRemaining = koMatches.filter((m) => m.round === currentRound).length * 2;
      } else {
        teamsRemaining = 2;
      }
    }
  } else {
    const koMatches = tournament.matches.filter((m) => !m.isThirdPlace);
    const currentRound = koMatches
      .filter((m) => m.status === 'pending' && m.teamA && m.teamB)
      .map((m) => m.round)
      .sort((a, b) => a - b)[0];
    if (currentRound) {
      teamsRemaining = koMatches.filter((m) => m.round === currentRound).length * 2;
    } else {
      teamsRemaining = 2;
    }
  }

  return {
    completed: completed.length,
    total: playable.length,
    teamsRemaining,
    matchesRemaining,
  };
}

// ─── Knockout stage qualifiers ─────────────────────────────────────────────────

export interface KnockoutQualifierStage {
  /** Stable key, e.g. "round-16". */
  key: string;
  /** Human label, e.g. "Round of 16 Qualifiers". */
  label: string;
  /** Ordered list of teams that advanced out of this stage. Empty until played. */
  teams: Team[];
}

/**
 * Derive per-stage qualifier tables for a tournament's knockout bracket.
 *
 * Each completed knockout round contributes one stage whose `teams` are the
 * winners of that round (i.e. the teams that advanced to the next round).
 * The Final round yields a single winner (the champion) plus the runner-up,
 * both surfaced in the "Finalists" stage. If a Third Place Match exists and
 * is completed, the third-place team is included in the Finalists stage too.
 *
 * Stages are returned in play order (earliest round first, Final last). A
 * stage is only included once at least one match in that round has been
 * completed, so unplayed rounds never show an empty table.
 */
export function getKnockoutQualifiers(tournament: Tournament): KnockoutQualifierStage[] {
  const { format } = tournament.settings;
  const isGroupStage = format === 'group-stage';

  const koMatches = tournament.matches.filter((m) =>
    isGroupStage ? m.phase === 'knockout' : true,
  );
  // Non-third-place matches define the main bracket rounds.
  const bracketMatches = koMatches.filter((m) => !m.isThirdPlace);
  const rounds = Array.from(new Set(bracketMatches.map((m) => m.round))).sort((a, b) => a - b);
  const thirdPlaceMatch = koMatches.find((m) => m.isThirdPlace);

  const stages: KnockoutQualifierStage[] = [];

  for (const round of rounds) {
    const roundMatches = bracketMatches
      .filter((m) => m.round === round)
      .sort((a, b) => a.position - b.position);

    const isFinalRound = round === rounds[rounds.length - 1];
    const label = safeKnockoutRoundLabel(roundMatches.length);
    const anyCompleted = roundMatches.some((m) => m.status === 'completed' || m.isBye);

    if (!anyCompleted) continue;

    if (isFinalRound) {
      const finalMatch = roundMatches[0];
      const champion = finalMatch?.winner ?? null;
      const runnerUp = finalMatch?.loser ?? null;
      const thirdPlace = thirdPlaceMatch?.status === 'completed' ? (thirdPlaceMatch.winner ?? null) : null;
      const finalists = [champion, runnerUp, thirdPlace].filter((t): t is Team => t !== null);
      stages.push({
        key: 'finalists',
        label: 'Finalists',
        teams: finalists,
      });
      continue;
    }

    // Non-final rounds: winners advance to the next round.
    const winners = roundMatches
      .map((m) => m.winner)
      .filter((t): t is Team => t !== null);
    stages.push({
      key: `round-${roundMatches.length * 2}`,
      label: `${label} Qualifiers`,
      teams: winners,
    });
  }

  return stages;
}
