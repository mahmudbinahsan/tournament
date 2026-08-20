import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { Tournament } from '../../core/models/types';

interface TournamentListRowProps {
  tournament: Tournament;
  onClick?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
}

export function TournamentListRow({
  tournament,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
}: TournamentListRowProps) {
  const handleClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect();
    } else if (onClick) {
      onClick();
    }
  };

  const interactive = !!(onClick || selectionMode);

  const secondary =
    tournament.status === 'completed'
      ? tournament.winner?.name ?? '—'
      : tournament.status === 'draft'
        ? 'Draft'
        : 'In Progress';

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
      ) : null}

      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold text-ink truncate leading-snug tracking-tight">
          {tournament.name}
        </span>
        <span
          className={[
            'block text-xs mt-0.5 truncate',
            tournament.status === 'completed' ? 'text-gold-300' : 'text-ink-faint',
          ].join(' ')}
        >
          {secondary}
        </span>
      </span>
    </button>
  );
}

export function TournamentList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={['flex flex-col gap-3', className].join(' ')}>
      {children}
    </div>
  );
}
