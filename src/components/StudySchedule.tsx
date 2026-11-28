import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Button, StatusBadge, ProgressBar, OriginBadge, SubjectBaseBadge } from './ui';
import {
  Play,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Trash2,
  Database,
  CalendarDays,
  AlertTriangle,
  Coffee,
} from 'lucide-react';
import { exportFullBackup, STORAGE_KEYS } from '../utils/backupStorage';
import { StudyCalendarView } from './StudyCalendarView';
import { StudyResumeCompactCard } from './StudyResumePrompt';
import {
  getCalendarDayPlan,
  getInitialCalendarDateKey,
  type CalendarStudyBlock,
} from '../utils/studyCalendar2027';
import {
  DAILY_GOAL_MINUTES,
  FOCUS_STORAGE_KEYS,
  formatMinutesAsHoursMinutes,
  getDistinctFocusDaysCount,
  getMacroFocusSecondsDistribution,
  getNetFocusSecondsForDate,
  getWeekdayFocusStreakCount,
  getWeeklyWeekdayFocusSeconds,
  isWeekdayDateKey,
  loadFocusLogs,
  parseLocalDateKey,
  toLocalDateKey,
  WEEKLY_GOAL_MINUTES,
  type FocusLogSegment,
} from '../utils/studyFocusStorage';
import {
  buildTimerLaunchTargetFromCalendarBlock,
  recordStudyResumePointer,
  resolveStudyResumeContext,
  type TimerLaunchTarget,
} from '../utils/studyResume';

const MACRO_LABELS: Record<string, string> = {
  quimica_processos: 'Química & SMS',
  mecanica_fluidos: 'Mecânica & Fluidos',
  instrumentacao: 'Instrumentação',
  eletricidade: 'Eletricidade',
};

const MONTH_LONG_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function formatLongDateBR(dateKey: string, weekdayLabel: string): string {
  const dt = parseLocalDateKey(dateKey);
  const day = String(dt.getDate()).padStart(2, '0');
  const monthName = MONTH_LONG_PT[dt.getMonth()] || '';
  return `${weekdayLabel}, ${day} de ${monthName} de ${dt.getFullYear()}`;
}

interface StudyScheduleProps {
  onLaunchTimer?: (target: TimerLaunchTarget) => void;
  selectedCalendarDate?: string;
  onSelectCalendarDate?: (dateKey: string) => void;
}

export const StudySchedule: React.FC<StudyScheduleProps> = ({
  onLaunchTimer,
  selectedCalendarDate: controlledDateKey,
  onSelectCalendarDate,
}) => {
  const dayPanelRef = useRef<HTMLDivElement>(null);

  const [internalDateKey, setInternalDateKey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(FOCUS_STORAGE_KEYS.SELECTED_DATE);
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
    } catch {
      // ignore
    }
    return getInitialCalendarDateKey();
  });

  const selectedDateKey = controlledDateKey || internalDateKey;

  const handleSelectDateKey = (nextDateKey: string) => {
    setInternalDateKey(nextDateKey);
    try {
      localStorage.setItem(FOCUS_STORAGE_KEYS.SELECTED_DATE, nextDateKey);
    } catch {
      // ignore
    }
    onSelectCalendarDate?.(nextDateKey);
  };

  // Estado reativo dos logs líquidos de foco
  const [focusLogs, setFocusLogs] = useState<FocusLogSegment[]>(() => loadFocusLogs());
  const [focusVersion, setFocusVersion] = useState<number>(0);

  useEffect(() => {
    const refreshFocus = () => {
      setFocusLogs(loadFocusLogs());
      setFocusVersion((v) => v + 1);
    };
    window.addEventListener('transpetro_focus_updated', refreshFocus);
    window.addEventListener('transpetro_data_restored', refreshFocus);
    return () => {
      window.removeEventListener('transpetro_focus_updated', refreshFocus);
      window.removeEventListener('transpetro_data_restored', refreshFocus);
    };
  }, []);

  const resumeContext = useMemo(() => {
    void focusVersion;
    return resolveStudyResumeContext();
  }, [focusVersion]);

  const todayKey = toLocalDateKey();
  const isTodayWeekday = isWeekdayDateKey(todayKey);
  const todayNetMinutes = Math.floor(getNetFocusSecondsForDate(todayKey, focusLogs) / 60);
  const todayGoalPct = Math.min(100, Math.round((todayNetMinutes / DAILY_GOAL_MINUTES) * 100));

  const weekReferenceKey = selectedDateKey;
  const weekNetMinutes = Math.floor(
    getWeeklyWeekdayFocusSeconds(weekReferenceKey, focusLogs) / 60
  );
  const weekGoalPct = Math.min(100, Math.round((weekNetMinutes / WEEKLY_GOAL_MINUTES) * 100));
  const distinctFocusDays = getDistinctFocusDaysCount(focusLogs);
  const weekdayStreakDays = getWeekdayFocusStreakCount(focusLogs, todayKey);
  const macroSecondsDist = useMemo(() => getMacroFocusSecondsDistribution(focusLogs), [focusLogs]);

  const loggedMinutesByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const seg of focusLogs) {
      map.set(seg.dateKey, (map.get(seg.dateKey) || 0) + Math.floor(seg.durationSeconds / 60));
    }
    return map;
  }, [focusLogs]);

  const loggedSecondsByBlock = useMemo(() => {
    const map = new Map<string, number>();
    for (const seg of focusLogs) {
      if (seg.scheduleBlockId) {
        map.set(seg.scheduleBlockId, (map.get(seg.scheduleBlockId) || 0) + seg.durationSeconds);
      }
    }
    return map;
  }, [focusLogs]);

  const selectedDayPlan = useMemo(
    () => getCalendarDayPlan(selectedDateKey),
    [selectedDateKey]
  );

  // Soma líquida vinculada ao dia selecionado (por dateKey ou por blocos planejados daquele dia, sem duplicar)
  const selectedDayFocusMinutes = useMemo(() => {
    const dayBlockIds = new Set(selectedDayPlan.blocks.map((b) => b.blockId));
    let totalSec = 0;
    for (const seg of focusLogs) {
      if (seg.dateKey === selectedDateKey || (seg.scheduleBlockId && dayBlockIds.has(seg.scheduleBlockId))) {
        totalSec += seg.durationSeconds;
      }
    }
    return Math.floor(totalSec / 60);
  }, [focusLogs, selectedDateKey, selectedDayPlan.blocks]);

  const scrollToDayPanel = () => {
    requestAnimationFrame(() => {
      dayPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const [subjectNotes, setSubjectNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE_DAY_NOTES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [savedNoteToasts, setSavedNoteToasts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_DAY_NOTES, JSON.stringify(subjectNotes));
      window.dispatchEvent(
        new CustomEvent('transpetro_storage_changed', {
          detail: { key: STORAGE_KEYS.SCHEDULE_DAY_NOTES },
        })
      );
    } catch (e) {
      console.error('Error saving schedule session notes', e);
    }
  }, [subjectNotes]);

  useEffect(() => {
    const handleStorageRestore = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE_DAY_NOTES);
        setSubjectNotes(saved ? JSON.parse(saved) : {});
      } catch {
        // ignore
      }
    };
    window.addEventListener('transpetro_data_restored', handleStorageRestore);
    return () => window.removeEventListener('transpetro_data_restored', handleStorageRestore);
  }, []);

  const handleUpdateNote = (key: string, text: string) => {
    setSubjectNotes((prev) => {
      const updated = { ...prev, [key]: text };
      try {
        localStorage.setItem(STORAGE_KEYS.SCHEDULE_DAY_NOTES, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearNote = (key: string) => {
    handleUpdateNote(key, '');
    setSavedNoteToasts((prev) => ({ ...prev, [key]: false }));
  };

  const handleSaveNoteExplicit = (key: string) => {
    const currentText = subjectNotes[key] || '';
    handleUpdateNote(key, currentText);
    setSavedNoteToasts((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setSavedNoteToasts((prev) => ({ ...prev, [key]: false }));
    }, 2500);
  };

  const handleToggleNoteExpand = (key: string) => {
    setExpandedNotes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartCalendarBlock = (block: CalendarStudyBlock) => {
    const target = buildTimerLaunchTargetFromCalendarBlock(block);
    recordStudyResumePointer(target, 'selected');
    if (onLaunchTimer) {
      onLaunchTimer(target);
    }
  };

  const macroDistEntries = (Object.entries(macroSecondsDist) as Array<[string, number]>).filter(
    ([, sec]) => sec > 0
  );

  return (
    <div className="space-y-6">
      {/* Header & Real-Data Indicators */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-600 mb-2">
              <StatusBadge tone="success">Calendário 2027 · Jan–Out</StatusBadge>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Seg–Sex · 50m aula + 20m descanso + 50m aula</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-[#006837]">
                {selectedDayPlan.phase === 'nivelamento'
                  ? 'Nivelamento — 1 matéria/dia (Química ↔ Física)'
                  : selectedDayPlan.phase === 'pareto_completo'
                  ? 'Pareto completo — aulas de 50 min'
                  : 'Planejamento Anual 2027'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              Cronograma &amp; Ciclos de Estudo
            </h2>
            <p className="text-slate-600 mt-1 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Jan–Mar/2027 com nivelamento de <strong>1 matéria por dia útil</strong> (alternando um dia Química e outro dia Física); Abr–Out/2027 com distribuição pelo <strong>Pareto Recursivo</strong> em blocos fixos de <strong>50 min</strong> (50m aula + 20m descanso + 50m aula).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <Button
              id="btn-schedule-backup-json"
              variant="primary"
              size="sm"
              leftIcon={<Database className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => {
                exportFullBackup().catch((err) => {
                  console.error('Erro ao gerar backup:', err);
                });
              }}
              title="Baixar backup completo de todos os dados e anotações"
            >
              Salvar Backup JSON
            </Button>
          </div>
        </div>

        {/* Compact Real-Only Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
          <div className="rounded-xl border border-slate-200 bg-[#F6F8F7] p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Foco hoje</span>
              <span className="font-mono tabular-nums text-[#006837]">
                {isTodayWeekday ? `${todayGoalPct}%` : 'DESCANSO'}
              </span>
            </div>
            <div className="text-sm sm:text-base font-display font-extrabold text-slate-900 font-mono tabular-nums">
              {isTodayWeekday
                ? `${formatMinutesAsHoursMinutes(todayNetMinutes)} de 1h40min`
                : todayNetMinutes > 0
                ? `${formatMinutesAsHoursMinutes(todayNetMinutes)} (extra)`
                : 'Fim de semana'}
            </div>
            {isTodayWeekday && (
              <ProgressBar
                value={todayNetMinutes}
                max={DAILY_GOAL_MINUTES}
                label="Meta diária líquida (2 × 50 min)"
                tone="emerald"
              />
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-[#F6F8F7] p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Semana (Seg–Sex)</span>
              <span className="font-mono tabular-nums text-[#006837]">{weekGoalPct}%</span>
            </div>
            <div className="text-sm sm:text-base font-display font-extrabold text-slate-900 font-mono tabular-nums">
              {formatMinutesAsHoursMinutes(weekNetMinutes)} de 8h20min
            </div>
            <ProgressBar
              value={weekNetMinutes}
              max={WEEKLY_GOAL_MINUTES}
              label="Meta semanal útil (10 × 50 min)"
              tone="gold"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-[#F6F8F7] p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Consistência (Seg–Sex)
              </span>
              <span className="text-[10px] font-medium text-slate-500">
                Sáb/Dom não contam
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">
                  Dias estudados
                </div>
                <div className="text-sm sm:text-base font-display font-extrabold text-slate-900 font-mono tabular-nums">
                  {distinctFocusDays} {distinctFocusDays === 1 ? 'dia' : 'dias'}
                </div>
              </div>
              <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">
                  Em sequência
                </div>
                <div className="text-sm sm:text-base font-display font-extrabold text-[#006837] font-mono tabular-nums">
                  {weekdayStreakDays} {weekdayStreakDays === 1 ? 'dia' : 'dias'}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-600 font-mono tabular-nums">
              {macroDistEntries.length > 0
                ? macroDistEntries
                    .map(([id, sec]) => `${MACRO_LABELS[id] || id}: ${Math.floor(sec / 60)}m`)
                    .join(' · ')
                : 'Sáb/Dom não contam como foco nem quebram a sequência'}
            </div>
          </div>
        </div>
      </Card>

      {/* Compact Resume Card if active/saved context exists */}
      {resumeContext && onLaunchTimer && (
        <StudyResumeCompactCard
          resumeContext={resumeContext}
          onResumeTimer={onLaunchTimer}
          showScheduleLink={false}
        />
      )}

      {/* Monthly / Weekly / Agenda 2027 Calendar */}
      <StudyCalendarView
        selectedDateKey={selectedDateKey}
        onSelectDate={handleSelectDateKey}
        loggedMinutesByDay={loggedMinutesByDay}
        onScrollToDayPanel={scrollToDayPanel}
      />

      {/* Selected Day Panel — Estudos do dia */}
      <div id="estudos-do-dia-panel" ref={dayPanelRef}>
        <Card padding="lg" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#006837]">
                  <CalendarDays className="w-4 h-4" aria-hidden="true" />
                  Estudos do dia
                </span>
                <StatusBadge
                  tone={
                    selectedDayPlan.isRestDay
                      ? 'neutral'
                      : selectedDayPlan.phase === 'nivelamento'
                      ? 'success'
                      : selectedDayPlan.phase === 'pareto_completo'
                      ? 'orange'
                      : 'neutral'
                  }
                >
                  {selectedDayPlan.phaseLabel}
                </StatusBadge>
              </div>
              <h3 className="text-lg sm:text-xl font-display font-extrabold text-slate-900">
                {formatLongDateBR(selectedDateKey, selectedDayPlan.weekdayLabel)}
              </h3>
            </div>

            {selectedDayPlan.inSchedulePeriod && !selectedDayPlan.isRestDay && (
              <div className="rounded-xl bg-[#F6F8F7] border border-slate-200 px-3.5 py-2 text-right font-mono tabular-nums shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-500">
                  Planejado x Registrado
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {selectedDayFocusMinutes} min / {selectedDayPlan.plannedMinutes} min (2 × 50 min)
                </div>
              </div>
            )}
          </div>

          {selectedDayPlan.isRestDay && selectedDayPlan.inSchedulePeriod ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
              <Coffee className="w-8 h-8 text-slate-500 mx-auto" aria-hidden="true" />
              <div className="inline-block px-2.5 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-bold uppercase">
                DESCANSO
              </div>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Sábados e domingos são reservados para descanso e consolidação da memória no plano de 2027. Se quiser adiantar algum assunto ou revisar o Caderno de Erros, selecione qualquer dia útil no calendário acima.
              </p>
            </div>
          ) : !selectedDayPlan.inSchedulePeriod ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center space-y-2">
              <p className="text-xs sm:text-sm text-slate-600">
                A data selecionada está fora do plano programado (01/01/2027 a 31/10/2027). Selecione um mês de 2027 acima para visualizar os blocos planejados.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSelectDateKey('2027-01-04')}
              >
                Ver primeiro dia útil (04/01/2027)
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {selectedDayPlan.blocks.map((block, idx) => {
                const noteKey = `cal_${block.blockId}`;
                const isNoteExpanded = Boolean(expandedNotes[noteKey]);
                const hasNote = Boolean(subjectNotes[noteKey]);
                const blockLoggedMin = Math.floor((loggedSecondsByBlock.get(block.blockId) || 0) / 60);

                return (
                  <div
                    key={block.blockId}
                    className="rounded-xl border border-slate-200 bg-[#F6F8F7] p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-[#071F14] text-[#FDB913] text-[10px] font-mono font-bold uppercase">
                            Bloco {idx + 1} · {block.plannedMinutes} min
                          </span>
                          <OriginBadge origem={block.origem} compact />
                          <SubjectBaseBadge
                            category={block.subjectCategory}
                            showNivelamento={block.isNivelamento}
                            compact
                          />
                        </div>

                        <StatusBadge
                          tone={
                            block.priority === 'CRÍTICA'
                              ? 'danger'
                              : block.priority === 'ALTA'
                              ? 'orange'
                              : 'neutral'
                          }
                        >
                          {block.priority}
                        </StatusBadge>
                      </div>

                      <div className="text-[11px] font-bold text-[#006837]">
                        {block.macroName} · {block.mesoName}
                      </div>

                      <h4 className="text-sm sm:text-base font-display font-bold text-slate-900 leading-snug">
                        {block.topicTitle}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-600 tabular-nums">
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                          Pareto {block.paretoSharePct}% · {block.mappedQuestions}q
                        </span>
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {block.studyMode}
                        </span>
                        {blockLoggedMin > 0 && (
                          <span className="bg-[#E6F4EC] border border-[#008542]/25 text-[#006837] font-bold px-2 py-0.5 rounded">
                            Estudado: {blockLoggedMin} min
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        {block.resumoEstrategico}
                      </p>

                      {block.keyTrap && (
                        <div className="rounded-lg bg-amber-50/80 border border-amber-200/80 p-2.5 text-[11px] text-amber-950 flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>
                            <strong>Atenção na prova:</strong> {block.keyTrap}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-200/80">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleNoteExpand(noteKey)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#006837] cursor-pointer py-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#008542]" aria-hidden="true" />
                          <span>Anotações do Bloco</span>
                          {hasNote && !isNoteExpanded && (
                            <StatusBadge tone="success">Salvo</StatusBadge>
                          )}
                          {isNoteExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          )}
                        </button>

                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          leftIcon={<Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />}
                          onClick={() => handleStartCalendarBlock(block)}
                        >
                          Iniciar estudo
                        </Button>
                      </div>

                      {isNoteExpanded && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                            <label htmlFor={`note-${noteKey}`}>
                              Dúvidas, Fórmulas &amp; Revisão
                            </label>
                            {savedNoteToasts[noteKey] && (
                              <StatusBadge tone="success" icon={<Check className="w-3 h-3" />}>
                                Salvo no Backup
                              </StatusBadge>
                            )}
                          </div>
                          <textarea
                            id={`note-${noteKey}`}
                            value={subjectNotes[noteKey] || ''}
                            onChange={(e) => handleUpdateNote(noteKey, e.target.value)}
                            placeholder={`Anotações sobre ${block.shortTitle}...`}
                            rows={3}
                            className="w-full p-2.5 bg-[#F6F8F7] border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              leftIcon={<Save className="w-3.5 h-3.5" aria-hidden="true" />}
                              onClick={() => handleSaveNoteExplicit(noteKey)}
                            >
                              Salvar Anotação
                            </Button>
                            {hasNote && (
                              <button
                                type="button"
                                onClick={() => handleClearNote(noteKey)}
                                className="text-slate-500 hover:text-rose-600 text-[11px] flex items-center gap-1 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" aria-hidden="true" />
                                <span>Limpar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

    </div>
  );
};
