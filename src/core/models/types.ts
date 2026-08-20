export type TournamentFormat = 'single-elimination' | 'double-elimination' | 'round-robin' | 'group-stage';
export type TournamentStatus = 'draft' | 'active' | 'completed';
export type MatchStatus = 'pending' | 'live' | 'completed' | 'bye';
export type TournamentPhase = 'qualifying' | 'group' | 'knockout' | 'finished';
export type QualifyCount = number;

export interface RecentMatch {
  opponentStrength: number;
  won: boolean;
  scoreFor: number;
  scoreAgainst: number;
  timestamp: string;
}

export interface TeamCareer {
  totalBattles: number;
  wins: number;
  losses: number;
  championships: number;
  runnerUps: number;
  thirdPlaces: number;
  tournamentsPlayed: number;
  /** Sum of (opponent strength − 50) weighted by result quality, across all
   *  career matches. Positive means the team has consistently faced and
   *  performed against above-average opposition. */
  qualityPoints: number;
  /** Sum of the absolute per-match contributions used to build qualityPoints,
   *  so we can normalize opponent quality into a stable modifier. */
  qualityWeight: number;
  /** Most recent matches (newest first), capped at RECENT_WINDOW_SIZE.
   *  Used for recent-form strength calculation. */
  recentMatches: RecentMatch[];
}

export function emptyCareer(): TeamCareer {
  return { totalBattles: 0, wins: 0, losses: 0, championships: 0, runnerUps: 0, thirdPlaces: 0, tournamentsPlayed: 0, qualityPoints: 0, qualityWeight: 0, recentMatches: [] };
}

export function winRate(career: TeamCareer): number {
  if (career.totalBattles === 0) return 0;
  return Math.round((career.wins / career.totalBattles) * 100);
}

/** Coalesce a possibly-stale persisted career (missing opponent-quality fields
 *  from older app versions) into a complete TeamCareer. */
export function normalizeCareer(c: Partial<TeamCareer> | undefined): TeamCareer {
  return { ...emptyCareer(), recentMatches: [], ...c };
}

/** Number of recent matches used for form-based strength. */
export const RECENT_WINDOW_SIZE = 15;

/** Teams with fewer than this many career matches are "Unproven" — their
 *  strength is uncertain and early matches are more unpredictable. */
export const UNPROVEN_THRESHOLD = 5;

export function isUnproven(team: Team): boolean {
  return team.career.totalBattles < UNPROVEN_THRESHOLD;
}

/**
 * Recent-form-based team strength on a 0–100 scale.
 *
 * Strength is calculated from the team's most recent RECENT_WINDOW_SIZE
 * completed matches, not the entire career. This keeps strength responsive
 * to current form — a team on a hot streak rises, a team in a slump falls.
 *
 * The calculation:
 *   1. Start with recent win rate as the base (maps to 25–75).
 *   2. Adjust for opponent strength: beating strong opponents boosts more,
 *      losing to weak opponents hurts more.
 *   3. Adjust for score differential: 4–0 wins count more than 4–3 wins.
 *   4. Unproven teams (few career matches) are pulled toward 50 (neutral).
 *
 * K is NOT used here. K controls only the logistic win-probability curve
 * in the simulation engine; it never touches strength calculation.
 */
export function teamStrength(team: Team): number {
  const battles = team.career.totalBattles;
  if (battles === 0) return 50; // brand new — neutral

  const recent = team.career.recentMatches ?? [];
  if (recent.length === 0) return 50;

  // Confidence grows with recent matches played, saturating at RECENT_WINDOW_SIZE.
  const confidence = Math.min(1, recent.length / RECENT_WINDOW_SIZE);

  // ── 1. Win rate base (25–75) ───────────────────────────────────────────
  const wins = recent.filter(m => m.won).length;
  const winRate = wins / recent.length;
  let strength = 25 + winRate * 50;

  // ── 2. Opponent-strength adjustment ─────────────────────────────────────
  // Each match contributes based on opponent strength relative to 50.
  // Beating a strong opponent (strength > 50) gives a large positive boost.
  // Losing to a weak opponent (strength < 50) gives a large negative penalty.
  let oppAdjustment = 0;
  for (const m of recent) {
    const oppGap = (m.opponentStrength - 50) / 50; // -1..1
    if (m.won) {
      // Beating strong opponents is worth more
      oppAdjustment += (0.5 + oppGap) * 3;
    } else {
      // Losing to weak opponents hurts more
      oppAdjustment -= (0.5 - oppGap) * 3;
    }
  }
  oppAdjustment /= recent.length; // average per match
  strength += oppAdjustment;

  // ── 3. Score-differential adjustment ───────────────────────────────────
  // 4–0 wins have more impact than 4–3 wins.
  let scoreAdjustment = 0;
  for (const m of recent) {
    const diff = m.scoreFor - m.scoreAgainst;
    scoreAdjustment += diff * 0.8;
  }
  scoreAdjustment /= recent.length;
  strength += scoreAdjustment;

  // ── 4. Unproven pull toward neutral ─────────────────────────────────────
  const unprovenWeight = 1 - confidence;
  strength = strength * (1 - unprovenWeight * 0.5) + 50 * (unprovenWeight * 0.5);

  return Math.round(Math.max(1, Math.min(99, strength)));
}

/** Short label describing a team's experience tier for display. */
export function strengthLabel(team: Team): string {
  if (isUnproven(team)) return 'Unproven';
  const s = teamStrength(team);
  if (s >= 65) return 'Proven';
  if (s >= 50) return 'Seasoned';
  if (s >= 35) return 'Developing';
  return 'Struggling';
}

export interface Team {
  id: string;
  name: string;
  emoji: string;
  color: string;         // hex
  wins: number;
  losses: number;
  draws: number;
  career: TeamCareer;
  createdAt: string;     // ISO
  deletedAt?: string | null; // ISO timestamp — soft-deleted teams are hidden from the team list but retained for historical tournaments
}

export interface MatchEvent {
  round: number;
  text: string;
  type: 'attack' | 'defense' | 'critical' | 'fumble' | 'momentum';
  team: 'a' | 'b' | 'neutral';
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  teamA: Team | null;
  teamB: Team | null;
  winner: Team | null;
  loser: Team | null;
  events: MatchEvent[];
  status: MatchStatus;
  isBye: boolean;
  scoreA?: number;
  scoreB?: number;
  loserBracket?: boolean;
  phase?: TournamentPhase;
  groupId?: string;
  isThirdPlace?: boolean;
}

export interface RoundRobinStanding {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  difference: number;
}

export interface TournamentSettings {
  format: TournamentFormat;
  thirdPlaceMatch: boolean;
  simulationSpeed: 'instant' | 'fast' | 'normal';
  maxTeams: number;
  numGroups?: number;
  teamsPerGroup?: number;
  qualifyPerGroup?: QualifyCount;
  encountersPerOpponent?: number;
  qualifying?: {
    enabled: boolean;
    teamsEntering: number;
    teamsQualifying: number;
  };
  balancedDraw?: boolean;
  useSeeding?: boolean;
}

export interface Group {
  id: string;
  name: string;
  teams: Team[];
  standings: RoundRobinStanding[];
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  theme: string;
  settings: TournamentSettings;
  status: TournamentStatus;
  teams: Team[];
  matches: Match[];
  standings: RoundRobinStanding[];
  groups?: Group[];
  phase?: TournamentPhase;
  winner: Team | null;
  runnerUp: Team | null;
  thirdPlace: Team | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  currentRound: number;
  totalRounds: number;
}

export type Screen =
  | { name: 'home' }
  | { name: 'teams' }
  | { name: 'create-tournament'; seasonFrom?: string; nonce?: string }
  | { name: 'tournament'; id: string }
  | { name: 'bracket'; id: string }
  | { name: 'match'; matchId: string; tournamentId: string }
  | { name: 'history' }
  | { name: 'team-details'; teamId: string }
  | { name: 'team-match-history'; teamId: string }
  | { name: 'team-builder'; teamId?: string }
  | { name: 'head-to-head' }
  | { name: 'settings' };

export const TOURNAMENT_THEMES = [
  { id: 'medieval', label: 'Medieval', emoji: '⚔️' },
  { id: 'space', label: 'Space', emoji: '🚀' },
  { id: 'animals', label: 'Animals', emoji: '🦁' },
  { id: 'robots', label: 'Robots', emoji: '🤖' },
  { id: 'fantasy', label: 'Fantasy', emoji: '🐉' },
  { id: 'superheroes', label: 'Superheroes', emoji: '🦸' },
  { id: 'custom', label: 'Custom', emoji: '✨' },
] as const;

export const TEAM_EMOJIS = [
  '⚔️','🛡️','🔥','❄️','⚡','🌊','🌪️','🌑',
  '🦁','🐯','🦊','🐺','🦅','🐉','🦄','🐻',
  '🤖','👾','👻','💀','🧟','🧙','🧝','🧚',
  '🚀','⭐','🌙','☀️','🌋','💎','🔮','🗡️',
  '🏴‍☠️','🎭','🎯','🏹','🛸','💣','🧲','🪄',
];

export const TEAM_COLORS = [
  '#B88A2A','#EF4444','#F97316','#EAB308','#22C55E',
  '#06B6D4','#3B82F6','#8B5CF6','#EC4899',
  '#14B8A6','#F59E0B','#84CC16','#6366F1',
  '#FFFFFF','#94A3B8','#64748B','#1E293B',
];
