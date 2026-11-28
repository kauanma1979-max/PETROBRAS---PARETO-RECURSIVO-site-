import type { CesgranrioProfileId, DifficultyLevel } from '../data/cesgranrioDna';
import type { RealExamQuestionRecord } from '../utils/questoesCsvParser';

export interface CesgranrioAlternative {
  letra: string;
  texto: string;
  correta: boolean;
  tipoDistrator: string;
  justificativa: string;
}

export interface CesgranrioGeneratedQuestion {
  rotuloTipo: string;
  perfilAplicado: string;
  codigoEdital: string;
  intersecaoPerfis: string;
  nivelDificuldade: number;
  nivelNome: string;
  habilidadeAvaliada: string;
  enunciado: string;
  alternativas: CesgranrioAlternative[];
  gabaritoLetra: string;
  raciocinioResolucao: string;
  pegadinhaPrincipal: string;
  conhecimentoIndispensavel: string;
  recomendacaoRevisao: string;
}

export interface CesgranrioProfessorLesson {
  tituloAula: string;
  intersecaoNota: string;
  passo1Fundamentacao: string;
  passo2AnalogiaPratica: string;
  passo3MecanismoFuncionamento: string;
  passo4ExemplosTecnicos: string[];
  passo5NaoConfundir: {
    conceitoA: string;
    conceitoB: string;
    diferencaChave: string;
  }[];
  passo6ComoCesgranrioCobra: string;
  passo7PegadinhasPrincipais: string[];
  passo8QuestaoComentada: {
    rotulo: string;
    enunciado: string;
    resolucaoPassoAPasso: string;
    conclusaoTecnica: string;
  };
  passo9QuestaoTeste: CesgranrioGeneratedQuestion;
}

export interface CesgranrioRealQuestionAnalysis {
  rotuloTipo: string;
  avisoPrecisaoBanca: string;
  conteudoCobrado: string;
  habilidadeExigida: string;
  nivelDificuldade: string;
  conceitoIndispensavel: string;
  logicaDistratores: string;
  conhecimentosSecundarios: string[];
  relacaoComEdital: string;
  variacaoDeCobrancaPossivel: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data && typeof data.error === 'string' && data.error) ||
      `Erro HTTP ${res.status} ao comunicar com o servidor.`;
    throw new Error(msg);
  }
  return data as T;
}

export async function requestCesgranrioLesson(params: {
  systemInstruction: string;
  topicTitle: string;
  codigoEdital: string;
  macroName: string;
  resumoEstrategico: string;
  bancaPattern?: string;
  keyTrap?: string;
  isIntersection: boolean;
  otherProfileCode?: string;
  customContext?: string;
  realQuestionsContext?: string;
}): Promise<CesgranrioProfessorLesson> {
  const res = await postJson<{ lesson: CesgranrioProfessorLesson }>(
    '/api/cesgranrio/teach',
    params
  );
  return res.lesson;
}

export async function requestCesgranrioQuestions(params: {
  systemInstruction: string;
  profileId: CesgranrioProfileId;
  topics: Array<{
    id: string;
    subtopic: string;
    macroName: string;
    codigoEdital: string;
    isIntersection: boolean;
    otherProfileCode?: string;
    resumoEstrategico: string;
    keyTrap?: string;
  }>;
  quantity: number;
  difficultyLevel: DifficultyLevel;
  skillFocus?: string;
  errorFocus?: string;
  realQuestionsContext?: string;
}): Promise<CesgranrioGeneratedQuestion[]> {
  const res = await postJson<{ questions: CesgranrioGeneratedQuestion[] }>(
    '/api/cesgranrio/generate-questions',
    params
  );
  return res.questions;
}

export async function requestRealQuestionAnalysis(params: {
  systemInstruction: string;
  questionText?: string;
  csvMetadata?: RealExamQuestionRecord;
  profileTopicsSummary?: string;
}): Promise<CesgranrioRealQuestionAnalysis> {
  const res = await postJson<{ analysis: CesgranrioRealQuestionAnalysis }>(
    '/api/cesgranrio/analyze-real',
    params
  );
  return res.analysis;
}
