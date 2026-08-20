import type { Team } from '../models/types';
import { teamStrength, isUnproven } from '../models/types';
import { getKValue } from '../storage/settings';

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Logistic function: maps a strength difference to a win probability.
 *
 * K controls the steepness of the curve. A higher K makes strength gaps matter
 * more while keeping the function smooth and upsets always possible.
 *
 * Unproven teams add extra randomness — when either team is unproven, the
 * probability is pulled toward 50/50 so early matches are unpredictable.
 */
function winProbability(strengthA: number, strengthB: number, unprovenBoost: number): number {
  const K = getKValue();
  const base = 1 / (1 + Math.exp(-K * (strengthA - strengthB)));
  // Pull toward 0.5 by the unproven factor so unproven matches are less predictable
  return base * (1 - unprovenBoost) + 0.5 * unprovenBoost;
}

export interface SimulationResult {
  winner: Team;
  loser: Team;
  scoreA: number;
  scoreB: number;
}

/**
 * Simulate a Best-of-7 match between two teams.
 *
 * Each battle is an independent random draw using the logistic win probability.
 * First to 4 battle wins ends the match. Scores are always 4–X (never >4, never 4–4).
 */
export function simulateMatch(teamA: Team, teamB: Team): SimulationResult {
  const strengthA = teamStrength(teamA);
  const strengthB = teamStrength(teamB);

  const unprovenBoost = (isUnproven(teamA) || isUnproven(teamB)) ? 0.25 : 0;
  const probAWins = winProbability(strengthA, strengthB, unprovenBoost);

  let winsA = 0;
  let winsB = 0;
  const TARGET = 4;

  while (winsA < TARGET && winsB < TARGET) {
    if (Math.random() < probAWins) {
      winsA++;
    } else {
      winsB++;
    }
  }

  const aWins = winsA > winsB;
  const winner = aWins ? teamA : teamB;
  const loser  = aWins ? teamB : teamA;

  return { winner, loser, scoreA: winsA, scoreB: winsB };
}

export function simulateMatchAsMatch(match: import('../models/types').Match): import('../models/types').Match {
  if (!match.teamA || !match.teamB) return match;
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

export interface BattleStep {
  scoreA: number;
  scoreB: number;
  winner: Team;
  loser: Team;
}

/**
 * Simulate a Best-of-7 match battle-by-battle, returning each intermediate
 * score state so the UI can update progressively during timed simulation.
 */
export function simulateMatchBattles(teamA: Team, teamB: Team): BattleStep[] {
  const strengthA = teamStrength(teamA);
  const strengthB = teamStrength(teamB);
  const unprovenBoost = (isUnproven(teamA) || isUnproven(teamB)) ? 0.25 : 0;
  const probAWins = winProbability(strengthA, strengthB, unprovenBoost);

  const steps: BattleStep[] = [];
  let winsA = 0;
  let winsB = 0;
  const TARGET = 4;

  while (winsA < TARGET && winsB < TARGET) {
    const aWinsBattle = Math.random() < probAWins;
    if (aWinsBattle) {
      winsA++;
    } else {
      winsB++;
    }
    steps.push({
      scoreA: winsA,
      scoreB: winsB,
      winner: aWinsBattle ? teamA : teamB,
      loser: aWinsBattle ? teamB : teamA,
    });
  }

  return steps;
}

// ─── Live Battle Simulation ───────────────────────────────────────────────────

export interface BattleTick {
  /** 0–100, how much momentum team A has (team B is 100 - momentumA) */
  momentumA: number;
  /** Human-readable status update */
  status: string;
  /** Which phase of the battle we're in */
  phase: 'live' | 'final';
}

/**
 * Pre-compute a sequence of battle ticks for the cinematic live simulation.
 *
 * Momentum starts near 50/50 and shifts naturally between both teams using
 * a random walk biased by the stronger team's probability. The final tick
 * always resolves to the actual winner determined by simulateMatch.
 *
 * @param tickCount number of animation frames (roughly 1 per second)
 */
export function generateBattleTimeline(
  teamA: Team,
  teamB: Team,
  tickCount: number,
): { ticks: BattleTick[]; winner: Team; loser: Team } {
  const { winner, loser } = simulateMatch(teamA, teamB);
  const aWins = winner.id === teamA.id;

  const strengthA = teamStrength(teamA);
  const strengthB = teamStrength(teamB);
  const unprovenBoost = (isUnproven(teamA) || isUnproven(teamB)) ? 0.25 : 0;
  const probAWins = winProbability(strengthA, strengthB, unprovenBoost);

  // Bias the random walk so the stronger team tends to gain momentum, but
  // with enough noise that momentum swings back and forth naturally.
  const bias = (probAWins - 0.5) * 2; // -1..1
  const aName = teamA.name;
  const bName = teamB.name;

  const ticks: BattleTick[] = [];
  let momentumA = 50;

  for (let i = 0; i < tickCount; i++) {
    const progress = i / tickCount; // 0..1
    const isFinal = i === tickCount - 1;

    if (isFinal) {
      // Resolve to actual winner
      momentumA = aWins ? 100 : 0;
      ticks.push({
        momentumA,
        status: `${winner.name} wins!`,
        phase: 'final',
      });
      break;
    }

    // Random walk with bias; noise shrinks slightly as the battle "settles"
    const noiseScale = 8 + (1 - progress) * 6;
    const drift = bias * (2 + progress * 3);
    const noise = (rand(0, 1) + rand(0, 1) - 1) * noiseScale;
    momentumA += drift + noise;
    momentumA = Math.max(5, Math.min(95, momentumA));

    // Generate status text based on momentum
    let status: string;
    if (momentumA > 65) {
      const options = [
        `${aName} gaining momentum…`,
        `${aName} pressing the attack…`,
        `${aName} in control…`,
      ];
      status = options[Math.floor(rand(0, options.length))];
    } else if (momentumA < 35) {
      const options = [
        `${bName} gaining momentum…`,
        `${bName} fighting back…`,
        `${bName} taking control…`,
      ];
      status = options[Math.floor(rand(0, options.length))];
    } else {
      const options = [
        'Even battle…',
        'Neither side giving ground…',
        'A tense standoff…',
        'Momentum shifting…',
      ];
      status = options[Math.floor(rand(0, options.length))];
    }

    ticks.push({ momentumA, status, phase: 'live' });
  }

  return { ticks, winner, loser };
}
