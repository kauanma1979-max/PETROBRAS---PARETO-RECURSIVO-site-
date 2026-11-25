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
    'bg-[#008542] hover:bg-[#006837] active:bg-[#00522B] text-white border border-transparent shadow-2xs',
  secondary:
    'bg-[#071F14] hover:bg-[#0D3020] active:bg-[#04140D] text-white border border-transparent shadow-2xs',
  orange:
    'bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white border border-transparent shadow-2xs',
  outline:
    'bg-white hover:bg-[#F6F8F7] active:bg-[#EBF2EE] text-slate-700 hover:text-[#071F14] border border-slate-200 hover:border-[#008542]/40 shadow-2xs',
  ghost:
    'bg-transparent hover:bg-[#EFF4F1] active:bg-[#E2ECE6] text-slate-600 hover:text-[#071F14] border border-transparent',
  danger:
    'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-transparent shadow-2xs',
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
      className={`inline-flex items-center justify-center font-semibold whitespace-nowrap shrink-0 transition-all duration-150 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
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
