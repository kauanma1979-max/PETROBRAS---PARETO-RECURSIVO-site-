/**
 * Persistência versionada para logs líquidos de foco (50/20),
 * estado checkpointed do cronômetro e ponteiro de retomada.
 */

export const FOCUS_STORAGE_KEYS = {
  FOCUS_LOGS: 'transpetro_pomodoro_focus_logs_v1',
  ACTIVE_STATE: 'transpetro_pomodoro_active_state_v1',
  RESUME_STATE: 'transpetro_study_resume_state_v1',
  SELECTED_DATE: 'transpetro_calendar_selected_date_v1',
} as const;

export const DAILY_GOAL_MINUTES = 100; // 2 aulas de 50 min (50m aula + 20m descanso + 50m aula)
export const DAILY_GOAL_SECONDS = DAILY_GOAL_MINUTES * 60; // 6000s
export const FOCUS_BLOCK_MINUTES = 50;
export const FOCUS_BLOCK_SECONDS = FOCUS_BLOCK_MINUTES * 60; // 3000s
export const REST_BLOCK_MINUTES = 20;
export const REST_BLOCK_SECONDS = REST_BLOCK_MINUTES * 60; // 1200s
export const WEEKLY_GOAL_MINUTES = 500; // 5 dias úteis x 100 min (10 aulas de 50 min)

export interface FocusLogSegment {
  id: string;
  dateKey: string; // YYYY-MM-DD (fuso local)
  startedAt: number; // epoch ms
  endedAt: number; // epoch ms
  durationSeconds: number;
  topicId?: string;
  scheduleBlockId?: string;
  macroAreaId?: string;
  topicTitle?: string;
  type: 'focus';
  status: 'completed' | 'interrupted';
}

export interface PomodoroActiveState {
  sessionId: string;
  dateKey: string;
  scheduleBlockId?: string;
  topicId?: string;
  macroAreaId?: string;
  topicTitle: string;
  subjectTitle: string;
  phase: 'focus' | 'rest';
  phaseIndex: number; // 1, 2, 3...
  phaseTotalSeconds: number;
  secondsRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  phaseStartedAtMs: number | null;
  accumulatedPhaseSecondsBeforeSlice: number;
  loggedFocusSecondsInPhase?: number;
  soundEnabled: boolean;
  lastCheckpointAt: number;
  completedPhaseEvents: string[];
  pendingExpiryNotice?: string | null;
  finishedDailyGoal?: boolean;
}

export interface StudyResumeState {
  updatedAt: number;
  dateKey: string;
  scheduleBlockId?: string;
  topicId?: string;
  macroAreaId?: string;
  topicTitle?: string;
  subjectTitle?: string;
  lastAction: 'selected' | 'started' | 'paused' | 'interrupted' | 'completed';
}

export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export function formatDateKeyBR(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  if (!y || !m || !d) return dateKey;
  return `${d}/${m}/${y}`;
}

export function isWeekdayDateKey(dateKey: string): boolean {
  const day = parseLocalDateKey(dateKey).getDay();
  return day >= 1 && day <= 5;
}

export function getMondayOfDateKey(dateKey: string): string {
  const dt = parseLocalDateKey(dateKey);
  const day = dt.getDay(); // 0=Dom..6=Sáb
  const diffToMon = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diffToMon);
  return toLocalDateKey(dt);
}

export function getWeekDateKeysMonToSun(referenceDateKey: string): string[] {
  const mon = parseLocalDateKey(getMondayOfDateKey(referenceDateKey));
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    keys.push(toLocalDateKey(d));
  }
  return keys;
}

export function dispatchFocusUpdated(): void {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('transpetro_focus_updated'));
    }
  } catch {
    // ignore in non-DOM contexts
  }
}

export function deduplicateFocusLogs(logs: unknown[]): FocusLogSegment[] {
  if (!Array.isArray(logs)) return [];
  const map = new Map<string, FocusLogSegment>();
  for (const raw of logs) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Partial<FocusLogSegment>;
    if (
      typeof item.id !== 'string' ||
      !item.id.trim() ||
      typeof item.dateKey !== 'string' ||
      typeof item.durationSeconds !== 'number' ||
      item.durationSeconds <= 0 ||
      item.type !== 'focus'
    ) {
      continue;
    }
    map.set(item.id, {
      id: item.id,
      dateKey: item.dateKey,
      startedAt: Number(item.startedAt) || Date.now(),
      endedAt: Number(item.endedAt) || Date.now(),
      durationSeconds: Math.round(item.durationSeconds),
      topicId: item.topicId,
      scheduleBlockId: item.scheduleBlockId,
      macroAreaId: item.macroAreaId,
      topicTitle: item.topicTitle,
      type: 'focus',
      status: item.status === 'interrupted' ? 'interrupted' : 'completed',
    });
  }
  return Array.from(map.values()).sort((a, b) => a.startedAt - b.startedAt);
}

export function loadFocusLogs(): FocusLogSegment[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(FOCUS_STORAGE_KEYS.FOCUS_LOGS);
    if (!raw) return [];
    return deduplicateFocusLogs(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveFocusLogs(logs: FocusLogSegment[]): FocusLogSegment[] {
  const clean = deduplicateFocusLogs(logs);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FOCUS_STORAGE_KEYS.FOCUS_LOGS, JSON.stringify(clean));
    }
    dispatchFocusUpdated();
  } catch {
    // ignore storage errors
  }
  return clean;
}

/**
 * Divide um intervalo de foco [startedAtMs, endedAtMs] nas fronteiras de meia-noite local,
 * garantindo soma exata dos segundos e atribuição à data local correta.
 */
export function splitFocusIntervalByLocalDate(params: {
  baseId: string;
  startedAtMs: number;
  endedAtMs: number;
  topicId?: string;
  scheduleBlockId?: string;
  macroAreaId?: string;
  topicTitle?: string;
  status: 'completed' | 'interrupted';
}): FocusLogSegment[] {
  const {
    baseId,
    startedAtMs,
    endedAtMs,
    topicId,
    scheduleBlockId,
    macroAreaId,
    topicTitle,
    status,
  } = params;

  if (endedAtMs <= startedAtMs) return [];

  const totalSeconds = Math.max(1, Math.round((endedAtMs - startedAtMs) / 1000));
  const segments: FocusLogSegment[] = [];

  let cursorMs = startedAtMs;
  let remainingSeconds = totalSeconds;
  let partIdx = 0;

  while (cursorMs < endedAtMs && remainingSeconds > 0) {
    const cursorDate = new Date(cursorMs);
    const dateKey = toLocalDateKey(cursorDate);
    const nextMidnightMs = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      cursorDate.getDate() + 1,
      0,
      0,
      0,
      0
    ).getTime();

    const sliceEndMs = Math.min(endedAtMs, nextMidnightMs);
    const isLastSlice = sliceEndMs >= endedAtMs;
    const rawSliceSeconds = isLastSlice
      ? remainingSeconds
      : Math.max(1, Math.round((sliceEndMs - cursorMs) / 1000));
    const clampedSeconds = Math.min(remainingSeconds, rawSliceSeconds);

    if (clampedSeconds > 0) {
      segments.push({
        id: partIdx === 0 && isLastSlice ? baseId : `${baseId}_p${partIdx}`,
        dateKey,
        startedAt: cursorMs,
        endedAt: sliceEndMs,
        durationSeconds: clampedSeconds,
        topicId,
        scheduleBlockId,
        macroAreaId,
        topicTitle,
        type: 'focus',
        status,
      });
    }

    remainingSeconds -= clampedSeconds;
    cursorMs = sliceEndMs;
    partIdx += 1;
  }

  return segments;
}

export function appendFocusSegments(newSegments: FocusLogSegment[]): FocusLogSegment[] {
  if (!newSegments || newSegments.length === 0) return loadFocusLogs();
  const current = loadFocusLogs();
  return saveFocusLogs([...current, ...newSegments]);
}

export function loadActivePomodoroState(): PomodoroActiveState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(FOCUS_STORAGE_KEYS.ACTIVE_STATE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PomodoroActiveState>;
    if (!parsed || typeof parsed.sessionId !== 'string' || typeof parsed.phaseTotalSeconds !== 'number') {
      return null;
    }
    return {
      sessionId: parsed.sessionId,
      dateKey: typeof parsed.dateKey === 'string' ? parsed.dateKey : toLocalDateKey(),
      scheduleBlockId: parsed.scheduleBlockId,
      topicId: parsed.topicId,
      macroAreaId: parsed.macroAreaId,
      topicTitle: parsed.topicTitle || 'Sessão de Estudo',
      subjectTitle: parsed.subjectTitle || '',
      phase: parsed.phase === 'rest' ? 'rest' : 'focus',
      phaseIndex: Number(parsed.phaseIndex) || 1,
      phaseTotalSeconds: Number(parsed.phaseTotalSeconds) || FOCUS_BLOCK_SECONDS,
      secondsRemaining: Math.max(0, Number(parsed.secondsRemaining) || 0),
      isRunning: Boolean(parsed.isRunning),
      isPaused: Boolean(parsed.isPaused),
      phaseStartedAtMs: parsed.phaseStartedAtMs ?? null,
      accumulatedPhaseSecondsBeforeSlice: Number(parsed.accumulatedPhaseSecondsBeforeSlice) || 0,
      loggedFocusSecondsInPhase: Number(parsed.loggedFocusSecondsInPhase) || 0,
      soundEnabled: parsed.soundEnabled !== false,
      lastCheckpointAt: Number(parsed.lastCheckpointAt) || Date.now(),
      completedPhaseEvents: Array.isArray(parsed.completedPhaseEvents)
        ? parsed.completedPhaseEvents
        : [],
      pendingExpiryNotice: parsed.pendingExpiryNotice ?? null,
      finishedDailyGoal: Boolean(parsed.finishedDailyGoal),
    };
  } catch {
    return null;
  }
}

export function saveActivePomodoroState(state: PomodoroActiveState | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!state) {
      localStorage.removeItem(FOCUS_STORAGE_KEYS.ACTIVE_STATE);
    } else {
      localStorage.setItem(FOCUS_STORAGE_KEYS.ACTIVE_STATE, JSON.stringify(state));
    }
    dispatchFocusUpdated();
  } catch {
    // ignore
  }
}

/**
 * Normaliza estado salvo após fechamento/reabertura do navegador:
 * nunca converte tempo com o navegador fechado em estudo; pausa no último checkpoint.
 */
export function normalizeRestoredPomodoroOnAppOpen(
  rawState: PomodoroActiveState | null
): PomodoroActiveState | null {
  if (!rawState) return null;
  if (rawState.finishedDailyGoal) return null;
  if (!rawState.isRunning) return rawState;

  return {
    ...rawState,
    isRunning: false,
    isPaused: true,
    phaseStartedAtMs: null,
    accumulatedPhaseSecondsBeforeSlice: Math.max(
      0,
      rawState.phaseTotalSeconds - rawState.secondsRemaining
    ),
  };
}

export function loadStudyResumeState(): StudyResumeState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(FOCUS_STORAGE_KEYS.RESUME_STATE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudyResumeState>;
    if (!parsed || typeof parsed.dateKey !== 'string') return null;
    return {
      updatedAt: Number(parsed.updatedAt) || Date.now(),
      dateKey: parsed.dateKey,
      scheduleBlockId: parsed.scheduleBlockId,
      topicId: parsed.topicId,
      macroAreaId: parsed.macroAreaId,
      topicTitle: parsed.topicTitle,
      subjectTitle: parsed.subjectTitle,
      lastAction: parsed.lastAction || 'selected',
    };
  } catch {
    return null;
  }
}

export function saveStudyResumeState(state: StudyResumeState | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!state) {
      localStorage.removeItem(FOCUS_STORAGE_KEYS.RESUME_STATE);
    } else {
      localStorage.setItem(FOCUS_STORAGE_KEYS.RESUME_STATE, JSON.stringify(state));
    }
    dispatchFocusUpdated();
  } catch {
    // ignore
  }
}

export function getNetFocusSecondsForDate(dateKey: string, logs?: FocusLogSegment[]): number {
  const source = logs ?? loadFocusLogs();
  return source.reduce((acc, seg) => (seg.dateKey === dateKey ? acc + seg.durationSeconds : acc), 0);
}

export function getNetFocusMinutesForDate(dateKey: string, logs?: FocusLogSegment[]): number {
  return Math.floor(getNetFocusSecondsForDate(dateKey, logs) / 60);
}

/**
 * Total semanal considerando estritamente segunda a sexta-feira (meta semanal de 500 min = 10 × 50 min).
 */
export function getWeeklyWeekdayFocusSeconds(
  referenceDateKey: string,
  logs?: FocusLogSegment[]
): number {
  const source = logs ?? loadFocusLogs();
  const weekdayKeys = new Set(getWeekDateKeysMonToSun(referenceDateKey).slice(0, 5));
  return source.reduce(
    (acc, seg) => (weekdayKeys.has(seg.dateKey) ? acc + seg.durationSeconds : acc),
    0
  );
}

function stepBackOneLocalDay(dateKey: string): string {
  const dt = parseLocalDateKey(dateKey);
  dt.setDate(dt.getDate() - 1);
  return toLocalDateKey(dt);
}

function stepBackToPreviousWeekday(dateKey: string): string {
  let cursor = stepBackOneLocalDay(dateKey);
  while (!isWeekdayDateKey(cursor)) {
    cursor = stepBackOneLocalDay(cursor);
  }
  return cursor;
}

/**
 * Conjunto de datas úteis (Segunda a Sexta) em que houve tempo líquido de estudo registrado.
 * Sábados e domingos nunca contam como dia de foco.
 */
export function getWeekdayFocusDayKeys(logs?: FocusLogSegment[]): Set<string> {
  const source = logs ?? loadFocusLogs();
  const keys = new Set<string>();
  for (const seg of source) {
    if (seg.durationSeconds > 0 && isWeekdayDateKey(seg.dateKey)) {
      keys.add(seg.dateKey);
    }
  }
  return keys;
}

/**
 * Total de dias úteis distintos estudados (Segunda a Sexta). Sábado e domingo não contam.
 */
export function getDistinctFocusDaysCount(logs?: FocusLogSegment[]): number {
  return getWeekdayFocusDayKeys(logs).size;
}

/**
 * Sequência atual de dias úteis estudados (Segunda a Sexta):
 * - Atrelada estritamente a dias úteis com estudo registrado (nunca dias corridos do calendário).
 * - Sábados e domingos são ignorados (não somam nem quebram a sequência entre sexta e segunda).
 * - Se hoje for dia útil e o usuário ainda não estudou hoje, preserva a sequência até o dia útil anterior.
 */
export function getWeekdayFocusStreakCount(
  logs?: FocusLogSegment[],
  referenceDateKey: string = toLocalDateKey()
): number {
  const studiedWeekdays = getWeekdayFocusDayKeys(logs);
  if (studiedWeekdays.size === 0) return 0;

  const isRefWeekday = isWeekdayDateKey(referenceDateKey);
  const latestWeekday = isRefWeekday
    ? referenceDateKey
    : stepBackToPreviousWeekday(referenceDateKey);

  let cursor: string;
  if (studiedWeekdays.has(latestWeekday)) {
    cursor = latestWeekday;
  } else if (isRefWeekday) {
    const prevWeekday = stepBackToPreviousWeekday(latestWeekday);
    if (!studiedWeekdays.has(prevWeekday)) {
      return 0;
    }
    cursor = prevWeekday;
  } else {
    return 0;
  }

  let streak = 0;
  while (studiedWeekdays.has(cursor)) {
    streak += 1;
    cursor = stepBackToPreviousWeekday(cursor);
  }
  return streak;
}

export function getMacroFocusSecondsDistribution(
  logs?: FocusLogSegment[]
): Record<string, number> {
  const source = logs ?? loadFocusLogs();
  const dist: Record<string, number> = {};
  for (const seg of source) {
    if (seg.macroAreaId) {
      dist[seg.macroAreaId] = (dist[seg.macroAreaId] || 0) + seg.durationSeconds;
    }
  }
  return dist;
}

/**
 * Calcula a duração do próximo bloco de foco: min(50 min, saldo restante para 100 min).
 */
export function computeNextFocusDurationSeconds(alreadyLoggedSecondsOnDate: number): number {
  const remainingGoal = Math.max(0, DAILY_GOAL_SECONDS - alreadyLoggedSecondsOnDate);
  if (remainingGoal === 0) return 0;
  return Math.min(FOCUS_BLOCK_SECONDS, remainingGoal);
}

export function formatMinutesAsHoursMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${String(m).padStart(2, '0')}min`;
}

export function formatSecondsAsClock(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
