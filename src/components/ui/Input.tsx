import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, hint, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-medium text-ink-muted tracking-tight">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">
            {icon}
          </span>
        )}
        <input
          className={[
            'w-full bg-app-surface-2 border border-app-border text-ink placeholder-ink-faint/50',
            'rounded-xl px-4 py-3 text-sm outline-none leading-snug',
            'focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200 ease-out',
            'disabled:opacity-40',
            icon ? 'pl-10' : '',
            error ? 'border-danger-400/60' : '',
            className,
          ].join(' ')}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
      {error && <p className="text-xs text-danger-400 font-medium">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ label, hint, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[13px] font-medium text-ink-muted tracking-tight">{label}</label>}
      <textarea
        className={[
          'w-full bg-app-surface-2 border border-app-border text-ink placeholder-ink-faint/50',
          'rounded-xl px-4 py-3 text-sm outline-none resize-none leading-relaxed',
          'focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200',
          className,
        ].join(' ')}
        {...props}
      />
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: number;
  color?: string;
}

export function StatSlider({ label, value, color = 'var(--accent-500, #B88A2A)', ...props }: SliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        <span className="text-sm font-bold text-ink tabular-nums">{value}</span>
      </div>
      <div className="relative h-2 rounded-full bg-app-solid-3 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-200 ease-out"
          style={{ width: `${value}%`, background: color }}
        />
        <input
          type="range"
          min={1}
          max={100}
          value={value}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          {...props}
        />
      </div>
    </div>
  );
}
