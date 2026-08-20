import { v4 as uuidv4 } from 'uuid';
import type { Team, Match, Tournament, RoundRobinStanding, Group, QualifyCount, TournamentPhase } from '../models/types';
import { teamStrength } from '../models/types';
import { simulateMatch } from './simulationEngine';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMatch(
  tournamentId: string,
  round: number,
  position: number,
  teamA: Team | null = null,
  teamB: Team | null = null,
  isBye = false,
): Match {
  return {
    id: uuidv4(),
    tournamentId,
    round,
    position,
    teamA,
    teamB,
    winner: null,
    loser: null,
    events: [],
    status: isBye ? 'bye' : 'pending',
    isBye,
  };
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Shared match simulation helper. Simulates a single pending match and returns
 * the updated match object with winner, loser, both battle scores, events, and
 * completed status. Used by both simulateSingleMatch and advanceSingleElimination
 * to guarantee identical result-writing logic.
 */
function simulateMatchAndUpdate(match: Match): Match {
  if (match.status !== 'pending' || !match.teamA || !match.teamB || match.isBye) return match;
  const result = simulateMatch(match.teamA, match.teamB);
  return {
    ...match,
    winner: result.winner,
    loser: result.loser,
    scoreA: result.scoreA,
    scoreB: result.scoreB,
    events: [],
    status: 'completed',
  };
}

// ─── Single Elimination ──────────────────────────────────────────────────────

export function buildSingleEliminationBracket(
  tournamentId: string,
  teams: Team[],
): Match[] {
  const bracketSize = nextPowerOf2(teams.length);
  const seeded = [...teams];
  const matches: Match[] = [];

  // Round 1
  const r1Count = bracketSize / 2;
  const r1Matches: Match[] = [];

  for (let i = 0; i < r1Count; i++) {
    const tA = seeded[i * 2] ?? null;
    const tB = seeded[i * 2 + 1] ?? null;
    const isBye = !tA || !tB;
    const m = makeMatch(tournamentId, 1, i, tA, tB, isBye);
    if (isBye) {
      m.winner = tA ?? tB;
      m.status = 'bye';
    }
    r1Matches.push(m);
    matches.push(m);
  }

  // Subsequent rounds
  let prevRound = r1Matches;
  let round = 2;
  while (prevRound.length > 1) {
    const currentRound: Match[] = [];
    for (let i = 0; i < prevRound.length; i += 2) {
      const m = makeMatch(tournamentId, round, i / 2);
      // If both previous matches are byes/known, pre-fill teams
      const mA = prevRound[i];
      const mB = prevRound[i + 1];
      if (mA.winner) m.teamA = mA.winner;
      if (mB?.winner) m.teamB = mB.winner;
      currentRound.push(m);
      matches.push(m);
    }
    prevRound = currentRound;
    round++;
  }

  return matches;
}

// ─── Round Robin ─────────────────────────────────────────────────────────────

export function buildRoundRobinMatches(tournamentId: string, teams: Team[], encounters: number = 1): Match[] {
  const matches: Match[] = [];
  let round = 1;

  // Generate round-robin schedule using circle method
  const list = teams.length % 2 === 0 ? [...teams] : [...teams, null];
  const n = list.length;
  const fixed = list[0];
  const rotating = list.slice(1);

  const baseRounds = n - 1;

  for (let encounter = 0; encounter < encounters; encounter++) {
    // For even encounters, keep home/away as-is; for odd encounters, swap to reverse legs
    const rot = [...rotating];
    for (let r = 0; r < baseRounds; r++) {
      const currentList = [fixed, ...rot];
      for (let i = 0; i < n / 2; i++) {
        const tA = currentList[i];
        const tB = currentList[n - 1 - i];
        if (tA && tB) {
          // Swap home/away on alternate encounters for proper double round-robin
          const home = encounter % 2 === 0 ? tA : tB;
          const away = encounter % 2 === 0 ? tB : tA;
          matches.push(makeMatch(tournamentId, round, i, home, away));
        }
      }
      // Rotate
      rot.unshift(rot.pop()!);
      round++;
    }
  }

  return matches;
}

export function computeRoundRobinStandings(
  teams: Team[],
  matches: Match[],
): RoundRobinStanding[] {
  const map = new Map<string, RoundRobinStanding>();
  teams.forEach((t) =>
    map.set(t.id, { team: t, played: 0, wins: 0, losses: 0, draws: 0, points: 0, difference: 0 }),
  );

  matches
    .filter((m) => m.status === 'completed')
    .forEach((m) => {
      if (!m.teamA || !m.teamB) return;
      const a = map.get(m.teamA.id)!;
      const b = map.get(m.teamB.id)!;
      a.played++;
      b.played++;

      const scoreA = m.scoreA ?? 0;
      const scoreB = m.scoreB ?? 0;
      a.difference += scoreA - scoreB;
      b.difference += scoreB - scoreA;

      if (m.winner && m.winner.id === m.teamA.id) {
        a.wins++; a.points += 3; b.losses++;
      } else if (m.winner && m.winner.id === m.teamB.id) {
        b.wins++; b.points += 3; a.losses++;
      } else {
        a.draws++; a.points += 1; b.draws++; b.points += 1;
      }
    });

  return Array.from(map.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.difference !== a.difference) return b.difference - a.difference;
    if (b.points !== a.points) return b.points - a.points;
    return a.losses - b.losses;
  });
}

// ─── Tournament progression ──────────────────────────────────────────────────

/**
 * Unified Knockout Progression Module.
 *
 * This is the SINGLE shared implementation used by:
 *   - Single Elimination tournaments
 *   - Group Stage → Knockout tournaments
 *   - Third Place Match generation
 *
 * There is no format-specific progression logic. Every knockout round —
 * Round of 64, Round of 32, Round of 16, Quarter-final, Semi-final, Final —
 * uses the exact same algorithm:
 *
 *   1. Create all matches for the current round (done at bracket build time).
 *   2. When every match in the current round is completed:
 *      a. Collect every winner.
 *      b. Generate the next round automatically (populate teamA/teamB).
 *   3. Repeat until one Champion remains.
 *
 * For every completed match the following is saved:
 *   - Winner, Loser, both Battle Scores, Victory Type, completed status.
 * Only the winner is advanced. The bracket and tournament progress are
 * refreshed immediately.
 *
 * If Third Place Match is enabled, it is created only after both Semi-finals
 * are completed, populated from the two losing Semi-finalists.
 */

/** Returns the set of knockout matches (excluding third-place) from a match list. */
function getKnockoutMatches(matches: Match[], isGroupStage: boolean): Match[] {
  return matches.filter(m =>
    !m.isThirdPlace && (isGroupStage ? m.phase === 'knockout' : true),
  );
}

/**
 * Core progression: advance winners from completed rounds into the next round.
 * Iterates round-by-round from the earliest round forward. For each round where
 * ALL matches are completed, winners are pushed into the next-round slots.
 * This handles cascading advancement (e.g. R1 byes → R2 → R3) in a single pass.
 */
function progressKnockout(matches: Match[], isGroupStage: boolean): Match[] {
  const koMatches = getKnockoutMatches(matches, isGroupStage);
  if (koMatches.length === 0) return matches;

  const rounds = [...new Set(koMatches.map(m => m.round))].sort((a, b) => a - b);

  let updated = [...matches];

  for (const round of rounds) {
    const roundMatches = koMatches
      .filter(m => m.round === round)
      .sort((a, b) => a.position - b.position);

    // Only advance if every match in this round is completed or bye
    if (!roundMatches.every(m => m.status === 'completed' || m.isBye)) continue;

    const nextRound = round + 1;

    for (let i = 0; i < roundMatches.length; i += 2) {
      const nextIdx = Math.floor(i / 2);
      const nextMatch = koMatches.find(
        m => m.round === nextRound && m.position === nextIdx,
      );
      if (!nextMatch) continue;

      const winnerA = roundMatches[i]?.winner;
      const winnerB = roundMatches[i + 1]?.winner;

      updated = updated.map(m => {
        if (m.id !== nextMatch.id) return m;
        // Never overwrite a match that has already been simulated
        if (m.status === 'completed' || m.winner) return m;
        const teamA = winnerA ?? m.teamA;
        const teamB = winnerB ?? m.teamB;
        return {
          ...m,
          teamA,
          teamB,
          status: teamA && teamB ? 'pending' : m.status,
        };
      });
    }
  }

  return updated;
}

/**
 * Create or populate the Third Place Match from the two losing Semi-finalists.
 * Created only after both Semi-finals are completed. Never leaves team names
 * empty — both slots are filled from the losers of the two Semi-final matches.
 */
function progressThirdPlace(
  matches: Match[],
  isGroupStage: boolean,
  tournamentId: string,
): Match[] {
  const koMatches = getKnockoutMatches(matches, isGroupStage);
  if (koMatches.length === 0) return matches;

  const finalRound = Math.max(...koMatches.map(m => m.round));
  const semiRound = finalRound - 1;
  const semiMatches = koMatches
    .filter(m => m.round === semiRound)
    .sort((a, b) => a.position - b.position);

  // Both Semi-finals must be completed to create the Third Place Match
  if (semiMatches.length !== 2) return matches;
  if (!semiMatches.every(m => m.status === 'completed' || m.isBye)) return matches;

  const losers = semiMatches.map(m => m.loser).filter(Boolean) as Team[];
  if (losers.length !== 2) return matches;

  let updated = [...matches];
  const existing = updated.find(m => m.isThirdPlace);

  if (!existing) {
    const tpMatch: Match = {
      id: uuidv4(),
      tournamentId,
      round: finalRound,
      position: semiMatches[0].position + 1,
      teamA: losers[0],
      teamB: losers[1],
      winner: null,
      loser: null,
      events: [],
      status: 'pending',
      isBye: false,
      phase: 'knockout',
      isThirdPlace: true,
    };
    updated = [...updated, tpMatch];
  } else if (existing.status === 'pending' && !existing.teamA && !existing.teamB) {
    updated = updated.map(m =>
      m.id === existing.id
        ? { ...m, teamA: losers[0], teamB: losers[1] }
        : m,
    );
  }

  return updated;
}

/**
 * Core post-match progression logic. After one or more matches have been
 * simulated (their results written onto the match objects), this function:
 *   1. Advances knockout winners via the shared progressKnockout module.
 *   2. Updates group standings / seeds knockout from groups.
 *   3. Creates/populates the Third Place Match via progressThirdPlace.
 *   4. Updates tournament progress, winner, runner-up, third place, status.
 */
export function progressTournament(tournament: Tournament, matches: Match[]): Tournament {
  let updated = [...matches];
  let standings = tournament.standings;
  let groups = tournament.groups;
  let phase = tournament.phase ?? (tournament.settings.format === 'group-stage' ? 'group' : undefined);

  const isKnockoutFormat = tournament.settings.format !== 'round-robin';
  const isGroupStage = tournament.settings.format === 'group-stage';

  // ── 1. Advance knockout winners (shared module) ──────────────────────────
  if (isKnockoutFormat) {
    updated = progressKnockout(updated, isGroupStage);
  }

  // ── 2. Update group standings / seed knockout from groups ─────────────────
  if (isGroupStage) {
    const gsResult = updateGroupStageAfterMatch(tournament, updated);
    updated = gsResult.matches;
    groups = gsResult.groups;
    standings = gsResult.standings;
    phase = gsResult.phase;
  } else if (tournament.settings.format === 'round-robin') {
    standings = computeRoundRobinStandings(tournament.teams, updated);
  }

  // ── 3. Advance knockout winners again after group seeding ────────────────
  // Group seeding may have populated the first knockout round; re-run to
  // cascade any already-completed byes forward.
  if (isKnockoutFormat) {
    updated = progressKnockout(updated, isGroupStage);
  }

  // ── 4. Create/populate Third Place Match (shared module) ──────────────────
  if (isKnockoutFormat && tournament.settings.thirdPlaceMatch) {
    updated = progressThirdPlace(updated, isGroupStage, tournament.id);
  }

  // ── 5. Finalize: progress, winner, runner-up, third place, status ─────────
  const allComplete = updated.every(m => m.status === 'completed' || m.isBye);

  let finalMatch: Match | undefined;
  let thirdPlaceMatch: Match | undefined;
  if (isGroupStage) {
    const koNonThirdPlace = updated.filter(m => m.phase === 'knockout' && !m.isThirdPlace);
    finalMatch = koNonThirdPlace.reduce((a, b) => (a.round > b.round ? a : b), koNonThirdPlace[0]);
    thirdPlaceMatch = updated.find(m => m.isThirdPlace);
  } else if (isKnockoutFormat) {
    const koNonThirdPlace = updated.filter(m => !m.isThirdPlace);
    finalMatch = koNonThirdPlace.reduce((a, b) => (a.round > b.round ? a : b), koNonThirdPlace[0]);
    thirdPlaceMatch = updated.find(m => m.isThirdPlace);
  }

  const winner = allComplete
    ? (tournament.settings.format === 'round-robin'
        ? (standings[0]?.team ?? null)
        : finalMatch?.winner ?? null)
    : null;

  const runnerUp = allComplete
    ? (tournament.settings.format === 'round-robin'
        ? (standings[1]?.team ?? null)
        : finalMatch?.loser ?? null)
    : tournament.runnerUp;

  const thirdPlace = allComplete
    ? (tournament.settings.format === 'round-robin'
        ? (standings[2]?.team ?? null)
        : (thirdPlaceMatch?.winner ?? null))
    : tournament.thirdPlace;

  const pendingPlayable = updated.filter(m => m.status === 'pending' && m.teamA && m.teamB && !m.isBye);
  const completedRounds = updated.filter(m => m.status === 'completed').map(m => m.round);
  const maxCompletedRound = completedRounds.length > 0 ? Math.max(...completedRounds) : 1;
  const newCurrentRound = pendingPlayable.length > 0
    ? Math.min(...pendingPlayable.map(m => m.round))
    : maxCompletedRound;

  return {
    ...tournament,
    matches: updated,
    standings,
    groups,
    phase,
    currentRound: newCurrentRound,
    winner,
    runnerUp,
    thirdPlace,
    status: allComplete ? 'completed' : 'active',
    completedAt: allComplete ? new Date().toISOString() : null,
    startedAt: tournament.startedAt ?? new Date().toISOString(),
  };
}

export function simulateSingleMatch(tournament: Tournament, matchId: string): Tournament {
  const match = tournament.matches.find(m => m.id === matchId);
  if (!match || match.status !== 'pending' || !match.teamA || !match.teamB) return tournament;

  const updated = tournament.matches.map(m =>
    m.id === matchId ? simulateMatchAndUpdate(m) : m,
  );

  return progressTournament(tournament, updated);
}

export function advanceSingleElimination(tournament: Tournament): Tournament {
  const pendingRounds = [...new Set(
    tournament.matches
      .filter(m => m.status === 'pending' && m.teamA && m.teamB && !m.isBye)
      .map(m => m.round),
  )].sort((a, b) => a - b);

  if (pendingRounds.length === 0) return tournament;

  const currentRound = pendingRounds[0];

  const updated = tournament.matches.map(m => {
    if (m.round !== currentRound || m.status !== 'pending' || !m.teamA || !m.teamB || m.isBye) return m;
    return simulateMatchAndUpdate(m);
  });

  return progressTournament(tournament, updated);
}

export function advanceRoundRobin(tournament: Tournament): Tournament {
  const pendingMatches = tournament.matches.filter(m => m.status === 'pending' && m.teamA && m.teamB);
  if (pendingMatches.length === 0) return tournament;

  // Simulate one round at a time to match single-match progression
  const pendingRounds = [...new Set(pendingMatches.map(m => m.round))].sort((a, b) => a - b);
  const currentRound = pendingRounds[0];

  const updated = tournament.matches.map(m => {
    if (m.round !== currentRound || m.status !== 'pending' || !m.teamA || !m.teamB) return m;
    const result = simulateMatch(m.teamA, m.teamB);
    return { ...m, winner: result.winner, loser: result.loser, scoreA: result.scoreA, scoreB: result.scoreB, events: [], status: 'completed' as const };
  });

  return progressTournament(tournament, updated);
}

// ─── Group Stage Engine ───────────────────────────────────────────────────────

const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Snake-draft distribution for balanced groups. */
export function distributeGroups(teams: Team[], numGroups: number): Team[][] {
  const groups: Team[][] = Array.from({ length: numGroups }, () => []);
  teams.forEach((team, i) => {
    const round = Math.floor(i / numGroups);
    const idx = i % numGroups;
    const groupIdx = round % 2 === 0 ? idx : numGroups - 1 - idx;
    groups[groupIdx].push(team);
  });
  return groups;
}

/**
 * Balanced Group Draw using seeding pots.
 *
 * Teams are sorted by Overall Power (high→low) and split into 4 pots of equal
 * size. Each group receives one randomly-selected team from each pot, so every
 * group gets one strong, two mid, and one low seed while keeping each draw
 * unique. Returns null when a balanced 4-pot split isn't possible (fallback).
 */
export function balancedGroupDraw(
  teams: Team[],
  numGroups: number,
): Team[][] | null {
  const NUM_POTS = 4;
  const totalTeams = teams.length;
  if (totalTeams !== numGroups * NUM_POTS) return null;

  const sorted = [...teams].sort(
    (a, b) => teamStrength(b) - teamStrength(a),
  );

  const pots: Team[][] = Array.from({ length: NUM_POTS }, () => []);
  sorted.forEach((team, i) => {
    pots[i % NUM_POTS].push(team);
  });

  const groups: Team[][] = Array.from({ length: numGroups }, () => []);
  for (const pot of pots) {
    const shuffled = [...pot].sort(() => Math.random() - 0.5);
    for (let g = 0; g < numGroups; g++) {
      groups[g].push(shuffled[g]);
    }
  }
  return groups;
}

/**
 * Seeded Group Distribution.
 *
 * Ranks every team by Overall Power (high→low) and distributes them across
 * pots in ranking order — Pot 1 holds the highest-ranked teams, Pot 2 the next
 * tier, and so on. Pot sizes do NOT need to be equal: the strongest teams are
 * spread one-per-group first, then the next tier one-per-group, etc. This
 * prevents any single group from collecting multiple powerhouses (or multiple
 * weak teams) while still keeping each draw deterministic by ranking.
 *
 * Works alongside the existing Pot System — when `useSeeding` is enabled this
 * distribution is used instead of the random/snake draw; when disabled the
 * existing Pot/Random behavior is unchanged.
 */
export function seededGroupDistribution(
  teams: Team[],
  numGroups: number,
): Team[][] {
  const sorted = [...teams].sort(
    (a, b) => teamStrength(b) - teamStrength(a),
  );

  const groups: Team[][] = Array.from({ length: numGroups }, () => []);
  sorted.forEach((team, i) => {
    // Round-robin across groups by rank: rank 0 → group 0, rank 1 → group 1,
    // … rank numGroups-1 → group numGroups-1, rank numGroups → group 0, etc.
    // This guarantees the top N teams are split one-per-group, the next N
    // teams one-per-group, and so on — so no group can hoard strong teams.
    groups[i % numGroups].push(team);
  });
  return groups;
}

export function buildGroupStage(
  tournamentId: string,
  teams: Team[],
  numGroups: number,
  teamsPerGroup: number,
  qualifyPerGroup: QualifyCount,
  thirdPlace: boolean,
  encounters: number = 1,
  balancedDraw: boolean = false,
  useSeeding: boolean = false,
): { matches: Match[]; groups: Group[]; totalRounds: number } {
  let distributed: Team[][];
  if (useSeeding) {
    distributed = seededGroupDistribution(teams, numGroups);
  } else if (balancedDraw) {
    const balanced = balancedGroupDraw(teams, numGroups);
    distributed = balanced ?? distributeGroups(teams, numGroups);
  } else {
    distributed = distributeGroups(teams, numGroups);
  }
  const groups: Group[] = [];
  const matches: Match[] = [];
  let matchPosition = 0;

  distributed.forEach((groupTeams, gIdx) => {
    const groupId = `group-${GROUP_NAMES[gIdx]}`;
    const groupName = `Group ${GROUP_NAMES[gIdx]}`;
    const group: Group = {
      id: groupId,
      name: groupName,
      teams: groupTeams,
      standings: computeRoundRobinStandings(groupTeams, []),
    };
    groups.push(group);

    // Generate round-robin matches for this group
    const rrMatches = buildRoundRobinMatches(tournamentId, groupTeams, encounters);
    // Renumber rounds so Round 1 = every team's first group match,
    // Round 2 = every team's second group match, etc.
    // buildRoundRobinMatches already produces matches in round order (round 1..N),
    // so we just need to ensure they start at 1 (they already do).
    for (const m of rrMatches) {
      matches.push({
        ...m,
        id: uuidv4(),
        groupId,
        phase: 'group',
        round: m.round, // already 1-based per group
        position: matchPosition++,
      });
    }
  });

  // Knockout matches are created with TBD teams — they'll be filled when group stage completes
  const knockoutTeams = numGroups * qualifyPerGroup;
  const knockoutSize = nextPowerOf2(knockoutTeams);
  const knockoutRounds = Math.log2(knockoutSize);
  const koStartRound = groups.length + 1;

  for (let round = 0; round < knockoutRounds; round++) {
    const matchesInRound = knockoutSize / Math.pow(2, round + 1);
    for (let i = 0; i < matchesInRound; i++) {
      const isFinal = round === knockoutRounds - 1;
      const isThirdPlace = thirdPlace && isFinal;
      matches.push({
        id: uuidv4(),
        tournamentId,
        round: koStartRound + round,
        position: i,
        teamA: null,
        teamB: null,
        winner: null,
        loser: null,
        events: [],
        status: 'pending',
        isBye: false,
        phase: 'knockout',
        isThirdPlace: false,
      });
      // Third place match as an extra match in the final round
      if (isThirdPlace) {
        matches.push({
          id: uuidv4(),
          tournamentId,
          round: koStartRound + round,
          position: i + 1,
          teamA: null,
          teamB: null,
          winner: null,
          loser: null,
          events: [],
          status: 'pending',
          isBye: false,
          phase: 'knockout',
          isThirdPlace: true,
        });
      }
    }
  }

  const baseRrRounds = teamsPerGroup % 2 === 0 ? teamsPerGroup - 1 : teamsPerGroup;
  const rrRounds = baseRrRounds * encounters;
  const totalRounds = rrRounds + knockoutRounds + (thirdPlace ? 1 : 0);

  return { matches, groups, totalRounds };
}

/**
 * Seed the knockout bracket from group standings.
 * Cross-seed: 1st of A vs 2nd of B, 1st of B vs 2nd of A, etc.
 */
function seedKnockoutFromGroups(
  matches: Match[],
  groups: Group[],
  qualifyPerGroup: number,
  thirdPlace: boolean,
): Match[] {
  const knockoutMatches = matches.filter(m => m.phase === 'knockout' && !m.isThirdPlace);
  if (knockoutMatches.length === 0) return matches;

  // Collect qualifiers: for each group, take top N
  const qualifiers: Team[][] = groups.map(g =>
    g.standings.slice(0, qualifyPerGroup).map(s => s.team),
  );

  // Cross-seed: A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2, etc.
  const seeds: (Team | null)[] = [];
  const numGroups = groups.length;
  for (let i = 0; i < numGroups; i++) {
    seeds.push(qualifiers[i][0] ?? null);
    if (qualifyPerGroup >= 2) {
      const nextGroup = (i + 1) % numGroups;
      seeds.push(qualifiers[nextGroup][1] ?? null);
    }
  }

  // For qualifyPerGroup === 4, add 3rd and 4th place teams
  if (qualifyPerGroup === 4) {
    for (let i = 0; i < numGroups; i++) {
      seeds.push(qualifiers[i][2] ?? null);
      const nextGroup = (i + 1) % numGroups;
      seeds.push(qualifiers[nextGroup][3] ?? null);
    }
  }

  // Assign seeds to first-round knockout matches
  const firstRoundMatches = knockoutMatches
    .filter(m => {
      const minRound = Math.min(...knockoutMatches.map(km => km.round));
      return m.round === minRound;
    })
    .sort((a, b) => a.position - b.position);

  let updated = [...matches];
  for (let i = 0; i < firstRoundMatches.length; i++) {
    // Never re-seed a match that already has teams or is completed
    if (firstRoundMatches[i].teamA || firstRoundMatches[i].teamB || firstRoundMatches[i].status === 'completed') continue;
    const teamA = seeds[i * 2] ?? null;
    const teamB = seeds[i * 2 + 1] ?? null;
    updated = updated.map(m => {
      if (m.id !== firstRoundMatches[i].id) return m;
      return {
        ...m,
        teamA,
        teamB,
        status: 'pending',
      };
    });
  }

  return updated;
}

function updateGroupStageAfterMatch(
  tournament: Tournament,
  matches: Match[],
): { matches: Match[]; groups: Group[]; standings: RoundRobinStanding[]; phase: TournamentPhase } {
  // Update group standings
  const groups: Group[] = (tournament.groups ?? []).map(g => {
    const groupMatches = matches.filter(m => m.groupId === g.id);
    return {
      ...g,
      standings: computeRoundRobinStandings(g.teams, groupMatches),
    };
  });

  // Check if all group matches are complete
  const groupMatches = matches.filter(m => m.phase === 'group');
  const groupComplete = groupMatches.every(m => m.status === 'completed');

  let phase: TournamentPhase = 'group';
  let updatedMatches = [...matches];

  if (groupComplete) {
    // Seed knockout bracket
    const qualifyPerGroup = tournament.settings.qualifyPerGroup ?? 2;
    const thirdPlace = tournament.settings.thirdPlaceMatch;
    updatedMatches = seedKnockoutFromGroups(matches, groups, qualifyPerGroup, thirdPlace);
    phase = 'knockout';
  }

  // Compute overall standings (for display)
  const allStandings = groups.flatMap(g => g.standings);

  return { matches: updatedMatches, groups, standings: allStandings, phase };
}

export function advanceGroupStage(tournament: Tournament): Tournament {
  const pendingMatches = tournament.matches.filter(m =>
    m.status === 'pending' && m.teamA && m.teamB && !m.isBye,
  );
  if (pendingMatches.length === 0) return tournament;

  // Simulate one round at a time (lowest pending round first)
  const pendingRounds = [...new Set(pendingMatches.map(m => m.round))].sort((a, b) => a - b);
  const currentRound = pendingRounds[0];

  const updated = tournament.matches.map(m => {
    if (m.round !== currentRound || m.status !== 'pending' || !m.teamA || !m.teamB || m.isBye) return m;
    return simulateMatchAndUpdate(m);
  });

  return progressTournament(tournament, updated);
}

export function getTotalRounds(teamCount: number, format: string, encounters: number = 1): number {
  if (format === 'round-robin') {
    const n = teamCount % 2 === 0 ? teamCount : teamCount + 1;
    return (n - 1) * encounters;
  }
  return Math.ceil(Math.log2(nextPowerOf2(teamCount)));
}

export function getGroupStageTotalRounds(numGroups: number, teamsPerGroup: number, qualifyPerGroup: number, thirdPlace: boolean, encounters: number = 1): number {
  const baseRrRounds = teamsPerGroup % 2 === 0 ? teamsPerGroup - 1 : teamsPerGroup;
  const rrRounds = baseRrRounds * encounters;
  const knockoutTeams = numGroups * qualifyPerGroup;
  const koRounds = Math.ceil(Math.log2(nextPowerOf2(knockoutTeams))) + (thirdPlace ? 1 : 0);
  return rrRounds + koRounds;
}

export function getRoundLabel(round: number, totalRounds: number, format: string): string {
  if (format === 'round-robin') return `Round ${round}`;
  const remaining = totalRounds - round + 1;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semi-final';
  if (remaining === 3) return 'Quarter-final';
  return `Round of ${Math.pow(2, remaining)}`;
}

/** Label a knockout round by the number of matches in that round. */
export function getKnockoutRoundLabel(matchesInRound: number): string {
  const teams = matchesInRound * 2;
  switch (teams) {
    case 2: return 'Final';
    case 4: return 'Semi-final';
    case 8: return 'Quarter-final';
    case 16: return 'Round of 16';
    case 32: return 'Round of 32';
    case 64: return 'Round of 64';
    case 128: return 'Round of 128';
    default: return `Round of ${teams}`;
  }
}
