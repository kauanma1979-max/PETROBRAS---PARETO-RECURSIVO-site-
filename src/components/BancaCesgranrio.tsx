import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BANCA_PROFILE, PARES_CONCEITUAIS_IRMAOS } from '../data/bancaData';
import {
  EDITAL_VERTICALIZADO_DATA,
  MACRO_DIVISOES,
  type EditalTopic,
} from '../data/verticalSyllabusData';
import {
  buildCesgranrioSystemInstruction,
  CESGRANRIO_CHARACTERISTICS,
  CESGRANRIO_DIFFICULTY_LEVELS,
  CESGRANRIO_DISTRACTOR_TYPES,
  CESGRANRIO_PRECISION_RULES,
  CESGRANRIO_PROFESSOR_9_STEPS,
  CESGRANRIO_PROFILES,
  CESGRANRIO_SKILLS,
  getProfileIntersectionSummary,
  getTopicsForCesgranrioProfile,
  type CesgranrioAiLaunchRequest,
  type CesgranrioModuleSubTab,
  type CesgranrioProfileId,
  type DifficultyLevel,
} from '../data/cesgranrioDna';
import {
  appendErrorToCadernoStorage,
  loadCesgranrioMemory,
  recordTopicPracticeOutcome,
  saveCesgranrioMemory,
  setActiveCesgranrioProfile,
  type CesgranrioPedagogicalMemory,
  type TopicPracticeStats,
} from '../utils/cesgranrioMemory';
import {
  parseBaseQuestoesCsv,
  type RealExamQuestionRecord,
} from '../utils/questoesCsvParser';
import {
  requestCesgranrioLesson,
  requestCesgranrioQuestions,
  requestRealQuestionAnalysis,
  type CesgranrioGeneratedQuestion,
  type CesgranrioProfessorLesson,
  type CesgranrioRealQuestionAnalysis,
} from '../services/cesgranrioAiClient';
import {
  Button,
  Card,
  EmptyState,
  OriginBadge,
  StatusBadge,
  SubjectBaseBadge,
  ToastBanner,
} from './ui';
import type { OrigemEdital } from './ui/OriginBadge';
import { classifyByCodigoRef } from '../utils/subjectClassification';
import {
  sortItemsByCodigoRefPareto,
  sortSyllabusTopicsByPareto,
} from '../utils/paretoOrdering';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Filter,
  FlaskConical,
  Layers,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';

interface BancaCesgranrioProps {
  launchRequest?: CesgranrioAiLaunchRequest | null;
}

const MACRO_TO_ERROR_DISCIPLINE: Record<EditalTopic['macroArea'], string> = {
  instrumentacao: 'Instrumentação, Metrologia & Controle',
  mecanica_fluidos: 'Mecânica, Fluidos, Termodinâmica & Equipamentos',
  quimica_processos: 'Química, Processos, Refino & SMS',
  eletricidade: 'Eletricidade, Eletromagnetismo & Eletrônica',
};

function getMacroLabel(macroId: EditalTopic['macroArea']): string {
  return MACRO_DIVISOES.find((m) => m.id === macroId)?.nome || macroId;
}

function getSyllabusTopicParetoPriority(topic: EditalTopic): 'CRÍTICA' | 'ALTA' | 'MÉDIA' {
  return topic.priority;
}

function formatQuestionSummaryForError(q: CesgranrioGeneratedQuestion): string {
  const clean = q.enunciado.replace(/\s+/g, ' ').trim();
  return clean.length > 210 ? `${clean.slice(0, 207)}...` : clean;
}

export const BancaCesgranrio: React.FC<BancaCesgranrioProps> = ({ launchRequest }) => {
  const [memory, setMemory] = useState<CesgranrioPedagogicalMemory>(() => loadCesgranrioMemory());
  const [activeSubTab, setActiveSubTab] = useState<CesgranrioModuleSubTab>('professor');
  const [showDnaMatrix, setShowDnaMatrix] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeProfile: CesgranrioProfileId = memory.activeProfile;
  const profileSpec = CESGRANRIO_PROFILES[activeProfile];
  const intersectionSummary = useMemo(() => getProfileIntersectionSummary(), []);

  // Topics ordered by Pareto for active profile
  const profileTopicMatches = useMemo(() => {
    const ordered = sortSyllabusTopicsByPareto(EDITAL_VERTICALIZADO_DATA);
    const byId = new Map(getTopicsForCesgranrioProfile(activeProfile).map((m) => [m.topic.id, m]));
    return ordered
      .map((t) => byId.get(t.id)!)
      .filter((m) => m && m.inActiveProfile);
  }, [activeProfile]);

  // Selected topic for Professor IA & Simulado
  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => {
    const first = profileTopicMatches[0]?.topic.id;
    return first || EDITAL_VERTICALIZADO_DATA[0]?.id || '';
  });

  // Sync memory when restored or updated elsewhere
  useEffect(() => {
    const refresh = () => setMemory(loadCesgranrioMemory());
    window.addEventListener('transpetro_cesgranrio_memory_updated', refresh);
    window.addEventListener('transpetro_data_restored', refresh);
    return () => {
      window.removeEventListener('transpetro_cesgranrio_memory_updated', refresh);
      window.removeEventListener('transpetro_data_restored', refresh);
    };
  }, []);

  // Ensure selectedTopicId belongs to active profile if user switches profile
  useEffect(() => {
    const exists = profileTopicMatches.some((m) => m.topic.id === selectedTopicId);
    if (!exists && profileTopicMatches[0]) {
      setSelectedTopicId(profileTopicMatches[0].topic.id);
    }
  }, [profileTopicMatches, selectedTopicId]);

  // Contextual launch from Edital / Pareto / Material / ErrorNotebook
  const [professorCustomContext, setProfessorCustomContext] = useState<string>('');
  const [simuladoErrorFocus, setSimuladoErrorFocus] = useState<string>('');

  useEffect(() => {
    if (!launchRequest) return;
    if (launchRequest.subTab) {
      setActiveSubTab(launchRequest.subTab);
    }
    if (launchRequest.topicId) {
      const targetTopic = EDITAL_VERTICALIZADO_DATA.find((t) => t.id === launchRequest.topicId);
      if (targetTopic) {
        if (targetTopic.origem === 'petrobras' && activeProfile !== 'operacao_jr') {
          setMemory(setActiveCesgranrioProfile('operacao_jr'));
        } else if (targetTopic.origem === 'transpetro' && activeProfile !== 'dutos_terminais') {
          setMemory(setActiveCesgranrioProfile('dutos_terminais'));
        }
        setSelectedTopicId(targetTopic.id);
      }
    }
    if (launchRequest.customContext) {
      if (launchRequest.subTab === 'questoes') {
        setSimuladoErrorFocus(launchRequest.customContext);
      } else {
        setProfessorCustomContext(launchRequest.customContext);
      }
    }
  }, [launchRequest]);

  const selectedMatch = useMemo(() => {
    return (
      profileTopicMatches.find((m) => m.topic.id === selectedTopicId) ||
      profileTopicMatches[0]
    );
  }, [profileTopicMatches, selectedTopicId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSelectProfile = (profileId: CesgranrioProfileId) => {
    const next = setActiveCesgranrioProfile(profileId);
    setMemory(next);
    showToast(`Perfil ativo alterado para ${CESGRANRIO_PROFILES[profileId].title}.`);
  };

  // Build real CSV context snippet relevant to a topic
  const getRelevantCsvContext = (topic?: EditalTopic): string | undefined => {
    if (!memory.importedQuestions.length) return undefined;
    const codes = [topic?.codigoTranspetro, topic?.codigoPetrobras]
      .filter(Boolean)
      .map((c) => c!.toLowerCase());
    const topicName = (topic?.subtopic || '').toLowerCase();

    const matched = memory.importedQuestions.filter((q) => {
      const qCode = (q.codigoEdital || '').toLowerCase();
      const qSubject = (q.assuntoCobrado || '').toLowerCase();
      if (codes.some((c) => qCode && (qCode.includes(c) || c.includes(qCode)))) return true;
      return topicName.split(/\s+/).some((w) => w.length >= 5 && qSubject.includes(w));
    });

    const sample = (matched.length > 0 ? matched : memory.importedQuestions).slice(0, 6);
    if (!sample.length) return undefined;
    return sample
      .map(
        (q) =>
          `- [${q.provaOrigem} | Q${q.numeroQuestao} | Vínculo: ${q.vinculoBruto || q.vinculoTipo}] ${q.assuntoCobrado} (Habilidade: ${q.habilidadeExigida}; Código: ${q.codigoEdital || 'N/I'})`
      )
      .join('\n');
  };

  // ==================== SUB-TAB 1: PROFESSOR IA (9 PASSOS) ====================
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState<CesgranrioProfessorLesson | null>(null);
  const [lessonTestChoice, setLessonTestChoice] = useState<string | null>(null);
  const [lessonTestRevealed, setLessonTestRevealed] = useState<boolean>(false);

  const handleGenerateLesson = async (overrideTopicId?: string) => {
    const match = overrideTopicId
      ? profileTopicMatches.find((m) => m.topic.id === overrideTopicId) || selectedMatch
      : selectedMatch;
    if (!match) return;

    setLessonLoading(true);
    setLessonError(null);
    setLessonTestChoice(null);
    setLessonTestRevealed(false);

    try {
      const lesson = await requestCesgranrioLesson({
        systemInstruction: buildCesgranrioSystemInstruction(activeProfile),
        topicTitle: match.topic.subtopic,
        codigoEdital: match.profileCode,
        macroName: getMacroLabel(match.topic.macroArea),
        resumoEstrategico: match.topic.resumoEstrategico,
        bancaPattern: `Foco ${profileSpec.shortTitle}; palavras-chave: ${match.topic.palavrasChave.join(', ')}`,
        keyTrap: match.topic.palavrasChave.slice(0, 4).join(', '),
        isIntersection: match.isIntersection,
        otherProfileCode: match.otherProfileCode,
        customContext: professorCustomContext.trim() || undefined,
        realQuestionsContext: getRelevantCsvContext(match.topic),
      });
      setLessonData(lesson);
    } catch (err) {
      setLessonError(
        err instanceof Error ? err.message : 'Não foi possível gerar a aula no momento.'
      );
    } finally {
      setLessonLoading(false);
    }
  };

  const handleAnswerLessonTest = () => {
    if (!lessonData || !lessonTestChoice || lessonTestRevealed) return;
    setLessonTestRevealed(true);
    const q = lessonData.passo9QuestaoTeste;
    const isCorrect = lessonTestChoice === q.gabaritoLetra;
    if (selectedMatch) {
      const updated = recordTopicPracticeOutcome({
        topicId: selectedMatch.topic.id,
        isCorrect,
        skill: q.habilidadeAvaliada,
        trap: q.pegadinhaPrincipal,
      });
      setMemory(updated);
    }
  };

  // ==================== SUB-TAB 2: SIMULADO & QUESTÕES A–E ====================
  const [simMode, setSimMode] = useState<'topic' | 'pareto_critico' | 'meus_erros'>('topic');
  const [simQty, setSimQty] = useState<1 | 3 | 5>(3);
  const [simDifficulty, setSimDifficulty] = useState<DifficultyLevel>(2);
  const [simSkillFocus, setSimSkillFocus] = useState<string>('automatica');
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simQuestions, setSimQuestions] = useState<CesgranrioGeneratedQuestion[]>([]);
  const [simTopicMap, setSimTopicMap] = useState<Record<number, EditalTopic>>({});
  const [simChoices, setSimChoices] = useState<Record<number, string>>({});
  const [simRevealed, setSimRevealed] = useState<Record<number, boolean>>({});
  const [savedErrorIndices, setSavedErrorIndices] = useState<Record<string, boolean>>({});

  const handleGenerateQuestions = async () => {
    setSimLoading(true);
    setSimError(null);
    setSimChoices({});
    setSimRevealed({});
    setSavedErrorIndices({});

    try {
      let chosenMatches = [];
      if (simMode === 'topic' && selectedMatch) {
        chosenMatches = [selectedMatch];
      } else if (simMode === 'pareto_critico') {
        chosenMatches = profileTopicMatches
          .filter((m) => m.topic.priority === 'CRÍTICA')
          .slice(0, 6);
      } else {
        // Focus on weak topics from topicStats or criticals
        const rankedWeak = [...profileTopicMatches].sort((a, b) => {
          const sa = memory.topicStats[a.topic.id];
          const sb = memory.topicStats[b.topic.id];
          const accA = sa && sa.attempts > 0 ? sa.correct / sa.attempts : 0.65;
          const accB = sb && sb.attempts > 0 ? sb.correct / sb.attempts : 0.65;
          return accA - accB;
        });
        chosenMatches = rankedWeak.slice(0, 5);
      }

      if (chosenMatches.length === 0) {
        chosenMatches = profileTopicMatches.slice(0, 3);
      }

      const topicsPayload = chosenMatches.map((m) => ({
        id: m.topic.id,
        subtopic: m.topic.subtopic,
        macroName: getMacroLabel(m.topic.macroArea),
        codigoEdital: m.profileCode,
        isIntersection: m.isIntersection,
        otherProfileCode: m.otherProfileCode,
        resumoEstrategico: m.topic.resumoEstrategico,
        keyTrap: m.topic.palavrasChave.slice(0, 5).join(', '),
      }));

      const questions = await requestCesgranrioQuestions({
        systemInstruction: buildCesgranrioSystemInstruction(activeProfile),
        profileId: activeProfile,
        topics: topicsPayload,
        quantity: simQty,
        difficultyLevel: simDifficulty,
        skillFocus: simSkillFocus === 'automatica' ? undefined : simSkillFocus,
        errorFocus: simumFocusContext(simMode, simuladoErrorFocus, chosenMatches, memory),
        realQuestionsContext: getRelevantCsvContext(chosenMatches[0]?.topic),
      });

      const mapping: Record<number, EditalTopic> = {};
      questions.forEach((q, idx) => {
        const matchedByCode = chosenMatches.find(
          (m) =>
            m.profileCode.toLowerCase() === (q.codigoEdital || '').toLowerCase() ||
            (q.codigoEdital || '').toLowerCase().includes(m.profileCode.toLowerCase())
        );
        mapping[idx] = matchedByCode?.topic || chosenMatches[idx % chosenMatches.length].topic;
      });

      setSimTopicMap(mapping);
      setSimQuestions(questions);
    } catch (err) {
      setSimError(
        err instanceof Error ? err.message : 'Erro ao gerar questões no padrão CESGRANRIO.'
      );
    } finally {
      setSimLoading(false);
    }
  };

  function simumFocusContext(
    mode: 'topic' | 'pareto_critico' | 'meus_erros',
    userFocus: string,
    matches: typeof profileTopicMatches,
    mem: CesgranrioPedagogicalMemory
  ): string | undefined {
    const parts: string[] = [];
    if (userFocus.trim()) parts.push(userFocus.trim());
    if (mode === 'meus_erros') {
      const traps = matches.flatMap((m) => mem.topicStats[m.topic.id]?.missedTraps || []);
      if (traps.length > 0) parts.push(`Pegadinhas já erradas: ${traps.slice(0, 4).join('; ')}`);
    }
    return parts.length > 0 ? parts.join(' | ') : undefined;
  }

  const handleRevealQuestion = (idx: number) => {
    const q = simQuestions[idx];
    const choice = simChoices[idx];
    if (!q || !choice || simRevealed[idx]) return;

    setSimRevealed((prev) => ({ ...prev, [idx]: true }));
    const topic = simTopicMap[idx];
    if (topic) {
      const updated = recordTopicPracticeOutcome({
        topicId: topic.id,
        isCorrect: choice === q.gabaritoLetra,
        skill: q.habilidadeAvaliada,
        trap: q.pegadinhaPrincipal,
      });
      setMemory(updated);
    }
  };

  const handleSaveQuestionToCaderno = (
    key: string,
    q: CesgranrioGeneratedQuestion,
    topic?: EditalTopic,
    userChoice?: string | null
  ) => {
    const macroArea = topic?.macroArea || 'quimica_processos';
    const origem: OrigemEdital = topic?.origem || (activeProfile === 'operacao_jr' ? 'petrobras' : 'transpetro');
    appendErrorToCadernoStorage({
      disciplina: MACRO_TO_ERROR_DISCIPLINE[macroArea],
      origem,
      subtopico: topic ? `${topic.subtopic} (${q.codigoEdital})` : q.codigoEdital,
      enunciadoResumido: `[${q.rotuloTipo || 'QUESTÃO INÉDITA'} · ${q.nivelNome}] ${formatQuestionSummaryForError(q)}`,
      motivoErro: userChoice && userChoice !== q.gabaritoLetra
        ? `Marquei (${userChoice}), gabarito (${q.gabaritoLetra}). Pegadinha: ${q.pegadinhaPrincipal}`
        : `Revisão preventiva — Pegadinha CESGRANRIO: ${q.pegadinhaPrincipal}`,
      regraCorreta: `${q.conhecimentoIndispensavel} — ${q.raciocinioResolucao}`,
    });
    setSavedErrorIndices((prev) => ({ ...prev, [key]: true }));
    showToast('Item salvo no Caderno de Erros.');
  };

  // ==================== SUB-TAB 3: QUESTÕES REAIS & CSV ====================
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvPasteText, setCsvPasteText] = useState<string>('');
  const [showCsvPasteBox, setShowCsvPasteBox] = useState<boolean>(false);
  const [csvSearch, setCsvSearch] = useState<string>('');
  const [csvVinculoFilter, setCsvVinculoFilter] = useState<'todos' | 'direto' | 'correlato'>('todos');
  const [realQuestionInput, setRealQuestionInput] = useState<string>('');
  const [selectedCsvRecord, setSelectedCsvRecord] = useState<RealExamQuestionRecord | undefined>(undefined);
  const [realAnalysisLoading, setRealAnalysisLoading] = useState<boolean>(false);
  const [realAnalysisError, setRealAnalysisError] = useState<string | null>(null);
  const [realAnalysisResult, setRealAnalysisResult] = useState<CesgranrioRealQuestionAnalysis | null>(null);

  const handleCsvTextImport = (text: string, fileName: string) => {
    const result = parseBaseQuestoesCsv(text);
    if (result.records.length === 0) {
      showToast(result.errors[0] || 'Nenhuma questão válida encontrada no CSV.');
      return;
    }
    const next = saveCesgranrioMemory({
      ...memory,
      importedCsvFileName: fileName,
      importedAt: new Date().toLocaleString('pt-BR'),
      importedQuestions: result.records,
    });
    setMemory(next);
    setShowCsvPasteBox(false);
    setCsvPasteText('');
    showToast(`${result.records.length} questões reais indexadas (${fileName}).`);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleCsvTextImport(String(reader.result || ''), file.name);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const filteredCsvQuestions = useMemo(() => {
    const q = csvSearch.trim().toLowerCase();
    return memory.importedQuestions.filter((rec) => {
      const matchesVinculo =
        csvVinculoFilter === 'todos' || rec.vinculoTipo === csvVinculoFilter;
      const matchesSearch =
        !q ||
        rec.assuntoCobrado.toLowerCase().includes(q) ||
        rec.provaOrigem.toLowerCase().includes(q) ||
        rec.codigoEdital.toLowerCase().includes(q) ||
        rec.habilidadeExigida.toLowerCase().includes(q) ||
        rec.conteudoSecundario.toLowerCase().includes(q);
      return matchesVinculo && matchesSearch;
    });
  }, [memory.importedQuestions, csvSearch, csvVinculoFilter]);

  const handleAnalyzeRealQuestion = async (recordOverride?: RealExamQuestionRecord) => {
    const targetRecord = recordOverride || selectedCsvRecord;
    const textToAnalyze = realQuestionInput.trim();
    if (!targetRecord && !textToAnalyze) {
      setRealAnalysisError('Cole o enunciado da questão real ou selecione uma questão da base CSV.');
      return;
    }
    setRealAnalysisLoading(true);
    setRealAnalysisError(null);

    try {
      const profileSummary = profileTopicMatches
        .slice(0, 18)
        .map((m) => `${m.profileCode}: ${m.topic.subtopic}`)
        .join(' | ');

      const analysis = await requestRealQuestionAnalysis({
        systemInstruction: buildCesgranrioSystemInstruction(activeProfile),
        questionText: textToAnalyze || undefined,
        csvMetadata: targetRecord,
        profileTopicsSummary: profileSummary,
      });
      setRealAnalysisResult(analysis);
    } catch (err) {
      setRealAnalysisError(
        err instanceof Error ? err.message : 'Erro ao analisar a questão real.'
      );
    } finally {
      setRealAnalysisLoading(false);
    }
  };

  // ==================== SUB-TAB 4: PARETO x DESEMPENHO, MEMÓRIA & PARES ====================
  const [obsProva, setObsProva] = useState<string>(profileSpec.provaReferenciaPrincipal);
  const [obsCodigo, setObsCodigo] = useState<string>('');
  const [obsTexto, setObsTexto] = useState<string>('');

  const handleAddObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsTexto.trim()) return;
    const next = saveCesgranrioMemory({
      ...memory,
      customObservations: [
        {
          id: `obs-${Date.now()}`,
          createdAt: new Date().toLocaleDateString('pt-BR'),
          profileId: activeProfile,
          provaOrigem: obsProva.trim() || profileSpec.provaReferenciaPrincipal,
          codigoEdital: obsCodigo.trim() || undefined,
          observacao: obsTexto.trim(),
        },
        ...memory.customObservations,
      ],
    });
    setMemory(next);
    setObsTexto('');
    setObsCodigo('');
    showToast('Padrão observado registrado na memória pedagógica.');
  };

  const handleDeleteObservation = (id: string) => {
    const next = saveCesgranrioMemory({
      ...memory,
      customObservations: memory.customObservations.filter((o) => o.id !== id),
    });
    setMemory(next);
  };

  // Pares Conceituais Irmãos state
  const [pairSearch, setPairSearch] = useState<string>('');
  const [pairDiscipline, setPairDiscipline] = useState<string>('todas');
  const [pairOrigin, setPairOrigin] = useState<'todas' | OrigemEdital>('todas');
  const [openPairId, setOpenPairId] = useState<string | null>(null);

  const orderedParesBase = useMemo(
    () => sortItemsByCodigoRefPareto(PARES_CONCEITUAIS_IRMAOS),
    []
  );
  const pairDisciplines = useMemo(
    () => Array.from(new Set(orderedParesBase.map((p) => p.discipline))),
    [orderedParesBase]
  );
  const filteredPares = useMemo(() => {
    const q = pairSearch.toLowerCase();
    return orderedParesBase.filter((par) => {
      const matchesSearch =
        !q ||
        par.conceptA.toLowerCase().includes(q) ||
        par.conceptB.toLowerCase().includes(q) ||
        par.difference.toLowerCase().includes(q) ||
        par.bancaTrap.toLowerCase().includes(q) ||
        (par.codigoRef && par.codigoRef.toLowerCase().includes(q));
      const matchesDisc =
        pairDiscipline === 'todas' ||
        par.discipline.toLowerCase().includes(pairDiscipline.toLowerCase());
      const matchesOrigin = pairOrigin === 'todas' || par.origem === pairOrigin;
      return matchesSearch && matchesDisc && matchesOrigin;
    });
  }, [orderedParesBase, pairSearch, pairDiscipline, pairOrigin]);

  const totalAttempts = useMemo(
    () =>
      (Object.values(memory.topicStats) as TopicPracticeStats[]).reduce(
        (acc, s) => acc + s.attempts,
        0
      ),
    [memory.topicStats]
  );
  const totalCorrect = useMemo(
    () =>
      (Object.values(memory.topicStats) as TopicPracticeStats[]).reduce(
        (acc, s) => acc + s.correct,
        0
      ),
    [memory.topicStats]
  );

  // ==================== SHARED QUESTION RENDERER ====================
  const renderInteractiveQuestion = (params: {
    keyId: string;
    question: CesgranrioGeneratedQuestion;
    choice: string | null;
    onSelectChoice: (letra: string) => void;
    revealed: boolean;
    onReveal: () => void;
    topic?: EditalTopic;
  }) => {
    const { keyId, question, choice, onSelectChoice, revealed, onReveal, topic } = params;
    const isCorrect = revealed && choice === question.gabaritoLetra;
    const isSaved = Boolean(savedErrorIndices[keyId]);

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge tone="orange">{question.rotuloTipo || 'QUESTÃO INÉDITA'}</StatusBadge>
            <StatusBadge tone="neutral">
              Nível {question.nivelDificuldade} · {question.nivelNome}
            </StatusBadge>
            <StatusBadge tone="success">{question.habilidadeAvaliada}</StatusBadge>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-600">
            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {question.codigoEdital}
            </span>
            {question.intersecaoPerfis && (
              <span className="bg-[#E6F4EC] text-[#006837] px-2 py-0.5 rounded border border-[#008542]/20">
                {question.intersecaoPerfis}
              </span>
            )}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-medium whitespace-pre-line">
          {question.enunciado}
        </p>

        <div className="space-y-2" role="radiogroup" aria-label="Alternativas da questão">
          {question.alternativas.map((alt) => {
            const isSelected = choice === alt.letra;
            const isRightOption = alt.letra === question.gabaritoLetra;
            let rowClasses =
              'w-full text-left p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm transition-colors flex items-start gap-3 cursor-pointer ';

            if (!revealed) {
              rowClasses += isSelected
                ? 'bg-[#E6F4EC] border-[#008542] text-[#071F14]'
                : 'bg-[#F6F8F7] border-slate-200 hover:border-slate-300 text-slate-800';
            } else if (isRightOption) {
              rowClasses += 'bg-emerald-50 border-emerald-400 text-emerald-950';
            } else if (isSelected && !isRightOption) {
              rowClasses += 'bg-rose-50 border-rose-300 text-rose-950';
            } else {
              rowClasses += 'bg-slate-50 border-slate-200 text-slate-700';
            }

            return (
              <button
                key={alt.letra}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={revealed}
                onClick={() => onSelectChoice(alt.letra)}
                className={rowClasses}
              >
                <span
                  className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${
                    revealed && isRightOption
                      ? 'bg-[#008542] text-white border-[#008542]'
                      : revealed && isSelected && !isRightOption
                      ? 'bg-rose-600 text-white border-rose-600'
                      : isSelected
                      ? 'bg-[#071F14] text-[#FDB913] border-[#071F14]'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {alt.letra}
                </span>
                <span className="flex-1 leading-relaxed">{alt.texto}</span>
              </button>
            );
          })}
        </div>

        {!revealed ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <span className="text-[11px] text-slate-500">
              {choice
                ? `Alternativa (${choice}) selecionada. Confirme para ver a correção comentada.`
                : 'Selecione uma alternativa (A–E) para conferir o comentário.'}
            </span>
            <Button
              variant="primary"
              size="sm"
              disabled={!choice}
              onClick={onReveal}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Confirmar e Ver Correção Comentada
            </Button>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-fadeIn">
            {/* 1 & 2: Resultado + Gabarito */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                isCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                {isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {isCorrect
                    ? `Resposta correta! Gabarito oficial da questão: (${question.gabaritoLetra}).`
                    : `Você marcou (${choice}). A alternativa correta é (${question.gabaritoLetra}).`}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isSaved}
                onClick={() => handleSaveQuestionToCaderno(keyId, question, topic, choice)}
                leftIcon={<BookOpen className="w-3.5 h-3.5 text-[#006837]" aria-hidden="true" />}
              >
                {isSaved ? 'Salvo no Caderno' : 'Salvar no Caderno de Erros'}
              </Button>
            </div>

            {/* 3: Raciocínio necessário */}
            <div className="bg-[#F6F8F7] p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed space-y-1">
              <div className="font-bold text-[#006837]">
                Raciocínio Técnico Necessário (Caminho CESGRANRIO)
              </div>
              <p className="whitespace-pre-line">{question.raciocinioResolucao}</p>
            </div>

            {/* 4: Análise individual A–E */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900">
                Análise Individual das 5 Alternativas e Distratores
              </div>
              <div className="space-y-1.5">
                {question.alternativas.map((alt) => (
                  <div
                    key={alt.letra}
                    className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                      alt.letra === question.gabaritoLetra
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-slate-900">({alt.letra})</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          alt.letra === question.gabaritoLetra
                            ? 'bg-emerald-200/80 text-emerald-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {alt.letra === question.gabaritoLetra
                          ? 'Correta'
                          : alt.tipoDistrator || 'Distrator'}
                      </span>
                    </div>
                    <p>{alt.justificativa}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 5–8: Pegadinha, Conceito Indispensável & Recomendação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-orange-50/80 p-3 rounded-xl border border-orange-200 text-orange-950 space-y-1">
                <div className="font-bold text-orange-900">Pegadinha Identificada</div>
                <p>{question.pegadinhaPrincipal}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-800 space-y-1">
                <div className="font-bold text-slate-900">Conhecimento Indispensável</div>
                <p>{question.conhecimentoIndispensavel}</p>
              </div>
              <div className="bg-[#E6F4EC]/70 p-3 rounded-xl border border-[#008542]/20 text-[#071F14] space-y-1">
                <div className="font-bold text-[#006837]">Recomendação de Revisão</div>
                <p>{question.recomendacaoRevisao}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {toastMsg && (
        <ToastBanner
          message={toastMsg}
          tone="success"
          onDismiss={() => setToastMsg(null)}
        />
      )}

      {/* Header + Profile Separation */}
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-500">
              <StatusBadge tone="success">Exclusivo Fundação CESGRANRIO</StatusBadge>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span>Múltipla Escolha A–E</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="tabular-nums">
                {intersectionSummary.intersection} tópicos em interseção entre perfis
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              {BANCA_PROFILE.title}
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-3xl leading-relaxed">
              {BANCA_PROFILE.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDnaMatrix((v) => !v)}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-[#008542]" aria-hidden="true" />}
              rightIcon={
                showDnaMatrix ? (
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                )
              }
            >
              {showDnaMatrix ? 'Ocultar Matriz DNA & Regras' : 'Ver Matriz DNA & Precisão'}
            </Button>
          </div>
        </div>

        {/* Strict Separation Profile Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {(['operacao_jr', 'dutos_terminais'] as CesgranrioProfileId[]).map((pid) => {
            const spec = CESGRANRIO_PROFILES[pid];
            const isActive = activeProfile === pid;
            const exclusiveCount =
              pid === 'operacao_jr'
                ? intersectionSummary.exclusiveOperacao
                : intersectionSummary.exclusiveDutos;

            return (
              <button
                key={pid}
                type="button"
                onClick={() => handleSelectProfile(pid)}
                aria-pressed={isActive}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  isActive
                    ? 'bg-[#071F14] text-white border-[#071F14] shadow-sm'
                    : 'bg-[#F6F8F7] text-slate-800 border-slate-200 hover:border-[#008542]/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                        isActive
                          ? 'bg-[#008542] text-white'
                          : 'bg-white text-[#006837] border border-slate-200'
                      }`}
                    >
                      {isActive ? 'PERFIL ATIVO' : 'SEPARADO'}
                    </span>
                    <span className="text-sm font-display font-bold">{spec.title}</span>
                  </div>
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      isActive ? 'text-[#FDB913]' : 'text-slate-600'
                    }`}
                  >
                    Ref. {spec.anoReferencia} · {spec.totalTopicosNoPerfil} tópicos
                  </span>
                </div>

                <div
                  className={`text-xs leading-relaxed ${
                    isActive ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  <strong className={isActive ? 'text-white' : 'text-slate-800'}>
                    {spec.provaReferenciaPrincipal}:
                  </strong>{' '}
                  {spec.resumoEstilo}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {spec.distribuicaoHistorica.map((d) => (
                    <span
                      key={d.label}
                      className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded border ${
                        isActive
                          ? 'bg-white/10 border-white/15 text-slate-100'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      {d.label}
                      {typeof d.questoes === 'number' ? `: ${d.questoes}q` : ''}
                    </span>
                  ))}
                  <span
                    className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded ${
                      isActive
                        ? 'bg-[#FDB913]/20 text-[#FDB913]'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {intersectionSummary.intersection} interseção + {exclusiveCount} exclusivos
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Collapsible DNA Matrix */}
        {showDnaMatrix && (
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fadeIn">
            <div className="bg-[#F6F8F7] p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#006837]">
                10 Características da Fundação CESGRANRIO
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                {CESGRANRIO_CHARACTERISTICS.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono font-bold text-[#006837] tabular-nums shrink-0">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#F6F8F7] p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-800">
                10 Mecanismos de Distração Inteligente
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CESGRANRIO_DISTRACTOR_TYPES.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] leading-relaxed"
                  >
                    <div className="font-bold text-slate-900">{d.label}</div>
                    <div className="text-slate-600 mt-0.5">{d.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Classificação de Dificuldade &amp; Habilidades Avaliadas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CESGRANRIO_DIFFICULTY_LEVELS.map((lvl) => (
                  <div
                    key={lvl.level}
                    className="p-2.5 rounded-xl bg-[#F6F8F7] border border-slate-200 text-xs"
                  >
                    <div className="font-mono font-bold text-[#006837]">
                      {lvl.code} — {lvl.title}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{lvl.description}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CESGRANRIO_SKILLS.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Regras de Precisão Obrigatórias (Zero Alucinação)
              </h3>
              <ul className="space-y-1.5 text-xs text-amber-950 leading-relaxed">
                {CESGRANRIO_PRECISION_RULES.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono font-bold text-amber-800 shrink-0">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Sub-tab Navigation */}
        <div
          role="tablist"
          aria-label="Módulos do DNA CESGRANRIO"
          className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100"
        >
          {(
            [
              {
                id: 'professor',
                label: 'Professor IA (9 Passos)',
                icon: <Brain className="w-3.5 h-3.5" aria-hidden="true" />,
              },
              {
                id: 'questoes',
                label: 'Simulado & Questões (A–E)',
                icon: <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />,
              },
              {
                id: 'reais',
                label: `Questões Reais & CSV (${memory.importedQuestions.length})`,
                icon: <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />,
              },
              {
                id: 'pareto_pares',
                label: 'Pareto × Desempenho & Pares',
                icon: <Layers className="w-3.5 h-3.5" aria-hidden="true" />,
              },
            ] as const
          ).map((tab) => {
            const isSelected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer border ${
                  isSelected
                    ? 'bg-[#008542] text-white border-[#008542]'
                    : 'bg-[#F6F8F7] text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ==================== TAB 1: PROFESSOR IA (9 PASSOS) ==================== */}
      {activeSubTab === 'professor' && (
        <div className="space-y-5">
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-base sm:text-lg font-display font-bold text-slate-900">
                    Professor IA — Metodologia em 9 Passos ({profileSpec.shortTitle})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ensino estruturado por Feynman, analogias operacionais, comparações conceituais,
                    pegadinhas da CESGRANRIO, questão comentada e teste inédito A–E.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="select-professor-topic"
                      className="block text-[11px] font-bold text-slate-700 mb-1"
                    >
                      Tópico do Edital ({profileSpec.totalTopicosNoPerfil} itens ordenados por Pareto):
                    </label>
                    <select
                      id="select-professor-topic"
                      value={selectedMatch?.topic.id || ''}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                    >
                      {profileTopicMatches.map((m) => (
                        <option key={m.topic.id} value={m.topic.id}>
                          [{m.topic.priority}] {m.profileCode} — {m.topic.subtopic}
                          {m.isIntersection ? ' (Interseção)' : ' (Exclusivo do Perfil)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="input-professor-context"
                      className="block text-[11px] font-bold text-slate-700 mb-1"
                    >
                      Dúvida ou enfoque específico (opcional):
                    </label>
                    <input
                      id="input-professor-context"
                      type="text"
                      value={professorCustomContext}
                      onChange={(e) => setProfessorCustomContext(e.target.value)}
                      placeholder="Ex: diferença entre NPSHd e NPSHr, zero vivo 4–20 mA..."
                      className="w-full px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                    />
                  </div>
                </div>

                {selectedMatch && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <OriginBadge origem={selectedMatch.topic.origem} compact />
                    <StatusBadge tone="neutral">{selectedMatch.profileCode}</StatusBadge>
                    {selectedMatch.isIntersection ? (
                      <StatusBadge tone="success">
                        Interseção com outro perfil ({selectedMatch.otherProfileCode})
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="gold">Exclusivo {profileSpec.shortTitle}</StatusBadge>
                    )}
                    <span className="text-slate-600">{selectedMatch.topic.resumoEstrategico}</span>
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                size="md"
                disabled={lessonLoading || !selectedMatch}
                onClick={() => handleGenerateLesson()}
                leftIcon={
                  lessonLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Brain className="w-4 h-4" aria-hidden="true" />
                  )
                }
              >
                {lessonLoading ? 'Estruturando 9 Passos...' : 'Gerar Aula (9 Passos)'}
              </Button>
            </div>

            {lessonError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{lessonError}</span>
              </div>
            )}
          </Card>

          {lessonData ? (
            <div className="space-y-4">
              <Card padding="lg" className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono font-bold text-[#006837]">
                      SEQUÊNCIA DIDÁTICA CESGRANRIO · 9 PASSOS
                    </div>
                    <h4 className="text-lg font-display font-bold text-slate-900">
                      {lessonData.tituloAula}
                    </h4>
                  </div>
                  <StatusBadge tone="success">{lessonData.intersecaoNota}</StatusBadge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                  <div className="bg-[#F6F8F7] p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="font-bold text-[#006837] text-xs">
                      1. Fundamentação do Conceito
                    </div>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                      {lessonData.passo1Fundamentacao}
                    </p>
                  </div>

                  <div className="bg-[#F6F8F7] p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="font-bold text-[#006837] text-xs">
                      2. Analogia / Aplicação Prática (Feynman)
                    </div>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                      {lessonData.passo2AnalogiaPratica}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-900 text-xs">
                      3. Funcionamento e Mecanismo Envolvido
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {lessonData.passo3MecanismoFuncionamento}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-900 text-xs">4. Exemplos Técnicos</div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {lessonData.passo4ExemplosTecnicos.map((ex, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-mono font-bold text-[#006837]">#{i + 1}</span>
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Passo 5 */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900">
                    5. Conceitos que Não Podem ser Confundidos
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {lessonData.passo5NaoConfundir.map((pair, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1"
                      >
                        <div className="font-bold text-slate-900">
                          {pair.conceitoA} <span className="text-slate-400">×</span> {pair.conceitoB}
                        </div>
                        <p className="text-slate-700">{pair.diferencaChave}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Passos 6 e 7 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  <div className="bg-[#E6F4EC]/60 p-4 rounded-xl border border-[#008542]/20 space-y-1.5">
                    <div className="font-bold text-[#006837]">
                      6. Como a CESGRANRIO Cobra este Assunto
                    </div>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                      {lessonData.passo6ComoCesgranrioCobra}
                    </p>
                  </div>

                  <div className="bg-orange-50/80 p-4 rounded-xl border border-orange-200 space-y-1.5">
                    <div className="font-bold text-orange-900">
                      7. Principais Pegadinhas e Distratores
                    </div>
                    <ul className="space-y-1 text-orange-950">
                      {lessonData.passo7PegadinhasPrincipais.map((p, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Passo 8 */}
                <div className="bg-[#071F14] text-slate-100 p-4 sm:p-5 rounded-2xl space-y-2.5 text-xs sm:text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#FDB913]">
                      8. Questão Comentada Passo a Passo
                    </span>
                    <span className="text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded">
                      {lessonData.passo8QuestaoComentada.rotulo || 'QUESTÃO INÉDITA COMENTADA'}
                    </span>
                  </div>
                  <p className="text-white leading-relaxed whitespace-pre-line">
                    {lessonData.passo8QuestaoComentada.enunciado}
                  </p>
                  <div className="pt-2 border-t border-white/15 space-y-1 text-xs text-slate-200 leading-relaxed">
                    <strong className="text-emerald-300">Resolução:</strong>{' '}
                    {lessonData.passo8QuestaoComentada.resolucaoPassoAPasso}
                  </div>
                  <div className="text-xs text-[#FDB913]">
                    <strong>Conclusão técnica:</strong>{' '}
                    {lessonData.passo8QuestaoComentada.conclusaoTecnica}
                  </div>
                </div>
              </Card>

              {/* Passo 9 */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 px-1">
                  9. Questão Inédita para Testar a Aprendizagem (A–E)
                </div>
                {renderInteractiveQuestion({
                  keyId: `lesson-step9-${selectedMatch?.topic.id || 'topic'}`,
                  question: lessonData.passo9QuestaoTeste,
                  choice: lessonTestChoice,
                  onSelectChoice: setLessonTestChoice,
                  revealed: lessonTestRevealed,
                  onReveal: handleAnswerLessonTest,
                  topic: selectedMatch?.topic,
                })}
              </div>
            </div>
          ) : (
            <Card padding="lg">
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Sequência fixa executada pelo Professor IA:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CESGRANRIO_PROFESSOR_9_STEPS.map((s) => (
                    <div
                      key={s}
                      className="p-2.5 rounded-xl bg-[#F6F8F7] border border-slate-200 text-xs text-slate-700"
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ==================== TAB 2: SIMULADO & QUESTÕES A–E ==================== */}
      {activeSubTab === 'questoes' && (
        <div className="space-y-5">
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-display font-bold text-slate-900">
                  Elaborador de Questões &amp; Simulado — Padrão CESGRANRIO (A–E)
                </h3>
                <p className="text-xs text-slate-500">
                  5 alternativas plausíveis com distratores reais de raciocínio, cálculos limpos sem
                  calculadora e correção comentada alternativa por alternativa.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                disabled={simLoading}
                onClick={handleGenerateQuestions}
                leftIcon={
                  simLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                  )
                }
              >
                {simLoading ? 'Elaborando Questões...' : `Gerar ${simQty} Questão(ões) A–E`}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="select-sim-mode"
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Estratégia de Seleção:
                </label>
                <select
                  id="select-sim-mode"
                  value={simMode}
                  onChange={(e) =>
                    setSimMode(e.target.value as 'topic' | 'pareto_critico' | 'meus_erros')
                  }
                  className="w-full px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                >
                  <option value="topic">Tópico específico do edital</option>
                  <option value="pareto_critico">Núcleo Pareto Crítico ({profileSpec.shortTitle})</option>
                  <option value="meus_erros">Foco nos meus erros / lacunas</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="select-sim-level"
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Nível de Dificuldade:
                </label>
                <select
                  id="select-sim-level"
                  value={simDifficulty}
                  onChange={(e) => setSimDifficulty(Number(e.target.value) as DifficultyLevel)}
                  className="w-full px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                >
                  {CESGRANRIO_DIFFICULTY_LEVELS.map((l) => (
                    <option key={l.level} value={l.level}>
                      {l.code} — {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="select-sim-skill"
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Habilidade Avaliada:
                </label>
                <select
                  id="select-sim-skill"
                  value={simSkillFocus}
                  onChange={(e) => setSimSkillFocus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                >
                  <option value="automatica">Automática (adequada ao tópico)</option>
                  {CESGRANRIO_SKILLS.map((sk) => (
                    <option key={sk} value={sk}>
                      {sk}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-700 mb-1">
                  Quantidade de Questões:
                </span>
                <div className="flex items-center gap-1.5">
                  {([1, 3, 5] as const).map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setSimQty(qty)}
                      className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer ${
                        simQty === qty
                          ? 'bg-[#071F14] text-[#FDB913] border-[#071F14]'
                          : 'bg-[#F6F8F7] text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {qty}q
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {simMode === 'topic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="select-sim-topic"
                    className="block text-[11px] font-bold text-slate-700 mb-1"
                  >
                    Tópico Alvo ({profileSpec.shortTitle}):
                  </label>
                  <select
                    id="select-sim-topic"
                    value={selectedMatch?.topic.id || ''}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                  >
                    {profileTopicMatches.map((m) => (
                      <option key={m.topic.id} value={m.topic.id}>
                        [{m.topic.priority}] {m.profileCode} — {m.topic.subtopic}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="input-sim-focus"
                    className="block text-[11px] font-bold text-slate-700 mb-1"
                  >
                    Foco extra (fórmula, equipamento ou erro a atacar):
                  </label>
                  <input
                    id="input-sim-focus"
                    type="text"
                    value={simuladoErrorFocus}
                    onChange={(e) => setSimuladoErrorFocus(e.target.value)}
                    placeholder="Ex: conversão °C para Kelvin ou válvula falha fecha..."
                    className="w-full px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                  />
                </div>
              </div>
            )}

            {simError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{simError}</span>
              </div>
            )}
          </Card>

          {simQuestions.length > 0 ? (
            <div className="space-y-4">
              {simQuestions.map((q, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="text-[11px] font-mono font-bold text-slate-500 px-1 tabular-nums">
                    QUESTÃO {idx + 1} DE {simQuestions.length} ·{' '}
                    {simTopicMap[idx]?.subtopic || q.codigoEdital}
                  </div>
                  {renderInteractiveQuestion({
                    keyId: `sim-${idx}-${q.codigoEdital}`,
                    question: q,
                    choice: simChoices[idx] || null,
                    onSelectChoice: (letra) =>
                      setSimChoices((prev) => ({ ...prev, [idx]: letra })),
                    revealed: Boolean(simRevealed[idx]),
                    onReveal: () => handleRevealQuestion(idx),
                    topic: simTopicMap[idx],
                  })}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhum simulado gerado nesta sessão"
              description="Escolha o tópico ou estratégia Pareto acima e clique em Gerar Questões A–E no padrão CESGRANRIO."
            />
          )}
        </div>
      )}

      {/* ==================== TAB 3: QUESTÕES REAIS & CSV ==================== */}
      {activeSubTab === 'reais' && (
        <div className="space-y-5">
          {/* CSV Importer */}
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-display font-bold text-slate-900">
                  Base de Questões Reais (`Base_Questoes_Pareto.csv`)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Importe seu CSV oficial para indexar questões reais por prova, banca, número,
                  página, assunto efetivamente cobrado, habilidade exigida, código do edital e vínculo
                  (direto ou correlato).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => csvFileInputRef.current?.click()}
                  leftIcon={<Upload className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Importar CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCsvPasteBox((v) => !v)}
                >
                  {showCsvPasteBox ? 'Fechar Texto CSV' : 'Colar Conteúdo CSV'}
                </Button>
              </div>
            </div>

            {showCsvPasteBox && (
              <div className="space-y-2 p-3.5 rounded-xl bg-[#F6F8F7] border border-slate-200">
                <label
                  htmlFor="textarea-csv-paste"
                  className="block text-xs font-bold text-slate-800"
                >
                  Cole as linhas do arquivo `Base_Questoes_Pareto.csv` (com cabeçalho):
                </label>
                <textarea
                  id="textarea-csv-paste"
                  rows={4}
                  value={csvPasteText}
                  onChange={(e) => setCsvPasteText(e.target.value)}
                  placeholder="Prova de origem;Banca;Número da questão;Página do PDF;Assunto efetivamente cobrado;Habilidade exigida;Conteúdo secundário;Código do edital;Vínculo direto ou correlato"
                  className="w-full p-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20"
                />
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCsvTextImport(csvPasteText, 'Base_Questoes_Pareto_colado.csv')}
                  >
                    Processar CSV
                  </Button>
                </div>
              </div>
            )}

            {memory.importedQuestions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs text-slate-600 tabular-nums">
                    Arquivo: <strong>{memory.importedCsvFileName || 'CSV importado'}</strong> ·{' '}
                    <strong>{filteredCsvQuestions.length}</strong> de{' '}
                    <strong>{memory.importedQuestions.length}</strong> questões exibidas
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Filtrar vínculo"
                      value={csvVinculoFilter}
                      onChange={(e) =>
                        setCsvVinculoFilter(e.target.value as 'todos' | 'direto' | 'correlato')
                      }
                      className="px-2.5 py-1.5 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-700"
                    >
                      <option value="todos">Vínculo: Todos</option>
                      <option value="direto">Apenas Direto</option>
                      <option value="correlato">Apenas Correlato</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Filtrar prova, código ou assunto..."
                      value={csvSearch}
                      onChange={(e) => setCsvSearch(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <th className="p-2.5">Prova / Banca</th>
                        <th className="p-2.5">Q / Pág.</th>
                        <th className="p-2.5">Assunto Cobrado</th>
                        <th className="p-2.5">Habilidade</th>
                        <th className="p-2.5">Código / Vínculo</th>
                        <th className="p-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredCsvQuestions.slice(0, 40).map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium text-slate-900">
                            <div>{rec.provaOrigem}</div>
                            <div className="text-[11px] text-slate-500">{rec.banca}</div>
                          </td>
                          <td className="p-2.5 font-mono tabular-nums text-slate-700">
                            Q{rec.numeroQuestao}
                            {rec.paginaPdf ? ` · p.${rec.paginaPdf}` : ''}
                          </td>
                          <td className="p-2.5 text-slate-800">
                            <div className="font-semibold">{rec.assuntoCobrado}</div>
                            {rec.conteudoSecundario && (
                              <div className="text-[11px] text-slate-500">
                                Sec.: {rec.conteudoSecundario}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-700">{rec.habilidadeExigida}</td>
                          <td className="p-2.5">
                            <div className="font-mono text-[11px] text-slate-700">
                              {rec.codigoEdital || '—'}
                            </div>
                            <span
                              className={`inline-block mt-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                rec.vinculoTipo === 'direto'
                                  ? 'bg-[#E6F4EC] text-[#006837]'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              {rec.vinculoBruto || rec.vinculoTipo}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCsvRecord(rec);
                                handleAnalyzeRealQuestion(rec);
                              }}
                            >
                              Analisar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F6F8F7] border border-slate-200 text-xs text-slate-600">
                Nenhuma base `Base_Questoes_Pareto.csv` carregada ainda. Clique em{' '}
                <strong>Importar CSV</strong> acima quando quiser indexar as provas reais da
                Transpetro 2018 e 2023.1.
              </div>
            )}
          </Card>

          {/* Real Question Analyzer */}
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-display font-bold text-slate-900">
                  Analisador de Questão Real (CESGRANRIO)
                </h3>
                <p className="text-xs text-slate-500">
                  Cole qualquer questão oficial (Transpetro 2018, Transpetro 2023.1 ou simulado real)
                  para extrair habilidade, lógica dos distratores, conceito indispensável e variações.
                </p>
              </div>
              {selectedCsvRecord && (
                <StatusBadge tone="success">
                  Vinculada: {selectedCsvRecord.provaOrigem} · Q{selectedCsvRecord.numeroQuestao}
                </StatusBadge>
              )}
            </div>

            <textarea
              rows={5}
              value={realQuestionInput}
              onChange={(e) => setRealQuestionInput(e.target.value)}
              placeholder="Cole aqui o enunciado e as 5 alternativas (A–E) da questão real da CESGRANRIO..."
              className="w-full p-3 text-xs sm:text-sm bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              {selectedCsvRecord ? (
                <button
                  type="button"
                  onClick={() => setSelectedCsvRecord(undefined)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Desvincular registro CSV selecionado
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">
                  Rotulada obrigatoriamente como QUESTÃO REAL.
                </span>
              )}

              <Button
                variant="primary"
                size="sm"
                disabled={realAnalysisLoading}
                onClick={() => handleAnalyzeRealQuestion()}
                leftIcon={
                  realAnalysisLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                  )
                }
              >
                {realAnalysisLoading ? 'Analisando Questão Real...' : 'Analisar Questão Real'}
              </Button>
            </div>

            {realAnalysisError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                {realAnalysisError}
              </div>
            )}

            {realAnalysisResult && (
              <div className="pt-4 border-t border-slate-200 space-y-3 animate-fadeIn text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="success">{realAnalysisResult.rotuloTipo || 'QUESTÃO REAL'}</StatusBadge>
                  <StatusBadge tone="neutral">{realAnalysisResult.nivelDificuldade}</StatusBadge>
                  <StatusBadge tone="gold">{realAnalysisResult.habilidadeExigida}</StatusBadge>
                </div>
                <p className="text-[11px] text-slate-500">{realAnalysisResult.avisoPrecisaoBanca}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-[#F6F8F7] p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-[#006837]">1. Conteúdo Efetivamente Cobrado</div>
                    <p className="text-slate-800">{realAnalysisResult.conteudoCobrado}</p>
                  </div>
                  <div className="bg-[#F6F8F7] p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-[#006837]">2. Conceito Indispensável</div>
                    <p className="text-slate-800">{realAnalysisResult.conceitoIndispensavel}</p>
                  </div>
                  <div className="bg-orange-50/80 p-3.5 rounded-xl border border-orange-200 space-y-1">
                    <div className="font-bold text-orange-900">3. Lógica dos Distratores</div>
                    <p className="text-orange-950">{realAnalysisResult.logicaDistratores}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900">4. Relação com o Edital ({profileSpec.shortTitle})</div>
                    <p className="text-slate-700">{realAnalysisResult.relacaoComEdital}</p>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900">
                    5. Conhecimentos Secundários &amp; Variação Possível de Cobrança
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {realAnalysisResult.conhecimentosSecundarios.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-700 pt-1">{realAnalysisResult.variacaoDeCobrancaPossivel}</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==================== TAB 4: PARETO x DESEMPENHO, MEMÓRIA & PARES ==================== */}
      {activeSubTab === 'pareto_pares' && (
        <div className="space-y-6">
          {/* Pareto Recursivo x Desempenho */}
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-display font-bold text-slate-900">
                  Inteligência Cruzada: Pareto × Edital × Desempenho ({profileSpec.shortTitle})
                </h3>
                <p className="text-xs text-slate-500">
                  Cruzamento em tempo real entre prioridade Pareto, interseção entre perfis, questões
                  reais importadas no CSV e seu histórico de acertos no treinamento CESGRANRIO.
                </p>
              </div>
              <div className="text-xs font-mono tabular-nums bg-[#F6F8F7] px-3 py-1.5 rounded-xl border border-slate-200">
                Desempenho acumulado: <strong>{totalCorrect}</strong>/{totalAttempts}{' '}
                {totalAttempts > 0 ? `(${Math.round((totalCorrect / totalAttempts) * 100)}%)` : ''}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="p-2.5">Prioridade</th>
                    <th className="p-2.5">Código / Tópico</th>
                    <th className="p-2.5">Interseção</th>
                    <th className="p-2.5">CSV Real</th>
                    <th className="p-2.5">Desempenho</th>
                    <th className="p-2.5 text-right">Treino Rápido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {profileTopicMatches.map((m) => {
                    const stats = memory.topicStats[m.topic.id];
                    const pct =
                      stats && stats.attempts > 0
                        ? Math.round((stats.correct / stats.attempts) * 100)
                        : null;
                    const csvCount = memory.importedQuestions.filter((q) => {
                      const qc = (q.codigoEdital || '').toLowerCase();
                      const pc = m.profileCode.toLowerCase();
                      return qc && (qc.includes(pc) || pc.includes(qc));
                    }).length;
                    const prio = getSyllabusTopicParetoPriority(m.topic);

                    return (
                      <tr key={m.topic.id} className="hover:bg-slate-50">
                        <td className="p-2.5">
                          <StatusBadge
                            tone={
                              prio === 'CRÍTICA' ? 'orange' : prio === 'ALTA' ? 'success' : 'neutral'
                            }
                          >
                            {prio}
                          </StatusBadge>
                        </td>
                        <td className="p-2.5">
                          <div className="font-mono text-[11px] text-slate-500">{m.profileCode}</div>
                          <div className="font-semibold text-slate-900">{m.topic.subtopic}</div>
                        </td>
                        <td className="p-2.5">
                          {m.isIntersection ? (
                            <span className="text-[11px] font-semibold text-[#006837]">
                              Comum ({m.otherProfileCode})
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">Exclusivo</span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono tabular-nums text-slate-700">{csvCount}q</td>
                        <td className="p-2.5 font-mono tabular-nums">
                          {stats ? (
                            <span
                              className={
                                pct !== null && pct >= 75
                                  ? 'text-[#006837] font-bold'
                                  : 'text-orange-700 font-bold'
                              }
                            >
                              {stats.correct}/{stats.attempts} ({pct}%)
                            </span>
                          ) : (
                            <span className="text-slate-400">Não praticado</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTopicId(m.topic.id);
                                setActiveSubTab('professor');
                              }}
                            >
                              Aula
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTopicId(m.topic.id);
                                setSimMode('topic');
                                setActiveSubTab('questoes');
                              }}
                            >
                              Questões
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Persistent Pedagogical Memory */}
          <Card padding="lg" className="space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-display font-bold text-slate-900">
                Memória Pedagógica Permanente da Banca
              </h3>
              <p className="text-xs text-slate-500">
                Registre padrões reais observados nas provas da CESGRANRIO (salvo automaticamente no
                JSON local e sincronizado com seu Google Drive).
              </p>
            </div>

            <form onSubmit={handleAddObservation} className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <input
                type="text"
                value={obsProva}
                onChange={(e) => setObsProva(e.target.value)}
                placeholder="Prova de referência"
                className="px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl"
              />
              <input
                type="text"
                value={obsCodigo}
                onChange={(e) => setObsCodigo(e.target.value)}
                placeholder="Código edital (opcional)"
                className="px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl"
              />
              <input
                type="text"
                value={obsTexto}
                onChange={(e) => setObsTexto(e.target.value)}
                placeholder="Padrão observado (ex: cobra conversão de °C para K em gases...)"
                className="px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl md:col-span-2"
              />
              <div className="md:col-span-4 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Registrar Padrão na Memória
                </Button>
              </div>
            </form>

            {memory.customObservations.length > 0 && (
              <div className="space-y-2">
                {memory.customObservations.map((obs) => (
                  <div
                    key={obs.id}
                    className="p-3 rounded-xl bg-[#F6F8F7] border border-slate-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span>{obs.createdAt}</span>
                        <span>·</span>
                        <span className="font-semibold text-[#006837]">{obs.provaOrigem}</span>
                        {obs.codigoEdital && <span>· {obs.codigoEdital}</span>}
                      </div>
                      <p className="text-slate-800">{obs.observacao}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteObservation(obs.id)}
                      aria-label="Remover observação"
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pares Conceituais Irmãos */}
          <Card padding="lg" className="space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-display font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                    <Sparkles className="w-4 h-4 text-[#008542] shrink-0" aria-hidden="true" />
                    <span>Dicionário Técnico de "Pares Conceituais Irmãos"</span>
                  </h3>
                  <StatusBadge tone="success">
                    <span className="tabular-nums">{filteredPares.length}</span> pares mapeados
                  </StatusBadge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Conceitos frequentemente invertidos nos distratores de múltipla escolha A–E da Fundação CESGRANRIO.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  aria-label="Filtrar por origem"
                  value={pairOrigin}
                  onChange={(e) => setPairOrigin(e.target.value as 'todas' | OrigemEdital)}
                  className="px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  <option value="todas">Todas as Origens</option>
                  <option value="ambos">Interseção (Ambos)</option>
                  <option value="transpetro">Exclusivo Dutos e Terminais</option>
                  <option value="petrobras">Exclusivo Operação Júnior</option>
                </select>

                <select
                  aria-label="Filtrar por área técnica"
                  value={pairDiscipline}
                  onChange={(e) => setPairDiscipline(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  <option value="todas">Todas as áreas</option>
                  {pairDisciplines.map((disc) => (
                    <option key={disc} value={disc}>
                      {disc}
                    </option>
                  ))}
                </select>

                <div className="relative w-full sm:w-56">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    placeholder="Buscar par (cavitação, PID...)"
                    value={pairSearch}
                    onChange={(e) => setPairSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>
            </div>

            {filteredPares.length > 0 ? (
              <div className="space-y-3">
                {filteredPares.map((par) => {
                  const isOpen = openPairId === par.id;
                  return (
                    <div
                      key={par.id}
                      className="bg-[#F6F8F7] rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-[#008542]/40 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <OriginBadge origem={par.origem} />
                          {classifyByCodigoRef(par.codigoRef).badges.map((cat) => (
                            <SubjectBaseBadge key={cat} category={cat} compact />
                          ))}
                          <StatusBadge tone="neutral">{par.discipline}</StatusBadge>
                          {par.codigoRef && (
                            <span className="text-[11px] font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                              {par.codigoRef}
                            </span>
                          )}
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {par.conceptA} <span className="text-slate-400">×</span> {par.conceptB}
                          </h4>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          aria-expanded={isOpen}
                          onClick={() => setOpenPairId(isOpen ? null : par.id)}
                          rightIcon={
                            isOpen ? (
                              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                            )
                          }
                          className="text-[#006837] hover:text-[#071F14] self-start md:self-auto"
                        >
                          {isOpen ? 'Ocultar Armadilha' : 'Ver Armadilha CESGRANRIO'}
                        </Button>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                        <Target className="w-4 h-4 text-[#008542] shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <strong className="text-[#006837]">Diferença-chave:</strong> {par.difference}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-3 bg-orange-50/90 p-3.5 rounded-xl border border-orange-200 text-xs text-orange-950 leading-relaxed flex items-start gap-2 animate-fadeIn">
                          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
                          <div>
                            <strong className="text-orange-900">Pegadinha clássica CESGRANRIO:</strong>{' '}
                            {par.bancaTrap}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title={`Nenhum par conceitual encontrado para "${pairSearch}"`}
                description="Ajuste a busca ou redefina os filtros para visualizar os conceitos."
                actionLabel="Limpar filtros"
                onAction={() => {
                  setPairSearch('');
                  setPairDiscipline('todas');
                  setPairOrigin('todas');
                }}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
