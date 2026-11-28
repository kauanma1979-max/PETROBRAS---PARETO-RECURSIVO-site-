import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'orange' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#008542] hover:bg-[#006837] active:bg-[#00522B] text-white border border-emerald-400/20 shadow-[0_1px_2px_rgba(0,104,55,0.25),inset_0_1px_0_rgba(255,255,255,0.16)]',
  secondary:
    'bg-[#071F14] hover:bg-[#0D3020] active:bg-[#04140D] text-white border border-white/10 shadow-[0_1px_2px_rgba(7,31,20,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]',
  orange:
    'bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white border border-orange-400/20 shadow-[0_1px_2px_rgba(234,88,12,0.25),inset_0_1px_0_rgba(255,255,255,0.16)]',
  outline:
    'bg-white hover:bg-[#F5F7F6] active:bg-[#EBF2EE] text-slate-700 hover:text-[#071F14] border border-slate-200/90 hover:border-[#008542]/40 shadow-[0_1px_2px_rgba(7,31,20,0.04)]',
  ghost:
    'bg-transparent hover:bg-[#EFF4F1] active:bg-[#E2ECE6] text-slate-600 hover:text-[#071F14] border border-transparent',
  danger:
    'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-400/20 shadow-[0_1px_2px_rgba(225,29,72,0.25),inset_0_1px_0_rgba(255,255,255,0.14)]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-xs sm:text-sm rounded-xl gap-2',
  lg: 'h-11 px-5 text-sm rounded-xl gap-2',
  icon: 'h-10 w-10 p-0 rounded-xl justify-center',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'outline',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`btn-tactile inline-flex items-center justify-center font-semibold whitespace-nowrap shrink-0 transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150 ease-[var(--ease-out)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
    </button>
  );
};
