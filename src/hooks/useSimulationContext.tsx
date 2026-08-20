import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { Match, Tournament, Team } from '../core/models/types';
import { simulateMatchBattles, type BattleStep } from '../core/engine/simulationEngine';
import { loadSettings, SIM_DURATIONS } from '../core/storage/settings';

/** Pre-computed final result for a single match, used by applySync
 *  so the persisted score is exactly what was shown during the animation. */
export interface MatchResult {
  matchId: string;
  scoreA: number;
  scoreB: number;
  winner: Team;
  loser: Team;
}

export interface MatchSimulationState {
  status: 'idle' | 'live' | 'done';
  scoreA: number;
  scoreB: number;
  steps: BattleStep[];
  stepIndex: number;
  matchIds: Set<string>;
}

export interface SimulationContextValue {
  /** Map of matchId → live simulation state. */
  liveStates: Map<string, MatchSimulationState>;
  /** Set of all match IDs currently being simulated. */
  simulatingMatchIds: Set<string>;
  /** Whether any simulation is currently running. */
  isSimulating: boolean;
  /** Start simulating a set of matches. The applySync callback is called once
   *  all matches reach their final state to persist the results. It receives
   *  the pre-computed match results so it does NOT re-simulate. */
  startSimulation: (
    matches: Match[],
    flagId: string,
    applySync: (results: MatchResult[]) => Tournament | null,
    onComplete?: (tournament: Tournament | null) => void,
  ) => void;
  /** Cancel all running simulations. */
  cancelSimulation: () => void;
  /** Get the live score for a single match (a, b) or null if not simulating. */
  getLiveScore: (matchId: string) => { a: number; b: number } | null;
  /** Check if a specific match is currently being simulated. */
  isMatchSimulating: (matchId: string) => boolean;
  /** Get the full simulation state for a match (for the popup). */
  getMatchState: (matchId: string) => MatchSimulationState | null;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}

/** Extract the final result from each match's battle steps. */
function buildResults(states: Map<string, MatchSimulationState>): MatchResult[] {
  const results: MatchResult[] = [];
  for (const [matchId, state] of states) {
    const final = state.steps[state.steps.length - 1];
    if (!final) continue;
    results.push({
      matchId,
      scoreA: final.scoreA,
      scoreB: final.scoreB,
      winner: final.winner,
      loser: final.loser,
    });
  }
  return results;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [liveStates, setLiveStates] = useState<Map<string, MatchSimulationState>>(new Map());
  const [simulatingMatchIds, setSimulatingMatchIds] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cancelledRef = useRef(false);
  // Mutable refs so the tick callbacks can access the latest without
  // re-creating timeouts.
  const statesRef = useRef<Map<string, MatchSimulationState>>(new Map());
  const applySyncRef = useRef<((results: MatchResult[]) => Tournament | null) | null>(null);
  const onCompleteRef = useRef<((t: Tournament | null) => void) | null>(null);

  const isSimulating = simulatingMatchIds.size > 0;

  const getDurationMs = useCallback((): number => {
    const dur = loadSettings().simDuration;
    return SIM_DURATIONS.find((d) => d.id === dur)?.ms ?? 0;
  }, []);

  const syncToState = useCallback(() => {
    setLiveStates(new Map(statesRef.current));
    setSimulatingMatchIds(new Set([...statesRef.current.keys()]));
  }, []);

  const clearAll = useCallback(() => {
    statesRef.current = new Map();
    setLiveStates(new Map());
    setSimulatingMatchIds(new Set());
  }, []);

  const cancelSimulation = useCallback(() => {
    cancelledRef.current = true;
    for (const [, handle] of timeoutsRef.current) clearTimeout(handle);
    timeoutsRef.current = new Map();
    clearAll();
    applySyncRef.current = null;
    onCompleteRef.current = null;
  }, [clearAll]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      for (const [, handle] of timeoutsRef.current) clearTimeout(handle);
    };
  }, []);

  const startSimulation = useCallback<
    SimulationContextValue['startSimulation']
  >(
    (matches, _flagId, applySync, onComplete) => {
      const playable = matches.filter(
        (m) => m.status === 'pending' && m.teamA && m.teamB && !m.isBye,
      );
      if (playable.length === 0) {
        const t = applySync([]);
        onComplete?.(t);
        return;
      }

      const durationMs = getDurationMs();
      cancelledRef.current = false;
      applySyncRef.current = applySync;
      onCompleteRef.current = onComplete ?? null;

      // Build battle steps for each match.
      const newStates = new Map<string, MatchSimulationState>();
      for (const m of playable) {
        const steps = simulateMatchBattles(m.teamA!, m.teamB!);
        newStates.set(m.id, {
          status: 'live',
          scoreA: 0,
          scoreB: 0,
          steps,
          stepIndex: -1,
          matchIds: new Set(playable.map((p) => p.id)),
        });
      }
      statesRef.current = newStates;
      syncToState();

      // Instant mode: apply immediately.
      if (durationMs === 0) {
        // Jump to final step for all matches.
        for (const [, state] of statesRef.current) {
          state.stepIndex = state.steps.length - 1;
          const final = state.steps[state.steps.length - 1];
          state.scoreA = final.scoreA;
          state.scoreB = final.scoreB;
          state.status = 'done';
        }
        syncToState();
        const results = buildResults(statesRef.current);
        const t = applySyncRef.current(results);
        onCompleteRef.current?.(t);
        clearAll();
        applySyncRef.current = null;
        onCompleteRef.current = null;
        return;
      }

      // Live mode: each match runs independently with its own timer.
      // Timing varies naturally between 4–10s per battle result.
      // A match completes immediately when either team reaches 4 wins,
      // regardless of other matches' progress.
      for (const [, handle] of timeoutsRef.current) clearTimeout(handle);
      timeoutsRef.current = new Map();

      const MIN_TICK_MS = 4000;
      const MAX_TICK_MS = 10000;
      const randomTick = () =>
        MIN_TICK_MS + Math.random() * (MAX_TICK_MS - MIN_TICK_MS);

      const maybeFinishAll = () => {
        const allDone = [...statesRef.current.values()].every(
          (s) => s.stepIndex >= s.steps.length - 1,
        );
        if (!allDone) return;

        for (const [, state] of statesRef.current) {
          state.status = 'done';
        }
        syncToState();
        const results = buildResults(statesRef.current);
        const t = applySyncRef.current?.(results) ?? null;
        onCompleteRef.current?.(t);
        clearAll();
        applySyncRef.current = null;
        onCompleteRef.current = null;
      };

      const tickMatch = (matchId: string) => {
        if (cancelledRef.current) {
          timeoutsRef.current.delete(matchId);
          return;
        }

        const state = statesRef.current.get(matchId);
        if (!state) return;

        // Advance exactly one battle.
        if (state.stepIndex < state.steps.length - 1) {
          state.stepIndex++;
          state.scoreA = state.steps[state.stepIndex].scoreA;
          state.scoreB = state.steps[state.stepIndex].scoreB;

          // If either team has reached 4 wins, this match is done —
          // skip any remaining steps so it completes immediately.
          if (state.scoreA >= 4 || state.scoreB >= 4) {
            state.stepIndex = state.steps.length - 1;
            const final = state.steps[state.stepIndex];
            state.scoreA = final.scoreA;
            state.scoreB = final.scoreB;
          }
        }

        syncToState();

        if (state.stepIndex >= state.steps.length - 1) {
          // This match is finished — no more timers for it.
          timeoutsRef.current.delete(matchId);
          maybeFinishAll();
        } else {
          // Schedule this match's next tick with a fresh random delay.
          timeoutsRef.current.set(
            matchId,
            setTimeout(() => tickMatch(matchId), randomTick()),
          );
        }
      };

      // Start an independent timer for each match.
      for (const [matchId] of statesRef.current) {
        timeoutsRef.current.set(
          matchId,
          setTimeout(() => tickMatch(matchId), randomTick()),
        );
      }
    },
    [getDurationMs, syncToState, clearAll],
  );

  const getLiveScore = useCallback(
    (matchId: string): { a: number; b: number } | null => {
      const s = statesRef.current.get(matchId);
      if (!s) return null;
      return { a: s.scoreA, b: s.scoreB };
    },
    [],
  );

  const isMatchSimulating = useCallback(
    (matchId: string): boolean => statesRef.current.has(matchId),
    [],
  );

  const getMatchState = useCallback(
    (matchId: string): MatchSimulationState | null =>
      statesRef.current.get(matchId) ?? null,
    [],
  );

  return (
    <SimulationContext.Provider
      value={{
        liveStates,
        simulatingMatchIds,
        isSimulating,
        startSimulation,
        cancelSimulation,
        getLiveScore,
        isMatchSimulating,
        getMatchState,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}
