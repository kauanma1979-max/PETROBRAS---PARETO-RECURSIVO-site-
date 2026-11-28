import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastBannerProps {
  tone?: 'success' | 'error' | 'info';
  message: string;
  className?: string;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({
  tone = 'success',
  message,
  className = '',
}) => {
  const styles =
    tone === 'success'
      ? 'bg-[#E6F4EC] border-[#008542]/30 text-[#071F14]'
      : tone === 'error'
      ? 'bg-rose-50 border-rose-200 text-rose-900'
      : 'bg-orange-50 border-orange-200 text-orange-950';

  const Icon =
    tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;
  const iconColor =
    tone === 'success'
      ? 'text-[#008542]'
      : tone === 'error'
      ? 'text-rose-600'
      : 'text-orange-600';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast-enter px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-2xs ${styles} ${className}`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
};
