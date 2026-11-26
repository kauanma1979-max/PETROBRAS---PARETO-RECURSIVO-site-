import { EDITAL_VERTICALIZADO_DATA, type EditalTopic } from '../data/verticalSyllabusData';

export type MacroAreaId = EditalTopic['macroArea'];
export type SubjectCategory = 'quimica' | 'fisica' | 'tecnico';

/**
 * Mapa canônico validado contra os 42 tópicos em src/data/verticalSyllabusData.ts:
 * - Química básica: qui-01 a qui-12 (12 tópicos)
 * - Física básica: mec-01 a mec-11 (11), ele-01 a ele-06 (6), inst-08 (SI) e inst-10 (Escalas de temperatura) (19 tópicos)
 * - Eixo técnico correlato (entra na fase completa a partir de abril): inst-01..07, inst-09, qui-13..15 (11 tópicos)
 */
export const QUIMICA_TOPIC_IDS: readonly string[] = [
  'qui-01',
  'qui-02',
  'qui-03',
  'qui-04',
  'qui-05',
  'qui-06',
  'qui-07',
  'qui-08',
  'qui-09',
  'qui-10',
  'qui-11',
  'qui-12',
];

export const FISICA_TOPIC_IDS: readonly string[] = [
  'mec-01',
  'mec-02',
  'mec-03',
  'mec-04',
  'mec-05',
  'mec-06',
  'mec-07',
  'mec-08',
  'mec-09',
  'mec-10',
  'mec-11',
  'ele-01',
  'ele-02',
  'ele-03',
  'ele-04',
  'ele-05',
  'ele-06',
  'inst-08',
  'inst-10',
];

export const TECNICO_TOPIC_IDS: readonly string[] = [
  'inst-01',
  'inst-02',
  'inst-03',
  'inst-04',
  'inst-05',
  'inst-06',
  'inst-07',
  'inst-09',
  'qui-13',
  'qui-14',
  'qui-15',
];

const QUIMICA_SET = new Set<string>(QUIMICA_TOPIC_IDS);
const FISICA_SET = new Set<string>(FISICA_TOPIC_IDS);
export const LEVELING_ELIGIBLE_TOPIC_IDS = new Set<string>([
  ...QUIMICA_TOPIC_IDS,
  ...FISICA_TOPIC_IDS,
]);

const TOPIC_BY_ID = new Map<string, EditalTopic>(
  EDITAL_VERTICALIZADO_DATA.map((t) => [t.id, t])
);

export function classifyTopicById(topicId: string): SubjectCategory {
  if (QUIMICA_SET.has(topicId)) return 'quimica';
  if (FISICA_SET.has(topicId)) return 'fisica';
  return 'tecnico';
}

export function isTopicLevelingEligible(topicId: string): boolean {
  return LEVELING_ELIGIBLE_TOPIC_IDS.has(topicId);
}

export function classifyMacroArea(macroId: string): SubjectCategory | null {
  switch (macroId as MacroAreaId | string) {
    case 'quimica_processos':
      return 'quimica';
    case 'mecanica_fluidos':
    case 'eletricidade':
      return 'fisica';
    case 'instrumentacao':
      return 'tecnico';
    default:
      return null;
  }
}

/**
 * Expande referências abreviadas do tipo:
 * "TP-29,30 / PB-B1.06, B1.07" ou "TP-21,22,32,33" ou "TP-01 / PB-B1.16"
 * e retorna os tópicos correspondentes em EDITAL_VERTICALIZADO_DATA.
 */
export function resolveTopicsFromCodigoRef(codigoRef?: string): EditalTopic[] {
  if (!codigoRef || !codigoRef.trim()) return [];

  const matchedIds = new Set<string>();
  const normalized = codigoRef.toUpperCase();

  // 1. Extrair códigos TP-XX,YY...
  const tpGroups = normalized.match(/TP-\d{2}(?:\s*,\s*\d{2})*/g) || [];
  const tpCodes = new Set<string>();
  for (const grp of tpGroups) {
    const nums = grp.replace('TP-', '').split(',');
    for (const num of nums) {
      const clean = num.trim();
      if (/^\d{2}$/.test(clean)) {
        tpCodes.add(`TP-${clean}`);
      }
    }
  }

  // 2. Extrair códigos PB-BX.YY e shorthands como "PB-B3.01,06" ou "PB-B1.06, B1.07"
  const pbCodes = new Set<string>();
  const pbSegmentMatches = normalized.match(/PB-B\d\.\d{2}(?:\s*,\s*(?:B\d\.)?\d{2})*/g) || [];
  for (const seg of pbSegmentMatches) {
    const withoutPrefix = seg.replace(/^PB-/, '');
    const parts = withoutPrefix.split(',').map((p) => p.trim());
    let currentBlock = '';
    for (const part of parts) {
      const fullMatch = part.match(/^(B\d)\.(\d{2})$/);
      if (fullMatch) {
        currentBlock = fullMatch[1];
        pbCodes.add(`PB-${currentBlock}.${fullMatch[2]}`);
      } else if (/^\d{2}$/.test(part) && currentBlock) {
        pbCodes.add(`PB-${currentBlock}.${part}`);
      }
    }
  }

  for (const topic of EDITAL_VERTICALIZADO_DATA) {
    if (topic.codigoTranspetro && tpCodes.has(topic.codigoTranspetro.toUpperCase())) {
      matchedIds.add(topic.id);
    }
    if (topic.codigoPetrobras) {
      const pbUpper = topic.codigoPetrobras.toUpperCase();
      for (const code of pbCodes) {
        if (pbUpper.includes(code)) {
          matchedIds.add(topic.id);
        }
      }
    }
  }

  return Array.from(matchedIds)
    .map((id) => TOPIC_BY_ID.get(id))
    .filter((t): t is EditalTopic => Boolean(t));
}

export interface CodigoRefClassification {
  primary: SubjectCategory | null;
  badges: Array<'quimica' | 'fisica'>;
  topics: EditalTopic[];
  isLevelingEligible: boolean;
}

export function classifyByCodigoRef(codigoRef?: string): CodigoRefClassification {
  const topics = resolveTopicsFromCodigoRef(codigoRef);
  if (topics.length === 0) {
    return {
      primary: null,
      badges: [],
      topics: [],
      isLevelingEligible: false,
    };
  }

  const cats = new Set<SubjectCategory>(topics.map((t) => classifyTopicById(t.id)));
  const badges: Array<'quimica' | 'fisica'> = [];
  if (cats.has('quimica')) badges.push('quimica');
  if (cats.has('fisica')) badges.push('fisica');

  let primary: SubjectCategory = 'tecnico';
  if (badges.length === 1) {
    primary = badges[0];
  } else if (badges.length > 1) {
    primary = badges[0];
  }

  return {
    primary,
    badges,
    topics,
    isLevelingEligible: topics.some((t) => isTopicLevelingEligible(t.id)),
  };
}

export function classifyModuleId(moduloId: string): SubjectCategory | null {
  switch (moduloId) {
    case 'quimica_processos':
      return 'quimica';
    case 'mecanica_fluidos':
    case 'eletricidade':
      return 'fisica';
    case 'instrumentacao':
      return 'tecnico';
    default:
      return null;
  }
}

function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Classificação segura para registros do Caderno de Erros.
 * Nunca inventa rótulo para Conhecimentos Gerais (Português/Matemática)
 * nem classifica qui-13..15 (Operações Unitárias, Refino e SMS) como Química básica.
 */
export function classifyErrorEntry(disciplina: string, subtopico = ''): SubjectCategory | null {
  const d = normalizeText(disciplina);
  const s = normalizeText(subtopico);

  if (!d) return null;
  if (d.includes('portug') || d.includes('matemat')) return null;

  if (d.includes('mecan') || d.includes('fluid') || d.includes('equip') || d.includes('termo')) {
    return 'fisica';
  }
  if (d.includes('eletr')) {
    return 'fisica';
  }
  if (d.includes('instrument') || d.includes('metrolog')) {
    if (
      s.includes('escala') ||
      s.includes('celsius') ||
      s.includes('kelvin') ||
      s.includes('fahrenheit') ||
      s.includes('sistema internacional')
    ) {
      return 'fisica';
    }
    return 'tecnico';
  }
  if (d.includes('quim') || d.includes('refino') || d.includes('sms')) {
    if (
      s.includes('operacoes unitarias') ||
      s.includes('destilacao') ||
      s.includes('refino') ||
      s.includes('fcc') ||
      s.includes('hdt') ||
      s.includes('vacuo') ||
      s.includes('sms') ||
      s.includes('nr-') ||
      s.includes('permissao de trabalho') ||
      s.includes('fispq')
    ) {
      return 'tecnico';
    }
    if (
      s.includes('estequiom') ||
      s.includes('gas') ||
      s.includes('clapeyron') ||
      s.includes('organica') ||
      s.includes('hidrocarboneto') ||
      s.includes('polimero') ||
      s.includes('equilibrio') ||
      s.includes('chatelier') ||
      s.includes('redox') ||
      s.includes('oxid') ||
      s.includes('nox') ||
      s.includes('inorganica') ||
      s.includes('acido') ||
      s.includes('soluc') ||
      s.includes('dispers') ||
      s.includes('coloide') ||
      s.includes('termoquim') ||
      s.includes('entalpia') ||
      s.includes('atomo') ||
      s.includes('ligac') ||
      s.includes('concentrac')
    ) {
      return 'quimica';
    }
    return null;
  }

  return null;
}

export function getTopicById(topicId: string): EditalTopic | undefined {
  return TOPIC_BY_ID.get(topicId);
}
