import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' };

export function Card({ children, className = '', onClick, padding = 'md' }: CardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={[
        'glass card-shadow rounded-2xl',
        paddingMap[padding],
        onClick ? 'cursor-pointer active:scale-[0.985] transition-all duration-200 ease-out hover:border-app-border-strong' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function CardSection({
  children,
  className = '',
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={['border-t border-app-border pt-3 mt-3', className].join(' ')}>
      {label && <p className="text-[11px] text-ink-faint uppercase tracking-[0.14em] mb-2 leading-none font-semibold">{label}</p>}
      {children}
    </div>
  );
}
