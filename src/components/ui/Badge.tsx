import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantMap: Record<BadgeVariant, string> = {
  default: 'bg-app-solid-2 text-ink-muted border border-app-border',
  success: 'bg-success-500/12 text-success-300 border border-success-500/20',
  warning: 'bg-warning-500/12 text-warning-300 border border-warning-500/20',
  danger: 'bg-danger-500/12 text-danger-300 border border-danger-500/20',
  info: 'bg-gold-500/12 text-gold-300 border border-gold-500/20',
  muted: 'bg-app-solid text-ink-faint border border-app-border',
};

const dotMap: Record<BadgeVariant, string> = {
  default: 'bg-ink/50',
  success: 'bg-success-400',
  warning: 'bg-warning-400',
  danger: 'bg-danger-400',
  info: 'bg-gold-400',
  muted: 'bg-ink-faint/50',
};

export function Badge({ variant = 'default', children, className = '', dot }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] leading-none',
        variantMap[variant],
        className,
      ].join(' ')}
    >
      {dot && <span className={['w-1.5 h-1.5 rounded-full shrink-0', dotMap[variant]].join(' ')} />}
      {children}
    </span>
  );
}
