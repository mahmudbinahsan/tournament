import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MoreVertical, Search, Filter, Zap, Pencil, RotateCcw, ChevronRight } from 'lucide-react';
import type { Tournament } from '../../core/models/types';
import { buildOptions, type SimOption } from './SimulateMenu';

export interface OverflowAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface TournamentOverflowMenuProps {
  tournament: Tournament;
  simulating: boolean;
  simulatingMatchId: string | null;
  onSimulateAll: () => void;
  onSimulateGroupStage: () => void;
  onSimulateKnockoutRound: () => void;
  onRename: () => void;
  onNewSeason: () => void;
  onToggleSearch: () => void;
  onToggleFilters: () => void;
}

function Spinner({ className = '' }: { className?: string }) {
  return <span className={`w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`} />;
}

export function TournamentOverflowMenu({
  tournament,
  simulating,
  simulatingMatchId,
  onSimulateAll,
  onSimulateGroupStage,
  onSimulateKnockoutRound,
  onRename,
  onNewSeason,
  onToggleSearch,
  onToggleFilters,
}: TournamentOverflowMenuProps) {
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

  const simOptions = buildOptions(
    tournament,
    simulating,
    simulatingMatchId,
    onSimulateAll,
    onSimulateGroupStage,
    onSimulateKnockoutRound,
  );

  const isActive = tournament.status === 'active';

  const run = (fn: () => void) => {
    close();
    fn();
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Tournament actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-xl bg-app-solid-2 border border-app-border flex items-center justify-center text-ink-muted hover:text-ink hover:bg-app-solid-3 hover:border-app-border-strong active:scale-95 transition-all duration-200 ease-out"
      >
        <MoreVertical size={18} strokeWidth={2.2} />
      </button>

      {open && (
        <>
          {/* Mobile backdrop tap-to-close; desktop uses outside-click handler */}
          <div className="fixed inset-0 z-40 sm:hidden" onClick={close} />
          <div
            ref={menuRef}
            role="menu"
            className="absolute z-50 top-full right-0 mt-2 w-72 glass-heavy rounded-2xl overflow-hidden shadow-2xl shadow-black/50 animate-fade-in origin-top"
            style={{ animationDuration: '0.15s' }}
          >
            <div className="py-1.5 max-h-[75vh] overflow-y-auto">
              {/* Search & filter */}
              <MenuRow
                icon={<Search size={16} />}
                label="Search Matches"
                onSelect={() => run(onToggleSearch)}
              />
              <MenuRow
                icon={<Filter size={16} />}
                label="Filter Matches"
                onSelect={() => run(onToggleFilters)}
              />

              {/* Simulate section — only while tournament is active */}
              {isActive && simOptions.length > 0 && (
                <>
                  <SectionDivider />
                  <SectionLabel icon={<Zap size={11} fill="currentColor" />} text="Simulate" />
                  {simOptions.map((opt) => (
                    <MenuRow
                      key={opt.id}
                      icon={opt.loading ? <Spinner className="text-gold-400" /> : opt.icon}
                      label={opt.label}
                      count={opt.count}
                      disabled={opt.disabled || opt.loading}
                      onSelect={() => run(opt.onSelect)}
                    />
                  ))}
                </>
              )}

              {/* Tournament management */}
              <SectionDivider />
              <MenuRow
                icon={<Pencil size={16} />}
                label="Rename Tournament"
                onSelect={() => run(onRename)}
              />
              <MenuRow
                icon={<RotateCcw size={16} />}
                label="Create New Season"
                onSelect={() => run(onNewSeason)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuRow({
  icon,
  label,
  count,
  disabled,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onSelect}
      disabled={disabled}
      className={[
        'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ease-out',
        disabled
          ? 'text-ink-faint cursor-not-allowed'
          : 'text-ink hover:bg-app-surface-2 active:bg-app-surface-3',
      ].join(' ')}
    >
      <span className="shrink-0 text-gold-400 w-4 flex items-center justify-center">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {typeof count === 'number' && count > 0 && !disabled && (
        <span className="text-xs text-ink-faint tabular-nums shrink-0">{count}</span>
      )}
    </button>
  );
}

function SectionDivider() {
  return <div className="h-px bg-app-border mx-3 my-1.5" />;
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-4 pt-1.5 pb-1">
      <span className="text-gold-400 flex items-center">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">{text}</span>
    </div>
  );
}
