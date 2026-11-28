import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'muted' | 'dark';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const VARIANT_MAP: Record<NonNullable<CardProps['variant']>, string> = {
  default:
    'bg-white border border-slate-200/80 text-slate-900 shadow-[0_1px_2px_rgba(7,31,20,0.04),0_10px_24px_-16px_rgba(7,31,20,0.09)]',
  interactive:
    'bg-white border border-slate-200/80 text-slate-900 shadow-[0_1px_2px_rgba(7,31,20,0.04),0_10px_24px_-16px_rgba(7,31,20,0.09)] card-interactive-hover',
  muted:
    'bg-[#F5F7F6] border border-slate-200/75 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
  dark:
    'bg-gradient-to-br from-[#071F14] via-[#092619] to-[#0B2E1E] border border-[#174630] text-white shadow-[0_6px_24px_-10px_rgba(7,31,20,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]',
};

const PADDING_MAP: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-7',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl ${VARIANT_MAP[variant]} ${PADDING_MAP[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
