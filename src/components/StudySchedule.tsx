import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CICLOS_ESTUDO,
  StudyCycle,
  StudySession,
  SessionBlock,
  TOTAL_CICLOS_ESTUDO,
  TOTAL_SESSOES_ESTUDO,
  TOTAL_QUESTOES_PLANEJADAS,
} from '../data/scheduleData';
import { Card, Button, StatusBadge, ProgressBar, OriginBadge, SubjectBaseBadge } from './ui';
import type { OrigemEdital } from './ui/OriginBadge';
import {
  CheckCircle2,
  Circle,
  Play,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Trash2,
  Database,
  Target,
  Filter,
  Clock,
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
  buildTimerLaunchTargetFromLegacySession,
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
  completedSessions: string[];
  onToggleSession: (sessionId: string) => void;
  onOpenSessionTimer: (session: StudySession) => void;
  onLaunchTimer?: (target: TimerLaunchTarget) => void;
  selectedCalendarDate?: string;
  onSelectCalendarDate?: (dateKey: string) => void;
}

export const StudySchedule: React.FC<StudyScheduleProps> = ({
  completedSessions,
  onToggleSession,
  onOpenSessionTimer,
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

  // Legado Ciclos C1-C6 (colapsável por padrão, preservação total)
  const [showLegacyCycles, setShowLegacyCycles] = useState<boolean>(false);

  const [selectedCicloNum, setSelectedCicloNum] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('transpetro_schedule_selected_ciclo');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= TOTAL_CICLOS_ESTUDO) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return 1;
  });

  const [activePhaseFilter, setActivePhaseFilter] = useState<string>(() => {
    try {
      return localStorage.getItem('transpetro_schedule_phase_filter') || 'todas';
    } catch {
      return 'todas';
    }
  });

  const [originFilter, setOriginFilter] = useState<'todas' | OrigemEdital>('todas');

  useEffect(() => {
    try {
      localStorage.setItem('transpetro_schedule_selected_ciclo', String(selectedCicloNum));
    } catch {
      // ignore
    }
  }, [selectedCicloNum]);

  useEffect(() => {
    try {
      localStorage.setItem('transpetro_schedule_phase_filter', activePhaseFilter);
    } catch {
      // ignore
    }
  }, [activePhaseFilter]);

  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [completedBlocks, setCompletedBlocks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPLETED_BLOCKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPLETED_BLOCKS, JSON.stringify(completedBlocks));
    } catch {}
  }, [completedBlocks]);

  const handleToggleSessionWrapper = (sessionId: string) => {
    const isDone = Array.isArray(completedSessions) && completedSessions.includes(sessionId);
    const keyA = `${sessionId}_blocoA`;
    const keyB = `${sessionId}_blocoB`;

    if (!isDone) {
      setCompletedBlocks((prev) => {
        const next = new Set(prev);
        next.add(keyA);
        next.add(keyB);
        return Array.from(next);
      });
    } else {
      setCompletedBlocks((prev) => prev.filter((k) => k !== keyA && k !== keyB));
    }
    onToggleSession(sessionId);
  };

  const handleToggleBlock = (sessionId: string, blockKey: 'blocoA' | 'blocoB') => {
    const isSessionDone =
      Array.isArray(completedSessions) && completedSessions.includes(sessionId);
    const keyA = `${sessionId}_blocoA`;
    const keyB = `${sessionId}_blocoB`;
    const targetKey = blockKey === 'blocoA' ? keyA : keyB;
    const otherKey = blockKey === 'blocoA' ? keyB : keyA;

    const isCurrentBlockDone = isSessionDone || completedBlocks.includes(targetKey);
    const isOtherBlockDone = isSessionDone || completedBlocks.includes(otherKey);

    if (isCurrentBlockDone) {
      const next = completedBlocks.filter((k) => k !== targetKey);
      if (isSessionDone && !next.includes(otherKey)) {
        next.push(otherKey);
      }
      setCompletedBlocks(next);
      if (isSessionDone) {
        onToggleSession(sessionId);
      }
    } else {
      const next = Array.from(new Set([...completedBlocks, targetKey]));
      setCompletedBlocks(next);
      if (isOtherBlockDone && !isSessionDone) {
        onToggleSession(sessionId);
      }
    }
  };

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
    } catch (e) {
      console.error('Error saving schedule session notes', e);
    }
  }, [subjectNotes]);

  useEffect(() => {
    const handleStorageRestore = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE_DAY_NOTES);
        if (saved) {
          setSubjectNotes(JSON.parse(saved));
        }
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

  const handleStartLegacySession = (session: StudySession) => {
    if (onLaunchTimer) {
      const target = buildTimerLaunchTargetFromLegacySession(session);
      recordStudyResumePointer(target, 'selected');
      onLaunchTimer(target);
    } else {
      onOpenSessionTimer(session);
    }
  };

  const phases = Array.from(new Set(CICLOS_ESTUDO.map((c) => c.phase)));

  const filteredCycles: StudyCycle[] =
    activePhaseFilter === 'todas'
      ? CICLOS_ESTUDO
      : CICLOS_ESTUDO.filter((c) => c.phase === activePhaseFilter);

  const currentCycle =
    CICLOS_ESTUDO.find((c) => c.cicloNumber === selectedCicloNum) || CICLOS_ESTUDO[0];

  const displayedSessions = currentCycle.sessions.filter(
    (s) =>
      originFilter === 'todas' ||
      s.blockA.origem === originFilter ||
      s.blockB.origem === originFilter
  );

  const cycleCompletedCount = currentCycle.sessions.filter(
    (s) => Array.isArray(completedSessions) && completedSessions.includes(s.id)
  ).length;
  const cycleProgressPct = Math.round(
    (cycleCompletedCount / Math.max(1, currentCycle.sessions.length)) * 100
  );

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
              <span className="font-mono tabular-nums">Seg–Sex · 2h/dia (50/20)</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-[#006837]">
                {selectedDayPlan.phase === 'nivelamento'
                  ? 'Nivelamento — Química e Física'
                  : selectedDayPlan.phase === 'pareto_completo'
                  ? 'Pareto completo — todas as macroáreas'
                  : 'Planejamento Anual 2027'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              Cronograma &amp; Ciclos de Estudo
            </h2>
            <p className="text-slate-600 mt-1 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Jan–Mar/2027 dedicado ao nivelamento de <strong>Química e Física</strong>; Abr–Out/2027 com distribuição integral pelo <strong>Pareto Recursivo</strong>. Clique em qualquer data ou bloco para estudar no cronômetro 50/20.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <Button
              id="btn-schedule-backup-json"
              variant="primary"
              size="sm"
              leftIcon={<Database className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => exportFullBackup()}
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
                ? `${formatMinutesAsHoursMinutes(todayNetMinutes)} de 2h00`
                : todayNetMinutes > 0
                ? `${formatMinutesAsHoursMinutes(todayNetMinutes)} (extra)`
                : 'Fim de semana'}
            </div>
            {isTodayWeekday && (
              <ProgressBar
                value={todayNetMinutes}
                max={DAILY_GOAL_MINUTES}
                label="Meta diária líquida"
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
              {formatMinutesAsHoursMinutes(weekNetMinutes)} de 10h00
            </div>
            <ProgressBar
              value={weekNetMinutes}
              max={WEEKLY_GOAL_MINUTES}
              label="Meta semanal útil"
              tone="gold"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-[#F6F8F7] p-3.5 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Consistência registrada
            </div>
            <div className="text-sm sm:text-base font-display font-extrabold text-slate-900 font-mono tabular-nums">
              {distinctFocusDays} {distinctFocusDays === 1 ? 'dia com foco' : 'dias com foco'}
            </div>
            <div className="text-[11px] text-slate-600 font-mono tabular-nums">
              {macroDistEntries.length > 0
                ? macroDistEntries
                    .map(([id, sec]) => `${MACRO_LABELS[id] || id}: ${Math.floor(sec / 60)}m`)
                    .join(' · ')
                : 'Nenhum minuto líquido gravado ainda'}
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
                  {selectedDayFocusMinutes} min / {selectedDayPlan.plannedMinutes} min (2h00)
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

      {/* Collapsible Legacy Cycles (C1–C6) — 100% Data & LocalStorage Compatibility Preserved */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="neutral">
                <span className="tabular-nums">
                  {TOTAL_CICLOS_ESTUDO} Ciclos · {TOTAL_SESSOES_ESTUDO} Sessões · {TOTAL_QUESTOES_PLANEJADAS} questões
                </span>
              </StatusBadge>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {completedSessions.length} concluídas
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 mt-1">
              Ciclos Temáticos Legados (C1–C6) — Referência Intercalada
            </h3>
            <p className="text-xs text-slate-600">
              Histórico e anotações anteriores preservados integralmente de forma independente do calendário 2027.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowLegacyCycles((prev) => !prev)}
            rightIcon={
              showLegacyCycles ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )
            }
          >
            {showLegacyCycles ? 'Ocultar Ciclos C1–C6' : 'Expandir Ciclos C1–C6'}
          </Button>
        </div>

        {showLegacyCycles && (
          <div className="space-y-5 pt-4 border-t border-slate-100">
            {/* Phase & Origin Filters */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" aria-hidden="true" /> Fase:
                </span>
                <button
                  type="button"
                  id="btn-phase-todas"
                  aria-pressed={activePhaseFilter === 'todas'}
                  onClick={() => setActivePhaseFilter('todas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                    activePhaseFilter === 'todas'
                      ? 'bg-[#071F14] text-[#FDB913] border-b-2 border-orange-500'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos os Ciclos
                </button>
                {phases.map((phase, idx) => {
                  const firstInPhase = CICLOS_ESTUDO.find((c) => c.phase === phase);
                  return (
                    <button
                      key={phase}
                      type="button"
                      id={`btn-phase-${idx + 1}`}
                      aria-pressed={activePhaseFilter === phase}
                      onClick={() => {
                        setActivePhaseFilter(phase);
                        if (firstInPhase) {
                          setSelectedCicloNum(firstInPhase.cicloNumber);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                        activePhaseFilter === phase
                          ? 'bg-[#071F14] text-[#FDB913] border-b-2 border-orange-500'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {phase}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 mr-1">Filtrar origem na sessão:</span>
                {(
                  [
                    { id: 'todas', label: 'Todas' },
                    { id: 'ambos', label: 'Transpetro + Petrobras' },
                    { id: 'transpetro', label: 'Transpetro' },
                    { id: 'petrobras', label: 'Petrobras' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={originFilter === opt.id}
                    onClick={() => setOriginFilter(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                      originFilter === opt.id
                        ? 'bg-[#008542] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cycle Selector Horizontal Scroller */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 mb-2.5 uppercase tracking-wider flex flex-wrap items-center justify-between gap-2">
                <span>Navegar pelos {TOTAL_CICLOS_ESTUDO} Ciclos Temáticos</span>
                <span className="text-[#006837] font-mono font-semibold tabular-nums">
                  Ciclo {selectedCicloNum} de {TOTAL_CICLOS_ESTUDO}
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {filteredCycles.map((ciclo) => {
                  const isSelected = selectedCicloNum === ciclo.cicloNumber;
                  const completedInCycle = ciclo.sessions.filter(
                    (s) => Array.isArray(completedSessions) && completedSessions.includes(s.id)
                  ).length;
                  const isCycleFull = completedInCycle === ciclo.sessions.length;

                  return (
                    <button
                      key={ciclo.cicloNumber}
                      type="button"
                      id={`btn-select-ciclo-${ciclo.cicloNumber}`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedCicloNum(ciclo.cicloNumber)}
                      className={`flex flex-col items-center justify-center min-w-[96px] py-2 px-3 rounded-xl border text-xs transition-colors duration-150 relative cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-[#071F14] text-white border-[#071F14] border-b-2 border-b-orange-500 shadow-2xs font-bold'
                          : 'bg-[#F6F8F7] text-slate-700 border-slate-200 hover:bg-[#EFF4F1]'
                      }`}
                    >
                      {isCycleFull && (
                        <CheckCircle2
                          className="w-3.5 h-3.5 text-[#008542] absolute top-1.5 right-1.5"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-[10px] opacity-75">Ciclo</span>
                      <span
                        className={`text-sm font-display font-extrabold font-mono tabular-nums ${
                          isSelected ? 'text-[#FDB913]' : ''
                        }`}
                      >
                        {ciclo.cicloNumber}
                      </span>
                      <span className="text-[10px] opacity-70 mt-0.5 tabular-nums">
                        {completedInCycle}/{ciclo.sessions.length} sessões
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Cycle Header Card */}
            <Card variant="dark" padding="md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-2 text-xs text-slate-300">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#008542]/25 text-[#FDB913] border border-[#FDB913]/35 font-bold font-mono">
                      {currentCycle.phase}
                    </span>
                    <span className="text-orange-400" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-orange-300">
                      {currentCycle.sessions.length} sessões de estudo
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-bold tracking-tight text-white">
                    {currentCycle.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-3xl leading-relaxed flex items-start gap-1.5">
                    <Target className="w-4 h-4 text-[#FDB913] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <strong className="text-white">Foco do Ciclo:</strong> {currentCycle.focus}
                    </span>
                  </p>
                </div>

                <div className="bg-[#0A281A] p-3.5 rounded-xl border border-[#184831] min-w-[180px] text-right shrink-0">
                  <div className="text-[11px] text-slate-300">Progresso do Ciclo</div>
                  <div className="text-base sm:text-lg font-bold text-[#FDB913] font-mono tabular-nums mb-1.5">
                    {cycleCompletedCount} de {currentCycle.sessions.length} ({cycleProgressPct}%)
                  </div>
                  <ProgressBar
                    value={cycleProgressPct}
                    tone="gold"
                    trackTheme="dark"
                    label={`Progresso do ciclo ${currentCycle.cicloNumber}`}
                  />
                </div>
              </div>
            </Card>

            {/* Sessions List */}
            <div className="space-y-4">
              {displayedSessions.map((session) => {
                const isDone =
                  Array.isArray(completedSessions) && completedSessions.includes(session.id);
                const isBlockADone = isDone || completedBlocks.includes(`${session.id}_blocoA`);
                const isBlockBDone = isDone || completedBlocks.includes(`${session.id}_blocoB`);
                const sessionQuestionsTotal =
                  session.blockA.questionsTarget + session.blockB.questionsTarget;

                const renderBlock = (
                  blockKey: 'blocoA' | 'blocoB',
                  blockNum: 1 | 2,
                  blockData: SessionBlock,
                  isBlockDone: boolean
                ) => {
                  const noteKey = `${session.id}_${blockKey}`;
                  const isExpanded = Boolean(expandedNotes[noteKey]);
                  const hasSavedNote = Boolean(subjectNotes[noteKey]);
                  const accentTone = blockNum === 1 ? 'emerald' : 'orange';

                  return (
                    <div
                      className={`rounded-xl p-4 border flex flex-col justify-between space-y-3 transition-colors ${
                        isBlockDone
                          ? blockNum === 1
                            ? 'bg-[#E6F4EC]/50 border-[#008542]/30'
                            : 'bg-orange-50/50 border-orange-200'
                          : 'bg-[#F6F8F7] border-slate-200/80'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                                accentTone === 'emerald'
                                  ? 'bg-[#E6F4EC] text-[#006837]'
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              Bloco {blockNum}
                            </span>
                            <OriginBadge origem={blockData.origem} compact />
                            {blockData.codigoRef && (
                              <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                {blockData.codigoRef}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            id={`btn-check-${session.id}-${blockKey}`}
                            aria-pressed={isBlockDone}
                            onClick={() => handleToggleBlock(session.id, blockKey)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer border ${
                              isBlockDone
                                ? accentTone === 'emerald'
                                  ? 'bg-[#008542] text-white border-[#008542]'
                                  : 'bg-orange-600 text-white border-orange-600'
                                : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {isBlockDone ? (
                              <>
                                <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />
                                <span>Concluído</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-3 h-3 text-slate-400" aria-hidden="true" />
                                <span>Marcar Bloco</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="text-xs font-bold text-[#006837]">{blockData.subject}</div>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {blockData.topic}
                        </h5>

                        <p className="text-xs text-slate-600 leading-relaxed">{blockData.notes}</p>

                        <div className="flex items-center justify-between bg-white py-1.5 px-2.5 rounded-lg border border-slate-200 text-[11px] font-mono tabular-nums font-semibold">
                          <span className="text-slate-600">Meta prática recomendada:</span>
                          <span className="text-[#006837] font-bold">
                            {blockData.questionsTarget} questões
                          </span>
                        </div>
                      </div>

                      {/* Collapsible Personal Notes */}
                      <div className="pt-3 border-t border-slate-200/80">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            id={`btn-toggle-note-${session.id}-${blockKey}`}
                            aria-expanded={isExpanded}
                            onClick={() => handleToggleNoteExpand(noteKey)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#006837] transition-colors cursor-pointer py-1"
                          >
                            <FileText
                              className={`w-3.5 h-3.5 ${
                                accentTone === 'emerald' ? 'text-[#008542]' : 'text-orange-600'
                              }`}
                              aria-hidden="true"
                            />
                            <span>Anotações do Bloco</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            )}
                          </button>

                          {hasSavedNote && !isExpanded && (
                            <StatusBadge tone={accentTone === 'emerald' ? 'success' : 'orange'}>
                              Salvo
                            </StatusBadge>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="mt-2.5 p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 animate-fadeIn">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                              <label htmlFor={`textarea-note-${session.id}-${blockKey}`}>
                                Dúvidas, Fórmulas &amp; Pontos de Revisão
                              </label>
                              {savedNoteToasts[noteKey] ? (
                                <StatusBadge tone="success" icon={<Check className="w-3 h-3" />}>
                                  Salvo no Backup
                                </StatusBadge>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  Persistido no JSON
                                </span>
                              )}
                            </div>

                            <textarea
                              id={`textarea-note-${session.id}-${blockKey}`}
                              value={subjectNotes[noteKey] || ''}
                              onChange={(e) => handleUpdateNote(noteKey, e.target.value)}
                              placeholder={`Anotações sobre ${blockData.topic}...`}
                              rows={3}
                              className="w-full p-2.5 bg-[#F6F8F7] border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                            />

                            <div className="flex items-center justify-between gap-2 pt-1">
                              <Button
                                id={`btn-save-note-${session.id}-${blockKey}`}
                                variant="primary"
                                size="sm"
                                leftIcon={<Save className="w-3.5 h-3.5" aria-hidden="true" />}
                                onClick={() => handleSaveNoteExplicit(noteKey)}
                              >
                                Salvar Anotação
                              </Button>

                              {hasSavedNote && (
                                <button
                                  type="button"
                                  id={`btn-clear-note-${session.id}-${blockKey}`}
                                  onClick={() => handleClearNote(noteKey)}
                                  className="text-slate-500 hover:text-rose-600 text-[11px] flex items-center gap-1 transition-colors p-1 cursor-pointer"
                                  title="Limpar anotações deste bloco"
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
                };

                return (
                  <Card
                    key={session.id}
                    padding="md"
                    className={
                      isDone
                        ? 'border-[#008542]/45 bg-[#E6F4EC]/25'
                        : 'border-slate-200/90 hover:border-[#008542]/40'
                    }
                  >
                    {/* Session Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <button
                          type="button"
                          id={`btn-check-${session.id}`}
                          aria-pressed={isDone}
                          aria-label={
                            isDone
                              ? `Desmarcar ${session.title} como concluída`
                              : `Marcar ${session.title} como concluída`
                          }
                          onClick={() => handleToggleSessionWrapper(session.id)}
                          className={`rounded-xl p-1 transition-transform active:scale-95 shrink-0 cursor-pointer ${
                            isDone
                              ? 'text-[#008542] hover:text-[#006837]'
                              : 'text-slate-300 hover:text-[#008542]'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2
                              className="w-8 h-8 fill-[#E6F4EC] text-[#008542]"
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              className="w-8 h-8 text-slate-300 hover:text-[#008542] transition-colors"
                              aria-hidden="true"
                            />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#006837] bg-[#E6F4EC] border border-[#008542]/25 px-2 py-0.5 rounded-md tabular-nums">
                              {session.id}
                            </span>
                            <StatusBadge tone="orange">{session.sessionType}</StatusBadge>
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                              Meta: {sessionQuestionsTotal} questões
                            </span>
                            {isDone && (
                              <StatusBadge
                                tone="success"
                                icon={<Check className="w-3 h-3 stroke-[3]" />}
                              >
                                Concluída
                              </StatusBadge>
                            )}
                          </div>
                          <h4
                            className={`text-sm sm:text-base font-bold text-slate-900 mt-1 ${
                              isDone ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {session.title}
                          </h4>
                        </div>
                      </div>

                      <Button
                        id={`btn-timer-${session.id}`}
                        variant="primary"
                        size="sm"
                        leftIcon={<Clock className="w-3.5 h-3.5" aria-hidden="true" />}
                        onClick={() => handleStartLegacySession(session)}
                        className="self-start sm:self-center"
                      >
                        Cronômetro 50/20
                      </Button>
                    </div>

                    {/* 2 Subject Blocks Side-by-Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {renderBlock('blocoA', 1, session.blockA, isBlockADone)}
                      {renderBlock('blocoB', 2, session.blockB, isBlockBDone)}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-2 gap-3">
              <Button
                id="btn-prev-ciclo"
                variant="outline"
                size="md"
                disabled={selectedCicloNum === 1}
                onClick={() => setSelectedCicloNum((prev) => Math.max(1, prev - 1))}
                leftIcon={<ChevronLeft className="w-4 h-4" aria-hidden="true" />}
              >
                Ciclo Anterior
              </Button>

              <span className="text-xs text-slate-500 font-mono font-medium tabular-nums text-center">
                Ciclo {selectedCicloNum} de {TOTAL_CICLOS_ESTUDO}
              </span>

              <Button
                id="btn-next-ciclo"
                variant="outline"
                size="md"
                disabled={selectedCicloNum === TOTAL_CICLOS_ESTUDO}
                onClick={() =>
                  setSelectedCicloNum((prev) => Math.min(TOTAL_CICLOS_ESTUDO, prev + 1))
                }
                rightIcon={<ChevronRight className="w-4 h-4" aria-hidden="true" />}
              >
                Próximo Ciclo
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
