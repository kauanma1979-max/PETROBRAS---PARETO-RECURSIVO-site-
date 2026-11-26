import { PARETO_MATRIX, type ParetoMacro, type ParetoMeso, type ParetoMicro } from '../data/paretoData';
import type { EditalTopic } from '../data/verticalSyllabusData';
import { resolveTopicsFromCodigoRef, type MacroAreaId } from './subjectClassification';

const MACRO_STATS_MAP = new Map<
  string,
  { exactPct: number; weightPct: number; questionCount: number; rank: number }
>();

// Computa ranking real diretamente de PARETO_MATRIX sem alterar o array fonte
const sortedMacroBase = [...PARETO_MATRIX].sort((a, b) => {
  if (b.exactPct !== a.exactPct) return b.exactPct - a.exactPct;
  if (b.weightPct !== a.weightPct) return b.weightPct - a.weightPct;
  if (b.questionCount !== a.questionCount) return b.questionCount - a.questionCount;
  return a.id.localeCompare(b.id);
});

sortedMacroBase.forEach((macro, index) => {
  MACRO_STATS_MAP.set(macro.id, {
    exactPct: macro.exactPct,
    weightPct: macro.weightPct,
    questionCount: macro.questionCount,
    rank: index + 1,
  });
});

export function getMacroParetoRank(macroId: string): number {
  return MACRO_STATS_MAP.get(macroId)?.rank ?? 999;
}

export function getMacroParetoMeta(macroId: string) {
  return MACRO_STATS_MAP.get(macroId) ?? null;
}

export function sortMacrosByPareto<T extends { id: string }>(macros: readonly T[]): T[] {
  return [...macros].sort((a, b) => {
    const statA = MACRO_STATS_MAP.get(a.id);
    const statB = MACRO_STATS_MAP.get(b.id);
    const pctA = statA?.exactPct ?? -1;
    const pctB = statB?.exactPct ?? -1;
    if (pctB !== pctA) return pctB - pctA;

    const qA = statA?.questionCount ?? -1;
    const qB = statB?.questionCount ?? -1;
    if (qB !== qA) return qB - qA;

    return a.id.localeCompare(b.id);
  });
}

export function sortParetoMacros(macros: readonly ParetoMacro[]): ParetoMacro[] {
  return [...macros].sort((a, b) => {
    if (b.exactPct !== a.exactPct) return b.exactPct - a.exactPct;
    if (b.weightPct !== a.weightPct) return b.weightPct - a.weightPct;
    if (b.questionCount !== a.questionCount) return b.questionCount - a.questionCount;
    return a.id.localeCompare(b.id);
  });
}

export function sortMesosByPareto(mesos: readonly ParetoMeso[]): ParetoMeso[] {
  return [...mesos].sort((a, b) => {
    if (b.weightInDiscipline !== a.weightInDiscipline) {
      return b.weightInDiscipline - a.weightInDiscipline;
    }
    if (b.questionCount !== a.questionCount) return b.questionCount - a.questionCount;
    return a.id.localeCompare(b.id);
  });
}

export function sortMicrosByPareto(micros: readonly ParetoMicro[]): ParetoMicro[] {
  return [...micros].sort((a, b) => {
    if (b.paretoPct !== a.paretoPct) return b.paretoPct - a.paretoPct;
    if (b.questionCount !== a.questionCount) return b.questionCount - a.questionCount;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export function sortSyllabusTopicsByPareto(topics: readonly EditalTopic[]): EditalTopic[] {
  return [...topics].sort((a, b) => {
    if (b.paretoSharePct !== a.paretoSharePct) return b.paretoSharePct - a.paretoSharePct;
    if (b.mappedQuestions !== a.mappedQuestions) return b.mappedQuestions - a.mappedQuestions;
    if (b.incidenceEstimate !== a.incidenceEstimate) return b.incidenceEstimate - a.incidenceEstimate;
    return a.id.localeCompare(b.id);
  });
}

export function getCodigoRefParetoScore(codigoRef?: string): {
  maxParetoPct: number;
  totalQuestions: number;
  bestMacroRank: number;
} {
  const matched = resolveTopicsFromCodigoRef(codigoRef);
  if (matched.length === 0) {
    return { maxParetoPct: -1, totalQuestions: -1, bestMacroRank: 999 };
  }

  let maxParetoPct = 0;
  let totalQuestions = 0;
  let bestMacroRank = 999;

  for (const t of matched) {
    if (t.paretoSharePct > maxParetoPct) maxParetoPct = t.paretoSharePct;
    totalQuestions += t.mappedQuestions;
    const mRank = getMacroParetoRank(t.macroArea);
    if (mRank < bestMacroRank) bestMacroRank = mRank;
  }

  return { maxParetoPct, totalQuestions, bestMacroRank };
}

export function sortItemsByCodigoRefPareto<
  T extends { codigoRef?: string; discipline?: string; id?: string }
>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const scoreA = getCodigoRefParetoScore(a.codigoRef);
    const scoreB = getCodigoRefParetoScore(b.codigoRef);

    if (scoreB.maxParetoPct !== scoreA.maxParetoPct) {
      return scoreB.maxParetoPct - scoreA.maxParetoPct;
    }
    if (scoreB.totalQuestions !== scoreA.totalQuestions) {
      return scoreB.totalQuestions - scoreA.totalQuestions;
    }
    if (scoreA.bestMacroRank !== scoreB.bestMacroRank) {
      return scoreA.bestMacroRank - scoreB.bestMacroRank;
    }
    return (a.id || '').localeCompare(b.id || '');
  });
}

export function sortMaterialModulesByPareto<T extends { id: string }>(modules: readonly T[]): T[] {
  return sortMacrosByPareto(modules);
}

export function getOrderedMacroIds(): MacroAreaId[] {
  return sortedMacroBase.map((m) => m.id as MacroAreaId);
}
