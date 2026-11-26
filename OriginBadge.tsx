import React from 'react';

export type OrigemEdital = 'transpetro' | 'petrobras' | 'ambos';

interface OriginBadgeProps {
  origem: OrigemEdital;
  codigoTranspetro?: string;
  codigoPetrobras?: string;
  compact?: boolean;
  showCodes?: boolean;
  className?: string;
}

const ORIGIN_STYLES: Record<
  OrigemEdital,
  {
    label: string;
    shortLabel: string;
    dotColor: string;
    badgeClass: string;
  }
> = {
  ambos: {
    label: 'Transpetro + Petrobras',
    shortLabel: 'TP + PB',
    dotColor: 'bg-[#E0A100]',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
  },
  transpetro: {
    label: 'Transpetro',
    shortLabel: 'Transpetro',
    dotColor: 'bg-[#008542]',
    badgeClass: 'bg-[#E6F4EC] text-[#006837] border-[#008542]/30',
  },
  petrobras: {
    label: 'Petrobras',
    shortLabel: 'Petrobras',
    dotColor: 'bg-orange-500',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-300',
  },
};

export const OriginBadge: React.FC<OriginBadgeProps> = ({
  origem,
  codigoTranspetro,
  codigoPetrobras,
  compact = false,
  showCodes = false,
  className = '',
}) => {
  const cfg = ORIGIN_STYLES[origem];
  const codesText = [codigoTranspetro, codigoPetrobras].filter(Boolean).join(' · ');

  return (
    <span
      title={codesText ? `${cfg.label} (${codesText})` : cfg.label}
      className={`inline-flex items-center gap-1.5 rounded-md border font-semibold leading-tight whitespace-nowrap shrink-0 ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'
      } ${cfg.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotColor}`} aria-hidden="true" />
      <span>{compact ? cfg.shortLabel : cfg.label}</span>
      {showCodes && codesText && (
        <span className="font-mono text-[10px] opacity-80 border-l border-current/25 pl-1.5">
          {codesText}
        </span>
      )}
    </span>
  );
};
