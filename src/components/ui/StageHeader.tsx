import type { ReactNode } from 'react';

interface StageHeaderProps {
  label: string;
  icon?: ReactNode;
  /** Accent color for the left bar; defaults to the app accent. */
  accent?: 'default' | 'gold' | 'success';
  align?: 'left' | 'center';
  className?: string;
}

const accentMap = {
  default: 'bg-gold-400',
  gold: 'bg-gold-400',
  success: 'bg-success-400',
} as const;

export function StageHeader({
  label,
  icon,
  accent = 'default',
  align = 'left',
  className = '',
}: StageHeaderProps) {
  const centered = align === 'center';

  return (
    <div
      className={[
        'flex items-center gap-2.5 select-none',
        centered ? 'justify-center' : '',
        className,
      ].join(' ')}
    >
      <span
        className={[
          'rounded-full transition-colors duration-200',
          accentMap[accent],
          centered ? 'w-8 h-1' : 'w-1 h-4',
        ].join(' ')}
      />
      <div className="flex items-center gap-1.5 min-w-0">
        {icon}
        <h3 className="text-[13px] font-bold text-ink tracking-tight leading-none uppercase truncate">
          {label}
        </h3>
      </div>
    </div>
  );
}
