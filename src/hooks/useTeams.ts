import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Team } from '../core/models/types';
import { emptyCareer } from '../core/models/types';
import {
  loadTeams,
  upsertTeam,
  deleteTeam as deleteTeamStorage,
  importTeams as importTeamsStorage,
  subscribeToDataChanges,
  type TeamExportFile,
  type ImportSummary,
} from '../core/storage/storage';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>(() => loadTeams());

  useEffect(() => {
    return subscribeToDataChanges(() => setTeams(loadTeams()));
  }, []);

  const refresh = useCallback(() => setTeams(loadTeams()), []);

  const createTeam = useCallback(
    (data: Omit<Team, 'id' | 'wins' | 'losses' | 'draws' | 'createdAt'>): Team => {
      const team: Team = {
        ...data,
        id: uuidv4(),
        wins: 0,
        losses: 0,
        draws: 0,
        career: emptyCareer(),
        createdAt: new Date().toISOString(),
      };
      upsertTeam(team);
      setTeams(loadTeams());
      return team;
    },
    [],
  );

  const updateTeam = useCallback((team: Team): void => {
    upsertTeam(team);
    setTeams(loadTeams());
  }, []);

  const removeTeam = useCallback((id: string): void => {
    deleteTeamStorage(id);
    setTeams(loadTeams());
  }, []);

  const importBulk = useCallback(
    (file: TeamExportFile, mode: 'skip' | 'replace'): ImportSummary => {
      const summary = importTeamsStorage(file, mode);
      setTeams(loadTeams());
      return summary;
    },
    [],
  );

  return { teams, createTeam, updateTeam, removeTeam, importBulk, refresh };
}
