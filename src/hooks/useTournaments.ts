import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Tournament, Team, TournamentSettings, Match, Group } from '../core/models/types';
import {
  loadTournaments,
  upsertTournament,
  deleteTournament as deleteTournamentStorage,
  renameTournament as renameTournamentStorage,
  getTournamentById,
  subscribeToDataChanges,
  recomputeTeamCareersOnly,
} from '../core/storage/storage';
import {
  buildSingleEliminationBracket,
  buildRoundRobinMatches,
  buildGroupStage,
  getTotalRounds,
  advanceSingleElimination,
  advanceRoundRobin,
  advanceGroupStage,
  simulateSingleMatch,
  progressTournament,
} from '../core/engine/bracketEngine';
import { simulateMatch as simulateMatchEngine } from '../core/engine/simulationEngine';
import type { MatchResult } from './useSimulationContext';
import {
  buildTournamentWithQualifying,
  advanceQualifyingRound,
  simulateAllQualifying,
  transitionToGroupStage,
  isQualifyingComplete,
} from '../core/engine/qualifyingEngine';

export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>(() => loadTournaments());

  // Subscribe to data changes so the state re-hydrates after initStorage()
  // completes (which runs after the first render). Without this, the state
  // initialized from the empty pre-init cache would stay empty forever.
  useEffect(() => {
    return subscribeToDataChanges(() => setTournaments(loadTournaments()));
  }, []);

  const refresh = useCallback(() => setTournaments(loadTournaments()), []);

  const createTournament = useCallback(
    (
      name: string,
      description: string,
      theme: string,
      teams: Team[],
      settings: TournamentSettings,
    ): Tournament => {
      const id = uuidv4();
      let matches: Match[];
      let groups: Group[] | undefined;
      let totalRounds: number;
      let phase: Tournament['phase'] | undefined;

      const qualifyingResult = buildTournamentWithQualifying(id, teams, settings);
      if (qualifyingResult) {
        matches = qualifyingResult.matches;
        groups = qualifyingResult.groups;
        totalRounds = qualifyingResult.totalRounds;
        phase = qualifyingResult.phase;
      } else if (settings.format === 'group-stage') {
        const numGroups = settings.numGroups ?? 2;
        const teamsPerGroup = settings.teamsPerGroup ?? 4;
        const qualifyPerGroup = settings.qualifyPerGroup ?? 2;
        const thirdPlace = settings.thirdPlaceMatch;
        const encounters = settings.encountersPerOpponent ?? 1;
        const result = buildGroupStage(id, teams, numGroups, teamsPerGroup, qualifyPerGroup, thirdPlace, encounters, settings.balancedDraw ?? false, settings.useSeeding ?? false);
        matches = result.matches;
        groups = result.groups;
        totalRounds = result.totalRounds;
      } else if (settings.format === 'round-robin') {
        const encounters = settings.encountersPerOpponent ?? 1;
        matches = buildRoundRobinMatches(id, teams, encounters);
        totalRounds = getTotalRounds(teams.length, settings.format, encounters);
      } else {
        matches = buildSingleEliminationBracket(id, teams);
        totalRounds = getTotalRounds(teams.length, settings.format);
      }

      const tournament: Tournament = {
        id,
        name,
        description,
        theme,
        settings,
        status: 'draft',
        teams,
        matches,
        standings: [],
        groups,
        phase: phase ?? (settings.format === 'group-stage' ? 'group' : undefined),
        winner: null,
        runnerUp: null,
        thirdPlace: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        currentRound: 0,
        totalRounds,
      };

      upsertTournament(tournament);
      setTournaments(loadTournaments());
      return tournament;
    },
    [],
  );

  const startTournament = useCallback((id: string): Tournament | null => {
    const t = getTournamentById(id);
    if (!t) return null;
    const updated: Tournament = {
      ...t,
      status: 'active',
      startedAt: new Date().toISOString(),
      currentRound: 1,
    };
    upsertTournament(updated);
    setTournaments(loadTournaments());
    return updated;
  }, []);

  const simulateNextRound = useCallback((id: string): Tournament | null => {
    const t = getTournamentById(id);
    if (!t || t.status !== 'active') return null;

    // For knockout formats, progression is fully automatic after each match.
    // The Next Round button must never modify tournament data for these formats.
    if (t.settings.format === 'single-elimination' || t.settings.format === 'double-elimination') {
      return t;
    }

    if (t.phase === 'qualifying') {
      const updated = advanceQualifyingRound(t);
      upsertTournament(updated);
      setTournaments(loadTournaments());
      return updated;
    }

    const updated =
      t.settings.format === 'group-stage'
        ? advanceGroupStage(t)
        : advanceRoundRobin(t);

    upsertTournament(updated);
    setTournaments(loadTournaments());
    return updated;
  }, []);

  const simulateAll = useCallback((id: string): Tournament | null => {
    let t = getTournamentById(id);
    if (!t) return null;
    if (t.status === 'draft') {
      t = { ...t, status: 'active', startedAt: new Date().toISOString(), currentRound: 1 };
    }

    let iterations = 0;
    while (t.status !== 'completed' && iterations < 50) {
      if (t.phase === 'qualifying') {
        t = advanceQualifyingRound(t);
      } else {
        t =
          t.settings.format === 'group-stage'
            ? advanceGroupStage(t)
            : t.settings.format === 'round-robin'
              ? advanceRoundRobin(t)
              : advanceSingleElimination(t);
      }
      // Recompute careers in-place so later rounds see updated strength
      // from earlier rounds in this same batch.
      recomputeTeamCareersOnly();
      iterations++;
    }

    upsertTournament(t);
    setTournaments(loadTournaments());
    return t;
  }, []);

  const simulateMatch = useCallback((id: string, matchId: string): Tournament | null => {
    const t = getTournamentById(id);
    if (!t) return null;

    if (t.phase === 'qualifying') {
      const match = t.matches.find((m) => m.id === matchId);
      if (!match || match.phase !== 'qualifying' || match.status !== 'pending' || !match.teamA || !match.teamB) return t;
      const result = simulateMatchEngine(match.teamA, match.teamB);
      const updatedMatches = t.matches.map((m) =>
        m.id === matchId
          ? { ...m, winner: result.winner, loser: result.loser, scoreA: result.scoreA, scoreB: result.scoreB, events: [], status: 'completed' as const }
          : m,
      );
      let updated: Tournament = { ...t, matches: updatedMatches };
      if (isQualifyingComplete(updated.matches)) {
        updated = transitionToGroupStage(updated);
      }
      upsertTournament(updated);
      setTournaments(loadTournaments());
      return updated;
    }

    const updated = simulateSingleMatch(t, matchId);
    upsertTournament(updated);
    setTournaments(loadTournaments());
    return updated;
  }, []);

  const simulateGroup = useCallback((id: string, groupId: string): Tournament | null => {
    let t = getTournamentById(id);
    if (!t || t.status !== 'active') return null;

    let iterations = 0;
    while (iterations < 50) {
      const pending = t.matches.filter(
        (m) => m.groupId === groupId && m.status === 'pending' && m.teamA && m.teamB && !m.isBye,
      );
      if (pending.length === 0) break;

      const pendingRounds = [...new Set(pending.map((m) => m.round))].sort((a, b) => a - b);
      const currentRound = pendingRounds[0];

      const updatedMatches = t.matches.map((m) => {
        if (m.round !== currentRound || m.status !== 'pending' || !m.teamA || !m.teamB || m.isBye) return m;
        if (m.groupId !== groupId) return m;
        const result = simulateMatchEngine(m.teamA, m.teamB);
        return { ...m, winner: result.winner, loser: result.loser, scoreA: result.scoreA, scoreB: result.scoreB, events: [], status: 'completed' as const };
      });
      t = progressTournament(t, updatedMatches);
      // Recompute careers in-place so later rounds in this group see updated
      // strength from earlier rounds.
      recomputeTeamCareersOnly();
      iterations++;
    }

    upsertTournament(t);
    setTournaments(loadTournaments());
    return t;
  }, []);

  const simulateGroupStage = useCallback((id: string): Tournament | null => {
    let t = getTournamentById(id);
    if (!t || t.status !== 'active') return null;

    if (t.phase === 'qualifying') {
      t = simulateAllQualifying(t);
      upsertTournament(t);
      setTournaments(loadTournaments());
      return t;
    }

    let iterations = 0;
    while (t.status === 'active' && t.phase === 'group' && iterations < 50) {
      t = advanceGroupStage(t);
      // Recompute careers in-place so later group rounds see updated strength.
      recomputeTeamCareersOnly();
      iterations++;
    }

    upsertTournament(t);
    setTournaments(loadTournaments());
    return t;
  }, []);

  const simulateKnockoutRound = useCallback((id: string): Tournament | null => {
    let t = getTournamentById(id);
    if (!t || t.status !== 'active') return null;

    if (t.phase === 'qualifying') {
      t = advanceQualifyingRound(t);
      upsertTournament(t);
      setTournaments(loadTournaments());
      return t;
    }

    const koMatches = t.matches.filter(
      (m) => m.phase === 'knockout' || (!m.phase && t.settings.format !== 'round-robin'),
    );
    const pending = koMatches.filter((m) => m.status === 'pending' && m.teamA && m.teamB && !m.isBye);
    if (pending.length === 0) return t;

    const pendingRounds = [...new Set(pending.map((m) => m.round))].sort((a, b) => a - b);
    const currentRound = pendingRounds[0];

    const updatedMatches = t.matches.map((m) => {
      if (m.round !== currentRound || m.status !== 'pending' || !m.teamA || !m.teamB || m.isBye) return m;
      const result = simulateMatchEngine(m.teamA, m.teamB);
      return { ...m, winner: result.winner, loser: result.loser, scoreA: result.scoreA, scoreB: result.scoreB, events: [], status: 'completed' as const };
    });
    t = progressTournament(t, updatedMatches);

    upsertTournament(t);
    setTournaments(loadTournaments());
    return t;
  }, []);

  const updateTournament = useCallback((tournament: Tournament): void => {
    upsertTournament(tournament);
    setTournaments(loadTournaments());
  }, []);

  const removeTournament = useCallback((id: string): void => {
    deleteTournamentStorage(id);
    setTournaments(loadTournaments());
  }, []);

  const renameTournament = useCallback((id: string, newName: string): void => {
    renameTournamentStorage(id, newName);
    setTournaments(loadTournaments());
  }, []);

  /** Apply pre-computed match results (from live simulation) without
   *  re-simulating. This guarantees the persisted score matches what was
   *  shown during the animation. */
  const applyMatchResults = useCallback((id: string, results: MatchResult[]): Tournament | null => {
    let t = getTournamentById(id);
    if (!t) return null;
    if (results.length === 0) return t;

    const resultMap = new Map(results.map((r) => [r.matchId, r]));

    // Apply each pre-computed result to its match.
    const updatedMatches = t.matches.map((m) => {
      const r = resultMap.get(m.id);
      if (!r) return m;
      return {
        ...m,
        winner: r.winner,
        loser: r.loser,
        scoreA: r.scoreA,
        scoreB: r.scoreB,
        events: [],
        status: 'completed' as const,
      };
    });

    t = progressTournament({ ...t, matches: updatedMatches }, updatedMatches);
    recomputeTeamCareersOnly();

    upsertTournament(t);
    setTournaments(loadTournaments());
    return t;
  }, []);

  const applyMatchResult = useCallback((id: string, matchId: string, winnerId: string): Tournament | null => {
    const all = loadTournaments();
    const t = all.find((t) => t.id === id);
    if (!t) return null;
    const match = t.matches.find((m) => m.id === matchId);
    if (!match || !match.teamA || !match.teamB) return null;
    const winner = match.teamA.id === winnerId ? match.teamA : match.teamB;
    const loser = match.teamA.id === winnerId ? match.teamB : match.teamA;
    const scoreA = winnerId === match.teamA.id ? 4 : 0;
    const scoreB = winnerId === match.teamB.id ? 4 : 0;
    const updatedMatches = t.matches.map((m) =>
      m.id === matchId
        ? { ...m, winner, loser, scoreA, scoreB, events: [], status: 'completed' as const }
        : m,
    );
    const updated = progressTournament({ ...t, matches: updatedMatches }, updatedMatches);
    upsertTournament(updated);
    setTournaments(loadTournaments());
    return updated;
  }, []);

  return {
    tournaments,
    createTournament,
    startTournament,
    simulateNextRound,
    simulateAll,
    simulateMatch,
    simulateGroup,
    simulateGroupStage,
    simulateKnockoutRound,
    applyMatchResult,
    applyMatchResults,
    updateTournament,
    removeTournament,
    renameTournament,
    refresh,
  };
}
