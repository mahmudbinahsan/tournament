import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'text-gold-50 accent-gradient shadow-md shadow-gold-500/20 hover:shadow-lg hover:shadow-gold-500/30 hover:brightness-[1.06] active:brightness-95 border border-gold-400/20',
  secondary:
    'bg-app-solid-2 hover:bg-app-solid-3 active:bg-app-solid text-ink border border-app-border hover:border-app-border-strong shadow-sm',
  ghost:
    'bg-transparent hover:bg-app-solid-2 active:bg-app-solid text-ink-muted hover:text-ink',
  danger:
    'bg-danger-500/12 hover:bg-danger-500/20 active:bg-danger-500/25 text-danger-300 border border-danger-400/25 hover:border-danger-400/40',
  success:
    'bg-success-500 hover:bg-success-400 active:bg-success-600 text-white shadow-md shadow-success-500/25',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-[13px] rounded-xl gap-1.5 font-semibold tracking-tight',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2 font-semibold tracking-tight',
  lg: 'px-6 py-3.5 text-[15px] rounded-2xl gap-2.5 font-bold tracking-tight',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-semibold',
        'transition-all duration-200 ease-out active:scale-[0.97]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        'select-none cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
      {iconRight && !loading && <span className="shrink-0 ml-auto">{iconRight}</span>}
    </button>
  );
}
