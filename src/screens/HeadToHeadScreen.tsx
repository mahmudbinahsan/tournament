import { useState, useMemo, useEffect, useRef } from 'react';
import { Swords, ArrowLeft, Calendar, ChevronDown } from 'lucide-react';
import type { Team, Tournament, Match } from '../core/models/types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { getRoundLabel, getKnockoutRoundLabel } from '../core/engine/bracketEngine';
import { useTournaments } from '../hooks/useTournaments';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getMatchStageLabel(match: Match, tournament: Tournament): string {
  const { format } = tournament.settings;
  if (match.isThirdPlace) return 'Third Place Match';
  if (match.phase === 'qualifying') return 'Qualifying Round';
  if (format === 'round-robin') return getRoundLabel(match.round, tournament.totalRounds, format);
  if (format === 'group-stage') {
    if (match.phase === 'group') return `Group Stage · Round ${match.round}`;
    const sameRound = tournament.matches.filter((m) => m.round === match.round && !m.isThirdPlace);
    return getKnockoutRoundLabel(sameRound.length);
  }
  return getRoundLabel(match.round, tournament.totalRounds, format);
}

interface H2HMatch {
  match: Match;
  tournament: Tournament;
  stageLabel: string;
  dateLabel: string;
  order: number;
}

export function HeadToHeadScreen({ onBack }: { onBack: () => void }) {
  const { tournaments } = useTournaments();
  const allTeams = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of tournaments) {
      for (const team of t.teams) {
        if (!map.has(team.id)) map.set(team.id, team);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tournaments]);

  const [teamAId, setTeamAId] = useState<string>('');
  const [teamBId, setTeamBId] = useState<string>('');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest'>('newest');

  const bothSelected = teamAId && teamBId && teamAId !== teamBId;

  const teamA = allTeams.find((t) => t.id === teamAId) ?? null;
  const teamB = allTeams.find((t) => t.id === teamBId) ?? null;

  const h2hMatches = useMemo<H2HMatch[]>(() => {
    if (!bothSelected) return [];
    const results: H2HMatch[] = [];
    for (const t of tournaments) {
      for (const m of t.matches) {
        if (m.status !== 'completed' || m.isBye) continue;
        const isPair =
          (m.teamA?.id === teamAId && m.teamB?.id === teamBId) ||
          (m.teamA?.id === teamBId && m.teamB?.id === teamAId);
        if (!isPair) continue;
        results.push({
          match: m,
          tournament: t,
          stageLabel: getMatchStageLabel(m, t),
          dateLabel: formatDate(t.createdAt),
          order: new Date(t.createdAt).getTime(),
        });
      }
    }
    return results;
  }, [bothSelected, teamAId, teamBId, tournaments]);

  const h2hSorted = useMemo(() => {
    const sorted = [...h2hMatches];
    if (sortMode === 'newest') sorted.sort((a, b) => b.order - a.order);
    else sorted.sort((a, b) => a.order - b.order);
    return sorted;
  }, [h2hMatches, sortMode]);

  const h2hSummary = useMemo(() => {
    if (h2hMatches.length === 0) return null;
    let winsA = 0;
    let winsB = 0;
    let draws = 0;
    let lastWinner: Team | null = null;
    let lastOrder = -1;
    for (const h of h2hMatches) {
      const m = h.match;
      if (!m.winner || !m.teamA || !m.teamB) continue;
      if (m.winner.id === teamAId) winsA++;
      else if (m.winner.id === teamBId) winsB++;
      else draws++;
      if (h.order > lastOrder) {
        lastOrder = h.order;
        lastWinner = m.winner;
      }
    }
    return { winsA, winsB, draws, lastWinner, total: h2hMatches.length };
  }, [h2hMatches, teamAId, teamBId]);

  // Auto-scroll to top when both teams are selected (entering the dedicated H2H view).
  const viewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bothSelected) {
      viewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [bothSelected]);

  return (
    <div ref={viewRef} className="flex flex-col gap-5 pb-4 animate-fade-in">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-app-surface-2 border border-app-border hover:bg-app-surface-3 transition-colors duration-200 ease-out active:scale-95 shrink-0"
          aria-label="Back to Teams"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Swords size={20} className="text-gold-400" />
          <h1 className="text-2xl font-black text-ink tracking-tight">Head-to-Head</h1>
        </div>
      </div>

      {/* Team selectors */}
      <div className="glass card-shadow rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex items-stretch gap-3">
          <TeamSelector
            label="Team A"
            teams={allTeams}
            value={teamAId}
            onChange={setTeamAId}
            excludeId={teamBId}
          />
          <div className="flex items-center justify-center shrink-0">
            <span className="text-xs text-ink-faint font-black uppercase tracking-[0.14em]">VS</span>
          </div>
          <TeamSelector
            label="Team B"
            teams={allTeams}
            value={teamBId}
            onChange={setTeamBId}
            excludeId={teamAId}
          />
        </div>
        {!bothSelected && (
          <p className="text-sm text-ink-faint text-center">
            Select two teams to compare their head-to-head record across all tournaments.
          </p>
        )}
      </div>

      {/* Dedicated H2H view — only shown when both teams are selected */}
      {bothSelected && (
        <>
          {/* H2H Summary card */}
          {h2hSummary && h2hSummary.total > 0 ? (
            <H2HSummaryCard
              summary={h2hSummary}
              teamA={teamA}
              teamB={teamB}
            />
          ) : (
            <EmptyState
              variant="medium"
              icon={<Swords size={28} className="mx-auto mb-2 text-ink-faint" />}
              description="No previous meetings between these teams."
            />
          )}

          {/* Sort controls */}
          {h2hSorted.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-ink-faint">
                {h2hSorted.length} meeting{h2hSorted.length !== 1 ? 's' : ''}
              </span>
              <div className="flex-1" />
              <div className="flex gap-1 p-1 bg-app-solid rounded-xl">
                {([
                  { id: 'newest', label: 'Newest' },
                  { id: 'oldest', label: 'Oldest' },
                ] as { id: 'newest' | 'oldest'; label: string }[]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSortMode(s.id)}
                    className={[
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ease-out',
                      sortMode === s.id ? 'accent-gradient text-gold-50' : 'text-ink-faint hover:text-ink-muted',
                    ].join(' ')}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* H2H match timeline */}
          {h2hSorted.length > 0 && (
            <div className="flex flex-col gap-3 stagger">
              {h2hSorted.map(({ match, tournament: t, stageLabel, dateLabel }) => (
                <H2HMatchRow
                  key={match.id}
                  match={match}
                  tournamentName={t.name}
                  stageLabel={stageLabel}
                  dateLabel={dateLabel}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Team Selector ────────────────────────────────────────────────────────────

function TeamSelector({
  label,
  teams,
  value,
  onChange,
  excludeId,
}: {
  label: string;
  teams: Team[];
  value: string;
  onChange: (id: string) => void;
  excludeId: string;
}) {
  const selectedTeam = teams.find((t) => t.id === value);

  return (
    <div className="flex-1 min-w-0">
      <label className="text-[11px] text-ink-faint font-bold uppercase tracking-[0.12em] mb-1.5 block">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none pl-4 pr-10 py-3 bg-app-surface-2 border border-app-border rounded-xl text-sm text-ink outline-none focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200 ease-out cursor-pointer"
        >
          <option value="">Select team...</option>
          {teams.filter((t) => t.id !== excludeId).map((t) => (
            <option key={t.id} value={t.id} className="bg-app-surface-3">{t.emoji} {t.name}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
        {selectedTeam && (
          <div
            className="absolute left-0 top-0 w-1 h-full rounded-l-xl pointer-events-none"
            style={{ background: selectedTeam.color }}
          />
        )}
      </div>
      {selectedTeam && (
        <p className="text-xs font-semibold text-ink-muted mt-1.5 truncate pl-1">
          {selectedTeam.emoji} {selectedTeam.name}
        </p>
      )}
    </div>
  );
}

// ─── H2H Summary Card ─────────────────────────────────────────────────────────

function H2HSummaryCard({
  summary,
  teamA,
  teamB,
}: {
  summary: { winsA: number; winsB: number; draws: number; lastWinner: Team | null; total: number };
  teamA: Team | null;
  teamB: Team | null;
}) {
  return (
    <div className="glass card-shadow rounded-2xl p-4 flex flex-col gap-3 border border-app-border animate-fade-in-soft">
      <div className="flex items-center gap-2">
        <Swords size={16} className="text-gold-400" />
        <h3 className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.14em]">Head-to-Head Record</h3>
      </div>

      {/* Team names */}
      <div className="flex items-center justify-center gap-3">
        {teamA && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-ink">{teamA.name}</span>
          </div>
        )}
        <span className="text-xs text-ink-faint font-bold">VS</span>
        {teamB && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-ink">{teamB.name}</span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <H2HStat label="Total Meetings" value={String(summary.total)} />
        <H2HStat
          label={teamA ? `${teamA.name} Wins` : 'Team A Wins'}
          value={String(summary.winsA)}
          accent={teamA?.color}
        />
        <H2HStat
          label={teamB ? `${teamB.name} Wins` : 'Team B Wins'}
          value={String(summary.winsB)}
          accent={teamB?.color}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <H2HStat label="Draws" value={String(summary.draws)} />
        <H2HStat
          label="Last Winner"
          value={summary.lastWinner?.name ?? '—'}
          accent={summary.lastWinner?.color}
        />
      </div>
    </div>
  );
}

function H2HStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-app-solid-2 border border-app-border rounded-xl px-3 py-2.5">
      <p className="text-[10px] text-ink-faint font-semibold uppercase tracking-[0.12em] leading-tight">{label}</p>
      <p
        className="text-base font-bold mt-0.5 truncate"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

// ─── H2H Match Row ────────────────────────────────────────────────────────────

function H2HMatchRow({
  match,
  tournamentName,
  stageLabel,
  dateLabel,
}: {
  match: Match;
  tournamentName: string;
  stageLabel: string;
  dateLabel: string;
}) {
  const winner = match.winner;
  const isAWinner = winner?.id === match.teamA?.id;
  const isBWinner = winner?.id === match.teamB?.id;
  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;

  return (
    <div className="px-4 py-3.5 flex flex-col gap-2.5 glass card-shadow rounded-2xl transition-colors duration-150 ease-out">
      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-ink-muted truncate">{tournamentName}</span>
        <span className="text-[10px] text-ink-faint/60">•</span>
        <Badge variant="info">{stageLabel}</Badge>
        <span className="text-[10px] text-ink-faint/60">•</span>
        <span className="text-[10px] text-ink-faint flex items-center gap-0.5">
          <Calendar size={10} /> {dateLabel}
        </span>
      </div>

      {/* Result row with score */}
      <div className="flex items-center gap-2">
        <H2HTeamSlot team={match.teamA} isWinner={isAWinner} score={scoreA} />
        <span className="text-xs text-ink-faint font-bold shrink-0 tabular-nums">{scoreA}–{scoreB}</span>
        <H2HTeamSlot team={match.teamB} isWinner={isBWinner} score={scoreB} alignRight />
      </div>
    </div>
  );
}

function H2HTeamSlot({ team, isWinner, score, alignRight }: { team: Team | null; isWinner: boolean; score: number; alignRight?: boolean }) {
  if (!team) {
    return (
      <div className="flex-1 flex items-center gap-2 opacity-30">
        <div className="w-8 h-8 rounded-xl bg-app-solid-2 flex items-center justify-center text-sm text-ink-faint">?</div>
        <span className="text-sm text-ink-faint italic">TBD</span>
      </div>
    );
  }
  return (
    <div className={[
      'flex-1 flex items-center gap-2 px-2 py-1.5',
      alignRight ? 'flex-row-reverse text-right' : '',
    ].join(' ')}>
      <span className={[
        'text-sm flex-1 truncate',
        isWinner ? 'font-bold text-ink' : 'font-medium text-ink-muted',
      ].join(' ')}>
        {team.name}
      </span>
      {isWinner && <span className="text-[9px] font-black text-gold-300 uppercase tracking-[0.12em]">Win</span>}
    </div>
  );
}
