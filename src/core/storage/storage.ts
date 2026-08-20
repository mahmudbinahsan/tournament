import { get, set, createStore, type UseStore } from 'idb-keyval';
import type { Tournament, Team, TeamCareer, RecentMatch } from '../models/types';
import { emptyCareer, RECENT_WINDOW_SIZE } from '../models/types';

const KEYS = {
  tournaments: 'tournamentverse_tournaments',
  teams: 'tournamentverse_teams',
  settings: 'tournamentverse_settings',
  lastGroupConfig: 'tournamentverse_last_group_config',
  schemaVersion: 'tournamentverse_schema_version',
} as const;

const SCHEMA_VERSION = 2;

export interface LastGroupConfig {
  numGroups: number;
  teamsPerGroup: number;
  qualifyPerGroup: number;
}

// ─── IndexedDB store ──────────────────────────────────────────────────────────
// A SINGLE idb-keyval store holds both tournaments and teams under separate
// keys. This avoids the idb-keyval multi-store pitfall: createStore() calls
// indexedDB.open() without a version, so the second store's
// onupgradeneeded never fires and the store is never created. Using one store
// with two keys sidesteps the entire problem.
//
// The store is created lazily inside initStorage() so that a failure to open
// IndexedDB never crashes the module import or prevents the app from
// rendering. If IndexedDB is unavailable, corrupted, or blocked, initStorage
// falls back to localStorage so the app always launches.

const DB_NAME = 'tournamentverse-db';
const STORE_NAME = 'kv';

let store: UseStore | null = null;

// ─── In-memory cache ──────────────────────────────────────────────────────────
// The cache always holds tournaments with RESOLVED Team objects (references
// to the canonical entries in teamCache). This means all existing engine and
// UI code works unchanged — match.teamA.name, match.winner.emoji, etc. all
// resolve transparently.
//
// The persistence layer serializes Team objects to IDs before writing to
// IndexedDB, and deserializes IDs back to Team objects on load. This gives
// us normalized storage (each team persisted once) with zero changes to
// consuming code.
//
// Because the resolved Team objects in matches ARE the same references as
// the canonical objects in teamCache, when recomputeTeamCareers() mutates
// team.career in-place, every match referencing that team automatically
// sees the updated career — giving us "live strength" for free.

let tournamentCache: Tournament[] = [];
let teamCache: Team[] = [];

// O(1) lookup index: teamId → Team (includes soft-deleted teams)
let teamIndex: Map<string, Team> = new Map();

let initialized = false;

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors — data is non-critical if IDB is the primary store
  }
}

// ─── Team index management ────────────────────────────────────────────────────

function rebuildTeamIndex(): void {
  teamIndex = new Map(teamCache.map((t) => [t.id, t]));
}

// ─── Serialization / Deserialization ──────────────────────────────────────────
//
// The persistence layer stores only Team IDs inside tournaments. The
// in-memory cache stores resolved Team object references. These functions
// convert between the two representations at the persistence boundary.

function toId(ref: Team | string | null | undefined): string | null {
  if (ref === null || ref === undefined) return null;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object' && 'id' in ref) return ref.id;
  return null;
}

function fromId(ref: Team | string | null | undefined): Team | null {
  if (ref === null || ref === undefined) return null;
  if (typeof ref === 'string') return teamIndex.get(ref) ?? null;
  if (typeof ref === 'object' && 'id' in ref) {
    const id = (ref as Team).id;
    return teamIndex.get(id) ?? (ref as Team);
  }
  return null;
}

function serializeTournament(t: Tournament): Tournament {
  return {
    ...t,
    teams: t.teams.map((tm) => toId(tm) as unknown as Team),
    matches: t.matches.map((m) => ({
      ...m,
      teamA: toId(m.teamA) as unknown as Team,
      teamB: toId(m.teamB) as unknown as Team,
      winner: toId(m.winner) as unknown as Team,
      loser: toId(m.loser) as unknown as Team,
    })),
    groups: t.groups?.map((g) => ({
      ...g,
      teams: g.teams.map((tm) => toId(tm) as unknown as Team),
      standings: g.standings.map((s) => ({
        ...s,
        team: toId(s.team) as unknown as Team,
      })),
    })),
    winner: toId(t.winner) as unknown as Team,
    runnerUp: toId(t.runnerUp) as unknown as Team,
    thirdPlace: toId(t.thirdPlace) as unknown as Team,
  };
}

function deserializeTournament(t: Tournament): Tournament {
  return {
    ...t,
    teams: t.teams.map((tm) => fromId(tm) as Team),
    matches: t.matches.map((m) => ({
      ...m,
      teamA: fromId(m.teamA) as Team | null,
      teamB: fromId(m.teamB) as Team | null,
      winner: fromId(m.winner) as Team | null,
      loser: fromId(m.loser) as Team | null,
    })),
    groups: t.groups?.map((g) => ({
      ...g,
      teams: g.teams.map((tm) => fromId(tm) as Team),
      standings: g.standings.map((s) => ({
        ...s,
        team: fromId(s.team) as Team,
      })),
    })),
    winner: fromId(t.winner) as Team | null,
    runnerUp: fromId(t.runnerUp) as Team | null,
    thirdPlace: fromId(t.thirdPlace) as Team | null,
  };
}

/**
 * Re-resolve all tournament team references from the canonical team store.
 * Called after team data changes (upsertTeam, deleteTeam, import) so that
 * matches always point to the latest canonical Team objects.
 */
function resolveAllTournaments(): void {
  tournamentCache = tournamentCache.map(deserializeTournament);
}

// ─── Migration: v1 → v2 ────────────────────────────────────────────────────────
//
// v1 stored full Team objects inside every match slot (teamA, teamB, winner,
// loser), inside tournament.teams, tournament.winner/runnerUp/thirdPlace,
// inside group.teams, and inside group.standings[].team.
//
// v2 stores only Team IDs in all those positions. Team objects live exactly
// once in the teams store. This migration converts all existing v1 data
// to IDs, collecting any orphaned teams (not in the teams store) and adding
// them so no data is lost.

function migrateTournament(t: Tournament): Tournament {
  if ((t as unknown as { _schemaVersion?: number })._schemaVersion === 2) return t;

  const result = serializeTournament(t);
  (result as unknown as { _schemaVersion?: number })._schemaVersion = 2;
  return result;
}

/**
 * During migration, collect embedded Team objects from v1 tournament data
 * that are not already in the teams store, and add them. This ensures no
 * team data is lost when converting from embedded snapshots to IDs.
 */
function collectOrphanedTeams(tournaments: Tournament[]): Team[] {
  const orphaned: Team[] = [];
  const seen = new Set<string>(teamCache.map((t) => t.id));

  for (const t of tournaments) {
    const collectFrom = (ref: unknown): void => {
      if (!ref || typeof ref !== 'object') return;
      const team = ref as Team;
      if (!team.id || seen.has(team.id)) return;
      seen.add(team.id);
      orphaned.push({
        ...team,
        career: team.career ?? emptyCareer(),
        deletedAt: team.deletedAt ?? null,
      });
    };

    t.teams.forEach(collectFrom);
    t.matches.forEach((m) => {
      collectFrom(m.teamA);
      collectFrom(m.teamB);
      collectFrom(m.winner);
      collectFrom(m.loser);
    });
    t.groups?.forEach((g) => {
      g.teams.forEach(collectFrom);
      g.standings.forEach((s) => collectFrom(s.team));
    });
    collectFrom(t.winner);
    collectFrom(t.runnerUp);
    collectFrom(t.thirdPlace);
  }

  return orphaned;
}

// ─── Initialization & migration ───────────────────────────────────────────────

export async function initStorage(): Promise<void> {
  if (initialized) return;

  let idbAvailable = false;
  try {
    store = createStore(DB_NAME, STORE_NAME);
    await get(KEYS.tournaments, store);
    idbAvailable = true;
  } catch {
    store = null;
  }

  if (idbAvailable) {
    try {
      const [idbTournaments, idbTeams, idbSchemaVersion] = await Promise.all([
        get<Tournament[]>(KEYS.tournaments, store!),
        get<Team[]>(KEYS.teams, store!),
        get<number>(KEYS.schemaVersion, store!),
      ]);

      const hasIdbData =
        (idbTournaments !== undefined && idbTournaments.length > 0) ||
        (idbTeams !== undefined && idbTeams.length > 0);

      if (hasIdbData) {
        teamCache = (idbTeams ?? []).map((t) => ({
          ...t,
          career: t.career ?? emptyCareer(),
          deletedAt: t.deletedAt ?? null,
        }));

        const needsMigration = idbSchemaVersion !== SCHEMA_VERSION;
        let rawTournaments = idbTournaments ?? [];

        if (needsMigration) {
          // Collect orphaned teams from v1 embedded data before migrating
          const orphaned = collectOrphanedTeams(rawTournaments);
          if (orphaned.length > 0) {
            teamCache.push(...orphaned);
          }
          rawTournaments = rawTournaments.map(migrateTournament);
        }

        rebuildTeamIndex();
        tournamentCache = rawTournaments.map(deserializeTournament);

        if (needsMigration) {
          await set(KEYS.schemaVersion, SCHEMA_VERSION, store!);
          await set(KEYS.tournaments, tournamentCache.map(serializeTournament), store!);
          await set(KEYS.teams, teamCache, store!);
        }
      } else {
        // IDB is empty — check localStorage for legacy data to migrate.
        const localTournaments = loadJSON<Tournament[]>(KEYS.tournaments, []);
        const localTeams = loadJSON<Team[]>(KEYS.teams, []);

        if (localTournaments.length > 0 || localTeams.length > 0) {
          teamCache = localTeams.map((t) => ({
            ...t,
            career: t.career ?? emptyCareer(),
            deletedAt: t.deletedAt ?? null,
          }));

          const orphaned = collectOrphanedTeams(localTournaments);
          if (orphaned.length > 0) {
            teamCache.push(...orphaned);
          }

          rebuildTeamIndex();
          tournamentCache = localTournaments.map(migrateTournament).map(deserializeTournament);

          await set(KEYS.schemaVersion, SCHEMA_VERSION, store!);
          await set(KEYS.tournaments, tournamentCache.map(serializeTournament), store!);
          await set(KEYS.teams, teamCache, store!);
        } else {
          tournamentCache = [];
          teamCache = [];
          rebuildTeamIndex();
        }
      }
    } catch {
      store = null;
      teamCache = loadJSON<Team[]>(KEYS.teams, []).map((t) => ({
        ...t,
        career: t.career ?? emptyCareer(),
        deletedAt: t.deletedAt ?? null,
      }));
      const localTournaments = loadJSON<Tournament[]>(KEYS.tournaments, []);
      const orphaned = collectOrphanedTeams(localTournaments);
      if (orphaned.length > 0) teamCache.push(...orphaned);
      rebuildTeamIndex();
      tournamentCache = localTournaments.map(migrateTournament).map(deserializeTournament);
    }
  } else {
    // localStorage fallback — read directly.
    teamCache = loadJSON<Team[]>(KEYS.teams, []).map((t) => ({
      ...t,
      career: t.career ?? emptyCareer(),
      deletedAt: t.deletedAt ?? null,
    }));
    const localTournaments = loadJSON<Tournament[]>(KEYS.tournaments, []);
    const orphaned = collectOrphanedTeams(localTournaments);
    if (orphaned.length > 0) teamCache.push(...orphaned);
    rebuildTeamIndex();
    tournamentCache = localTournaments.map(migrateTournament).map(deserializeTournament);
  }

  initialized = true;
  notifyDataChange();
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function persistTeams(): Promise<void> {
  if (store) {
    await set(KEYS.teams, teamCache, store);
  } else {
    saveJSON(KEYS.teams, teamCache);
  }
}

async function persistTournaments(): Promise<void> {
  const serialized = tournamentCache.map(serializeTournament);
  if (store) {
    await set(KEYS.tournaments, serialized, store);
  } else {
    saveJSON(KEYS.tournaments, serialized);
  }
}

// ─── Data change pub-sub ──────────────────────────────────────────────────────

let dataVersion = 0;
const dataListeners = new Set<() => void>();

export function getDataVersion(): number {
  return dataVersion;
}

export function subscribeToDataChanges(cb: () => void): () => void {
  dataListeners.add(cb);
  return () => dataListeners.delete(cb);
}

function notifyDataChange(): void {
  dataVersion++;
  dataListeners.forEach((cb) => cb());
}

// ─── Last group config (localStorage — small) ────────────────────────────────

export function loadLastGroupConfig(): LastGroupConfig | null {
  return loadJSON<LastGroupConfig | null>(KEYS.lastGroupConfig, null);
}

export function saveLastGroupConfig(config: LastGroupConfig): void {
  saveJSON(KEYS.lastGroupConfig, config);
}

// ─── Tournaments ──────────────────────────────────────────────────────────────

export function loadTournaments(): Tournament[] {
  return tournamentCache;
}

export function getTournamentById(id: string): Tournament | null {
  return tournamentCache.find((t) => t.id === id) ?? null;
}

export function upsertTournament(tournament: Tournament): void {
  const idx = tournamentCache.findIndex((t) => t.id === tournament.id);
  if (idx >= 0) tournamentCache[idx] = tournament;
  else tournamentCache.unshift(tournament);

  persistTournaments().catch((err) => {
    console.error('Failed to persist tournament:', err);
  });

  recomputeTeamCareers();
  notifyDataChange();
}

export function renameTournament(id: string, newName: string): void {
  const idx = tournamentCache.findIndex((t) => t.id === id);
  if (idx < 0) return;
  tournamentCache[idx] = { ...tournamentCache[idx], name: newName };

  persistTournaments().catch((err) => {
    console.error('Failed to persist tournament rename:', err);
  });

  notifyDataChange();
}

export function deleteTournament(id: string): void {
  tournamentCache = tournamentCache.filter((t) => t.id !== id);

  persistTournaments().catch((err) => {
    console.error('Failed to delete tournament:', err);
  });

  recomputeTeamCareers();
  notifyDataChange();
}

// ─── Teams ────────────────────────────────────────────────────────────────────

/**
 * Returns all non-deleted teams. Soft-deleted teams are excluded so they
 * disappear from the team list, but their data survives for historical
 * tournaments.
 */
export function loadTeams(): Team[] {
  return teamCache.filter((t) => !t.deletedAt);
}

/**
 * Returns ALL teams including soft-deleted ones. Used by backup/restore
 * and by code that needs to resolve any team ID to its object.
 */
export function loadAllTeams(): Team[] {
  return teamCache;
}

/**
 * O(1) team lookup by ID. Returns the team even if soft-deleted, so
 * historical tournaments can always resolve their team references.
 */
export function getTeamById(id: string): Team | null {
  return teamIndex.get(id) ?? null;
}

export function upsertTeam(team: Team): void {
  const normalized: Team = {
    ...team,
    career: team.career ?? emptyCareer(),
    deletedAt: team.deletedAt ?? null,
  };
  const idx = teamCache.findIndex((t) => t.id === team.id);
  if (idx >= 0) teamCache[idx] = normalized;
  else teamCache.unshift(normalized);

  teamIndex.set(normalized.id, normalized);

  // Re-resolve all tournament team references so matches point to the
  // updated canonical object (latest name, emoji, color, career).
  resolveAllTournaments();

  persistTeams().catch((err) => {
    console.error('Failed to persist team:', err);
  });
  persistTournaments().catch((err) => {
    console.error('Failed to persist tournaments after team update:', err);
  });

  notifyDataChange();
}

/**
 * Soft-delete a team. The team is marked with a deletedAt timestamp so it
 * disappears from the team list, but its object survives in the teams store
 * so that historical tournaments can still resolve its name, emoji, color,
 * and career.
 */
export function deleteTeam(id: string): void {
  const idx = teamCache.findIndex((t) => t.id === id);
  if (idx < 0) return;
  teamCache[idx] = { ...teamCache[idx], deletedAt: new Date().toISOString() };
  teamIndex.set(teamCache[idx].id, teamCache[idx]);

  persistTeams().catch((err) => {
    console.error('Failed to soft-delete team:', err);
  });

  notifyDataChange();
}

/**
 * Restore a soft-deleted team back to the active list.
 */
export function restoreTeam(id: string): void {
  const idx = teamCache.findIndex((t) => t.id === id);
  if (idx < 0) return;
  teamCache[idx] = { ...teamCache[idx], deletedAt: null };
  teamIndex.set(teamCache[idx].id, teamCache[idx]);

  persistTeams().catch((err) => {
    console.error('Failed to restore team:', err);
  });

  notifyDataChange();
}

/**
 * Recolor every canonical team to a single color. Used by the theme system
 * so that switching themes automatically re-skins all teams to the active
 * theme's default team color.
 *
 * In the normalized architecture, tournament matches store only Team IDs,
 * so there are no embedded snapshots to recolor — the canonical team objects
 * are the single source of truth, and all displays resolve through the O(1)
 * index.
 */
export function recolorAllTeams(color: string): void {
  for (const t of teamCache) {
    t.color = color;
  }

  persistTeams().catch((err) => {
    console.error('Failed to persist recolored teams:', err);
  });

  notifyDataChange();
}

// ─── Team Export / Import ─────────────────────────────────────────────────────

export interface ExportedTeam {
  name: string;
  emoji: string;
  color: string;
}

export interface TeamExportFile {
  version: 1;
  exportedAt: string;
  teams: ExportedTeam[];
}

export function exportTeams(): TeamExportFile {
  const exported: ExportedTeam[] = loadTeams().map((t) => ({
    name: t.name,
    emoji: t.emoji,
    color: t.color,
  }));
  return { version: 1, exportedAt: new Date().toISOString(), teams: exported };
}

export interface ImportSummary {
  imported: number;
  replaced: number;
  skipped: number;
}

export function importTeams(
  file: TeamExportFile,
  mode: 'skip' | 'replace',
): ImportSummary {
  const activeTeams = loadTeams();
  const byName = new Map<string, number>();
  activeTeams.forEach((t, i) => byName.set(t.name.toLowerCase(), i));

  let imported = 0;
  let replaced = 0;
  let skipped = 0;

  for (const incoming of file.teams ?? []) {
    const name = (incoming.name ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const idx = byName.get(key);
    if (idx !== undefined) {
      if (mode === 'replace') {
        const target = activeTeams[idx];
        const updated: Team = {
          ...target,
          name,
          emoji: incoming.emoji ?? target.emoji,
          color: incoming.color ?? target.color,
        };
        upsertTeam(updated);
        replaced++;
      } else {
        skipped++;
      }
    } else {
      const newTeam: Team = {
        id: uuidv4Like(),
        name,
        emoji: incoming.emoji ?? '🏳️',
        color: incoming.color ?? '#B88A2A',
        wins: 0,
        losses: 0,
        draws: 0,
        career: emptyCareer(),
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };
      teamCache.unshift(newTeam);
      teamIndex.set(newTeam.id, newTeam);
      byName.set(key, 0);
      imported++;
    }
  }

  resolveAllTournaments();

  persistTeams().catch((err) =>
    console.error('Failed to persist imported teams:', err),
  );
  persistTournaments().catch((err) =>
    console.error('Failed to persist tournaments after import:', err),
  );

  notifyDataChange();
  return { imported, replaced, skipped };
}

function uuidv4Like(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Career Recomputation ─────────────────────────────────────────────────────
//
// Recomputes career stats for every team from all completed tournament matches.
// Because the in-memory tournament cache holds resolved references to the
// canonical Team objects (not copies), mutating team.career here updates
// every match's team reference simultaneously — giving us live strength
// without any engine changes.

/**
 * Recompute careers from all completed tournament matches and write the
 * results onto the canonical Team objects in-place, WITHOUT persisting.
 * Used between rounds in multi-round simulation loops so that later rounds
 * see the updated career/strength from earlier rounds in the same batch.
 * The caller's final upsertTournament() handles persistence.
 */
export function recomputeTeamCareersOnly(): void {
  computeCareersOntoTeams();
}

export function recomputeTeamCareers(): void {
  computeCareersOntoTeams();

  persistTeams().catch((err) => {
    console.error('Failed to persist team career updates:', err);
  });
}

function computeCareersOntoTeams(): void {
  const careerMap = new Map<string, TeamCareer>();

  for (const team of teamCache) {
    careerMap.set(team.id, emptyCareer());
  }

  const resolveId = (ref: unknown): string | null => {
    if (ref === null || ref === undefined) return null;
    if (typeof ref === 'string') return ref;
    if (typeof ref === 'object' && 'id' in ref) return (ref as { id: string }).id;
    return null;
  };

  // ── Collect all completed matches with tournament timestamps ─────────────
  // For recent-form, we need matches sorted newest-first. We use the
  // tournament's completedAt (or startedAt) as a rough timestamp, plus
  // match round/position as a tiebreaker within a tournament.
  interface MatchRecord {
    teamId: string;
    opponentId: string;
    won: boolean;
    scoreFor: number;
    scoreAgainst: number;
    timestamp: string;
    tournamentCompletedAt: string | null;
    round: number;
    position: number;
  }

  const allMatchRecords: MatchRecord[] = [];

  // ── Pass 1: wins, losses, tournaments, championships ──────────────────
  for (const t of tournamentCache) {
    const playedTeams = new Set<string>();
    for (const m of t.matches) {
      if (m.status !== 'completed' || m.isBye) continue;
      const aId = resolveId(m.teamA);
      const bId = resolveId(m.teamB);
      if (aId) playedTeams.add(aId);
      if (bId) playedTeams.add(bId);
    }

    for (const m of t.matches) {
      if (m.status !== 'completed' || m.isBye) continue;
      const aId = resolveId(m.teamA);
      const bId = resolveId(m.teamB);
      const winnerId = resolveId(m.winner);
      if (!winnerId || !aId || !bId) continue;
      const loserId = winnerId === aId ? bId : aId;

      const winCareer = careerMap.get(winnerId);
      if (winCareer) {
        winCareer.totalBattles++;
        winCareer.wins++;
      }
      const loseCareer = careerMap.get(loserId);
      if (loseCareer) {
        loseCareer.totalBattles++;
        loseCareer.losses++;
      }

      // Collect match records for recent-form
      const scoreA = m.scoreA ?? 0;
      const scoreB = m.scoreB ?? 0;
      const ts = t.completedAt ?? t.startedAt ?? new Date().toISOString();
      allMatchRecords.push({
        teamId: winnerId,
        opponentId: loserId,
        won: true,
        scoreFor: scoreA > scoreB ? scoreA : scoreB,
        scoreAgainst: scoreA > scoreB ? scoreB : scoreA,
        timestamp: ts,
        tournamentCompletedAt: t.completedAt ?? null,
        round: m.round,
        position: m.position,
      });
      allMatchRecords.push({
        teamId: loserId,
        opponentId: winnerId,
        won: false,
        scoreFor: scoreA > scoreB ? scoreB : scoreA,
        scoreAgainst: scoreA > scoreB ? scoreA : scoreB,
        timestamp: ts,
        tournamentCompletedAt: t.completedAt ?? null,
        round: m.round,
        position: m.position,
      });
    }

    if (t.status === 'completed') {
      for (const teamId of playedTeams) {
        const c = careerMap.get(teamId);
        if (c) c.tournamentsPlayed++;
      }
      const winnerId = resolveId(t.winner);
      if (winnerId) {
        const c = careerMap.get(winnerId);
        if (c) c.championships++;
      }
      const runnerUpId = resolveId(t.runnerUp);
      if (runnerUpId) {
        const c = careerMap.get(runnerUpId);
        if (c) c.runnerUps++;
      }
      const thirdPlaceId = resolveId(t.thirdPlace);
      if (thirdPlaceId) {
        const c = careerMap.get(thirdPlaceId);
        if (c) c.thirdPlaces++;
      }
    }
  }

  // ── Pass 2: opponent-quality contributions (for career stats) ────────────
  const baseStrength = new Map<string, number>();
  for (const team of teamCache) {
    const c = careerMap.get(team.id) ?? emptyCareer();
    const battles = c.totalBattles;
    if (battles === 0) { baseStrength.set(team.id, 50); continue; }
    const wr = battles > 0 ? (c.wins / battles) * 100 : 50;
    const confidence = Math.min(1, battles / 20);
    const perf = 20 + (wr / 100) * 60;
    baseStrength.set(team.id, perf * confidence + 50 * (1 - confidence));
  }

  for (const t of tournamentCache) {
    for (const m of t.matches) {
      if (m.status !== 'completed' || m.isBye) continue;
      const aId = resolveId(m.teamA);
      const bId = resolveId(m.teamB);
      const winnerId = resolveId(m.winner);
      if (!winnerId || !aId || !bId) continue;
      const loserId = winnerId === aId ? bId : aId;

      const oppStrengthForWinner = baseStrength.get(loserId) ?? 50;
      const oppStrengthForLoser = baseStrength.get(winnerId) ?? 50;

      const gapForWinner = (oppStrengthForWinner - 50) / 50;
      const gapForLoser   = (oppStrengthForLoser   - 50) / 50;

      const winContribution  = (0.5 + gapForWinner) * 0.5;
      const lossContribution = (0.5 + gapForLoser)   * 0.5;

      const winCareer = careerMap.get(winnerId);
      if (winCareer) {
        winCareer.qualityPoints += winContribution;
        winCareer.qualityWeight += winContribution;
      }
      const loseCareer = careerMap.get(loserId);
      if (loseCareer) {
        loseCareer.qualityPoints -= lossContribution;
        loseCareer.qualityWeight += lossContribution;
      }
    }
  }

  // ── Pass 3: Build recent-form per team ────────────────────────────────────
  // Sort all match records newest-first (by timestamp, then round, then position).
  allMatchRecords.sort((a, b) => {
    // Completed tournaments first (by completedAt desc), then in-progress
    // (by startedAt desc). Within same timestamp, higher round/position = newer.
    const aTime = a.tournamentCompletedAt ?? a.timestamp;
    const bTime = b.tournamentCompletedAt ?? b.timestamp;
    if (bTime !== aTime) return bTime.localeCompare(aTime);
    if (b.round !== a.round) return b.round - a.round;
    return b.position - a.position;
  });

  const recentByTeam = new Map<string, RecentMatch[]>();
  for (const rec of allMatchRecords) {
    const arr = recentByTeam.get(rec.teamId) ?? [];
    if (arr.length < RECENT_WINDOW_SIZE) {
      arr.push({
        opponentStrength: baseStrength.get(rec.opponentId) ?? 50,
        won: rec.won,
        scoreFor: rec.scoreFor,
        scoreAgainst: rec.scoreAgainst,
        timestamp: rec.timestamp,
      });
    }
    recentByTeam.set(rec.teamId, arr);
  }

  for (const team of teamCache) {
    const c = careerMap.get(team.id) ?? emptyCareer();
    c.recentMatches = recentByTeam.get(team.id) ?? [];
    team.career = c;
    team.wins = c.wins;
    team.losses = c.losses;
  }
}

// ─── Full Backup / Restore ────────────────────────────────────────────────────

export interface AppBackup {
  backupVersion: 1;
  appVersion: string;
  exportedAt: string;
  data: {
    tournaments: Tournament[];
    teams: Team[];
    settings: unknown;
    lastGroupConfig: LastGroupConfig | null;
  };
}

export function exportBackup(): AppBackup {
  return {
    backupVersion: 1,
    appVersion: '0.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      tournaments: tournamentCache.map(serializeTournament),
      teams: [...teamCache],
      settings: loadJSON<unknown>(KEYS.settings, null),
      lastGroupConfig: loadLastGroupConfig(),
    },
  };
}

export type BackupValidationResult =
  | { ok: true; backup: AppBackup }
  | { ok: false; error: string };

export function validateBackup(raw: unknown): BackupValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid file: not a valid backup object.' };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.backupVersion !== 1) {
    return { ok: false, error: 'Unsupported backup version. Expected v1.' };
  }
  if (typeof obj.exportedAt !== 'string') {
    return { ok: false, error: 'Invalid file: missing export timestamp.' };
  }
  if (!obj.data || typeof obj.data !== 'object') {
    return { ok: false, error: 'Invalid file: backup data is missing.' };
  }
  const data = obj.data as Record<string, unknown>;
  if (!Array.isArray(data.tournaments) || !Array.isArray(data.teams)) {
    return { ok: false, error: 'Invalid file: tournaments or teams data is corrupted.' };
  }
  return { ok: true, backup: obj as unknown as AppBackup };
}

export async function restoreBackup(backup: AppBackup): Promise<void> {
  const tournaments = backup.data.tournaments ?? [];
  const teams = backup.data.teams ?? [];

  teamCache = teams.map((t) => ({
    ...t,
    career: t.career ?? emptyCareer(),
    deletedAt: t.deletedAt ?? null,
  }));

  // Collect any orphaned teams from backup tournament data
  const orphaned = collectOrphanedTeams(tournaments);
  if (orphaned.length > 0) {
    const seen = new Set(teamCache.map((t) => t.id));
    for (const ot of orphaned) {
      if (!seen.has(ot.id)) {
        teamCache.push(ot);
      }
    }
  }

  rebuildTeamIndex();
  tournamentCache = tournaments.map(migrateTournament).map(deserializeTournament);

  await Promise.all([persistTeams(), persistTournaments()]);
  if (store) {
    await set(KEYS.schemaVersion, SCHEMA_VERSION, store);
  }

  if (backup.data.settings !== undefined && backup.data.settings !== null) {
    saveJSON(KEYS.settings, backup.data.settings);
  }
  if (backup.data.lastGroupConfig) {
    saveJSON(KEYS.lastGroupConfig, backup.data.lastGroupConfig);
  }

  recomputeTeamCareers();
  notifyDataChange();
}
