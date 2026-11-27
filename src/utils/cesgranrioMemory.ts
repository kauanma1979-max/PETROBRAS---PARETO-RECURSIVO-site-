import type { CesgranrioProfileId } from '../data/cesgranrioDna';
import type { RealExamQuestionRecord } from './questoesCsvParser';

export const CESGRANRIO_MEMORY_STORAGE_KEY = 'transpetro_cesgranrio_dna_memory_v1';

export interface CustomBancaObservation {
  id: string;
  createdAt: string;
  profileId: CesgranrioProfileId | 'ambos';
  provaOrigem: string;
  codigoEdital?: string;
  observacao: string;
}

export interface TopicPracticeStats {
  attempts: number;
  correct: number;
  lastPracticedAt: number;
  missedSkills: string[];
  missedTraps: string[];
}

export interface CesgranrioPedagogicalMemory {
  version: string;
  activeProfile: CesgranrioProfileId;
  importedCsvFileName?: string;
  importedAt?: string;
  importedQuestions: RealExamQuestionRecord[];
  customObservations: CustomBancaObservation[];
  topicStats: Record<string, TopicPracticeStats>;
}

export function createDefaultCesgranrioMemory(): CesgranrioPedagogicalMemory {
  return {
    version: '1.0',
    activeProfile: 'operacao_jr',
    importedQuestions: [],
    customObservations: [],
    topicStats: {},
  };
}

export function sanitizeCesgranrioMemory(raw: unknown): CesgranrioPedagogicalMemory {
  const base = createDefaultCesgranrioMemory();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Partial<CesgranrioPedagogicalMemory>;

  const activeProfile: CesgranrioProfileId =
    obj.activeProfile === 'dutos_terminais' ? 'dutos_terminais' : 'operacao_jr';

  const importedQuestions = Array.isArray(obj.importedQuestions)
    ? obj.importedQuestions.filter(
        (q): q is RealExamQuestionRecord =>
          Boolean(q && typeof q === 'object' && typeof q.id === 'string' && typeof q.assuntoCobrado === 'string')
      )
    : [];

  const customObservations = Array.isArray(obj.customObservations)
    ? obj.customObservations.filter(
        (o): o is CustomBancaObservation =>
          Boolean(o && typeof o === 'object' && typeof o.id === 'string' && typeof o.observacao === 'string')
      )
    : [];

  const topicStats: Record<string, TopicPracticeStats> = {};
  if (obj.topicStats && typeof obj.topicStats === 'object') {
    Object.entries(obj.topicStats).forEach(([topicId, val]) => {
      if (!val || typeof val !== 'object') return;
      const v = val as Partial<TopicPracticeStats>;
      topicStats[topicId] = {
        attempts: Math.max(0, Number(v.attempts) || 0),
        correct: Math.max(0, Number(v.correct) || 0),
        lastPracticedAt: Number(v.lastPracticedAt) || 0,
        missedSkills: Array.isArray(v.missedSkills) ? v.missedSkills.slice(0, 12) : [],
        missedTraps: Array.isArray(v.missedTraps) ? v.missedTraps.slice(0, 12) : [],
      };
    });
  }

  return {
    version: '1.0',
    activeProfile,
    importedCsvFileName: typeof obj.importedCsvFileName === 'string' ? obj.importedCsvFileName : undefined,
    importedAt: typeof obj.importedAt === 'string' ? obj.importedAt : undefined,
    importedQuestions,
    customObservations,
    topicStats,
  };
}

export function dispatchCesgranrioMemoryUpdated(): void {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('transpetro_cesgranrio_memory_updated'));
    }
  } catch {
    // ignore
  }
}

export function loadCesgranrioMemory(): CesgranrioPedagogicalMemory {
  try {
    if (typeof localStorage === 'undefined') return createDefaultCesgranrioMemory();
    const raw = localStorage.getItem(CESGRANRIO_MEMORY_STORAGE_KEY);
    if (!raw) return createDefaultCesgranrioMemory();
    return sanitizeCesgranrioMemory(JSON.parse(raw));
  } catch {
    return createDefaultCesgranrioMemory();
  }
}

export function saveCesgranrioMemory(
  memory: CesgranrioPedagogicalMemory
): CesgranrioPedagogicalMemory {
  const clean = sanitizeCesgranrioMemory(memory);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CESGRANRIO_MEMORY_STORAGE_KEY, JSON.stringify(clean));
    }
    dispatchCesgranrioMemoryUpdated();
  } catch (err) {
    console.error('Erro ao salvar memória pedagógica CESGRANRIO:', err);
  }
  return clean;
}

export function setActiveCesgranrioProfile(
  profileId: CesgranrioProfileId
): CesgranrioPedagogicalMemory {
  const cur = loadCesgranrioMemory();
  return saveCesgranrioMemory({ ...cur, activeProfile: profileId });
}

export function recordTopicPracticeOutcome(params: {
  topicId: string;
  isCorrect: boolean;
  skill?: string;
  trap?: string;
}): CesgranrioPedagogicalMemory {
  const cur = loadCesgranrioMemory();
  const prev = cur.topicStats[params.topicId] || {
    attempts: 0,
    correct: 0,
    lastPracticedAt: 0,
    missedSkills: [],
    missedTraps: [],
  };

  const nextMissedSkills =
    !params.isCorrect && params.skill
      ? Array.from(new Set([params.skill, ...prev.missedSkills])).slice(0, 8)
      : prev.missedSkills;

  const nextMissedTraps =
    !params.isCorrect && params.trap
      ? Array.from(new Set([params.trap, ...prev.missedTraps])).slice(0, 8)
      : prev.missedTraps;

  return saveCesgranrioMemory({
    ...cur,
    topicStats: {
      ...cur.topicStats,
      [params.topicId]: {
        attempts: prev.attempts + 1,
        correct: prev.correct + (params.isCorrect ? 1 : 0),
        lastPracticedAt: Date.now(),
        missedSkills: nextMissedSkills,
        missedTraps: nextMissedTraps,
      },
    },
  });
}

export function mergeCesgranrioMemories(
  localRaw: unknown,
  remoteRaw: unknown
): CesgranrioPedagogicalMemory {
  const local = sanitizeCesgranrioMemory(localRaw);
  const remote = sanitizeCesgranrioMemory(remoteRaw);

  const questionMap = new Map<string, RealExamQuestionRecord>();
  for (const q of remote.importedQuestions) questionMap.set(q.id, q);
  for (const q of local.importedQuestions) questionMap.set(q.id, q);

  const obsMap = new Map<string, CustomBancaObservation>();
  for (const o of remote.customObservations) obsMap.set(o.id, o);
  for (const o of local.customObservations) obsMap.set(o.id, o);

  const allTopicIds = new Set([
    ...Object.keys(local.topicStats),
    ...Object.keys(remote.topicStats),
  ]);
  const mergedStats: Record<string, TopicPracticeStats> = {};
  for (const id of allTopicIds) {
    const l = local.topicStats[id];
    const r = remote.topicStats[id];
    if (!l) mergedStats[id] = r;
    else if (!r) mergedStats[id] = l;
    else {
      mergedStats[id] = {
        attempts: Math.max(l.attempts, r.attempts),
        correct: Math.max(l.correct, r.correct),
        lastPracticedAt: Math.max(l.lastPracticedAt, r.lastPracticedAt),
        missedSkills: Array.from(new Set([...l.missedSkills, ...r.missedSkills])).slice(0, 8),
        missedTraps: Array.from(new Set([...l.missedTraps, ...r.missedTraps])).slice(0, 8),
      };
    }
  }

  return {
    version: '1.0',
    activeProfile: local.activeProfile || remote.activeProfile,
    importedCsvFileName: local.importedCsvFileName || remote.importedCsvFileName,
    importedAt: local.importedAt || remote.importedAt,
    importedQuestions: Array.from(questionMap.values()),
    customObservations: Array.from(obsMap.values()),
    topicStats: mergedStats,
  };
}

export interface NewCadernoErrorPayload {
  disciplina: string;
  origem: 'ambos' | 'transpetro' | 'petrobras';
  subtopico: string;
  enunciadoResumido: string;
  motivoErro: string;
  regraCorreta: string;
}

export function appendErrorToCadernoStorage(payload: NewCadernoErrorPayload): void {
  if (typeof localStorage === 'undefined') return;
  const KEY = 'transpetro_caderno_erros';
  try {
    const existingRaw = localStorage.getItem(KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    const list = Array.isArray(existing) ? existing : [];

    const entry = {
      id: `err-cesgranrio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      data: new Date().toLocaleDateString('pt-BR'),
      disciplina: payload.disciplina,
      origem: payload.origem,
      subtopico: payload.subtopico,
      enunciadoResumido: payload.enunciadoResumido,
      motivoErro: payload.motivoErro,
      regraCorreta: payload.regraCorreta,
      revisado: false,
    };

    localStorage.setItem(KEY, JSON.stringify([entry, ...list]));
    localStorage.setItem('transpetro_caderno_erros_customized', 'true');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('transpetro_data_restored', { detail: { key: KEY } }));
    }
  } catch (err) {
    console.error('Erro ao registrar item no Caderno de Erros:', err);
  }
}

