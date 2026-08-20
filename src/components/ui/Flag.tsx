import React, { useMemo } from 'react';
import { isCountryFlagEmoji, COUNTRY_FLAGS } from '../../core/models/countries';
import { SVG_FLAGS } from '../../core/models/flagSvg';

export type FlagSize = 'xs' | 'small' | 'medium' | 'large' | 'xlarge' | 'hero';

const sizeClass: Record<FlagSize, string> = {
  xs: 'w-[18px] h-[12px] text-[11px] rounded-[3px]',
  small: 'w-[22px] h-[15px] text-[13px] rounded-[4px]',
  medium: 'w-[26px] h-[18px] text-[15px] rounded-[4px]',
  large: 'w-[30px] h-[20px] text-[17px] rounded-[5px]',
  xlarge: 'w-[36px] h-[24px] text-[20px] rounded-[5px]',
  hero: 'w-[64px] h-[42px] text-[35px] rounded-[8px]',
};

interface FlagProps {
  emoji: string;
  size?: FlagSize;
  className?: string;
  style?: React.CSSProperties;
}

export function Flag({ emoji, size = 'medium', className = '', style }: FlagProps) {
  const isPlaceholder = emoji === '—';

  const svgMarkup = useMemo(() => {
    if (isPlaceholder) return null;
    const country = COUNTRY_FLAGS.find((c) => c.emoji === emoji);
    if (!country) return null;
    return SVG_FLAGS[country.code] ?? null;
  }, [emoji, isPlaceholder]);

  const containerClass = [
    'inline-flex shrink-0 items-center justify-center overflow-hidden',
    'border border-white/20 bg-app-surface-3',
    'shadow-[0_1px_2px_rgba(0,0,0,0.28),0_2px_5px_rgba(0,0,0,0.16)]',
    'leading-none',
    sizeClass[size],
    isPlaceholder ? 'text-[11px] font-semibold text-ink-faint' : svgMarkup ? '' : 'flag-glyph',
    className,
  ].join(' ');

  return (
    <span
      className={containerClass}
      style={style}
      role="img"
      aria-label="flag"
    >
      {isPlaceholder ? emoji : svgMarkup ? (
        <span
          className="flex w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      ) : emoji}
    </span>
  );
}
