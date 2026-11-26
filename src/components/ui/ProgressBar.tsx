import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  tone?: 'emerald' | 'rose' | 'amber' | 'sky' | 'orange' | 'gold';
  trackTheme?: 'light' | 'dark';
  height?: 'sm' | 'md';
  className?: string;
}

const BAR_COLORS: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  emerald: 'bg-[#008542]',
  rose: 'bg-rose-600',
  amber: 'bg-[#FDB913]',
  sky: 'bg-sky-600',
  orange: 'bg-orange-600',
  gold: 'bg-gradient-to-r from-[#008542] via-[#FDB913] to-[#F97316]',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  tone = 'emerald',
  trackTheme = 'light',
  height = 'sm',
  className = '',
}) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label || 'Progresso'}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full rounded-full overflow-hidden ${
        height === 'sm' ? 'h-1.5' : 'h-2.5'
      } ${trackTheme === 'dark' ? 'bg-[#0D3221]' : 'bg-slate-200/80'} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${BAR_COLORS[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
