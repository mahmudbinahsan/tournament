import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { Team } from '../../core/models/types';
import { teamStrength, isUnproven } from '../../core/models/types';
import { Flag } from '../ui/Flag';

interface TeamListRowProps {
  team: Team;
  rank?: number;
  onClick?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
  trailing?: React.ReactNode;
}

export function TeamListRow({
  team,
  rank,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  trailing,
}: TeamListRowProps) {
  const strength = teamStrength(team);
  const unproven = isUnproven(team);

  const handleClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect();
    } else if (onClick) {
      onClick();
    }
  };

  const interactive = !!(onClick || selectionMode);

  return (
    <button
      onClick={handleClick}
      className={[
        'w-full flex items-center gap-3 px-4 py-3.5 glass card-shadow rounded-2xl transition-colors duration-150 ease-out',
        interactive ? 'hover:bg-app-surface-2 active:bg-app-surface-3 cursor-pointer' : '',
        selected && !selectionMode ? 'bg-gold-500/[0.08] ring-1 ring-gold-400/30' : '',
      ].join(' ')}
    >
      {selectionMode ? (
        <span
          className={[
            'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ease-out',
            selected
              ? 'bg-gold-500 border-gold-400 text-gold-50'
              : 'border-app-border-strong bg-app-surface-2',
          ].join(' ')}
        >
          {selected && <CheckCircle size={16} strokeWidth={2.5} />}
        </span>
      ) : typeof rank === 'number' ? (
        <span className="text-xs font-bold text-ink-faint tabular-nums w-6 text-right shrink-0">{rank}</span>
      ) : null}

      <Flag emoji={team.emoji} size="small" />

      <span className="text-sm font-semibold text-ink truncate flex-1 text-left">{team.name}</span>

      {trailing ?? (
        <span className="text-xs font-medium text-ink-faint tabular-nums shrink-0">
          {unproven ? '—' : strength}
        </span>
      )}
    </button>
  );
}

export function TeamList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={['flex flex-col gap-3', className].join(' ')}>
      {children}
    </div>
  );
}
