import type { StudySession } from '../data/scheduleData';
import type { OrigemEdital } from '../components/ui/OriginBadge';
import {
  getCalendarDayPlan,
  getNextPendingStudyDayOrBlock,
  isDateIn2027Schedule,
  type CalendarStudyBlock,
} from './studyCalendar2027';
import {
  DAILY_GOAL_SECONDS,
  formatDateKeyBR,
  formatMinutesAsHoursMinutes,
  formatSecondsAsClock,
  getNetFocusMinutesForDate,
  getNetFocusSecondsForDate,
  isWeekdayDateKey,
  loadActivePomodoroState,
  loadFocusLogs,
  loadStudyResumeState,
  normalizeRestoredPomodoroOnAppOpen,
  saveStudyResumeState,
  toLocalDateKey,
  type PomodoroActiveState,
  type StudyResumeState,
} from './studyFocusStorage';

export interface TimerLaunchTarget {
  kind: 'calendar-block' | 'legacy-session' | 'restored-pomodoro';
  dateKey: string;
  scheduleBlockId?: string;
  legacySessionId?: string;
  topicId?: string;
  macroAreaId?: string;
  topicTitle: string;
  subjectTitle: string;
  origem?: OrigemEdital;
  codigoRef?: string;
  notes?: string;
  questionsTarget?: number;
  studyMode?: string;
  bancaPattern?: string;
  keyTrap?: string;
  isNivelamento?: boolean;
  plannedMinutes?: number;
  legacySession?: StudySession;
  restoredState?: PomodoroActiveState;
}

export interface ResolvedStudyResume {
  reason: 'unfinished_timer' | 'interrupted_or_saved' | 'next_pending_weekday';
  hasUnfinishedTimer: boolean;
  phase?: 'focus' | 'rest';
  secondsRemaining?: number;
  remainingClock?: string;
  topicTitle: string;
  subjectTitle: string;
  dateKey: string;
  dateFormatted: string;
  todayLoggedMinutes: number;
  todayGoalMinutes: number;
  todaySummaryLabel: string;
  primaryCtaLabel: string;
  secondaryNote: string;
  macroAreaId?: string;
  topicId?: string;
  scheduleBlockId?: string;
  isNivelamento?: boolean;
  launchTarget: TimerLaunchTarget;
}

export function buildTimerLaunchTargetFromCalendarBlock(
  block: CalendarStudyBlock
): TimerLaunchTarget {
  const codeParts = [block.codigoTranspetro, block.codigoPetrobras].filter(Boolean);
  return {
    kind: 'calendar-block',
    dateKey: block.dateKey,
    scheduleBlockId: block.blockId,
    topicId: block.topicId,
    macroAreaId: block.macroAreaId,
    topicTitle: block.topicTitle,
    subjectTitle: `${block.macroName} · ${block.mesoName}`,
    origem: block.origem,
    codigoRef: codeParts.join(' / ') || undefined,
    notes: block.resumoEstrategico,
    studyMode: block.studyMode,
    bancaPattern: block.bancaPattern,
    keyTrap: block.keyTrap,
    isNivelamento: block.isNivelamento,
    plannedMinutes: block.plannedMinutes,
  };
}

export function buildTimerLaunchTargetFromLegacySession(
  session: StudySession,
  dateKey: string = toLocalDateKey()
): TimerLaunchTarget {
  return {
    kind: 'legacy-session',
    dateKey,
    legacySessionId: session.id,
    topicTitle: session.blockA.topic,
    subjectTitle: `${session.id} · ${session.title}`,
    origem: session.blockA.origem,
    codigoRef: session.blockA.codigoRef,
    notes: session.blockA.notes,
    questionsTarget: session.blockA.questionsTarget,
    legacySession: session,
  };
}

export function buildTimerLaunchTargetFromRestoredPomodoro(
  state: PomodoroActiveState
): TimerLaunchTarget {
  return {
    kind: 'restored-pomodoro',
    dateKey: state.dateKey,
    scheduleBlockId: state.scheduleBlockId,
    legacySessionId: state.legacySessionId,
    topicId: state.topicId,
    macroAreaId: state.macroAreaId,
    topicTitle: state.topicTitle,
    subjectTitle: state.subjectTitle,
    restoredState: state,
  };
}

export function recordStudyResumePointer(
  target: Pick<
    TimerLaunchTarget,
    'dateKey' | 'scheduleBlockId' | 'legacySessionId' | 'topicId' | 'macroAreaId' | 'topicTitle' | 'subjectTitle'
  >,
  lastAction: StudyResumeState['lastAction']
): StudyResumeState {
  const next: StudyResumeState = {
    updatedAt: Date.now(),
    dateKey: target.dateKey,
    scheduleBlockId: target.scheduleBlockId,
    legacySessionId: target.legacySessionId,
    topicId: target.topicId,
    macroAreaId: target.macroAreaId,
    topicTitle: target.topicTitle,
    subjectTitle: target.subjectTitle,
    lastAction,
  };
  saveStudyResumeState(next);
  return next;
}

/**
 * Resolve o contexto real de retomada ao abrir o app ou exibir cards compactos.
 * Retorna null quando não existe nenhum histórico ou estado salvo (sem modal vazio).
 */
export function resolveStudyResumeContext(
  todayKey: string = toLocalDateKey()
): ResolvedStudyResume | null {
  const activeRestored = normalizeRestoredPomodoroOnAppOpen(loadActivePomodoroState());
  const resumeState = loadStudyResumeState();
  const focusLogs = loadFocusLogs();
  const todayLoggedSeconds = getNetFocusSecondsForDate(todayKey, focusLogs);
  const todayLoggedMinutes = getNetFocusMinutesForDate(todayKey, focusLogs);
  const todayGoalMinutes = 100;
  const todaySummaryLabel = `${formatMinutesAsHoursMinutes(todayLoggedMinutes)} de 1h40min`;

  // 1. Prioridade máxima: sessão de cronômetro inacabada (pausada no último checkpoint)
  if (activeRestored) {
    const remainingClock = formatSecondsAsClock(activeRestored.secondsRemaining);
    const phaseLabel = activeRestored.phase === 'rest' ? 'DESCANSO' : 'ESTUDO';
    const blockMatch = activeRestored.scheduleBlockId
      ? getCalendarDayPlan(activeRestored.dateKey).blocks.find(
          (b) => b.blockId === activeRestored.scheduleBlockId
        )
      : undefined;

    return {
      reason: 'unfinished_timer',
      hasUnfinishedTimer: true,
      phase: activeRestored.phase,
      secondsRemaining: activeRestored.secondsRemaining,
      remainingClock,
      topicTitle: activeRestored.topicTitle,
      subjectTitle: activeRestored.subjectTitle || blockMatch?.macroName || 'Bloco em andamento',
      dateKey: activeRestored.dateKey,
      dateFormatted: formatDateKeyBR(activeRestored.dateKey),
      todayLoggedMinutes,
      todayGoalMinutes,
      todaySummaryLabel,
      primaryCtaLabel: 'Retomar cronômetro',
      secondaryNote: `Sessão pausada em ${phaseLabel} · faltavam ${remainingClock}`,
      macroAreaId: activeRestored.macroAreaId,
      topicId: activeRestored.topicId,
      scheduleBlockId: activeRestored.scheduleBlockId,
      isNivelamento: blockMatch?.isNivelamento,
      launchTarget: buildTimerLaunchTargetFromRestoredPomodoro(activeRestored),
    };
  }

  // Sem cronômetro ativo, sem ponteiro salvo e sem histórico de foco -> não exibir modal na abertura
  if (!resumeState && focusLogs.length === 0) {
    return null;
  }

  // 2. Ponteiro salvo de tópico/bloco recente (exceto se concluído no passado com meta de hoje pendente)
  const isWeekendToday = !isWeekdayDateKey(todayKey);
  const todayPendingGoal =
    !isWeekendToday &&
    isDateIn2027Schedule(todayKey) &&
    todayLoggedSeconds < DAILY_GOAL_SECONDS;

  if (resumeState && resumeState.topicTitle) {
    const dayPlan = getCalendarDayPlan(resumeState.dateKey);
    const matchedBlock = resumeState.scheduleBlockId
      ? dayPlan.blocks.find((b) => b.blockId === resumeState.scheduleBlockId)
      : dayPlan.blocks[0];

    // Se hoje é dia útil de 2027 e o último item já foi concluído em data anterior, avança para o pendente de hoje
    const shouldAdvanceToTodayPending =
      resumeState.lastAction === 'completed' &&
      resumeState.dateKey !== todayKey &&
      todayPendingGoal;

    if (!shouldAdvanceToTodayPending) {
      const launchTarget: TimerLaunchTarget = matchedBlock
        ? buildTimerLaunchTargetFromCalendarBlock(matchedBlock)
        : {
            kind: resumeState.legacySessionId ? 'legacy-session' : 'calendar-block',
            dateKey: isWeekendToday ? toLocalDateKey() : resumeState.dateKey,
            scheduleBlockId: resumeState.scheduleBlockId,
            legacySessionId: resumeState.legacySessionId,
            topicId: resumeState.topicId,
            macroAreaId: resumeState.macroAreaId,
            topicTitle: resumeState.topicTitle,
            subjectTitle: resumeState.subjectTitle || 'Estudo em andamento',
          };

      return {
        reason: 'interrupted_or_saved',
        hasUnfinishedTimer: false,
        topicTitle: resumeState.topicTitle,
        subjectTitle: resumeState.subjectTitle || matchedBlock?.macroName || 'Retomada do estudo',
        dateKey: resumeState.dateKey,
        dateFormatted: formatDateKeyBR(resumeState.dateKey),
        todayLoggedMinutes,
        todayGoalMinutes,
        todaySummaryLabel,
        primaryCtaLabel:
          resumeState.lastAction === 'completed' ? 'Continuar neste assunto' : 'Retomar estudo',
        secondaryNote: isWeekendToday
          ? 'Fim de semana de descanso no plano — pronto para continuar no próximo dia útil ou revisar este tópico.'
          : `Último acesso em ${formatDateKeyBR(resumeState.dateKey)}`,
        macroAreaId: resumeState.macroAreaId,
        topicId: resumeState.topicId,
        scheduleBlockId: resumeState.scheduleBlockId,
        isNivelamento: matchedBlock?.isNivelamento,
        launchTarget,
      };
    }
  }

  // 3. Fallback quando há histórico de foco: próximo bloco pendente em dia útil (nunca sábado/domingo)
  const loggedMap = new Map<string, number>();
  for (const seg of focusLogs) {
    loggedMap.set(seg.dateKey, (loggedMap.get(seg.dateKey) || 0) + seg.durationSeconds);
  }

  const nextPending = getNextPendingStudyDayOrBlock({
    referenceDateKey: todayKey,
    loggedSecondsByDate: loggedMap,
  });

  if (nextPending.suggestedBlock) {
    const blk = nextPending.suggestedBlock;
    return {
      reason: 'next_pending_weekday',
      hasUnfinishedTimer: false,
      topicTitle: blk.topicTitle,
      subjectTitle: `${blk.macroName} · ${blk.mesoName}`,
      dateKey: blk.dateKey,
      dateFormatted: formatDateKeyBR(blk.dateKey),
      todayLoggedMinutes,
      todayGoalMinutes,
      todaySummaryLabel,
      primaryCtaLabel: 'Retomar estudo',
      secondaryNote: `Próximo dia útil planejado: ${formatDateKeyBR(blk.dateKey)} (${blk.plannedMinutes} min)`,
      macroAreaId: blk.macroAreaId,
      topicId: blk.topicId,
      scheduleBlockId: blk.blockId,
      isNivelamento: blk.isNivelamento,
      launchTarget: buildTimerLaunchTargetFromCalendarBlock(blk),
    };
  }

  return null;
}
