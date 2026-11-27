import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  FastForward,
  Pause,
  Play,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { OriginBadge } from './ui/OriginBadge';
import { SubjectBaseBadge } from './ui/SubjectBaseBadge';
import {
  appendFocusSegments,
  computeNextFocusDurationSeconds,
  DAILY_GOAL_MINUTES,
  DAILY_GOAL_SECONDS,
  FOCUS_BLOCK_SECONDS,
  formatMinutesAsHoursMinutes,
  formatSecondsAsClock,
  getNetFocusSecondsForDate,
  loadActivePomodoroState,
  normalizeRestoredPomodoroOnAppOpen,
  REST_BLOCK_SECONDS,
  saveActivePomodoroState,
  splitFocusIntervalByLocalDate,
  toLocalDateKey,
  type PomodoroActiveState,
} from '../utils/studyFocusStorage';
import { playStudyAlarmChime, unlockStudyAlarmAudio } from '../utils/studyAlarmAudio';
import { classifyTopicById } from '../utils/subjectClassification';
import { recordStudyResumePointer, type TimerLaunchTarget } from '../utils/studyResume';

interface DailySessionModalProps {
  target: TimerLaunchTarget | null;
  onClose: () => void;
}

function computeElapsedInPhase(state: PomodoroActiveState, nowMs: number): number {
  if (!state.isRunning || !state.phaseStartedAtMs) {
    return Math.min(state.phaseTotalSeconds, Math.max(0, state.accumulatedPhaseSecondsBeforeSlice));
  }
  const deltaSec = Math.max(0, Math.floor((nowMs - state.phaseStartedAtMs) / 1000));
  return Math.min(
    state.phaseTotalSeconds,
    Math.max(0, state.accumulatedPhaseSecondsBeforeSlice + deltaSec)
  );
}

function flushFocusSlice(
  state: PomodoroActiveState,
  elapsedTotalInPhase: number,
  endedAtMs: number,
  status: 'completed' | 'interrupted'
): number {
  const alreadyLogged = Math.max(0, state.loggedFocusSecondsInPhase || 0);
  const clampedElapsed = Math.min(state.phaseTotalSeconds, Math.max(0, elapsedTotalInPhase));
  const deltaSeconds = clampedElapsed - alreadyLogged;

  if (state.phase === 'focus' && deltaSeconds > 0) {
    const safeEndedAt = Math.max(endedAtMs, 1000);
    const startedAtMs = safeEndedAt - deltaSeconds * 1000;
    const segments = splitFocusIntervalByLocalDate({
      baseId: `${state.sessionId}_p${state.phaseIndex}_l${alreadyLogged}`,
      startedAtMs,
      endedAtMs: safeEndedAt,
      topicId: state.topicId,
      scheduleBlockId: state.scheduleBlockId,
      macroAreaId: state.macroAreaId,
      topicTitle: state.topicTitle,
      status,
    });
    appendFocusSegments(segments);
  }

  return Math.max(alreadyLogged, clampedElapsed);
}

function createInitialStateForTarget(target: TimerLaunchTarget): PomodoroActiveState {
  const realTodayKey = toLocalDateKey();
  const loggedToday = getNetFocusSecondsForDate(realTodayKey);
  const nextFocusSec = computeNextFocusDurationSeconds(loggedToday);
  const finishedDailyGoal = nextFocusSec === 0;

  // Se houver um estado salvo compatível para o mesmo bloco, restaura pausado
  const existing = normalizeRestoredPomodoroOnAppOpen(loadActivePomodoroState());
  if (
    existing &&
    !finishedDailyGoal &&
    target.scheduleBlockId &&
    existing.scheduleBlockId === target.scheduleBlockId
  ) {
    return existing;
  }

  return {
    sessionId: `pom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    dateKey: target.dateKey || realTodayKey,
    scheduleBlockId: target.scheduleBlockId,
    topicId: target.topicId,
    macroAreaId: target.macroAreaId,
    topicTitle: target.topicTitle,
    subjectTitle: target.subjectTitle,
    phase: 'focus',
    phaseIndex: 1,
    phaseTotalSeconds: nextFocusSec || FOCUS_BLOCK_SECONDS,
    secondsRemaining: nextFocusSec,
    isRunning: false,
    isPaused: false,
    phaseStartedAtMs: null,
    accumulatedPhaseSecondsBeforeSlice: 0,
    loggedFocusSecondsInPhase: 0,
    soundEnabled: true,
    lastCheckpointAt: Date.now(),
    completedPhaseEvents: [],
    pendingExpiryNotice: null,
    finishedDailyGoal,
  };
}

export const DailySessionModal: React.FC<DailySessionModalProps> = ({
  target,
  onClose,
}) => {
  const [timerState, setTimerState] = useState<PomodoroActiveState | null>(null);
  const [confirmAdvanceOpen, setConfirmAdvanceOpen] = useState<boolean>(false);
  const [audioBlockedNotice, setAudioBlockedNotice] = useState<boolean>(false);
  const [todayLoggedSeconds, setTodayLoggedSeconds] = useState<number>(() =>
    getNetFocusSecondsForDate(toLocalDateKey())
  );

  const stateRef = useRef<PomodoroActiveState | null>(null);
  stateRef.current = timerState;

  const refreshTodayLogged = useCallback(() => {
    setTodayLoggedSeconds(getNetFocusSecondsForDate(toLocalDateKey()));
  }, []);

  // Inicializa estado quando target muda
  useEffect(() => {
    if (!target) {
      setTimerState(null);
      setConfirmAdvanceOpen(false);
      setAudioBlockedNotice(false);
      return;
    }

    setConfirmAdvanceOpen(false);
    setAudioBlockedNotice(false);
    refreshTodayLogged();

    if (target.kind === 'restored-pomodoro' && target.restoredState) {
      const normalized = normalizeRestoredPomodoroOnAppOpen(target.restoredState);
      if (normalized) {
        setTimerState(normalized);
        saveActivePomodoroState(normalized);
        return;
      }
    }

    const init = createInitialStateForTarget(target);
    setTimerState(init);
    if (!init.finishedDailyGoal) {
      saveActivePomodoroState(init);
      recordStudyResumePointer(
        {
          dateKey: init.dateKey,
          scheduleBlockId: init.scheduleBlockId,
          topicId: init.topicId,
          macroAreaId: init.macroAreaId,
          topicTitle: init.topicTitle,
          subjectTitle: init.subjectTitle,
        },
        'selected'
      );
    }
  }, [target, refreshTodayLogged]);

  // Trigger do alarme sonoro com fallback visual se bloqueado
  const triggerAlarmOnce = useCallback(async (soundEnabled: boolean) => {
    if (!soundEnabled) return;
    const res = await playStudyAlarmChime();
    if (res.blocked) {
      setAudioBlockedNotice(true);
    }
  }, []);

  // Reconciliação determinística por timestamp (cobre ticks normais e suspensão em segundo plano)
  const reconcileAt = useCallback(
    (nowMs: number, fromBackgroundResume: boolean = false) => {
      const cur = stateRef.current;
      if (!cur || !cur.isRunning || !cur.phaseStartedAtMs || cur.finishedDailyGoal) {
        return;
      }

      const elapsed = computeElapsedInPhase(cur, nowMs);
      const remaining = Math.max(0, cur.phaseTotalSeconds - elapsed);

      if (remaining > 0) {
        if (remaining !== cur.secondsRemaining) {
          const updated: PomodoroActiveState = {
            ...cur,
            secondsRemaining: remaining,
            lastCheckpointAt: nowMs,
          };
          setTimerState(updated);
        }
        return;
      }

      // Fase atual zerou! Guard contra disparo duplicado
      const eventKey = `done_p${cur.phaseIndex}`;
      if (cur.completedPhaseEvents.includes(eventKey)) {
        return;
      }

      const remainingSliceBeforeStart = Math.max(
        0,
        cur.phaseTotalSeconds - cur.accumulatedPhaseSecondsBeforeSlice
      );
      const exactPhaseEndMs = cur.phaseStartedAtMs + remainingSliceBeforeStart * 1000;
      const nextEvents = [...cur.completedPhaseEvents, eventKey];

      if (cur.phase === 'focus') {
        flushFocusSlice(cur, cur.phaseTotalSeconds, exactPhaseEndMs, 'completed');
        refreshTodayLogged();

        const updatedLoggedToday = getNetFocusSecondsForDate(toLocalDateKey());
        const nextFocusSec = computeNextFocusDurationSeconds(updatedLoggedToday);

        void triggerAlarmOnce(cur.soundEnabled);

        if (nextFocusSec === 0) {
          // Atingiu 100 minutos líquidos acumulados no dia (2 × 50 min) -> META DIÁRIA CONCLUÍDA
          const finishedState: PomodoroActiveState = {
            ...cur,
            secondsRemaining: 0,
            isRunning: false,
            isPaused: false,
            phaseStartedAtMs: null,
            accumulatedPhaseSecondsBeforeSlice: cur.phaseTotalSeconds,
            loggedFocusSecondsInPhase: cur.phaseTotalSeconds,
            lastCheckpointAt: nowMs,
            completedPhaseEvents: nextEvents,
            finishedDailyGoal: true,
            pendingExpiryNotice: fromBackgroundResume
              ? 'Fase finalizada em segundo plano. Meta diária de 100 min atingida.'
              : null,
          };
          setTimerState(finishedState);
          saveActivePomodoroState(null);
          recordStudyResumePointer(
            {
              dateKey: cur.dateKey,
              scheduleBlockId: cur.scheduleBlockId,
              topicId: cur.topicId,
              macroAreaId: cur.macroAreaId,
              topicTitle: cur.topicTitle,
              subjectTitle: cur.subjectTitle,
            },
            'completed'
          );
          return;
        }

        // Ainda falta saldo no dia -> entra em DESCANSO de 20 min
        // Se voltou de segundo plano longo, entra pausado; se ao vivo, inicia descanso imediatamente
        const shouldAutoRunRest = !fromBackgroundResume && nowMs - exactPhaseEndMs < 5000;
        const restState: PomodoroActiveState = {
          ...cur,
          phase: 'rest',
          phaseIndex: cur.phaseIndex + 1,
          phaseTotalSeconds: REST_BLOCK_SECONDS,
          secondsRemaining: REST_BLOCK_SECONDS,
          isRunning: shouldAutoRunRest,
          isPaused: !shouldAutoRunRest,
          phaseStartedAtMs: shouldAutoRunRest ? nowMs : null,
          accumulatedPhaseSecondsBeforeSlice: 0,
          loggedFocusSecondsInPhase: 0,
          lastCheckpointAt: nowMs,
          completedPhaseEvents: nextEvents,
          pendingExpiryNotice: fromBackgroundResume
            ? 'Tempo de foco encerrado enquanto a aba estava em segundo plano. Inicie o descanso quando estiver pronto.'
            : null,
        };
        setTimerState(restState);
        saveActivePomodoroState(restState);
        return;
      }

      // Fase de DESCANSO terminou -> prepara próximo bloco de ESTUDO (pausado para clique explícito)
      void triggerAlarmOnce(cur.soundEnabled);
      const updatedLoggedToday = getNetFocusSecondsForDate(toLocalDateKey());
      const nextFocusSec = computeNextFocusDurationSeconds(updatedLoggedToday);

      if (nextFocusSec === 0) {
        const finishedState: PomodoroActiveState = {
          ...cur,
          secondsRemaining: 0,
          isRunning: false,
          isPaused: false,
          phaseStartedAtMs: null,
          lastCheckpointAt: nowMs,
          completedPhaseEvents: nextEvents,
          finishedDailyGoal: true,
        };
        setTimerState(finishedState);
        saveActivePomodoroState(null);
        return;
      }

      const nextFocusState: PomodoroActiveState = {
        ...cur,
        phase: 'focus',
        phaseIndex: cur.phaseIndex + 1,
        phaseTotalSeconds: nextFocusSec,
        secondsRemaining: nextFocusSec,
        isRunning: false,
        isPaused: true,
        phaseStartedAtMs: null,
        accumulatedPhaseSecondsBeforeSlice: 0,
        loggedFocusSecondsInPhase: 0,
        lastCheckpointAt: nowMs,
        completedPhaseEvents: nextEvents,
        pendingExpiryNotice: 'Descanso concluído. Clique em Retomar estudo para iniciar o próximo bloco.',
      };
      setTimerState(nextFocusState);
      saveActivePomodoroState(nextFocusState);
    },
    [refreshTodayLogged, triggerAlarmOnce]
  );

  // Ticker de exibição (500ms) + checkpoint periódico (<= 4s)
  useEffect(() => {
    if (!timerState?.isRunning) return;

    const tickInterval = window.setInterval(() => {
      reconcileAt(Date.now(), false);
    }, 500);

    const checkpointInterval = window.setInterval(() => {
      const cur = stateRef.current;
      if (!cur || !cur.isRunning) return;
      const nowMs = Date.now();
      const elapsed = computeElapsedInPhase(cur, nowMs);
      const remaining = Math.max(0, cur.phaseTotalSeconds - elapsed);
      saveActivePomodoroState({
        ...cur,
        secondsRemaining: remaining,
        lastCheckpointAt: nowMs,
      });
    }, 4000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(checkpointInterval);
    };
  }, [timerState?.isRunning, reconcileAt]);

  // Visibilidade / foco / pagehide para nunca perder checkpoint e reconciliar suspensão
  useEffect(() => {
    if (!target) return;

    const handleVisibilityOrFocus = () => {
      const cur = stateRef.current;
      if (!cur) return;
      if (document.visibilityState === 'hidden') {
        const nowMs = Date.now();
        const elapsed = computeElapsedInPhase(cur, nowMs);
        const remaining = Math.max(0, cur.phaseTotalSeconds - elapsed);
        if (cur.isRunning) {
          saveActivePomodoroState({
            ...cur,
            secondsRemaining: remaining,
            lastCheckpointAt: nowMs,
          });
        }
      } else {
        reconcileAt(Date.now(), true);
      }
    };

    const handlePageHide = () => {
      const cur = stateRef.current;
      if (!cur || cur.finishedDailyGoal) return;
      const nowMs = Date.now();
      const elapsed = computeElapsedInPhase(cur, nowMs);
      const remaining = Math.max(0, cur.phaseTotalSeconds - elapsed);
      saveActivePomodoroState({
        ...cur,
        secondsRemaining: remaining,
        lastCheckpointAt: nowMs,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [target, reconcileAt]);

  const handleStartOrResume = () => {
    if (!timerState || timerState.finishedDailyGoal) return;
    void unlockStudyAlarmAudio();
    setAudioBlockedNotice(false);
    setConfirmAdvanceOpen(false);

    const nowMs = Date.now();
    const next: PomodoroActiveState = {
      ...timerState,
      isRunning: true,
      isPaused: false,
      phaseStartedAtMs: nowMs,
      lastCheckpointAt: nowMs,
      pendingExpiryNotice: null,
    };
    setTimerState(next);
    saveActivePomodoroState(next);
    recordStudyResumePointer(
      {
        dateKey: next.dateKey,
        scheduleBlockId: next.scheduleBlockId,
        topicId: next.topicId,
        macroAreaId: next.macroAreaId,
        topicTitle: next.topicTitle,
        subjectTitle: next.subjectTitle,
      },
      'started'
    );
  };

  const handlePause = () => {
    if (!timerState || !timerState.isRunning) return;
    const nowMs = Date.now();
    const elapsed = computeElapsedInPhase(timerState, nowMs);
    const remaining = Math.max(0, timerState.phaseTotalSeconds - elapsed);
    const loggedInPhase =
      timerState.phase === 'focus'
        ? flushFocusSlice(timerState, elapsed, nowMs, 'interrupted')
        : timerState.loggedFocusSecondsInPhase || 0;

    refreshTodayLogged();

    const next: PomodoroActiveState = {
      ...timerState,
      isRunning: false,
      isPaused: true,
      phaseStartedAtMs: null,
      accumulatedPhaseSecondsBeforeSlice: elapsed,
      loggedFocusSecondsInPhase: loggedInPhase,
      secondsRemaining: remaining,
      lastCheckpointAt: nowMs,
    };
    setTimerState(next);
    saveActivePomodoroState(next);
    recordStudyResumePointer(
      {
        dateKey: next.dateKey,
        scheduleBlockId: next.scheduleBlockId,
        topicId: next.topicId,
        macroAreaId: next.macroAreaId,
        topicTitle: next.topicTitle,
        subjectTitle: next.subjectTitle,
      },
      'paused'
    );
  };

  const handleStopEarlyAndClose = () => {
    if (!timerState) {
      onClose();
      return;
    }
    const nowMs = Date.now();
    const elapsed = computeElapsedInPhase(timerState, nowMs);
    const endMsForLog = timerState.isRunning ? nowMs : timerState.lastCheckpointAt || nowMs;

    if (timerState.phase === 'focus' && !timerState.finishedDailyGoal) {
      flushFocusSlice(timerState, elapsed, endMsForLog, 'interrupted');
      refreshTodayLogged();
    }

    saveActivePomodoroState(null);
    recordStudyResumePointer(
      {
        dateKey: timerState.dateKey,
        scheduleBlockId: timerState.scheduleBlockId,
        topicId: timerState.topicId,
        macroAreaId: timerState.macroAreaId,
        topicTitle: timerState.topicTitle,
        subjectTitle: timerState.subjectTitle,
      },
      timerState.finishedDailyGoal ? 'completed' : 'interrupted'
    );
    onClose();
  };

  const performAdvancePhase = () => {
    if (!timerState || timerState.finishedDailyGoal) return;
    setConfirmAdvanceOpen(false);
    const nowMs = Date.now();
    const elapsed = computeElapsedInPhase(timerState, nowMs);
    const endMsForLog = timerState.isRunning ? nowMs : timerState.lastCheckpointAt || nowMs;

    if (timerState.phase === 'focus') {
      flushFocusSlice(timerState, elapsed, endMsForLog, 'interrupted');
      refreshTodayLogged();
      const updatedLogged = getNetFocusSecondsForDate(toLocalDateKey());
      const nextFocusSec = computeNextFocusDurationSeconds(updatedLogged);

      if (nextFocusSec === 0) {
        const doneState: PomodoroActiveState = {
          ...timerState,
          secondsRemaining: 0,
          isRunning: false,
          isPaused: false,
          phaseStartedAtMs: null,
          finishedDailyGoal: true,
          lastCheckpointAt: nowMs,
        };
        setTimerState(doneState);
        saveActivePomodoroState(null);
        recordStudyResumePointer(
          {
            dateKey: timerState.dateKey,
            scheduleBlockId: timerState.scheduleBlockId,
            topicId: timerState.topicId,
            macroAreaId: timerState.macroAreaId,
            topicTitle: timerState.topicTitle,
            subjectTitle: timerState.subjectTitle,
          },
          'completed'
        );
        return;
      }

      const restState: PomodoroActiveState = {
        ...timerState,
        phase: 'rest',
        phaseIndex: timerState.phaseIndex + 1,
        phaseTotalSeconds: REST_BLOCK_SECONDS,
        secondsRemaining: REST_BLOCK_SECONDS,
        isRunning: false,
        isPaused: true,
        phaseStartedAtMs: null,
        accumulatedPhaseSecondsBeforeSlice: 0,
        loggedFocusSecondsInPhase: 0,
        lastCheckpointAt: nowMs,
        pendingExpiryNotice: null,
      };
      setTimerState(restState);
      saveActivePomodoroState(restState);
      return;
    }

    // Descanso -> próximo bloco de ESTUDO (pausado)
    const updatedLogged = getNetFocusSecondsForDate(toLocalDateKey());
    const nextFocusSec = computeNextFocusDurationSeconds(updatedLogged);
    if (nextFocusSec === 0) {
      setTimerState({ ...timerState, finishedDailyGoal: true, isRunning: false, isPaused: false });
      saveActivePomodoroState(null);
      return;
    }

    const focusState: PomodoroActiveState = {
      ...timerState,
      phase: 'focus',
      phaseIndex: timerState.phaseIndex + 1,
      phaseTotalSeconds: nextFocusSec,
      secondsRemaining: nextFocusSec,
      isRunning: false,
      isPaused: true,
      phaseStartedAtMs: null,
      accumulatedPhaseSecondsBeforeSlice: 0,
      loggedFocusSecondsInPhase: 0,
      lastCheckpointAt: nowMs,
      pendingExpiryNotice: null,
    };
    setTimerState(focusState);
    saveActivePomodoroState(focusState);
  };

  const handleRequestAdvancePhase = () => {
    if (!timerState || timerState.finishedDailyGoal) return;
    const elapsed = computeElapsedInPhase(timerState, Date.now());
    if (elapsed > 0 || timerState.isRunning) {
      setConfirmAdvanceOpen(true);
    } else {
      performAdvancePhase();
    }
  };

  const handleToggleSound = () => {
    if (!timerState) return;
    const nextVal = !timerState.soundEnabled;
    if (nextVal) {
      void unlockStudyAlarmAudio();
      setAudioBlockedNotice(false);
    }
    const next = { ...timerState, soundEnabled: nextVal };
    setTimerState(next);
    if (!next.finishedDailyGoal) {
      saveActivePomodoroState(next);
    }
  };

  const handleTestSound = async () => {
    await unlockStudyAlarmAudio();
    const res = await playStudyAlarmChime();
    setAudioBlockedNotice(res.blocked);
  };

  // Quando usuário fecha pelo X ou backdrop enquanto pausado, salva checkpoint sem apagar retomada
  const handleClosePreserveCheckpoint = () => {
    if (timerState && !timerState.finishedDailyGoal) {
      const nowMs = Date.now();
      const elapsed = computeElapsedInPhase(timerState, nowMs);
      const remaining = Math.max(0, timerState.phaseTotalSeconds - elapsed);
      const loggedInPhase =
        timerState.isRunning && timerState.phase === 'focus'
          ? flushFocusSlice(timerState, elapsed, nowMs, 'interrupted')
          : timerState.loggedFocusSecondsInPhase || 0;

      const pausedToSave: PomodoroActiveState = {
        ...timerState,
        isRunning: false,
        isPaused: elapsed > 0,
        phaseStartedAtMs: null,
        accumulatedPhaseSecondsBeforeSlice: elapsed,
        loggedFocusSecondsInPhase: loggedInPhase,
        secondsRemaining: remaining,
        lastCheckpointAt: nowMs,
      };
      saveActivePomodoroState(pausedToSave);
      recordStudyResumePointer(
        {
          dateKey: pausedToSave.dateKey,
          scheduleBlockId: pausedToSave.scheduleBlockId,
          topicId: pausedToSave.topicId,
          macroAreaId: pausedToSave.macroAreaId,
          topicTitle: pausedToSave.topicTitle,
          subjectTitle: pausedToSave.subjectTitle,
        },
        elapsed > 0 ? 'paused' : 'selected'
      );
    }
    onClose();
  };

  const liveTotalTodaySeconds = useMemo(() => {
    if (!timerState) return todayLoggedSeconds;
    const alreadyInLogs = todayLoggedSeconds;
    if (timerState.phase !== 'focus') return alreadyInLogs;
    const elapsedInPhase = timerState.isRunning
      ? computeElapsedInPhase(timerState, Date.now())
      : timerState.accumulatedPhaseSecondsBeforeSlice;
    const unlogged = Math.max(0, elapsedInPhase - (timerState.loggedFocusSecondsInPhase || 0));
    return Math.min(DAILY_GOAL_SECONDS, alreadyInLogs + unlogged);
  }, [timerState, todayLoggedSeconds]);

  const liveTodayMinutes = Math.floor(liveTotalTodaySeconds / 60);
  const dailyPct = Math.min(100, Math.round((liveTotalTodaySeconds / DAILY_GOAL_SECONDS) * 100));

  const subjectCategory = timerState?.topicId ? classifyTopicById(timerState.topicId) : null;
  const isFinished = Boolean(timerState?.finishedDailyGoal);
  const isFocusPhase = !isFinished && timerState?.phase === 'focus';
  const isRestPhase = !isFinished && timerState?.phase === 'rest';

  const surfaceThemeClasses = isFinished
    ? 'bg-[#071F14] text-white border border-[#14432C]'
    : isRestPhase
    ? 'bg-[#B91C1C] text-white border border-[#7F1D1D]'
    : 'bg-[#1D4ED8] text-white border border-[#1E3A8A]';

  const innerSurfaceClasses = isFinished
    ? 'bg-[#0B2C1D] border-[#184D33]'
    : isRestPhase
    ? 'bg-[#991B1B] border-[#7F1D1D]'
    : 'bg-[#1E40AF] border-[#1E3A8A]';

  const phaseElapsedSec = timerState
    ? Math.max(0, timerState.phaseTotalSeconds - timerState.secondsRemaining)
    : 0;
  const phasePct = timerState?.phaseTotalSeconds
    ? Math.min(100, Math.round((phaseElapsedSec / timerState.phaseTotalSeconds) * 100))
    : 0;

  return (
    <Modal
      isOpen={Boolean(target && timerState)}
      onClose={handleClosePreserveCheckpoint}
      hideHeader
      maxWidth="4xl"
      theme="dark"
      ariaLabel={timerState ? `Cronômetro 50/20 — ${timerState.topicTitle}` : 'Cronômetro'}
      panelClassName={`md:w-[54vw] md:min-w-[560px] md:max-w-[780px] md:min-h-[54vh] transition-colors duration-200 ${surfaceThemeClasses}`}
    >
      {target && timerState && (
        <div className="p-5 sm:p-7 flex flex-col justify-between min-h-full space-y-5">
          {/* Top Bar */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-extrabold uppercase tracking-wider ${
                    isFinished
                      ? 'bg-[#008542] text-white'
                      : 'bg-white text-slate-900'
                  }`}
                >
                  {isFinished ? 'META DIÁRIA CONCLUÍDA' : isRestPhase ? 'DESCANSO' : 'ESTUDO'}
                </span>

                <span className="text-xs font-mono font-semibold text-white/90 tabular-nums">
                  Ciclo 50 + 20 + 50 · Etapa {timerState.phaseIndex}
                </span>

                {target.origem && <OriginBadge origem={target.origem} compact />}
                {subjectCategory && subjectCategory !== 'tecnico' && (
                  <SubjectBaseBadge
                    category={subjectCategory}
                    showNivelamento={target.isNivelamento}
                    compact
                  />
                )}
              </div>

              <h3 className="text-base sm:text-xl font-display font-extrabold text-white leading-snug">
                {timerState.topicTitle}
              </h3>
              <p className="text-xs text-white/85 truncate">{timerState.subjectTitle}</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleSound}
                aria-label={timerState.soundEnabled ? 'Desativar som do alarme' : 'Ativar som do alarme'}
                title={timerState.soundEnabled ? 'Som ligado' : 'Som desligado'}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors duration-150 cursor-pointer"
              >
                {timerState.soundEnabled ? (
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-4 h-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {timerState.soundEnabled ? 'Som ligado' : 'Som desligado'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleTestSound}
                className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors duration-150 cursor-pointer"
              >
                Testar som
              </button>

              <button
                type="button"
                onClick={handleClosePreserveCheckpoint}
                aria-label="Minimizar e fechar janela do cronômetro"
                className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors duration-150 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>


          {/* Notices (Audio blocked or Background Phase Expiry) */}
          {(audioBlockedNotice || timerState.pendingExpiryNotice) && (
            <div className="rounded-xl bg-white text-slate-900 px-4 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
              <span>
                {audioBlockedNotice
                  ? 'Tempo encerrado — clique em Ativar áudio para ouvir o alarme sonoro.'
                  : timerState.pendingExpiryNotice}
              </span>
              {audioBlockedNotice && (
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Ativar áudio
                </button>
              )}
            </div>
          )}

          {/* Main Countdown Area */}
          {!isFinished ? (
            <div className={`rounded-2xl border p-6 text-center space-y-4 ${innerSurfaceClasses}`}>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-white/90">
                {isRestPhase
                  ? 'Pausa regenerativa — afaste-se da tela e descanse'
                  : 'Bloco de foco líquido — zero distrações'}
              </div>

              <div
                aria-live="off"
                className="text-6xl sm:text-7xl font-mono font-extrabold tabular-nums tracking-tight text-white"
              >
                {formatSecondsAsClock(timerState.secondsRemaining)}
              </div>

              {/* Phase Progress Bar */}
              <div className="max-w-md mx-auto space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${phasePct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-white/90 tabular-nums">
                  <span>
                    Bloco atual: {Math.floor(phaseElapsedSec / 60)} de{' '}
                    {Math.round(timerState.phaseTotalSeconds / 60)} min
                  </span>
                  <span>{phasePct}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#008542]/50 bg-[#0B2C1D] p-7 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-[#FDB913] mx-auto" aria-hidden="true" />
              <h4 className="text-xl font-display font-extrabold text-white">
                META DIÁRIA CONCLUÍDA
              </h4>
              <p className="text-xs sm:text-sm text-slate-200 max-w-md mx-auto leading-relaxed">
                Você completou os 100 minutos líquidos de aula previstos para hoje (2 blocos de 50 min: {formatMinutesAsHoursMinutes(liveTodayMinutes)} de {DAILY_GOAL_MINUTES} min). Descanse para consolidar o conteúdo.
              </p>
            </div>
          )}

          {/* Daily Goal Net Focus Tracker */}
          <div className={`rounded-xl border px-4 py-3 space-y-2 ${innerSurfaceClasses}`}>
            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-white">
              <span>Progresso líquido de hoje (2 × 50 min = 1h40min):</span>
              <span className="font-bold">
                {formatMinutesAsHoursMinutes(liveTodayMinutes)} / 1h40min ({dailyPct}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-[#FDB913] transition-all duration-300"
                style={{ width: `${dailyPct}%` }}
              />
            </div>
          </div>

          {/* Inline Advance Confirmation */}
          {confirmAdvanceOpen && !isFinished && (
            <div className="rounded-xl bg-white text-slate-900 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold">
                {isFocusPhase
                  ? 'Confirmar avanço para o descanso? Os minutos líquidos já estudados serão registrados.'
                  : 'Confirmar fim antecipado do descanso para preparar o próximo bloco de foco?'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAdvanceOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={performAdvancePhase}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Confirmar avanço
                </button>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/20">
            {!isFinished ? (
              <>
                <button
                  type="button"
                  onClick={handleStopEarlyAndClose}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors duration-150 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Encerrar</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    id="btn-pomodoro-primary"
                    onClick={timerState.isRunning ? handlePause : handleStartOrResume}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-sm font-extrabold shadow-sm transition-colors duration-150 cursor-pointer"
                  >
                    {timerState.isRunning ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                        <span>
                          {timerState.isPaused ? 'Retomar' : 'Iniciar estudo'}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestAdvancePhase}
                    title="Avançar fase"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors duration-150 cursor-pointer"
                  >
                    <FastForward className="w-4 h-4" aria-hidden="true" />
                    <span>Avançar fase</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  onClick={handleStopEarlyAndClose}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#008542] hover:bg-[#006837] text-white text-sm font-extrabold transition-colors duration-150 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Fechar e salvar progresso</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
