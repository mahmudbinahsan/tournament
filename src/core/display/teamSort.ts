import type { Team } from '../models/types';
import { teamStrength, winRate } from '../models/types';

export type TeamSortKey =
  | 'az'
  | 'strongest'
  | 'championships'
  | 'winpct'
  | 'wins'
  | 'matches';

export const SORT_OPTIONS: { key: TeamSortKey; label: string }[] = [
  { key: 'strongest', label: 'Strongest' },
  { key: 'az', label: 'A–Z' },
  { key: 'championships', label: '🏆 Titles' },
  { key: 'winpct', label: 'Win %' },
  { key: 'wins', label: 'Most Wins' },
  { key: 'matches', label: 'Most Matches' },
];

const comparers: Record<TeamSortKey, (a: Team, b: Team) => number> = {
  az: (a, b) => a.name.localeCompare(b.name),
  strongest: (a, b) => teamStrength(b) - teamStrength(a),
  championships: (a, b) => b.career.championships - a.career.championships,
  winpct: (a, b) => winRate(b.career) - winRate(a.career),
  wins: (a, b) => b.career.wins - a.career.wins,
  matches: (a, b) => b.career.totalBattles - a.career.totalBattles,
};

export function sortTeams(teams: Team[], key: TeamSortKey = 'strongest'): Team[] {
  const cmp = comparers[key];
  return [...teams].sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name));
}
