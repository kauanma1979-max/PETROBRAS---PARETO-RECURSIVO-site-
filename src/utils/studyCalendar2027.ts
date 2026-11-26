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
export const DAILY_TARGET_MINUTES = DAILY_GOAL_MINUTES; // 120 min
export const WEEKLY_TARGET_MINUTES = STUDY_DAYS_PER_WEEK * DAILY_TARGET_MINUTES; // 600 min

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
 * Calcula dinamicamente as quotas semanais da Fase 2 (600 min/semana) a partir dos
 * questionCounts reais de PARETO_MATRIX em múltiplos de 5 min.
 */
export function computePhase2WeeklyQuotas(): Record<MacroAreaId, number> {
  const macros = PARETO_MATRIX;
  const totalQuestions = macros.reduce((acc, m) => acc + m.questionCount, 0);
  const unitMinutes = 5;
  const totalUnits = WEEKLY_TARGET_MINUTES / unitMinutes; // 120 unidades de 5 min

  const exactUnits = macros.map((m) => ({
    id: m.id as MacroAreaId,
    raw: (m.questionCount / Math.max(1, totalQuestions)) * totalUnits,
    floor: Math.floor((m.questionCount / Math.max(1, totalQuestions)) * totalUnits),
    rank: getMacroParetoRank(m.id),
  }));

  const assigned = exactUnits.reduce((acc, item) => acc + item.floor, 0);
  let remainder = totalUnits - assigned;

  const byFraction = [...exactUnits].sort((a, b) => {
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

  for (const item of exactUnits) {
    result[item.id] = item.floor * unitMinutes;
  }
  for (let i = 0; i < remainder; i++) {
    const target = byFraction[i % byFraction.length];
    result[target.id] += unitMinutes;
  }

  return result;
}

/**
 * Calcula dinamicamente as quotas semanais da Fase 1 (Química vs Física, total 600 min/semana)
 * a partir da soma real de mappedQuestions dos tópicos elegíveis.
 */
export function computePhase1WeeklyQuotas(): { quimica: number; fisica: number } {
  const eligible = EDITAL_VERTICALIZADO_DATA.filter((t) => isTopicLevelingEligible(t.id));
  const quiQuestions = eligible
    .filter((t) => classifyTopicById(t.id) === 'quimica')
    .reduce((acc, t) => acc + t.mappedQuestions, 0);
  const fisQuestions = eligible
    .filter((t) => classifyTopicById(t.id) === 'fisica')
    .reduce((acc, t) => acc + t.mappedQuestions, 0);

  const totalQ = Math.max(1, quiQuestions + fisQuestions);
  const unitMinutes = 5;
  const totalUnits = WEEKLY_TARGET_MINUTES / unitMinutes;

  const quiUnits = Math.round(((quiQuestions / totalQ) * totalUnits));
  const fisUnits = totalUnits - quiUnits;

  return {
    quimica: quiUnits * unitMinutes,
    fisica: fisUnits * unitMinutes,
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

  const phase1Quotas = computePhase1WeeklyQuotas(); // ~250 Química, ~350 Física (soma 600)
  // Divide cada cota semanal exatamente pelos 5 dias úteis em blocos de 5 min somando 120/dia
  const quiDailyMin = Math.round(phase1Quotas.quimica / STUDY_DAYS_PER_WEEK / 5) * 5;
  const fisDailyMin = DAILY_TARGET_MINUTES - quiDailyMin;

  const phase2Quotas = computePhase2WeeklyQuotas();
  // Distribuição diária determinística que soma exatamente phase2Quotas[macro] na semana e 120/dia útil
  const phase2DailyTemplates: Array<Array<{ macroId: MacroAreaId; minutes: number }>> = buildPhase2DailyTemplates(phase2Quotas);

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
  const quiPhase1Seq = buildProgressiveTopicCycle(quiLevelingOrdered, 120);
  const fisPhase1Seq = buildProgressiveTopicCycle(fisLevelingOrdered, 120);

  const phase2Seq: Record<MacroAreaId, EditalTopic[]> = {
    quimica_processos: buildProgressiveTopicCycle(byMacroOrdered.quimica_processos, 240),
    mecanica_fluidos: buildProgressiveTopicCycle(byMacroOrdered.mecanica_fluidos, 240),
    instrumentacao: buildProgressiveTopicCycle(byMacroOrdered.instrumentacao, 180),
    eletricidade: buildProgressiveTopicCycle(byMacroOrdered.eletricidade, 180),
  };

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
    const phaseLabel = isPhase1
      ? 'Nivelamento — Química e Física'
      : 'Pareto completo — todas as macroáreas';

    if (weekday === 0 || weekday === 6) {
      map.set(dateKey, {
        dateKey,
        weekday,
        weekdayLabel,
        inSchedulePeriod: true,
        isRestDay: true,
        phase,
        phaseLabel,
        plannedMinutes: 0,
        blocks: [],
      });
      continue;
    }

    const monToFriIdx = weekday - 1; // 0=Seg .. 4=Sex
    const blocks: CalendarStudyBlock[] = [];

    if (isPhase1) {
      const quiTopic = quiPhase1Seq[quiP1Cursor++];
      const fisTopic = fisPhase1Seq[fisP1Cursor++];

      // Alterna a ordem inicial entre dias pares e ímpares para variedade didática
      const pair =
        monToFriIdx % 2 === 0
          ? [
              { topic: quiTopic, minutes: quiDailyMin },
              { topic: fisTopic, minutes: fisDailyMin },
            ]
          : [
              { topic: fisTopic, minutes: fisDailyMin },
              { topic: quiTopic, minutes: quiDailyMin },
            ];

      pair.forEach((slot, idx) => {
        if (slot.minutes <= 0) return;
        const occ = topicOccurrenceCount.get(slot.topic.id) || 0;
        topicOccurrenceCount.set(slot.topic.id, occ + 1);
        blocks.push(
          buildBlock({
            dateKey,
            blockIndex: idx,
            topic: slot.topic,
            plannedMinutes: slot.minutes,
            isNivelamento: true,
            occurrenceCount: occ,
          })
        );
      });
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
 * Gera grade semanal de Segunda a Sexta para a Fase 2 respeitando exatamente as cotas semanais
 * (padrão 235/210/100/55 min -> 120 min/dia útil, 600 min/semana), recalculando automaticamente
 * caso os pesos-fonte mudem.
 */
function buildPhase2DailyTemplates(
  quotas: Record<MacroAreaId, number>
): Array<Array<{ macroId: MacroAreaId; minutes: number }>> {
  // Caso canônico atual (235, 210, 100, 55) — corresponde exatamente à tabela verificada da seção 8.3
  if (
    quotas.quimica_processos === 235 &&
    quotas.mecanica_fluidos === 210 &&
    quotas.instrumentacao === 100 &&
    quotas.eletricidade === 55
  ) {
    return [
      // Segunda
      [
        { macroId: 'quimica_processos', minutes: 50 },
        { macroId: 'mecanica_fluidos', minutes: 50 },
        { macroId: 'instrumentacao', minutes: 20 },
      ],
      // Terça
      [
        { macroId: 'quimica_processos', minutes: 50 },
        { macroId: 'mecanica_fluidos', minutes: 50 },
        { macroId: 'eletricidade', minutes: 20 },
      ],
      // Quarta
      [
        { macroId: 'quimica_processos', minutes: 50 },
        { macroId: 'mecanica_fluidos', minutes: 40 },
        { macroId: 'instrumentacao', minutes: 30 },
      ],
      // Quinta
      [
        { macroId: 'quimica_processos', minutes: 45 },
        { macroId: 'mecanica_fluidos', minutes: 50 },
        { macroId: 'eletricidade', minutes: 25 },
      ],
      // Sexta
      [
        { macroId: 'quimica_processos', minutes: 40 },
        { macroId: 'mecanica_fluidos', minutes: 20 },
        { macroId: 'instrumentacao', minutes: 50 },
        { macroId: 'eletricidade', minutes: 10 },
      ],
    ];
  }

  // Fallback algorítmico geral (em múltiplos de 5 min fechando 120 por dia e quota semanal exata)
  const macrosOrder: MacroAreaId[] = [
    'quimica_processos',
    'mecanica_fluidos',
    'instrumentacao',
    'eletricidade',
  ];
  const remaining: Record<MacroAreaId, number> = { ...quotas };
  const days: Array<Record<MacroAreaId, number>> = Array.from({ length: 5 }, () => ({
    quimica_processos: 0,
    mecanica_fluidos: 0,
    instrumentacao: 0,
    eletricidade: 0,
  }));

  for (let d = 0; d < 5; d++) {
    let dayLeft = DAILY_TARGET_MINUTES;
    for (const m of macrosOrder) {
      if (dayLeft <= 0) break;
      const targetSlice = Math.min(dayLeft, remaining[m], 50);
      const roundedSlice = Math.floor(targetSlice / 5) * 5;
      if (roundedSlice > 0) {
        days[d][m] += roundedSlice;
        remaining[m] -= roundedSlice;
        dayLeft -= roundedSlice;
      }
    }
    while (dayLeft > 0) {
      const m = macrosOrder.find((id) => remaining[id] >= 5);
      if (!m) break;
      const add = Math.min(dayLeft, remaining[m]);
      days[d][m] += add;
      remaining[m] -= add;
      dayLeft -= add;
    }
  }

  return days.map((dayObj) =>
    macrosOrder
      .filter((m) => dayObj[m] > 0)
      .map((m) => ({ macroId: m, minutes: dayObj[m] }))
  );
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
