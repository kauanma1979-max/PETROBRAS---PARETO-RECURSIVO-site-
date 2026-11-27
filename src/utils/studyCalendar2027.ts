import { PARETO_MATRIX, type ParetoMacro } from '../data/paretoData';
import {
  EDITAL_VERTICALIZADO_DATA,
  type EditalTopic,
} from '../data/verticalSyllabusData';
import {
  classifyTopicById,
  isTopicLevelingEligible,
  type MacroAreaId,
  type SubjectCategory,
} from './subjectClassification';
import {
  getMacroParetoRank,
  sortMicrosByPareto,
  sortSyllabusTopicsByPareto,
} from './paretoOrdering';
import { DAILY_GOAL_MINUTES, parseLocalDateKey, toLocalDateKey } from './studyFocusStorage';

export const STUDY_DAYS_PER_WEEK = 5;
export const BLOCK_DURATION_MINUTES = 50;
export const BLOCKS_PER_DAY = 2;
export const DAILY_TARGET_MINUTES = DAILY_GOAL_MINUTES; // 100 min (2 aulas de 50 min)
export const WEEKLY_TARGET_MINUTES = STUDY_DAYS_PER_WEEK * DAILY_TARGET_MINUTES; // 500 min (10 aulas de 50 min)

export const CALENDAR_START_DATE = '2027-01-01';
export const CALENDAR_END_DATE = '2027-10-31';
export const PHASE_1_END_DATE = '2027-03-31';
export const PHASE_2_START_DATE = '2027-04-01';

export type SchedulePhase2027 = 'nivelamento' | 'pareto_completo' | 'fora_do_periodo';
export type StudyModeKind = 'Teoria & Questões' | 'Resolução de Questões' | 'Revisão & Caderno de Erros';

export interface CalendarStudyBlock {
  blockId: string; // Ex: cal-2027-01-04-b1
  dateKey: string;
  blockIndex: number;
  topicId: string;
  topicTitle: string;
  shortTitle: string;
  macroAreaId: MacroAreaId;
  macroName: string;
  mesoName: string;
  subjectCategory: SubjectCategory;
  isNivelamento: boolean;
  plannedMinutes: number;
  origem: EditalTopic['origem'];
  codigoTranspetro?: string;
  codigoPetrobras?: string;
  priority: EditalTopic['priority'];
  paretoSharePct: number;
  mappedQuestions: number;
  examPresenceCount: number;
  isNucleo80: boolean;
  studyMode: StudyModeKind;
  resumoEstrategico: string;
  bancaPattern?: string;
  keyTrap?: string;
}

export interface CalendarDayPlan {
  dateKey: string;
  weekday: number; // 0=Dom..6=Sáb
  weekdayLabel: string;
  inSchedulePeriod: boolean;
  isRestDay: boolean;
  phase: SchedulePhase2027;
  phaseLabel: string;
  plannedMinutes: number;
  blocks: CalendarStudyBlock[];
}

const WEEKDAY_NAMES_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const STUDY_MODES_ROTATION: StudyModeKind[] = [
  'Teoria & Questões',
  'Resolução de Questões',
  'Revisão & Caderno de Erros',
];

// Indexa metadados reais de PARETO_MATRIX (meso + micro) por código de referência para enriquecer os blocos sem inventar dados
interface MicroContextMeta {
  mesoName: string;
  isNucleo80: boolean;
  bancaPattern?: string;
  keyTrap?: string;
}

const MACRO_LOOKUP = new Map<string, ParetoMacro>(PARETO_MATRIX.map((m) => [m.id, m]));

function findMicroMetaForTopic(topic: EditalTopic): MicroContextMeta {
  const macro = MACRO_LOOKUP.get(topic.macroArea);
  if (!macro) {
    return {
      mesoName: topic.macroName,
      isNucleo80: topic.priority === 'CRÍTICA',
    };
  }

  const tp = topic.codigoTranspetro?.toUpperCase();
  const pb = topic.codigoPetrobras?.toUpperCase();

  for (const meso of macro.mesos) {
    for (const micro of sortMicrosByPareto(meso.micros)) {
      const ref = (micro.codigoRef || '').toUpperCase();
      if ((tp && ref.includes(tp)) || (pb && ref.includes(pb.split('/')[0].trim()))) {
        return {
          mesoName: meso.name,
          isNucleo80: micro.isNucleo80,
          bancaPattern: micro.bancaPattern,
          keyTrap: micro.keyTrap,
        };
      }
      // Fallback para referências abreviadas tipo "TP-29,30" ou "TP-07,08,09"
      if (tp) {
        const tpNum = tp.replace('TP-', '');
        if (ref.includes(`,${tpNum}`) || ref.includes(`, ${tpNum}`)) {
          return {
            mesoName: meso.name,
            isNucleo80: micro.isNucleo80,
            bancaPattern: micro.bancaPattern,
            keyTrap: micro.keyTrap,
          };
        }
      }
    }
  }

  return {
    mesoName: macro.mesos[0]?.name || topic.macroName,
    isNucleo80: topic.priority === 'CRÍTICA',
  };
}

const TOPIC_MICRO_META = new Map<string, MicroContextMeta>(
  EDITAL_VERTICALIZADO_DATA.map((t) => [t.id, findMicroMetaForTopic(t)])
);

/**
 * Calcula dinamicamente as quotas semanais da Fase 2 (500 min/semana = 10 aulas de 50 min)
 * a partir dos questionCounts reais de PARETO_MATRIX, garantindo >= 50 min em TODA aula.
 */
export function computePhase2WeeklyQuotas(): Record<MacroAreaId, number> {
  const macros = PARETO_MATRIX;
  const totalQuestions = macros.reduce((acc, m) => acc + m.questionCount, 0);
  const unitMinutes = BLOCK_DURATION_MINUTES; // 50 min por aula
  const totalSlots = WEEKLY_TARGET_MINUTES / unitMinutes; // 10 aulas/semana

  const exactSlots = macros.map((m) => ({
    id: m.id as MacroAreaId,
    raw: (m.questionCount / Math.max(1, totalQuestions)) * totalSlots,
    floor: Math.floor((m.questionCount / Math.max(1, totalQuestions)) * totalSlots),
    rank: getMacroParetoRank(m.id),
  }));

  const assigned = exactSlots.reduce((acc, item) => acc + item.floor, 0);
  const remainder = totalSlots - assigned;

  const byFraction = [...exactSlots].sort((a, b) => {
    const fracA = a.raw - a.floor;
    const fracB = b.raw - b.floor;
    if (Math.abs(fracB - fracA) > 1e-9) return fracB - fracA;
    return a.rank - b.rank;
  });

  const result: Record<MacroAreaId, number> = {
    quimica_processos: 0,
    mecanica_fluidos: 0,
    instrumentacao: 0,
    eletricidade: 0,
  };

  for (const item of exactSlots) {
    result[item.id] = item.floor * unitMinutes;
  }
  for (let i = 0; i < remainder; i++) {
    const target = byFraction[i % byFraction.length];
    result[target.id] += unitMinutes;
  }

  return result;
}

/**
 * Fase 1 (Jan–Mar/2027): 1 matéria por dia útil, alternando dia de Química e dia de Física.
 * Em média semanal (pares de semanas): 5 aulas de 50 min cada (250 min/sem cada).
 */
export function computePhase1WeeklyQuotas(): { quimica: number; fisica: number } {
  return {
    quimica: 250,
    fisica: 250,
  };
}

/**
 * Constrói sequência progressiva para uma lista ordenada de tópicos:
 * 1ª volta: passa por TODOS os tópicos da lista (garantindo cobertura integral, incluindo menor peso).
 * Voltas seguintes: alterna exposição antecipada/recorrente dos itens núcleo 80/20 e revisão completa.
 */
function buildProgressiveTopicCycle(
  orderedTopics: EditalTopic[],
  totalSlotsNeeded: number
): EditalTopic[] {
  if (orderedTopics.length === 0) return [];
  const nucleo = orderedTopics.filter(
    (t) => TOPIC_MICRO_META.get(t.id)?.isNucleo80 || t.priority === 'CRÍTICA'
  );
  const complementary = orderedTopics.filter(
    (t) => !(TOPIC_MICRO_META.get(t.id)?.isNucleo80 || t.priority === 'CRÍTICA')
  );

  const poolPattern: EditalTopic[] = [];
  // Volta 1: cobertura completa em ordem Pareto
  poolPattern.push(...orderedTopics);

  // Volta 2: reforço prioritário no núcleo 80/20 + intercalação dos demais
  if (nucleo.length > 0) {
    poolPattern.push(...nucleo);
  }
  poolPattern.push(...orderedTopics);
  if (complementary.length > 0 && nucleo.length > 0) {
    // Volta 3: núcleo + complementares
    poolPattern.push(...nucleo.slice(0, Math.max(2, Math.ceil(nucleo.length / 2))));
    poolPattern.push(...complementary);
  }

  const out: EditalTopic[] = [];
  for (let i = 0; i < totalSlotsNeeded; i++) {
    out.push(poolPattern[i % poolPattern.length]);
  }
  return out;
}

function makeShortTitle(subtopic: string): string {
  const clean = subtopic
    .replace(/^Noções de /i, '')
    .replace(/^Estudo dos /i, '')
    .replace(/^Cálculo /i, 'Cálc. ')
    .replace(/^Sistema Internacional de Unidades \(SI\)/i, 'Sistema Internacional (SI)')
    .replace(/^Segurança do trabalho, meio ambiente e saúde \(SMS\)/i, 'SMS Operacional (NRs/PT)')
    .split(':')[0]
    .split('(')[0]
    .trim();
  return clean.length > 34 ? `${clean.slice(0, 32).trim()}…` : clean;
}

function buildBlock(params: {
  dateKey: string;
  blockIndex: number;
  topic: EditalTopic;
  plannedMinutes: number;
  isNivelamento: boolean;
  occurrenceCount: number;
}): CalendarStudyBlock {
  const { dateKey, blockIndex, topic, plannedMinutes, isNivelamento, occurrenceCount } = params;
  const meta = TOPIC_MICRO_META.get(topic.id);

  // Primeira passagem foca em Teoria & Questões; passagens seguintes alternam Questões e Revisão/Erros
  const studyMode: StudyModeKind =
    occurrenceCount === 0
      ? 'Teoria & Questões'
      : STUDY_MODES_ROTATION[occurrenceCount % STUDY_MODES_ROTATION.length];

  return {
    blockId: `cal-${dateKey}-b${blockIndex + 1}`,
    dateKey,
    blockIndex,
    topicId: topic.id,
    topicTitle: topic.subtopic,
    shortTitle: makeShortTitle(topic.subtopic),
    macroAreaId: topic.macroArea,
    macroName: topic.macroName,
    mesoName: meta?.mesoName || topic.macroName,
    subjectCategory: classifyTopicById(topic.id),
    isNivelamento,
    plannedMinutes,
    origem: topic.origem,
    codigoTranspetro: topic.codigoTranspetro,
    codigoPetrobras: topic.codigoPetrobras,
    priority: topic.priority,
    paretoSharePct: topic.paretoSharePct,
    mappedQuestions: topic.mappedQuestions,
    examPresenceCount: topic.examPresenceCount,
    isNucleo80: Boolean(meta?.isNucleo80),
    studyMode,
    resumoEstrategico: topic.resumoEstrategico,
    bancaPattern: meta?.bancaPattern,
    keyTrap: meta?.keyTrap,
  };
}

let cachedScheduleMap: Map<string, CalendarDayPlan> | null = null;

function buildFull2027ScheduleMap(): Map<string, CalendarDayPlan> {
  if (cachedScheduleMap) return cachedScheduleMap;

  const map = new Map<string, CalendarDayPlan>();

  // Preparar conjuntos de tópicos ordenados por Pareto
  const eligibleLeveling = EDITAL_VERTICALIZADO_DATA.filter((t) => isTopicLevelingEligible(t.id));
  const quiLevelingOrdered = sortSyllabusTopicsByPareto(
    eligibleLeveling.filter((t) => classifyTopicById(t.id) === 'quimica')
  );
  const fisLevelingOrdered = sortSyllabusTopicsByPareto(
    eligibleLeveling.filter((t) => classifyTopicById(t.id) === 'fisica')
  );

  const phase2Quotas = computePhase2WeeklyQuotas();
  // Distribuição diária determinística: 2 aulas de 50 min/dia útil somando 500 min/semana no Pareto
  const phase2DailyTemplates: Array<Array<{ macroId: MacroAreaId; minutes: number }>> =
    buildPhase2DailyTemplates(phase2Quotas);

  const byMacroOrdered: Record<MacroAreaId, EditalTopic[]> = {
    quimica_processos: sortSyllabusTopicsByPareto(
      EDITAL_VERTICALIZADO_DATA.filter((t) => t.macroArea === 'quimica_processos')
    ),
    mecanica_fluidos: sortSyllabusTopicsByPareto(
      EDITAL_VERTICALIZADO_DATA.filter((t) => t.macroArea === 'mecanica_fluidos')
    ),
    instrumentacao: sortSyllabusTopicsByPareto(
      EDITAL_VERTICALIZADO_DATA.filter((t) => t.macroArea === 'instrumentacao')
    ),
    eletricidade: sortSyllabusTopicsByPareto(
      EDITAL_VERTICALIZADO_DATA.filter((t) => t.macroArea === 'eletricidade')
    ),
  };

  // Listas progressivas suficientemente grandes para todo o intervalo jan-out/2027
  const quiPhase1Seq = buildProgressiveTopicCycle(quiLevelingOrdered, 160);
  const fisPhase1Seq = buildProgressiveTopicCycle(fisLevelingOrdered, 160);

  const phase2Seq: Record<MacroAreaId, EditalTopic[]> = {
    quimica_processos: buildProgressiveTopicCycle(byMacroOrdered.quimica_processos, 240),
    mecanica_fluidos: buildProgressiveTopicCycle(byMacroOrdered.mecanica_fluidos, 240),
    instrumentacao: buildProgressiveTopicCycle(byMacroOrdered.instrumentacao, 180),
    eletricidade: buildProgressiveTopicCycle(byMacroOrdered.eletricidade, 180),
  };

  let phase1StudyDayIndex = 0;
  let quiP1Cursor = 0;
  let fisP1Cursor = 0;
  const p2Cursors: Record<MacroAreaId, number> = {
    quimica_processos: 0,
    mecanica_fluidos: 0,
    instrumentacao: 0,
    eletricidade: 0,
  };
  const topicOccurrenceCount = new Map<string, number>();

  const start = parseLocalDateKey(CALENDAR_START_DATE);
  const end = parseLocalDateKey(CALENDAR_END_DATE);

  for (
    let cur = new Date(start.getTime());
    cur.getTime() <= end.getTime();
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1)
  ) {
    const dateKey = toLocalDateKey(cur);
    const weekday = cur.getDay(); // 0=Dom..6=Sáb
    const weekdayLabel = WEEKDAY_NAMES_PT[weekday];
    const isPhase1 = dateKey <= PHASE_1_END_DATE;
    const phase: SchedulePhase2027 = isPhase1 ? 'nivelamento' : 'pareto_completo';

    if (weekday === 0 || weekday === 6) {
      map.set(dateKey, {
        dateKey,
        weekday,
        weekdayLabel,
        inSchedulePeriod: true,
        isRestDay: true,
        phase,
        phaseLabel: isPhase1
          ? 'Nivelamento — Química e Física (Descanso)'
          : 'Pareto completo — todas as macroáreas (Descanso)',
        plannedMinutes: 0,
        blocks: [],
      });
      continue;
    }

    const monToFriIdx = weekday - 1; // 0=Seg .. 4=Sex
    const blocks: CalendarStudyBlock[] = [];
    let phaseLabel = 'Pareto completo — todas as macroáreas';

    if (isPhase1) {
      // Alterna estritamente 1 matéria por dia útil: dia par = Química, dia ímpar = Física
      const isQuimicaDay = phase1StudyDayIndex % 2 === 0;
      phase1StudyDayIndex += 1;

      phaseLabel = isQuimicaDay
        ? 'Nivelamento — Dia de Química (2 × 50 min)'
        : 'Nivelamento — Dia de Física (2 × 50 min)';

      for (let idx = 0; idx < BLOCKS_PER_DAY; idx++) {
        const topic = isQuimicaDay
          ? quiPhase1Seq[quiP1Cursor++]
          : fisPhase1Seq[fisP1Cursor++];
        const occ = topicOccurrenceCount.get(topic.id) || 0;
        topicOccurrenceCount.set(topic.id, occ + 1);
        blocks.push(
          buildBlock({
            dateKey,
            blockIndex: idx,
            topic,
            plannedMinutes: BLOCK_DURATION_MINUTES,
            isNivelamento: true,
            occurrenceCount: occ,
          })
        );
      }
    } else {
      const template = phase2DailyTemplates[monToFriIdx];
      template.forEach((slot, idx) => {
        if (slot.minutes <= 0) return;
        const seq = phase2Seq[slot.macroId];
        const cursor = p2Cursors[slot.macroId]++;
        const topic = seq[cursor % seq.length];
        const occ = topicOccurrenceCount.get(topic.id) || 0;
        topicOccurrenceCount.set(topic.id, occ + 1);

        blocks.push(
          buildBlock({
            dateKey,
            blockIndex: idx,
            topic,
            plannedMinutes: slot.minutes,
            isNivelamento: false,
            occurrenceCount: occ,
          })
        );
      });
    }

    map.set(dateKey, {
      dateKey,
      weekday,
      weekdayLabel,
      inSchedulePeriod: true,
      isRestDay: false,
      phase,
      phaseLabel,
      plannedMinutes: blocks.reduce((acc, b) => acc + b.plannedMinutes, 0),
      blocks,
    });
  }

  cachedScheduleMap = map;
  return map;
}

/**
 * Gera grade semanal de Segunda a Sexta para a Fase 2 com aulas estritas de 50 minutos
 * (2 aulas/dia útil = 100 min/dia, 10 aulas/semana = 500 min/semana).
 * Nenhuma aula pode ter menos de 50 minutos nem 70 minutos.
 */
function buildPhase2DailyTemplates(
  quotas: Record<MacroAreaId, number>
): Array<Array<{ macroId: MacroAreaId; minutes: number }>> {
  // Caso canônico atual: 200 / 150 / 100 / 50 min (4 / 3 / 2 / 1 aulas de 50 min)
  if (
    quotas.quimica_processos === 200 &&
    quotas.mecanica_fluidos === 150 &&
    quotas.instrumentacao === 100 &&
    quotas.eletricidade === 50
  ) {
    return [
      // Segunda
      [
        { macroId: 'quimica_processos', minutes: 50 },
        { macroId: 'mecanica_fluidos', minutes: 50 },
      ],
      // Terça
      [
        { macroId: 'quimica_processos', minutes: 50 },
        { macroId: 'instrumentacao', minutes: 50 },
      ],
      // Quarta
      [
        { macroId: 'mecanica_fluidos', minutes: 50 },
        { macroId: 'eletricidade', minutes: 50 },
      ],
      // Quinta
      [
        { macroId: 'quimica_processos', minutes: 50 },
        { macroId: 'mecanica_fluidos', minutes: 50 },
      ],
      // Sexta
      [
        { macroId: 'quimica_processos', minutes: 50 },
        { macroId: 'instrumentacao', minutes: 50 },
      ],
    ];
  }

  // Fallback algorítmico geral: distribui slots inteiros de 50 min (2 por dia útil)
  const macrosOrder: MacroAreaId[] = [
    'quimica_processos',
    'mecanica_fluidos',
    'instrumentacao',
    'eletricidade',
  ];
  const remainingSlots: Record<MacroAreaId, number> = {
    quimica_processos: Math.round(quotas.quimica_processos / BLOCK_DURATION_MINUTES),
    mecanica_fluidos: Math.round(quotas.mecanica_fluidos / BLOCK_DURATION_MINUTES),
    instrumentacao: Math.round(quotas.instrumentacao / BLOCK_DURATION_MINUTES),
    eletricidade: Math.round(quotas.eletricidade / BLOCK_DURATION_MINUTES),
  };

  const days: Array<Array<{ macroId: MacroAreaId; minutes: number }>> = Array.from(
    { length: STUDY_DAYS_PER_WEEK },
    () => []
  );

  // Distribui alternadamente respeitando 2 aulas distintas por dia quando possível
  const totalSlots = Object.values(remainingSlots).reduce((a, b) => a + b, 0);
  let assigned = 0;
  while (assigned < totalSlots) {
    let progressed = false;
    for (let d = 0; d < STUDY_DAYS_PER_WEEK && assigned < totalSlots; d++) {
      if (days[d].length >= BLOCKS_PER_DAY) continue;
      // Escolhe macro com mais slots restantes ainda não presente hoje (ou maior restante)
      const sorted = [...macrosOrder]
        .filter((m) => remainingSlots[m] > 0)
        .sort((a, b) => remainingSlots[b] - remainingSlots[a]);
      const chosen =
        sorted.find((m) => !days[d].some((slot) => slot.macroId === m)) || sorted[0];
      if (chosen) {
        days[d].push({ macroId: chosen, minutes: BLOCK_DURATION_MINUTES });
        remainingSlots[chosen] -= 1;
        assigned += 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  return days;
}

export function isDateIn2027Schedule(dateKey: string): boolean {
  return dateKey >= CALENDAR_START_DATE && dateKey <= CALENDAR_END_DATE;
}

export function getCalendarDayPlan(dateKey: string): CalendarDayPlan {
  const map = buildFull2027ScheduleMap();
  const existing = map.get(dateKey);
  if (existing) return existing;

  const dt = parseLocalDateKey(dateKey);
  const weekday = dt.getDay();
  const weekdayLabel = WEEKDAY_NAMES_PT[weekday];
  const isWeekend = weekday === 0 || weekday === 6;

  return {
    dateKey,
    weekday,
    weekdayLabel,
    inSchedulePeriod: false,
    isRestDay: isWeekend,
    phase: 'fora_do_periodo',
    phaseLabel: 'Fora do período programado (Jan–Out 2027)',
    plannedMinutes: 0,
    blocks: [],
  };
}

export function getAll2027ScheduleDays(): CalendarDayPlan[] {
  return Array.from(buildFull2027ScheduleMap().values());
}

export function getMonthCalendarCells(year: number, monthIndex0: number): Array<{
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  plan: CalendarDayPlan;
}> {
  const firstDay = new Date(year, monthIndex0, 1);
  const lastDay = new Date(year, monthIndex0 + 1, 0);

  // Semana começa na Segunda-feira (Mon=0 .. Sun=6)
  const firstWeekdayMonStart = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex0, 1 - firstWeekdayMonStart);

  const lastWeekdayMonStart = (lastDay.getDay() + 6) % 7;
  const trailingDays = 6 - lastWeekdayMonStart;
  const totalDays = firstWeekdayMonStart + lastDay.getDate() + trailingDays;

  const cells: Array<{
    dateKey: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    plan: CalendarDayPlan;
  }> = [];

  for (let i = 0; i < totalDays; i++) {
    const dt = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    const dateKey = toLocalDateKey(dt);
    cells.push({
      dateKey,
      dayNumber: dt.getDate(),
      isCurrentMonth: dt.getMonth() === monthIndex0 && dt.getFullYear() === year,
      plan: getCalendarDayPlan(dateKey),
    });
  }

  return cells;
}

export function getInitialCalendarDateKey(todayKey: string = toLocalDateKey()): string {
  if (isDateIn2027Schedule(todayKey)) {
    return todayKey;
  }
  return CALENDAR_START_DATE; // 2027-01-01
}

export function getNextPendingStudyDayOrBlock(params: {
  referenceDateKey: string;
  loggedSecondsByDate?: Map<string, number>;
}): {
  dayPlan: CalendarDayPlan;
  suggestedBlock: CalendarStudyBlock | null;
} {
  const { referenceDateKey } = params;
  const startKey = isDateIn2027Schedule(referenceDateKey)
    ? referenceDateKey
    : CALENDAR_START_DATE;

  const startDt = parseLocalDateKey(startKey);
  const endDt = parseLocalDateKey(CALENDAR_END_DATE);

  for (
    let cur = new Date(startDt.getTime());
    cur.getTime() <= endDt.getTime();
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1)
  ) {
    const dk = toLocalDateKey(cur);
    const plan = getCalendarDayPlan(dk);
    if (!plan.isRestDay && plan.blocks.length > 0) {
      return {
        dayPlan: plan,
        suggestedBlock: plan.blocks[0],
      };
    }
  }

  const fallbackPlan = getCalendarDayPlan(CALENDAR_START_DATE);
  return {
    dayPlan: fallbackPlan,
    suggestedBlock: fallbackPlan.blocks[0] || null,
  };
}
