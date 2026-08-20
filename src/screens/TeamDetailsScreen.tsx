import { useMemo } from 'react';
import { ChevronLeft, Pencil, Trophy, TrendingUp, Award, Hash } from 'lucide-react';
import type { Screen, Team, Match, Tournament } from '../core/models/types';
import { teamStrength, strengthLabel, isUnproven, winRate } from '../core/models/types';
import { getTeamById, loadTeams, loadTournaments } from '../core/storage/storage';
import { sortTeams } from '../core/display/teamSort';
import { Badge } from '../components/ui/Badge';
import { IconButton } from '../components/ui/IconButton';
import { Flag } from '../components/ui/Flag';
import { MatchCard } from '../components/tournament/MatchCard';

interface TeamDetailsScreenProps {
  teamId: string;
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
  dataVersion?: number;
}

interface RecentMatchInfo {
  match: Match;
  tournament: Tournament;
  opponent: Team;
  won: boolean;
}

export function TeamDetailsScreen({ teamId, onNavigate, onBack, dataVersion }: TeamDetailsScreenProps) {
  const team = useMemo(() => getTeamById(teamId), [teamId, dataVersion]);

  const recentMatches = useMemo<RecentMatchInfo[]>(() => {
    if (!team) return [];
    const tournaments = loadTournaments();
    const results: RecentMatchInfo[] = [];
    for (const t of tournaments) {
      for (const m of t.matches) {
        if (m.status !== 'completed' || m.isBye || !m.teamA || !m.teamB || !m.winner) continue;
        if (m.teamA.id !== teamId && m.teamB.id !== teamId) continue;
        const isA = m.teamA.id === teamId;
        const opponent = isA ? m.teamB! : m.teamA!;
        const won = m.winner.id === teamId;
        results.push({ match: m, tournament: t, opponent, won });
      }
    }
    results.sort((a, b) => {
      const ma = a.match;
      const mb = b.match;
      const ta = new Date(a.tournament.completedAt ?? a.tournament.createdAt).getTime();
      const tb = new Date(b.tournament.completedAt ?? b.tournament.createdAt).getTime();
      if (ta !== tb) return tb - ta;
      return mb.round - ma.round || mb.position - ma.position;
    });
    return results;
  }, [teamId, team, dataVersion]);

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-ink-muted font-semibold">Team not found.</p>
          <button onClick={() => onNavigate({ name: 'teams' })} className="mt-4 text-gold-400 font-bold text-sm">
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  const strength = teamStrength(team);
  const label = strengthLabel(team);
  const unproven = isUnproven(team);
  const c = team.career;
  const wr = winRate(c);
  const form = recentMatches.slice(0, 5).reverse();

  // Ranking — the team's current position in the Strength-sorted Teams list.
  // Calculated dynamically from the live Teams list (same sort as the Teams
  // page) so it always stays synchronized. Not stored or cached.
  const ranking = useMemo(() => {
    const sorted = sortTeams(loadTeams(), 'strongest');
    const idx = sorted.findIndex((t) => t.id === teamId);
    return idx >= 0 ? idx + 1 : null;
  }, [teamId, dataVersion]);

  return (
    <div className="flex flex-col gap-5 pb-4 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pb-3 bg-app-solid-2 border-b border-app-border" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)' }}>
        <div className="flex items-center justify-between gap-3">
          <IconButton onClick={onBack}>
            <ChevronLeft size={20} strokeWidth={2.2} />
          </IconButton>
          <button
            onClick={() => onNavigate({ name: 'team-builder', teamId: team.id })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-app-solid-2 border border-app-border text-ink hover:bg-app-solid-3 hover:border-app-border-strong active:scale-95 transition-all duration-200 ease-out text-sm font-bold"
          >
            <Pencil size={16} />
            Edit
          </button>
        </div>
      </div>

      {/* Team Identity Hero */}
      <div className="glass card-shadow rounded-2xl p-5 relative overflow-hidden">
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{ background: team.color }}
        />
        <div className="relative flex items-center gap-4">
          <Flag emoji={team.emoji} size="hero" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-ink truncate tracking-tight">{team.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant={unproven ? 'muted' : 'info'} dot>{label}</Badge>
              {!unproven && (
                <span className="text-3xl font-black text-ink tabular-nums">{strength}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats row — Titles • Ranking • Win Rate */}
      <div className="grid grid-cols-3 gap-3">
        <QuickStat icon={<Trophy size={16} />} value={c.championships} label="Titles" color="text-gold-400" />
        <QuickStat icon={<Hash size={16} />} value={ranking ? `#${ranking}` : '—'} label="Ranking" color="text-accent-secondary-400" />
        <QuickStat icon={<TrendingUp size={16} />} value={`${wr}%`} label="Win Rate" color="text-success-400" />
      </div>

      {/* Career */}
      <Section title="Career" icon={<Award size={16} className="text-gold-400" />}>
        <div className="grid grid-cols-2 gap-2.5">
          <CareerStat label="Total Matches" value={c.totalBattles} />
          <CareerStat label="Win Rate" value={`${wr}%`} />
          <CareerStat label="Wins" value={c.wins} accent="text-success-400" />
          <CareerStat label="Losses" value={c.losses} accent="text-danger-400" />
          <CareerStat label="Championships" value={c.championships} accent="text-gold-400" />
          <CareerStat label="Runner-up" value={c.runnerUps} accent="text-ink-muted" />
          <CareerStat label="Third Place" value={c.thirdPlaces} accent="text-third-400" />
          <CareerStat label="Tournaments" value={c.tournamentsPlayed} />
        </div>
      </Section>

      {/* Recent Form */}
      <Section title="Recent Form">
        {form.length === 0 ? (
          <p className="text-sm text-ink-faint font-medium py-2">No completed matches yet.</p>
        ) : (
          <div className="flex items-center gap-2">
            {form.map((rm, i) => (
              <div
                key={i}
                className={[
                  'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-transform duration-200 ease-out hover:scale-110',
                  rm.won
                    ? 'bg-success-500/15 text-success-300 border border-success-500/30'
                    : 'bg-danger-500/15 text-danger-300 border border-danger-500/30',
                ].join(' ')}
              >
                {rm.won ? 'W' : 'L'}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent Matches */}
      <Section title="Recent Matches">
        {recentMatches.length === 0 ? (
          <p className="text-sm text-ink-faint font-medium py-2">No completed matches yet.</p>
        ) : (
          <>
            <div className="space-y-2">
              {recentMatches.slice(0, 8).map((rm, i) => (
                <MatchCard
                  key={i}
                  match={rm.match}
                  tournament={rm.tournament}
                  onTeamClick={(id) => onNavigate({ name: 'team-details', teamId: id })}
                />
              ))}
            </div>
            <button
              onClick={() => onNavigate({ name: 'team-match-history', teamId: team.id })}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-app-solid-2 border border-app-border text-sm font-bold text-ink-muted hover:text-ink hover:bg-app-solid-3 hover:border-app-border-strong active:scale-[0.98] transition-all duration-200 ease-out"
            >
              View All Matches
            </button>
          </>
        )}
      </Section>
    </div>
  );
}

function QuickStat({ icon, value, label, color }: { icon: React.ReactNode; value: number | string; label: string; color: string }) {
  return (
    <div className="glass card-shadow rounded-2xl p-3 flex flex-col items-center gap-1.5">
      <div className={color}>{icon}</div>
      <p className="text-xl font-black text-ink tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-ink-faint">{label}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass card-shadow rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function CareerStat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="bg-app-solid-2 border border-app-border rounded-xl px-3 py-2.5">
      <p className="text-[10px] text-ink-faint font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className={['text-lg font-black tabular-nums mt-0.5', accent ?? 'text-ink'].join(' ')}>{value}</p>
    </div>
  );
}
