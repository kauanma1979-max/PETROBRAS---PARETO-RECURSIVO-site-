import React from 'react';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'orange' | 'gold';

interface StatusBadgeProps {
  tone?: StatusTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-[#E6F4EC] text-[#006837] border-[#008542]/25',
  warning: 'bg-amber-50 text-amber-900 border-amber-300',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  orange: 'bg-orange-50 text-orange-800 border-orange-200',
  gold: 'bg-[#FDB913] text-[#071F14] border-[#E0A100]',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  tone = 'neutral',
  icon,
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold leading-tight whitespace-nowrap shrink-0 ${TONE_CLASSES[tone]} ${className}`}
    >
      {icon && <span className="shrink-0 inline-flex" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
