import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  theme?: 'light' | 'dark';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  ariaLabel?: string;
  panelClassName?: string;
  hideHeader?: boolean;
}

const WIDTH_CLASSES: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = '2xl',
  theme = 'light',
  children,
  footer,
  closeOnBackdrop = true,
  ariaLabel,
  panelClassName = '',
  hideHeader = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [shouldRender, setShouldRender] = useState<boolean>(isOpen);
  const [animState, setAnimState] = useState<'open' | 'closed'>(isOpen ? 'open' : 'closed');

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let exitTimer: ReturnType<typeof setTimeout> | null = null;

    if (isOpen) {
      setShouldRender(true);
      setAnimState('closed');
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setAnimState('open');
        });
      });
    } else if (shouldRender) {
      setAnimState('closed');
      exitTimer = setTimeout(() => {
        setShouldRender(false);
      }, 175);
    }

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const formFocusables = container.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (formFocusables.length > 0) {
        formFocusables[0].focus();
        return;
      }
      const focusables = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        container.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusables = Array.from<HTMLElement>(
          containerRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  if (typeof document === 'undefined' || !shouldRender) {
    return null;
  }

  const modalContent = (
    <div
      data-state={animState}
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#04140D]/75 backdrop-blur-xs overflow-y-auto"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title || 'Janela de diálogo'}
        tabIndex={-1}
        data-state={animState}
        onClick={(e) => e.stopPropagation()}
        className={`modal-panel my-auto w-full ${WIDTH_CLASSES[maxWidth]} rounded-2xl shadow-[0_24px_60px_-16px_rgba(4,20,13,0.48)] overflow-hidden flex flex-col max-h-[90vh] outline-none ${
          theme === 'dark'
            ? 'bg-[#071F14] text-white border border-[#174630]'
            : 'bg-white text-slate-900 border border-slate-200/90'
        } ${panelClassName}`}
      >
        {title && !hideHeader && (
          <div className="bg-[#071F14] border-b border-[#133B28] text-white shrink-0 relative">
            <div
              className="h-1 w-full bg-gradient-to-r from-[#008542] via-[#FDB913] to-[#F97316]"
              aria-hidden="true"
            />
            <div className="px-5 py-4 sm:px-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="w-9 h-9 rounded-xl bg-[#008542]/25 text-[#FDB913] border border-[#FDB913]/35 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-display font-bold tracking-tight text-white truncate">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-xs text-slate-300 truncate mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar janela"
                className="btn-tactile p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#113624] transition-colors duration-150 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="modal-scroll-area overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div
            className={`px-5 py-3.5 sm:px-6 border-t shrink-0 ${
              theme === 'dark'
                ? 'bg-[#05160E] border-[#123826]'
                : 'bg-[#F5F7F6] border-slate-200'
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
