import React from 'react';
import { ArrowRight, Calendar, Clock, Play, RotateCcw } from 'lucide-react';
import { Button, Card, Modal, StatusBadge, SubjectBaseBadge } from './ui';
import type { ResolvedStudyResume, TimerLaunchTarget } from '../utils/studyResume';
import { classifyTopicById } from '../utils/subjectClassification';

interface StudyResumePromptProps {
  isOpen: boolean;
  resumeContext: ResolvedStudyResume | null;
  onResumeTimer: (target: TimerLaunchTarget) => void;
  onOpenSchedule: (dateKey: string) => void;
  onDismiss: () => void;
}

export const StudyResumePrompt: React.FC<StudyResumePromptProps> = ({
  isOpen,
  resumeContext,
  onResumeTimer,
  onOpenSchedule,
  onDismiss,
}) => {
  if (!resumeContext) return null;

  const subjectCategory = resumeContext.topicId
    ? classifyTopicById(resumeContext.topicId)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onDismiss}
      maxWidth="lg"
      theme="light"
      title="Continuar de onde parei"
      subtitle="Retomada automática do último tópico e tempo registrado"
      icon={<RotateCcw className="w-5 h-5" aria-hidden="true" />}
    >
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {resumeContext.hasUnfinishedTimer ? (
            <StatusBadge
              tone={resumeContext.phase === 'rest' ? 'danger' : 'info'}
              icon={<Clock className="w-3 h-3" aria-hidden="true" />}
            >
              {resumeContext.phase === 'rest' ? 'DESCANSO PAUSADO' : 'ESTUDO PAUSADO'} ·{' '}
              <span className="font-mono tabular-nums">{resumeContext.remainingClock}</span>
            </StatusBadge>
          ) : (
            <StatusBadge tone="success">Retomada sugerida</StatusBadge>
          )}
          <SubjectBaseBadge
            category={subjectCategory}
            showNivelamento={resumeContext.isNivelamento}
            compact
          />
          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded tabular-nums ml-auto">
            Hoje: {resumeContext.todaySummaryLabel}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-[#F6F8F7] p-4 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Você estava estudando:
          </div>
          <h4 className="text-base sm:text-lg font-display font-bold text-slate-900 leading-snug">
            {resumeContext.topicTitle}
          </h4>
          <p className="text-xs text-slate-600">{resumeContext.subjectTitle}</p>
          <p className="text-xs text-slate-500 pt-1 font-mono tabular-nums">
            {resumeContext.secondaryNote}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onDismiss}
          >
            Agora não
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            leftIcon={<Calendar className="w-4 h-4" aria-hidden="true" />}
            onClick={() => onOpenSchedule(resumeContext.dateKey)}
          >
            Ver planejamento
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            leftIcon={<Play className="w-4 h-4 fill-current" aria-hidden="true" />}
            onClick={() => onResumeTimer(resumeContext.launchTarget)}
          >
            {resumeContext.primaryCtaLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface StudyResumeCompactCardProps {
  resumeContext: ResolvedStudyResume | null;
  onResumeTimer: (target: TimerLaunchTarget) => void;
  onOpenSchedule?: (dateKey: string) => void;
  showScheduleLink?: boolean;
}

export const StudyResumeCompactCard: React.FC<StudyResumeCompactCardProps> = ({
  resumeContext,
  onResumeTimer,
  onOpenSchedule,
  showScheduleLink = true,
}) => {
  if (!resumeContext) return null;

  const subjectCategory = resumeContext.topicId
    ? classifyTopicById(resumeContext.topicId)
    : null;

  return (
    <Card padding="md" className="border-[#008542]/30 bg-[#E6F4EC]/40">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#006837]">
              Continuar de onde parei
            </span>
            {resumeContext.hasUnfinishedTimer && (
              <StatusBadge tone={resumeContext.phase === 'rest' ? 'danger' : 'info'}>
                {resumeContext.phase === 'rest' ? 'DESCANSO' : 'ESTUDO'} ·{' '}
                <span className="font-mono tabular-nums">{resumeContext.remainingClock}</span>
              </StatusBadge>
            )}
            <SubjectBaseBadge
              category={subjectCategory}
              showNivelamento={resumeContext.isNivelamento}
              compact
            />
            <span className="text-[11px] font-mono text-slate-600 tabular-nums">
              Hoje: {resumeContext.todaySummaryLabel}
            </span>
          </div>
          <div className="text-sm sm:text-base font-display font-bold text-slate-900 truncate">
            {resumeContext.topicTitle}
          </div>
          <div className="text-xs text-slate-600 truncate">
            {resumeContext.subjectTitle} · {resumeContext.secondaryNote}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {showScheduleLink && onOpenSchedule && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => onOpenSchedule(resumeContext.dateKey)}
            >
              Ver planejamento
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />}
            onClick={() => onResumeTimer(resumeContext.launchTarget)}
          >
            {resumeContext.primaryCtaLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
};
