import React from 'react';
import { Trophy, Swords, Users, ChevronRight, Zap, Activity, Crown } from 'lucide-react';
import type { Screen, Tournament } from '../core/models/types';
import { TournamentListRow, TournamentList } from '../components/tournament/TournamentListRow';
import { TeamListRow, TeamList } from '../components/team/TeamListRow';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

interface HomeScreenProps {
  tournaments: Tournament[];
  onNavigate: (screen: Screen) => void;
  onTeamClick?: (teamId: string) => void;
  onRestore?: () => void;
}

export function HomeScreen({ tournaments, onNavigate }: HomeScreenProps) {
  const active = tournaments.filter((t) => t.status === 'active');
  const completed = tournaments.filter((t) => t.status === 'completed');
  const recent = [...active, ...tournaments.filter((t) => t.status === 'draft')]
    .slice(0, 3);

  const totalTeams = new Set(
    tournaments.flatMap((t) => t.teams.map((team) => team.id)),
  ).size;

  return (
    <div className="flex flex-col gap-6 pb-4 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[28px] glass-heavy card-shadow p-6">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full accent-tint blur-2xl opacity-50 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full accent-tint blur-2xl opacity-30 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-xl accent-gradient flex items-center justify-center text-sm shadow-md shadow-gold-500/30">
              <Trophy size={14} className="text-gold-50" />
            </span>
            <span className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.16em]">TournamentVerse</span>
          </div>
          <h1 className="text-[28px] leading-[1.1] font-black text-ink tracking-tight">
            The Universal{' '}
            <span className="text-transparent bg-clip-text accent-gradient">
              Battle Arena
            </span>
          </h1>
          <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
            Create epic tournaments for any team, faction, or force. Run brackets, simulate battles, crown champions.
          </p>
          <div className="mt-5">
            <Button
              size="lg"
              icon={<Zap size={18} />}
              onClick={() => onNavigate({ name: 'create-tournament', nonce: String(Date.now()) })}
              className="w-full sm:w-auto"
            >
              New Tournament
            </Button>
          </div>
        </div>
      </div>

      {/* Stats — unified container with three internal sections */}
      <div className="glass card-shadow rounded-2xl overflow-hidden">
        <div className="grid grid-cols-3">
          <StatSection
            icon={<Swords size={18} />}
            value={tournaments.length}
            label="Tournaments"
            color="var(--accent-500, #B88A2A)"
          />
          <StatSection
            icon={<Users size={18} />}
            value={totalTeams}
            label="Teams"
            color="#06b6d4"
            divider
          />
          <StatSection
            icon={<Trophy size={18} />}
            value={completed.length}
            label="Completed"
            color="#f59e0b"
            divider
          />
        </div>
      </div>

      {/* Active tournaments */}
      {active.length > 0 && (
        <Section
          title="In Progress"
          icon={<Activity size={15} className="text-gold-400" />}
          action={active.length > 3 ? { label: 'See all', onClick: () => onNavigate({ name: 'history' }) } : undefined}
        >
          <TournamentList>
            {active.slice(0, 3).map((t, i) => (
              <TournamentListRow
                key={t.id}
                tournament={t}
                onClick={() => onNavigate({ name: 'tournament', id: t.id })}
              />
            ))}
          </TournamentList>
        </Section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <Section
          title={active.length > 0 ? 'Drafts' : 'Recent Tournaments'}
          action={{ label: 'All', onClick: () => onNavigate({ name: 'history' }) }}
        >
          <TournamentList>
            {recent.map((t, i) => (
              <TournamentListRow
                key={t.id}
                tournament={t}
                onClick={() => onNavigate({ name: 'tournament', id: t.id })}
              />
            ))}
          </TournamentList>
        </Section>
      )}

      {/* Empty state */}
      {tournaments.length === 0 && (
        <EmptyState
          icon="⚔️"
          title="No Tournaments Yet"
          description="Create your first tournament and let the battles begin."
          action={
            <Button onClick={() => onNavigate({ name: 'create-tournament', nonce: String(Date.now()) })} icon={<Zap size={16} />}>
              Create Tournament
            </Button>
          }
        />
      )}

      {/* Recently completed */}
      {completed.length > 0 && (
        <Section
          title="Champions"
          icon={<Crown size={15} className="text-gold-400" />}
          action={{ label: 'History', onClick: () => onNavigate({ name: 'history' }) }}
        >
          <TeamList>
            {completed.slice(0, 3).map((t, i) => (
              <TeamListRow
                key={t.id}
                team={t.winner ?? { id: 'unknown', name: 'Unknown', emoji: '🏅', color: '#888', wins: 0, losses: 0, draws: 0, createdAt: '', career: { totalBattles: 0, wins: 0, losses: 0, draws: 0, championships: 0, runnerUps: 0, thirdPlaces: 0, tournamentsPlayed: 0 } }}
                rank={i + 1}
                onClick={() => onNavigate({ name: 'tournament', id: t.id })}
                trailing={<Trophy size={16} className="text-gold-400 shrink-0" />}
              />
            ))}
          </TeamList>
        </Section>
      )}
    </div>
  );
}

function StatSection({ icon, value, label, color, divider }: { icon: React.ReactNode; value: number; label: string; color: string; divider?: boolean }) {
  return (
    <div className={`p-4 flex flex-col gap-2 ${divider ? 'border-l border-app-border/40' : ''}`}>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-ink tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-ink-faint mt-1">{label}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink tracking-tight">
          {icon}
          {title}
        </h2>
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-0.5 text-xs text-gold-400 font-semibold hover:text-gold-300 transition-colors duration-200 ease-out"
          >
            {action.label}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
