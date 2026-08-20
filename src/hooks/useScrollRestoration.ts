/**
 * Unified, in-memory scroll restoration.
 *
 * A single shared registry maps a string key to a saved window.scrollY.
 * Every screen, tab and sub-tab gets its own key, so positions never
 * overwrite each other. Restoration timing is consistent everywhere:
 * save synchronously, restore on the next animation frame.
 */

const positions = new Map<string, number>();

function savePosition(key: string) {
  positions.set(key, window.scrollY);
}

function restorePosition(key: string) {
  const y = positions.get(key) ?? 0;
  requestAnimationFrame(() => {
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
  });
}

export const scrollRegistry = {
  save: savePosition,
  restore: restorePosition,
  get: (key: string) => positions.get(key) ?? 0,
  has: (key: string) => positions.has(key),
};

/**
 * In-memory store for per-tournament UI state (active tab + matches sub-tab),
 * so leaving and returning to a tournament restores the previously active tab
 * and sub-tab. Keyed by tournament id.
 */
interface TournamentTabState {
  tab: string;
  subTab: string;
}

const tournamentTabStates = new Map<string, TournamentTabState>();

export const tabStateRegistry = {
  get: (tournamentId: string): TournamentTabState | undefined =>
    tournamentTabStates.get(tournamentId),
  set: (tournamentId: string, state: TournamentTabState) => {
    tournamentTabStates.set(tournamentId, state);
  },
};
