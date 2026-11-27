import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  X,
} from 'lucide-react';
import {
  CALENDAR_END_DATE,
  CALENDAR_START_DATE,
  getCalendarDayPlan,
  getMonthCalendarCells,
  isDateIn2027Schedule,
  type CalendarDayPlan,
  type CalendarStudyBlock,
} from '../utils/studyCalendar2027';
import {
  formatDateKeyBR,
  getWeekDateKeysMonToSun,
  parseLocalDateKey,
  toLocalDateKey,
} from '../utils/studyFocusStorage';
import { Button, Card, OriginBadge, StatusBadge, SubjectBaseBadge } from './ui';
import type { MacroAreaId } from '../utils/subjectClassification';

export type CalendarViewMode = 'semana' | 'mes' | 'agenda';

interface StudyCalendarViewProps {
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  loggedMinutesByDay?: Map<string, number>;
  onScrollToDayPanel?: () => void;
}

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const MACRO_ACCENT: Record<MacroAreaId, string> = {
  quimica_processos: 'border-l-orange-500 bg-orange-50/75 text-orange-950 hover:bg-orange-100/80',
  mecanica_fluidos: 'border-l-sky-600 bg-sky-50/75 text-sky-950 hover:bg-sky-100/80',
  instrumentacao: 'border-l-emerald-600 bg-emerald-50/75 text-emerald-950 hover:bg-emerald-100/80',
  eletricidade: 'border-l-amber-500 bg-amber-50/75 text-amber-950 hover:bg-amber-100/80',
};

function getPillAccentClass(block: CalendarStudyBlock): string {
  if (block.isNivelamento) {
    return block.subjectCategory === 'quimica'
      ? 'border-l-orange-500 bg-orange-50/85 text-orange-950 hover:bg-orange-100'
      : 'border-l-sky-600 bg-sky-50/85 text-sky-950 hover:bg-sky-100';
  }
  return MACRO_ACCENT[block.macroAreaId] || 'border-l-slate-500 bg-slate-100 text-slate-900';
}

export const StudyCalendarView: React.FC<StudyCalendarViewProps> = ({
  selectedDateKey,
  onSelectDate,
  loggedMinutesByDay,
  onScrollToDayPanel,
}) => {
  const initialDate = parseLocalDateKey(selectedDateKey);
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth0, setViewMonth0] = useState<number>(initialDate.getMonth());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('mes');
  const [outsideTodayNotice, setOutsideTodayNotice] = useState<boolean>(false);
  const [activePopoverBlock, setActivePopoverBlock] = useState<CalendarStudyBlock | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sincroniza mês visível quando o usuário seleciona uma data de outro mês externamente
  useEffect(() => {
    const dt = parseLocalDateKey(selectedDateKey);
    if (!Number.isNaN(dt.getTime())) {
      setViewYear(dt.getFullYear());
      setViewMonth0(dt.getMonth());
    }
  }, [selectedDateKey]);

  // Fechamento do popover via Escape ou clique externo
  useEffect(() => {
    if (!activePopoverBlock) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopoverBlock(null);
      }
    };
    const handlePointerDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePopoverBlock(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [activePopoverBlock]);

  const todayKey = toLocalDateKey();

  const monthCells = useMemo(
    () => getMonthCalendarCells(viewYear, viewMonth0),
    [viewYear, viewMonth0]
  );

  const weekPlans: CalendarDayPlan[] = useMemo(() => {
    return getWeekDateKeysMonToSun(selectedDateKey).map((dk) => getCalendarDayPlan(dk));
  }, [selectedDateKey]);

  const agendaDays: CalendarDayPlan[] = useMemo(() => {
    return monthCells
      .filter((c) => c.isCurrentMonth)
      .map((c) => c.plan);
  }, [monthCells]);

  const currentMonthKeyPrefix = `${viewYear}-${String(viewMonth0 + 1).padStart(2, '0')}`;
  const isPhase1Month =
    viewYear === 2027 && viewMonth0 >= 0 && viewMonth0 <= 2;
  const isPhase2Month =
    viewYear === 2027 && viewMonth0 >= 3 && viewMonth0 <= 9;

  const handlePrevPeriod = () => {
    setActivePopoverBlock(null);
    if (viewMode === 'semana') {
      const dt = parseLocalDateKey(selectedDateKey);
      dt.setDate(dt.getDate() - 7);
      const nextKey = toLocalDateKey(dt);
      onSelectDate(nextKey);
      return;
    }
    if (viewMonth0 === 0) {
      setViewYear((y) => y - 1);
      setViewMonth0(11);
    } else {
      setViewMonth0((m) => m - 1);
    }
  };

  const handleNextPeriod = () => {
    setActivePopoverBlock(null);
    if (viewMode === 'semana') {
      const dt = parseLocalDateKey(selectedDateKey);
      dt.setDate(dt.getDate() + 7);
      const nextKey = toLocalDateKey(dt);
      onSelectDate(nextKey);
      return;
    }
    if (viewMonth0 === 11) {
      setViewYear((y) => y + 1);
      setViewMonth0(0);
    } else {
      setViewMonth0((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setActivePopoverBlock(null);
    const nowKey = toLocalDateKey();
    onSelectDate(nowKey);
    const nowDt = parseLocalDateKey(nowKey);
    setViewYear(nowDt.getFullYear());
    setViewMonth0(nowDt.getMonth());
    setOutsideTodayNotice(!isDateIn2027Schedule(nowKey));
  };

  const handleJumpMonth2027 = (m0: number) => {
    setActivePopoverBlock(null);
    setOutsideTodayNotice(false);
    setViewYear(2027);
    setViewMonth0(m0);
    // Seleciona primeiro dia útil do mês para leitura imediata de Estudos do dia
    for (let day = 1; day <= 7; day++) {
      const dt = new Date(2027, m0, day);
      if (dt.getDay() >= 1 && dt.getDay() <= 5) {
        onSelectDate(toLocalDateKey(dt));
        return;
      }
    }
  };

  const handleInspectBlock = (block: CalendarStudyBlock) => {
    onSelectDate(block.dateKey);
    setActivePopoverBlock(null);
    onScrollToDayPanel?.();
  };

  return (
    <Card padding="md" className="space-y-4 relative">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E6F4EC] border border-[#008542]/25 text-[#006837] flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 leading-tight">
              Calendário de Estudos
            </h3>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              Plano Jan–Out/2027 · 50m + 20m + 50m/dia útil · Sáb e Dom descanso
            </p>
          </div>
          {isPhase1Month && (
            <StatusBadge tone="success">Nivelamento — 1 matéria/dia (Química ↔ Física)</StatusBadge>
          )}
          {isPhase2Month && (
            <StatusBadge tone="orange">Pareto completo — aulas de 50 min</StatusBadge>
          )}
          {!isPhase1Month && !isPhase2Month && (
            <StatusBadge tone="neutral">Fora do intervalo Jan–Out/2027</StatusBadge>
          )}
        </div>

        {/* Navigation + View Switcher */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              id="btn-calendar-today"
              variant="outline"
              size="sm"
              onClick={handleGoToday}
            >
              Hoje
            </Button>
            <button
              type="button"
              id="btn-calendar-prev"
              onClick={handlePrevPeriod}
              aria-label="Mês anterior"
              title="Mês anterior"
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              id="btn-calendar-next"
              onClick={handleNextPeriod}
              aria-label="Próximo mês"
              title="Próximo mês"
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="text-sm font-display font-bold text-slate-900 px-2 tabular-nums min-w-[136px]">
              {MONTH_NAMES_PT[viewMonth0]} de {viewYear}
            </span>
          </div>

          <div
            role="group"
            aria-label="Alternar visualização do calendário"
            className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200"
          >
            {(
              [
                { id: 'semana', label: 'Semana' },
                { id: 'mes', label: 'Mês' },
                { id: 'agenda', label: 'Agenda' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                id={`btn-cal-view-${opt.id}`}
                aria-pressed={viewMode === opt.id}
                onClick={() => {
                  setActivePopoverBlock(null);
                  setViewMode(opt.id);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  viewMode === opt.id
                    ? 'bg-[#071F14] text-[#FDB913]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick 2027 Month Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1">2027:</span>
        {MONTH_NAMES_PT.slice(0, 10).map((monthName, idx) => {
          const isCurrent = viewYear === 2027 && viewMonth0 === idx;
          const isFase1 = idx <= 2;
          return (
            <button
              key={monthName}
              type="button"
              aria-pressed={isCurrent}
              onClick={() => handleJumpMonth2027(idx)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors duration-150 cursor-pointer shrink-0 ${
                isCurrent
                  ? 'bg-[#008542] text-white border-[#008542]'
                  : isFase1
                  ? 'bg-[#E6F4EC]/60 text-[#006837] border-[#008542]/20 hover:bg-[#E6F4EC]'
                  : 'bg-[#F6F8F7] text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title={
                isFase1
                  ? `${monthName} 2027 — Fase 1: Nivelamento Química e Física`
                  : `${monthName} 2027 — Fase 2: Pareto completo`
              }
            >
              {monthName.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {/* Informative notice when real Hoje is outside Jan-Oct 2027 */}
      {outsideTodayNotice && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span>
              A data atual ({formatDateKeyBR(todayKey)}) está fora do calendário programado ({formatDateKeyBR(CALENDAR_START_DATE)} a {formatDateKeyBR(CALENDAR_END_DATE)}). O cronômetro continua funcionando normalmente para registrar seu foco de hoje.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleJumpMonth2027(0)}
          >
            Ir para Janeiro de 2027
          </Button>
        </div>
      )}

      {/* VIEW: MÊS */}
      {viewMode === 'mes' && (
        <div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_HEADERS.map((h, i) => (
              <div
                key={h}
                className={`text-center py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md ${
                  i >= 5 ? 'text-slate-400 bg-slate-50' : 'text-slate-600 bg-[#F6F8F7]'
                }`}
              >
                {h}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell) => {
              const { dateKey, dayNumber, isCurrentMonth, plan } = cell;
              const isSelected = dateKey === selectedDateKey;
              const isToday = dateKey === todayKey;
              const loggedMin = loggedMinutesByDay?.get(dateKey) || 0;
              const visibleBlocks = plan.blocks.slice(0, 2);
              const extraCount = Math.max(0, plan.blocks.length - visibleBlocks.length);

              return (
                <div
                  key={dateKey}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActivePopoverBlock(null);
                    onSelectDate(dateKey);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActivePopoverBlock(null);
                      onSelectDate(dateKey);
                    }
                  }}
                  aria-label={`${plan.weekdayLabel}, ${formatDateKeyBR(dateKey)}${
                    plan.isRestDay ? ' — Descanso' : ` — ${plan.plannedMinutes} minutos planejados`
                  }`}
                  className={`min-h-[92px] sm:min-h-[108px] rounded-lg border p-1.5 flex flex-col justify-between text-left transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-[#008542] ring-2 ring-[#008542]/25 bg-[#E6F4EC]/35'
                      : !isCurrentMonth
                      ? 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-slate-200'
                      : plan.isRestDay
                      ? 'border-slate-200/70 bg-slate-50 hover:border-slate-300'
                      : 'border-slate-200 bg-white hover:border-[#008542]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-xs font-mono font-bold tabular-nums px-1 rounded ${
                        isToday
                          ? 'bg-[#FDB913] text-[#071F14]'
                          : isSelected
                          ? 'text-[#006837]'
                          : isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayNumber}
                    </span>

                    {plan.inSchedulePeriod && !plan.isRestDay && (
                      <span className="text-[10px] font-mono tabular-nums text-slate-400 hidden sm:inline">
                        {loggedMin > 0 ? `${loggedMin}m` : '2×50m'}
                      </span>
                    )}
                  </div>

                  {plan.inSchedulePeriod && plan.isRestDay ? (
                    <div className="my-auto text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600 text-[9px] font-bold uppercase tracking-wide">
                        DESCANSO
                      </span>
                    </div>
                  ) : plan.blocks.length > 0 ? (
                    <div className="space-y-1 flex-1 min-w-0">
                      {visibleBlocks.map((blk) => (
                        <button
                          key={blk.blockId}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDate(blk.dateKey);
                            setActivePopoverBlock(blk);
                          }}
                          className={`w-full text-left px-1.5 py-0.5 rounded border-l-2 text-[10px] leading-tight transition-colors duration-150 cursor-pointer block truncate ${getPillAccentClass(
                            blk
                          )}`}
                          title={`${blk.topicTitle} (${blk.plannedMinutes} min)`}
                        >
                          <span className="font-mono font-bold mr-1 tabular-nums">
                            {blk.plannedMinutes}m
                          </span>
                          <span className="truncate">{blk.shortTitle}</span>
                        </button>
                      ))}
                      {extraCount > 0 && (
                        <div className="text-[10px] font-mono font-semibold text-[#006837] px-1">
                          +{extraCount} atividades
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="my-auto text-[10px] text-slate-400 text-center">
                      {!plan.inSchedulePeriod && isCurrentMonth ? 'Fora do plano' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: SEMANA */}
      {viewMode === 'semana' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {weekPlans.map((plan) => {
            const isSelected = plan.dateKey === selectedDateKey;
            const isToday = plan.dateKey === todayKey;
            const loggedMin = loggedMinutesByDay?.get(plan.dateKey) || 0;

            return (
              <div
                key={plan.dateKey}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDate(plan.dateKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectDate(plan.dateKey);
                  }
                }}
                className={`rounded-xl border p-2.5 flex flex-col gap-2 min-h-[140px] text-left transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-[#008542] ring-2 ring-[#008542]/20 bg-[#E6F4EC]/30'
                    : plan.isRestDay
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-[#008542]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      {plan.weekdayLabel.split('-')[0]}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                      {formatDateKeyBR(plan.dateKey)}
                    </div>
                  </div>
                  {isToday && (
                    <span className="px-1.5 py-0.5 rounded bg-[#FDB913] text-[#071F14] text-[10px] font-bold">
                      Hoje
                    </span>
                  )}
                </div>

                {plan.isRestDay ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                      DESCANSO
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">Sem metas</span>
                  </div>
                ) : plan.blocks.length > 0 ? (
                  <div className="space-y-1.5 flex-1">
                    {plan.blocks.map((blk) => (
                      <button
                        key={blk.blockId}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDate(blk.dateKey);
                          setActivePopoverBlock(blk);
                        }}
                        className={`w-full text-left p-1.5 rounded-md border-l-2 text-[11px] leading-snug transition-colors duration-150 cursor-pointer ${getPillAccentClass(
                          blk
                        )}`}
                      >
                        <div className="font-mono font-bold tabular-nums">
                          {blk.plannedMinutes} min
                        </div>
                        <div className="font-semibold line-clamp-2">{blk.topicTitle}</div>
                      </button>
                    ))}
                    <div className="text-[10px] font-mono text-slate-500 pt-1 tabular-nums">
                      Registrado: {loggedMin} / {plan.plannedMinutes} min
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[11px] text-slate-400">
                    Fora de Jan–Out/2027
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: AGENDA */}
      {viewMode === 'agenda' && (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {agendaDays.map((plan) => {
            const isSelected = plan.dateKey === selectedDateKey;
            const loggedMin = loggedMinutesByDay?.get(plan.dateKey) || 0;
            return (
              <div
                key={plan.dateKey}
                onClick={() => onSelectDate(plan.dateKey)}
                className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-[#008542] bg-[#E6F4EC]/40'
                    : plan.isRestDay
                    ? 'border-slate-200/70 bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-[#008542]/45'
                }`}
              >
                <div className="flex items-center gap-3 min-w-[175px]">
                  <div className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                    {formatDateKeyBR(plan.dateKey)}
                  </div>
                  <div className="text-xs text-slate-600">{plan.weekdayLabel}</div>
                </div>

                {plan.isRestDay ? (
                  <div className="flex items-center gap-2">
                    <StatusBadge tone="neutral">DESCANSO</StatusBadge>
                    <span className="text-xs text-slate-500">Fim de semana livre no plano</span>
                  </div>
                ) : plan.blocks.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    {plan.blocks.map((blk) => (
                      <button
                        key={blk.blockId}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDate(blk.dateKey);
                          setActivePopoverBlock(blk);
                        }}
                        className={`px-2 py-1 rounded border-l-2 text-xs font-medium cursor-pointer transition-colors duration-150 ${getPillAccentClass(
                          blk
                        )}`}
                      >
                        <span className="font-mono font-bold mr-1 tabular-nums">
                          {blk.plannedMinutes}m
                        </span>
                        <span>{blk.shortTitle}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Fora do intervalo Jan–Out/2027</span>
                )}

                {plan.inSchedulePeriod && !plan.isRestDay && (
                  <div className="text-[11px] font-mono text-slate-600 tabular-nums shrink-0">
                    {loggedMin}/{plan.plannedMinutes} min
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Event Pill Localized Popover */}
      {activePopoverBlock && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Detalhes do bloco planejado"
          className="rounded-xl border border-slate-300 bg-white shadow-xl p-4 space-y-3 z-20"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <OriginBadge origem={activePopoverBlock.origem} compact />
                <SubjectBaseBadge
                  category={activePopoverBlock.subjectCategory}
                  showNivelamento={activePopoverBlock.isNivelamento}
                  compact
                />
                <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded tabular-nums">
                  {formatDateKeyBR(activePopoverBlock.dateKey)} · {activePopoverBlock.plannedMinutes} min
                </span>
              </div>
              <h4 className="text-sm font-display font-bold text-slate-900">
                {activePopoverBlock.topicTitle}
              </h4>
              <p className="text-xs text-slate-600">
                {activePopoverBlock.macroName} — {activePopoverBlock.mesoName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePopoverBlock(null)}
              aria-label="Fechar detalhes do bloco"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 font-mono tabular-nums text-slate-600">
              <Clock className="w-3.5 h-3.5 text-[#008542]" aria-hidden="true" />
              <span>
                Pareto {activePopoverBlock.paretoSharePct}% · {activePopoverBlock.mappedQuestions} questões ·{' '}
                {activePopoverBlock.studyMode}
              </span>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleInspectBlock(activePopoverBlock)}
            >
              Ver detalhes
            </Button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
        <span className="font-bold text-slate-700">Legenda:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-orange-500 inline-block" aria-hidden="true" />
          QUÍMICA / Química &amp; SMS
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-sky-600 inline-block" aria-hidden="true" />
          FÍSICA / Mecânica &amp; Fluidos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" aria-hidden="true" />
          Instrumentação
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" aria-hidden="true" />
          Eletricidade
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" aria-hidden="true" />
          DESCANSO (Sáb/Dom)
        </span>
        <span className="font-mono text-slate-400 ml-auto hidden sm:inline">
          Mês atual exibido: {currentMonthKeyPrefix}
        </span>
      </div>
    </Card>
  );
};
