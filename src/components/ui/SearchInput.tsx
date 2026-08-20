import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }: SearchInputProps) {
  return (
    <div className={['relative', className].join(' ')}>
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-10 py-3 bg-app-surface-2 border border-app-border/60 rounded-xl text-sm text-ink placeholder-ink-faint/40 outline-none focus:border-gold-400/40 focus:bg-app-surface-3 transition-all duration-200 ease-out"
        style={{
          backgroundImage:
            'linear-gradient(180deg, color-mix(in srgb, var(--accent-500) 4%, transparent) 0%, transparent 60%)',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors duration-200 ease-out"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
