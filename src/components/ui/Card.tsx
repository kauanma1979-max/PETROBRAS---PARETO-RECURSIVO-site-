import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'muted' | 'dark';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const VARIANT_MAP: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-white border border-slate-200/90 text-slate-900 shadow-2xs',
  interactive:
    'bg-white border border-slate-200/90 text-slate-900 shadow-2xs hover:border-[#008542]/45 hover:bg-[#F6F8F7]/60 hover:shadow-sm transition-[border-color,background-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]',
  muted: 'bg-[#F6F8F7] border border-slate-200/80 text-slate-900',
  dark: 'bg-[#071F14] border border-[#123826] text-white shadow-sm',
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
