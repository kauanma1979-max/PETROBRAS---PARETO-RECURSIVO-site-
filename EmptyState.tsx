import React from 'react';
import { Search } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`border border-dashed border-slate-300 bg-slate-50/70 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2.5 ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center shadow-2xs">
        {icon || <Search className="w-5 h-5" />}
      </div>
      <h4 className="text-sm font-display font-bold text-slate-900">{title}</h4>
      {description && (
        <p className="text-xs text-slate-600 max-w-md leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
