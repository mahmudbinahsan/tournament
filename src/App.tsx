import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { Trophy } from 'lucide-react';
import type { Screen, Team, TournamentSettings } from './core/models/types';
import { Navigation } from './components/layout/Navigation';
import { HomeScreen } from './screens/HomeScreen';
import { TeamsScreen } from './screens/TeamsScreen';
import { CreateTournamentScreen } from './screens/CreateTournamentScreen';
import { TournamentScreen } from './screens/TournamentScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { TeamDetailsScreen } from './screens/TeamDetailsScreen';
import { TeamMatchHistoryScreen } from './screens/TeamMatchHistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { HeadToHeadScreen } from './screens/HeadToHeadScreen';
import { useTournaments } from './hooks/useTournaments';
import { useDataVersion } from './hooks/useDataVersion';
import { getTournamentById, initStorage } from './core/storage/storage';
import { scrollRegistry } from './hooks/useScrollRestoration';
import { applyTheme, getDefaultTeamColor, type ThemeId } from './core/theme/themes';
import { applyFont, applyFontSize, type FontId, type FontSizeId } from './core/theme/fonts';
import { loadSettings } from './core/storage/settings';
import { recolorAllTeams } from './core/storage/storage';
import { SimulationProvider } from './hooks/useSimulationContext';

function screenKey(s: Screen): string {
  switch (s.name) {
    case 'tournament': return `tournament:${s.id}`;
    case 'team-details': return `team-details:${s.teamId}`;
    case 'team-match-history': return `team-match-history:${s.teamId}`;
    case 'team-builder': return `team-builder:${s.teamId ?? 'new'}`;
    case 'create-tournament': return `create-tournament:${s.seasonFrom ?? ''}:${s.nonce ?? ''}`;
    default: return s.name;
  }
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initStorage()
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const historyRef = useRef<Screen[]>([]);
  const [liveScreens, setLiveScreens] = useState<Map<string, Screen>>(
    () => new Map([['home', { name: 'home' } as Screen]]),
  );
  const {
    tournaments,
    createTournament,
    startTournament,
    simulateNextRound,
    simulateAll,
    simulateMatch,
    applyMatchResult,
    applyMatchResults,
    simulateGroup,
    simulateGroupStage,
    simulateKnockoutRound,
    removeTournament,
    renameTournament,
    refresh,
  } = useTournaments();

  const dataVersion = useDataVersion();

  // Apply the saved theme and font on first mount so the app renders in the
  // user's chosen palette and typeface before any paint. Champion Elite is the
  // default theme; Inter is the default font.
  useEffect(() => {
    const { theme, font, fontSize } = loadSettings();
    applyTheme(theme);
    applyFont(font);
    applyFontSize(fontSize);
  }, []);

  const navigate = useCallback((s: Screen) => {
    scrollRegistry.save(screenKey(screen));
    historyRef.current.push(screen);
    setLiveScreens((prev) => new Map(prev).set(screenKey(s), s));
    setScreen(s);
    scrollRegistry.restore(screenKey(s));
  }, [screen]);

  const goBack = useCallback(() => {
    scrollRegistry.save(screenKey(screen));
    const prev = historyRef.current.pop();
    if (prev) {
      setScreen(prev);
      scrollRegistry.restore(screenKey(prev));
    }
  }, [screen]);

  function handleCreate(
    name: string,
    description: string,
    theme: string,
    teams: Team[],
    settings: TournamentSettings,
  ) {
    const t = createTournament(name, description, theme, teams, settings);
    navigate({ name: 'tournament', id: t.id });
  }

  function handleNewSeason(id: string) {
    const t = tournaments.find((x) => x.id === id);
    if (!t) return;
    navigate({ name: 'create-tournament', seasonFrom: id });
  }

  function renderScreenContent(s: Screen): ReactNode {
    switch (s.name) {
      case 'home':
        return <HomeScreen tournaments={tournaments} onNavigate={navigate} onTeamClick={(id) => navigate({ name: 'team-details', teamId: id })} onRestore={refresh} />;

      case 'teams':
        return <TeamsScreen onNavigate={navigate} />;

      case 'create-tournament':
        return (
          <CreateTournamentScreen
            onNavigate={navigate}
            onCreate={handleCreate}
            seasonFromId={s.seasonFrom}
            tournaments={tournaments}
          />
        );

      case 'tournament': {
        const t = tournaments.find((x) => x.id === s.id) ?? getTournamentById(s.id);
        if (!t) return <div className="text-ink-faint text-center py-20">Tournament not found.</div>;
        return (
          <TournamentScreen
            tournament={t}
            onNavigate={navigate}
            onStart={(id) => { startTournament(id); refresh(); }}
            onSimulateRound={(id) => { const r = simulateNextRound(id); refresh(); return r; }}
            onSimulateAll={(id) => { const r = simulateAll(id); refresh(); return r; }}
            onSimulateMatch={(id, matchId) => { const r = simulateMatch(id, matchId); refresh(); return r; }}
            onApplyMatchResult={(id, matchId, winnerId) => { const r = applyMatchResult(id, matchId, winnerId); refresh(); return r; }}
            onApplyMatchResults={(id, results) => { const r = applyMatchResults(id, results); refresh(); return r; }}
            onSimulateGroup={(id, groupId) => { const r = simulateGroup(id, groupId); refresh(); return r; }}
            onSimulateGroupStage={(id) => { const r = simulateGroupStage(id); refresh(); return r; }}
            onSimulateKnockoutRound={(id) => { const r = simulateKnockoutRound(id); refresh(); return r; }}
            onDelete={(id) => { removeTournament(id); navigate({ name: 'home' }); }}
            onRename={renameTournament}
            onNewSeason={handleNewSeason}
            onTeamClick={(id) => navigate({ name: 'team-details', teamId: id })}
          />
        );
      }

      case 'history':
        return <HistoryScreen tournaments={tournaments} onNavigate={navigate} onTeamClick={(id) => navigate({ name: 'team-details', teamId: id })} onDelete={removeTournament} />;

      case 'team-details':
        return <TeamDetailsScreen teamId={s.teamId} onNavigate={navigate} onBack={goBack} dataVersion={dataVersion} />;

      case 'team-match-history':
        return <TeamMatchHistoryScreen teamId={s.teamId} onNavigate={navigate} onBack={goBack} dataVersion={dataVersion} />;

      case 'team-builder':
        return <TeamsScreen onNavigate={navigate} editTeamId={s.teamId} />;

      case 'head-to-head':
        return <HeadToHeadScreen onBack={() => goBack()} />;

      case 'settings':
        return (
          <SettingsScreen
            onNavigate={navigate}
            onRestore={refresh}
            onThemeChange={(id: ThemeId) => {
              applyTheme(id);
              recolorAllTeams(getDefaultTeamColor(id));
              refresh();
            }}
            onFontChange={(id: FontId) => {
              applyFont(id);
            }}
            onFontSizeChange={(id: FontSizeId) => {
              applyFontSize(id);
            }}
          />
        );

      default:
        return <HomeScreen tournaments={tournaments} onNavigate={navigate} onTeamClick={(id) => navigate({ name: 'team-details', teamId: id })} />;
    }
  }

  const activeKey = screenKey(screen);

  if (!ready) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl accent-gradient flex items-center justify-center shadow-lg shadow-gold-500/30">
          <Trophy size={28} className="text-gold-50" />
        </div>
        <p className="text-sm text-ink-muted font-semibold animate-pulse">
          Loading TournamentVerse…
        </p>
      </div>
    );
  }

  return (
    <SimulationProvider>
    <div className="min-h-screen bg-app text-ink">
      {/* Content */}
      <main className="relative z-10 max-w-xl mx-auto px-4 pt-10 pb-nav">
        {Array.from(liveScreens.entries()).map(([key, s]) => (
          <div key={key} className={key === activeKey ? '' : 'hidden'}>
            {renderScreenContent(s)}
          </div>
        ))}
      </main>

      {/* Navigation — hidden on the tournament screen, which uses its own
          relocated tournament tabs in the bottom navigation area. */}
      {screen.name !== 'tournament' && (
        <Navigation current={screen} onNavigate={navigate} />
      )}
    </div>
    </SimulationProvider>
  );
}
