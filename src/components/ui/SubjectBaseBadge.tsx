import React from 'react';
import { Atom, FlaskConical } from 'lucide-react';
import type { SubjectCategory } from '../../utils/subjectClassification';

interface SubjectBaseBadgeProps {
  category: SubjectCategory | null | undefined;
  showNivelamento?: boolean;
  showPhaseHint?: boolean;
  compact?: boolean;
  className?: string;
}

export const SubjectBaseBadge: React.FC<SubjectBaseBadgeProps> = ({
  category,
  showNivelamento = false,
  showPhaseHint = false,
  compact = false,
  className = '',
}) => {
  if (!category) return null;

  if (category === 'tecnico') {
    if (!showPhaseHint) return null;
    return (
      <span
        className={`inline-flex items-center rounded-md border border-slate-200 bg-slate-100 text-slate-700 font-semibold leading-tight whitespace-nowrap shrink-0 ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'
        } ${className}`}
        title="Conteúdo técnico específico — entra no cronograma a partir de abril de 2027"
      >
        A partir de abril
      </span>
    );
  }

  const isQuimica = category === 'quimica';
  const paddingClass = compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <span
        className={`inline-flex items-center gap-1 rounded-md border font-semibold leading-tight whitespace-nowrap shrink-0 ${paddingClass} ${
          isQuimica
            ? 'bg-orange-50 text-orange-800 border-orange-300'
            : 'bg-sky-50 text-sky-800 border-sky-300'
        }`}
        title={isQuimica ? 'Base em Química (Nivelamento Jan–Mar)' : 'Base em Física (Nivelamento Jan–Mar)'}
      >
        {isQuimica ? (
          <FlaskConical className="w-3 h-3 shrink-0" aria-hidden="true" />
        ) : (
          <Atom className="w-3 h-3 shrink-0" aria-hidden="true" />
        )}
        <span>{isQuimica ? 'QUÍMICA' : 'FÍSICA'}</span>
      </span>

      {showNivelamento && (
        <span
          className={`inline-flex items-center rounded-md border border-[#008542]/30 bg-[#E6F4EC] text-[#006837] font-semibold leading-tight whitespace-nowrap shrink-0 ${paddingClass}`}
          title="Conteúdo ativo na fase de nivelamento (Janeiro a Março de 2027)"
        >
          NIVELAMENTO
        </span>
      )}
    </span>
  );
};
