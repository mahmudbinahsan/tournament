import { SORT_OPTIONS, type TeamSortKey } from '../../core/display/teamSort';

interface SortChipsProps {
  active: TeamSortKey;
  onChange: (key: TeamSortKey) => void;
}

export function SortChips({ active, onChange }: SortChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
      {SORT_OPTIONS.map((opt) => {
        const isActive = active === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={[
              'shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-200 ease-out active:scale-95',
              isActive
                ? 'accent-gradient text-gold-50 shadow-sm shadow-gold-500/15 border border-gold-400/20'
                : 'bg-app-solid-2 text-ink-faint hover:bg-app-solid-3 hover:text-ink-muted border border-app-border/50',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
