import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Zap, Trophy, Layers } from 'lucide-react';
import type { Tournament } from '../../core/models/types';

export interface SimOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  disabled?: boolean;
  loading?: boolean;
  onSelect: () => void;
}

interface SimulateMenuProps {
  tournament: Tournament;
  simulating: boolean;
  simulatingMatchId: string | null;
  onSimulateAll: () => void;
  onSimulateGroupStage: () => void;
  onSimulateKnockoutRound: () => void;
  compact?: boolean;
}

function Spinner({ className = '' }: { className?: string }) {
  return <span className={`w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`} />;
}

export function SimulateMenu({
  tournament,
  simulating,
  simulatingMatchId,
  onSimulateAll,
  onSimulateGroupStage,
  onSimulateKnockoutRound,
  compact = false,
}: SimulateMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  const options = buildOptions(
    tournament,
    simulating,
    simulatingMatchId,
    onSimulateAll,
    onSimulateGroupStage,
    onSimulateKnockoutRound,
  );

  if (options.length === 0) return null;

  const anyLoading = simulating || simulatingMatchId !== null;

  const handleSelect = (opt: SimOption) => {
    if (opt.disabled || opt.loading) return;
    close();
    opt.onSelect();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        disabled={anyLoading}
        className={[
          compact
            ? 'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold shrink-0'
            : 'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold',
          'transition-all duration-200 active:scale-[0.97] select-none',
          'bg-app-surface-2 border border-app-border text-ink-muted hover:text-ink hover:bg-app-surface-3',
          anyLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ].join(' ')}
      >
        {anyLoading ? (
          <Spinner />
        ) : (
          <Zap size={compact ? 16 : 16} fill="currentColor" />
        )}
        {compact ? <span className="hidden sm:inline">Simulate</span> : 'Simulate'}
        <ChevronDown
          size={compact ? 14 : 16}
          className={[
            'transition-transform duration-200 ease-out',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" onClick={close} />
          <div
            ref={menuRef}
            className={[
              'absolute z-50 top-full mt-2',
              compact ? 'right-0 w-64' : 'left-0 right-0',
              'glass-heavy rounded-2xl overflow-hidden shadow-2xl shadow-black/50',
              'animate-fade-in origin-top',
            ].join(' ')}
            style={{ animationDuration: '0.15s' }}
          >
            <div className="py-1.5 max-h-[70vh] overflow-y-auto">
              {options.map((opt, i) => (
                <MenuRow key={opt.id} option={opt} index={i} onSelect={handleSelect} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuRow({
  option,
  index,
  onSelect,
}: {
  option: SimOption;
  index: number;
  onSelect: (opt: SimOption) => void;
}) {
  return (
    <button
      onClick={() => onSelect(option)}
      disabled={option.disabled || option.loading}
      className={[
        'w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors duration-150 ease-out',
        'animate-fade-in',
        option.disabled || option.loading
          ? 'text-ink-faint cursor-not-allowed'
          : 'text-ink hover:bg-app-surface-2 active:bg-app-surface-3',
      ].join(' ')}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <span className="shrink-0 text-gold-400">
        {option.loading ? <Spinner className="text-gold-400" /> : option.icon}
      </span>
      <span className="flex-1 text-left truncate">{option.label}</span>
      {typeof option.count === 'number' && option.count > 0 && !option.loading && (
        <span className="text-xs text-ink-faint tabular-nums shrink-0">{option.count}</span>
      )}
    </button>
  );
}

export function buildOptions(
  tournament: Tournament,
  simulating: boolean,
  simulatingMatchId: string | null,
  onSimulateAll: () => void,
  onSimulateGroupStage: () => void,
  onSimulateKnockoutRound: () => void,
): SimOption[] {
  const { settings, matches, groups, phase } = tournament;
  const isGroup = settings.format === 'group-stage';

  const opts: SimOption[] = [];

  const pendingTotal = matches.filter((m) => m.status === 'pending' && m.teamA && m.teamB && !m.isBye);

  // 1. Simulate Entire Tournament
  if (pendingTotal.length > 0) {
    opts.push({
      id: 'sim-all',
      label: 'Simulate Entire Tournament',
      icon: <Trophy size={15} />,
      count: pendingTotal.length,
      loading: simulating,
      disabled: simulating,
      onSelect: onSimulateAll,
    });
  }

  // 2. Simulate Group Stage (group-stage format only, while in group phase)
  if (isGroup && phase === 'group' && groups) {
    const remainingGroupStage = matches.filter(
      (m) => m.phase === 'group' && m.status === 'pending' && m.teamA && m.teamB && !m.isBye,
    );
    if (remainingGroupStage.length > 0) {
      opts.push({
        id: 'sim-group-stage',
        label: 'Simulate Group Stage',
        icon: <Layers size={15} />,
        count: remainingGroupStage.length,
        loading: simulatingMatchId === 'group-stage',
        disabled: simulatingMatchId === 'group-stage',
        onSelect: onSimulateGroupStage,
      });
    }
  }

  // 3. Simulate Current Round
  if (pendingTotal.length > 0) {
    const pendingRounds = [...new Set(pendingTotal.map((m) => m.round))].sort((a, b) => a - b);
    const currentRound = pendingRounds[0];
    const roundCount = matches.filter((m) => m.round === currentRound && !m.isBye).length;
    opts.push({
      id: 'sim-current-round',
      label: 'Simulate Current Round',
      icon: <Zap size={15} fill="currentColor" />,
      count: roundCount,
      loading: simulatingMatchId === 'ko-round',
      disabled: simulatingMatchId === 'ko-round',
      onSelect: onSimulateKnockoutRound,
    });
  }

  return opts;
}
