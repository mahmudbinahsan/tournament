import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'large' | 'medium';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'large',
  className = '',
}: EmptyStateProps) {
  if (variant === 'medium') {
    return (
      <div className={['glass card-shadow rounded-2xl p-8 text-center text-ink-muted', className].join(' ')}>
        {icon}
        {description && <p className="text-sm leading-relaxed">{description}</p>}
        {action}
      </div>
    );
  }

  const isEmoji = typeof icon === 'string';
  return (
    <div className={['glass card-shadow rounded-2xl p-8 text-center', className].join(' ')}>
      {icon && (isEmoji ? (
        <div className="relative inline-flex mb-5">
          <div className="absolute inset-0 rounded-3xl accent-tint blur-xl opacity-70" />
          <div className="relative text-5xl">{icon}</div>
        </div>
      ) : (
        <div className="mb-4 flex justify-center">{icon}</div>
      ))}
      {title && <h3 className="text-base font-bold text-ink mb-2 leading-tight tracking-tight">{title}</h3>}
      {description && <p className="text-sm text-ink-muted mb-5 leading-relaxed max-w-xs mx-auto">{description}</p>}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
