import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface NumberStepperProps {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  error?: string;
  hint?: React.ReactNode;
  size?: 'full' | 'sm';
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 1,
  max = Infinity,
  error,
  hint,
  size = 'full',
}: NumberStepperProps) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const inputClass =
    size === 'sm'
      ? 'w-16 text-center px-2 py-2 bg-app-surface-2 border border-app-border rounded-xl text-sm font-bold text-ink outline-none focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200 ease-out tabular-nums'
      : 'flex-1 w-full bg-app-surface-2 border border-app-border text-ink text-center font-bold tabular-nums rounded-xl px-3 py-2 text-sm outline-none focus:border-gold-400/50 focus:bg-app-surface-3 transition-colors duration-200 ease-out';

  return (
    <div className="flex flex-col gap-1.5">
      {(label || error) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-ink-muted font-medium">{label}</span>}
          {error && <span className="text-xs text-danger-400 font-medium">{error}</span>}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          className="w-9 h-9 rounded-xl bg-app-surface-2 border border-app-border flex items-center justify-center text-ink-muted hover:text-ink hover:bg-app-surface-3 hover:border-app-border-strong disabled:opacity-30 disabled:hover:bg-app-surface-2 transition-all duration-200 ease-out active:scale-95"
        >
          <Minus size={16} />
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max === Infinity ? undefined : max}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onChange(Number.isNaN(v) ? min : clamp(v));
          }}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          className="w-9 h-9 rounded-xl bg-app-surface-2 border border-app-border flex items-center justify-center text-ink-muted hover:text-ink hover:bg-app-surface-3 hover:border-app-border-strong disabled:opacity-30 disabled:hover:bg-app-surface-2 transition-all duration-200 ease-out active:scale-95"
        >
          <Plus size={16} />
        </button>
        {hint}
      </div>
    </div>
  );
}
