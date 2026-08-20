import React from 'react';

interface IconButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function IconButton({ onClick, children, title, className = '', disabled, ...rest }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        'w-10 h-10 rounded-xl bg-app-solid-2 border border-app-border flex items-center justify-center text-ink-muted',
        'hover:text-ink hover:bg-app-solid-3 hover:border-app-border-strong',
        'active:scale-95 transition-all duration-200 ease-out shrink-0',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
