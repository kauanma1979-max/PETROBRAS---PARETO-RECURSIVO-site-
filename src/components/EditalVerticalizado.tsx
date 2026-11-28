import React, { useState, useEffect, useMemo } from 'react';
import {
  EDITAL_VERTICALIZADO_DATA,
  MACRO_DIVISOES,
  SYLLABUS_COUNTS,
  EditalTopic,
  OrigemEdital,
} from '../data/verticalSyllabusData';
import {
  Card,
  Button,
  StatusBadge,
  ProgressBar,
  ConfirmDialog,
  EmptyState,
  ToastBanner,
  OriginBadge,
  SubjectBaseBadge,
} from './ui';
import { classifyTopicById, classifyMacroArea } from '../utils/subjectClassification';
import { sortMacrosByPareto, sortSyllabusTopicsByPareto } from '../utils/paretoOrdering';
import {
  Search,
  CheckCircle2,
  Clock,
  BookOpen,
  HelpCircle,
  PenTool,
  Sparkles,
  Flame,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Tag,
  Gauge,
  Cog,
  FlaskConical,
  Zap,
  Target,
  Save,
  Check,
  Database,
  Trash2,
  Layers,
  Filter,
} from 'lucide-react';
import { exportFullBackup, notifyDataUpdated } from '../utils/backupStorage';

interface TopicProgress {
  teoria: boolean;
  questoes: boolean;
  revisao: boolean;
  questoesFeitas: number;
  questoesAcertos: number;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'dominado';
  notas: string;
}

type MacroAreaId = EditalTopic['macroArea'];
type PriorityFilter = 'todas' | EditalTopic['priority'];
type OriginFilter = 'todas' | OrigemEdital;

const VALID_MACROS: MacroAreaId[] = [
  'instrumentacao',
  'mecanica_fluidos',
  'quimica_processos',
  'eletricidade',
];

const STORAGE_KEY = 'transpetro_edital_verticalizado_progress_v2';

export const EditalVerticalizado: React.FC = () => {
  const [progressState, setProgressState] = useState<Record<string, TopicProgress>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMacro, setSelectedMacro] = useState<MacroAreaId | 'todas'>(() => {
    try {
      const saved = localStorage.getItem('transpetro_vertical_macro');
      if (saved && VALID_MACROS.includes(saved as MacroAreaId)) {
        return saved as MacroAreaId;
      }
    } catch {
      // ignore
    }
    return 'todas';
  });

  const [selectedOrigin, setSelectedOrigin] = useState<OriginFilter>(() => {
    try {
      const saved = localStorage.getItem('transpetro_vertical_origem');
      if (saved === 'ambos' || saved === 'transpetro' || saved === 'petrobras') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'todas';
  });

  const [selectedPrioridade, setSelectedPrioridade] = useState<PriorityFilter>(() => {
    try {
      const saved = localStorage.getItem('transpetro_vertical_prioridade');
      if (saved === 'CRÍTICA' || saved === 'ALTA' || saved === 'MÉDIA') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'todas';
  });

  const [selectedStatus, setSelectedStatus] = useState<string>(() => {
    try {
      return localStorage.getItem('transpetro_vertical_status') || 'todos';
    } catch {
      return 'todos';
    }
  });

  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [collapsedMacroSections, setCollapsedMacroSections] = useState<Record<string, boolean>>({});
  const [savedTopicToasts, setSavedTopicToasts] = useState<Record<string, boolean>>({});
  const [globalSaveFeedback, setGlobalSaveFeedback] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'mark_critica' | 'reset' | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('transpetro_vertical_macro', selectedMacro);
    } catch {}
  }, [selectedMacro]);

  useEffect(() => {
    try {
      localStorage.setItem('transpetro_vertical_origem', selectedOrigin);
    } catch {}
  }, [selectedOrigin]);

  useEffect(() => {
    try {
      localStorage.setItem('transpetro_vertical_prioridade', selectedPrioridade);
    } catch {}
  }, [selectedPrioridade]);

  useEffect(() => {
    try {
      localStorage.setItem('transpetro_vertical_status', selectedStatus);
    } catch {}
  }, [selectedStatus]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressState));
      notifyDataUpdated(STORAGE_KEY);
    } catch (e) {
      console.error('Error saving progress to localStorage', e);
    }
  }, [progressState]);

  useEffect(() => {
    const handleStorageRestore = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setProgressState(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('transpetro_data_restored', handleStorageRestore);
    return () => window.removeEventListener('transpetro_data_restored', handleStorageRestore);
  }, []);

  const getTopicProgress = (id: string): TopicProgress => {
    return (
      progressState[id] || {
        teoria: false,
        questoes: false,
        revisao: false,
        questoesFeitas: 0,
        questoesAcertos: 0,
        status: 'pendente',
        notas: '',
      }
    );
  };

  const updateTopicProgress = (id: string, updates: Partial<TopicProgress>) => {
    setProgressState((prev) => {
      const current = prev[id] || {
        teoria: false,
        questoes: false,
        revisao: false,
        questoesFeitas: 0,
        questoesAcertos: 0,
        status: 'pendente',
        notas: '',
      };
      const updated = { ...current, ...updates };

      if (
        updates.teoria !== undefined ||
        updates.questoes !== undefined ||
        updates.revisao !== undefined
      ) {
        const isTeoria = updates.teoria ?? current.teoria;
        const isQuestoes = updates.questoes ?? current.questoes;
        const isRevisao = updates.revisao ?? current.revisao;

        if (isTeoria && isQuestoes && isRevisao) {
          updated.status = 'dominado';
        } else if (isTeoria || isQuestoes || isRevisao) {
          updated.status = 'em_andamento';
        } else {
          updated.status = 'pendente';
        }
      }

      return { ...prev, [id]: updated };
    });
  };

  const handleExplicitSaveTopic = (id: string) => {
    const current = getTopicProgress(id);
    updateTopicProgress(id, { ...current });
    setSavedTopicToasts((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setSavedTopicToasts((prev) => ({ ...prev, [id]: false }));
    }, 2500);
  };

  const handleMarkTopicFullyCompleted = (id: string) => {
    updateTopicProgress(id, {
      teoria: true,
      questoes: true,
      revisao: true,
      status: 'dominado',
    });
    setSavedTopicToasts((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setSavedTopicToasts((prev) => ({ ...prev, [id]: false }));
    }, 2500);
  };

  const handleClearTopicNotes = (id: string) => {
    updateTopicProgress(id, { notas: '' });
    setSavedTopicToasts((prev) => ({ ...prev, [id]: false }));
  };

  const toggleExpand = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMacroSection = (macroId: string) => {
    setCollapsedMacroSections((prev) => ({ ...prev, [macroId]: !prev[macroId] }));
  };

  const handleDownloadBackupJson = () => {
    exportFullBackup();
    setGlobalSaveFeedback('Arquivo de backup JSON gerado com sucesso.');
    setTimeout(() => setGlobalSaveFeedback(null), 3000);
  };

  const getMacroIcon = (macroId: MacroAreaId, className: string = 'w-5 h-5') => {
    switch (macroId) {
      case 'instrumentacao':
        return <Gauge className={className} aria-hidden="true" />;
      case 'mecanica_fluidos':
        return <Cog className={className} aria-hidden="true" />;
      case 'quimica_processos':
        return <FlaskConical className={className} aria-hidden="true" />;
      case 'eletricidade':
      default:
        return <Zap className={className} aria-hidden="true" />;
    }
  };

  const getMacroTheme = (macroId: MacroAreaId) => {
    switch (macroId) {
      case 'instrumentacao':
        return {
          iconBg: 'bg-[#008542]/25 text-[#FDB913] border border-[#008542]/40',
        };
      case 'mecanica_fluidos':
        return {
          iconBg: 'bg-amber-500/20 text-[#FDB913] border border-[#FDB913]/35',
        };
      case 'quimica_processos':
        return {
          iconBg: 'bg-orange-500/20 text-orange-300 border border-orange-400/35',
        };
      case 'eletricidade':
      default:
        return {
          iconBg: 'bg-[#008542]/25 text-emerald-300 border border-emerald-400/35',
        };
    }
  };

  const filteredItems = useMemo(() => {
    return EDITAL_VERTICALIZADO_DATA.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubtopic = item.subtopic.toLowerCase().includes(q);
        const matchMacro = item.macroName.toLowerCase().includes(q);
        const matchTP = (item.codigoTranspetro || '').toLowerCase().includes(q);
        const matchPB = (item.codigoPetrobras || '').toLowerCase().includes(q);
        const matchKeywords = item.palavrasChave.some((k) => k.toLowerCase().includes(q));
        const matchResumo = item.resumoEstrategico.toLowerCase().includes(q);
        if (!matchSubtopic && !matchMacro && !matchTP && !matchPB && !matchKeywords && !matchResumo) {
          return false;
        }
      }

      if (selectedMacro !== 'todas' && item.macroArea !== selectedMacro) {
        return false;
      }

      if (selectedOrigin !== 'todas' && item.origem !== selectedOrigin) {
        return false;
      }

      if (selectedPrioridade !== 'todas' && item.priority !== selectedPrioridade) {
        return false;
      }

      if (selectedStatus !== 'todos') {
        const prog = getTopicProgress(item.id);
        if (prog.status !== selectedStatus) {
          return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedMacro, selectedOrigin, selectedPrioridade, selectedStatus, progressState]);

  const handleExpandAllInView = () => {
    const next: Record<string, boolean> = {};
    filteredItems.forEach((i) => {
      next[i.id] = true;
    });
    setExpandedTopics(next);
  };

  const handleCollapseAllInView = () => {
    setExpandedTopics({});
  };

  const orderedMacroDivisoes = useMemo(() => sortMacrosByPareto(MACRO_DIVISOES), []);

  const groupedByMacro = useMemo(() => {
    const groups: Record<MacroAreaId, EditalTopic[]> = {
      instrumentacao: [],
      mecanica_fluidos: [],
      quimica_processos: [],
      eletricidade: [],
    };

    filteredItems.forEach((item) => {
      groups[item.macroArea].push(item);
    });

    (Object.keys(groups) as MacroAreaId[]).forEach((macroKey) => {
      groups[macroKey] = sortSyllabusTopicsByPareto(groups[macroKey]);
    });

    return groups;
  }, [filteredItems]);

  const totalItems = EDITAL_VERTICALIZADO_DATA.length;
  const criticaItems = EDITAL_VERTICALIZADO_DATA.filter((i) => i.priority === 'CRÍTICA');

  const completedCount = EDITAL_VERTICALIZADO_DATA.filter((item) => {
    const p = getTopicProgress(item.id);
    return p.status === 'concluido' || p.status === 'dominado';
  }).length;

  const criticaCompletedCount = criticaItems.filter((item) => {
    const p = getTopicProgress(item.id);
    return p.status === 'concluido' || p.status === 'dominado';
  }).length;

  const progressList = Object.values(progressState) as TopicProgress[];
  const totalQuestoesFeitas = progressList.reduce(
    (acc, curr) => acc + (Number(curr?.questoesFeitas) || 0),
    0
  );
  const totalQuestoesAcertos = progressList.reduce(
    (acc, curr) => acc + (Number(curr?.questoesAcertos) || 0),
    0
  );
  const taxaAcertoGlobal =
    totalQuestoesFeitas > 0 ? Math.round((totalQuestoesAcertos / totalQuestoesFeitas) * 100) : 0;

  const overallProgressPct = Math.round((completedCount / Math.max(1, totalItems)) * 100);
  const criticaProgressPct = Math.round((criticaCompletedCount / Math.max(1, criticaItems.length)) * 100);

  const getMacroStats = (macroId: MacroAreaId) => {
    const allMacroItems = EDITAL_VERTICALIZADO_DATA.filter((i) => i.macroArea === macroId);
    const macroDone = allMacroItems.filter((item) => {
      const p = getTopicProgress(item.id);
      return p.status === 'concluido' || p.status === 'dominado';
    }).length;
    const pct = allMacroItems.length > 0 ? Math.round((macroDone / allMacroItems.length) * 100) : 0;
    const commonCount = allMacroItems.filter((i) => i.origem === 'ambos').length;
    const tpCount = allMacroItems.filter((i) => i.origem === 'transpetro').length;
    const pbCount = allMacroItems.filter((i) => i.origem === 'petrobras').length;

    return {
      total: allMacroItems.length,
      done: macroDone,
      pct,
      commonCount,
      tpCount,
      pbCount,
    };
  };

  const executeMarkAllCritica = () => {
    setProgressState((prev) => {
      const next = { ...prev };
      criticaItems.forEach((item) => {
        const cur = next[item.id] || {
          teoria: false,
          questoes: false,
          revisao: false,
          questoesFeitas: 0,
          questoesAcertos: 0,
          status: 'pendente',
          notas: '',
        };
        next[item.id] = {
          ...cur,
          teoria: true,
          status: cur.status === 'pendente' ? 'em_andamento' : cur.status,
        };
      });
      return next;
    });
    setGlobalSaveFeedback('Teoria marcada para todos os tópicos de Prioridade Crítica.');
    setTimeout(() => setGlobalSaveFeedback(null), 3000);
  };

  const executeResetProgress = () => {
    setProgressState({});
    localStorage.removeItem(STORAGE_KEY);
    setGlobalSaveFeedback('Progresso do edital verticalizado zerado.');
    setTimeout(() => setGlobalSaveFeedback(null), 3000);
  };

  const handleExportCsv = () => {
    const headers = [
      'MacroArea',
      'Origem',
      'CodigoTranspetro',
      'CodigoPetrobras',
      'Subtopico',
      'Prioridade',
      'ParetoPct',
      'QuestoesMapeadas',
      'PresencaEmProvas',
      'Teoria',
      'Questoes',
      'Revisao',
      'QuestoesFeitas',
      'Acertos',
      'Status',
    ];
    const rows = EDITAL_VERTICALIZADO_DATA.map((item) => {
      const p = getTopicProgress(item.id);
      const origemLabel =
        item.origem === 'ambos'
          ? 'Transpetro + Petrobras'
          : item.origem === 'transpetro'
          ? 'Transpetro'
          : 'Petrobras';
      return [
        `"${item.macroName}"`,
        `"${origemLabel}"`,
        `"${item.codigoTranspetro || ''}"`,
        `"${item.codigoPetrobras || ''}"`,
        `"${item.subtopic.replace(/"/g, '""')}"`,
        `"${item.priority}"`,
        `${item.paretoSharePct.toFixed(1)}%`,
        `${item.mappedQuestions}`,
        `"${item.examPresenceCount}/5 provas"`,
        p.teoria ? 'SIM' : 'NAO',
        p.questoes ? 'SIM' : 'NAO',
        p.revisao ? 'SIM' : 'NAO',
        p.questoesFeitas || 0,
        p.questoesAcertos || 0,
        `"${p.status}"`,
      ].join(',');
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `edital_verticalizado_transpetro_petrobras_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityBadge = (p: EditalTopic['priority']) => {
    switch (p) {
      case 'CRÍTICA':
        return (
          <StatusBadge tone="orange" icon={<Flame className="w-3 h-3" />}>
            Prioridade Crítica
          </StatusBadge>
        );
      case 'ALTA':
        return (
          <StatusBadge tone="success" icon={<Sparkles className="w-3 h-3" />}>
            Alta Prioridade
          </StatusBadge>
        );
      case 'MÉDIA':
      default:
        return (
          <StatusBadge tone="neutral" icon={<Clock className="w-3 h-3" />}>
            Média Prioridade
          </StatusBadge>
        );
    }
  };

  const getStatusBadge = (status: TopicProgress['status']) => {
    switch (status) {
      case 'dominado':
        return (
          <StatusBadge tone="success" icon={<CheckCircle2 className="w-3 h-3" />}>
            Dominado (100%)
          </StatusBadge>
        );
      case 'concluido':
        return (
          <StatusBadge tone="info" icon={<CheckCircle2 className="w-3 h-3" />}>
            Concluído
          </StatusBadge>
        );
      case 'em_andamento':
        return (
          <StatusBadge tone="warning" icon={<Clock className="w-3 h-3" />}>
            Em Andamento
          </StatusBadge>
        );
      case 'pendente':
      default:
        return <StatusBadge tone="neutral">Pendente</StatusBadge>;
    }
  };

  const visibleMacroList =
    selectedMacro === 'todas'
      ? orderedMacroDivisoes
      : orderedMacroDivisoes.filter((m) => m.id === selectedMacro);

  return (
    <div className="space-y-6">
      {/* Top Banner & Strategy Summary */}
      <Card padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-600 mb-1.5">
              <StatusBadge tone="success" icon={<FileSpreadsheet className="w-3 h-3" />}>
                Matriz Mesclada · Transpetro + Petrobras
              </StatusBadge>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="tabular-nums">{SYLLABUS_COUNTS.total} Tópicos Técnicos Unificados</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 tracking-tight">
              Edital Verticalizado — Conteúdo Programático Unificado
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Fusão integral entre <strong>Transpetro 2026 (Ênfase 4: Dutos e Terminais)</strong> e{' '}
              <strong>Petrobras 2023.2 (Ênfase 8: Operação)</strong>, com identificação de origem e
              código original ao lado de cada item.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              id="btn-download-backup-json"
              variant="primary"
              size="sm"
              leftIcon={<Database className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={handleDownloadBackupJson}
              title="Baixar arquivo JSON de backup com todas as anotações e progresso"
            >
              Salvar Backup JSON
            </Button>
            <Button
              id="btn-export-vertical-csv"
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={handleExportCsv}
              title="Baixar planilha CSV"
            >
              Exportar CSV
            </Button>
            <Button
              id="btn-activate-alta-priority"
              variant="outline"
              size="sm"
              leftIcon={<Flame className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />}
              onClick={() => setConfirmAction('mark_critica')}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
              title="Marcar teoria de todos os itens de prioridade crítica"
            >
              Ativar Prioridade Crítica
            </Button>
            <Button
              id="btn-reset-vertical-progress"
              variant="ghost"
              size="icon"
              onClick={() => setConfirmAction('reset')}
              aria-label="Resetar progresso do edital verticalizado"
              title="Resetar progresso"
              className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {globalSaveFeedback && (
          <div className="mt-4">
            <ToastBanner tone="success" message={globalSaveFeedback} />
          </div>
        )}

        {/* Global Progress Metric Cards (Zero day counts) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-[#F6F8F7] border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span>Cobertura Geral</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {overallProgressPct}%
              </span>
            </div>
            <div className="text-xl font-display font-bold text-slate-900 mb-2 tabular-nums">
              {completedCount}{' '}
              <span className="text-xs font-normal text-slate-500">/ {totalItems} tópicos</span>
            </div>
            <ProgressBar value={overallProgressPct} label="Cobertura geral do edital" />
          </div>

          <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-orange-800 font-medium mb-1">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" /> Prioridade Crítica
              </span>
              <span className="font-mono font-bold text-orange-950 tabular-nums">
                {criticaProgressPct}%
              </span>
            </div>
            <div className="text-xl font-display font-bold text-orange-950 mb-2 tabular-nums">
              {criticaCompletedCount}{' '}
              <span className="text-xs font-normal text-orange-800">
                / {criticaItems.length} tópicos
              </span>
            </div>
            <ProgressBar
              value={criticaProgressPct}
              tone="orange"
              label="Progresso nos itens de prioridade crítica"
            />
          </div>

          <div className="bg-[#F6F8F7] border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span>Questões Resolvidas</span>
              <span className="font-mono font-bold text-[#006837] tabular-nums">
                {totalQuestoesFeitas} un
              </span>
            </div>
            <div className="text-xl font-display font-bold text-slate-900 mb-1.5 tabular-nums">
              {totalQuestoesAcertos}{' '}
              <span className="text-xs font-normal text-slate-500">acertos</span>
            </div>
            <div className="text-[11px] text-slate-500 tabular-nums">
              Taxa de acertos: <strong className="text-slate-800">{taxaAcertoGlobal}%</strong>
            </div>
          </div>

          <div className="bg-[#E6F4EC]/75 border border-[#008542]/25 rounded-xl p-3.5">
            <div className="text-xs text-[#006837] font-medium mb-1">Origem dos Tópicos</div>
            <div className="text-xl font-display font-bold text-[#071F14] mb-1.5 tabular-nums">
              {SYLLABUS_COUNTS.ambos}{' '}
              <span className="text-xs font-normal text-[#006837]">em comum (TP + PB)</span>
            </div>
            <div className="text-[11px] text-[#006837] tabular-nums">
              + {SYLLABUS_COUNTS.transpetro} Transpetro · + {SYLLABUS_COUNTS.petrobras} Petrobras
            </div>
          </div>
        </div>
      </Card>

      {/* Macro Divisions Interactive Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {orderedMacroDivisoes.map((macro, index) => {
          const stats = getMacroStats(macro.id);
          const isSelected = selectedMacro === macro.id;
          const macroSubject = classifyMacroArea(macro.id);

          return (
            <button
              key={macro.id}
              type="button"
              id={`card-macro-${macro.id}`}
              aria-pressed={isSelected}
              onClick={() => setSelectedMacro(isSelected ? 'todas' : macro.id)}
              className={`p-4 rounded-2xl border text-left transition-[border-color,background-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#071F14] text-white border-[#071F14] shadow-sm ring-2 ring-orange-500/70'
                  : 'bg-white text-slate-800 border-slate-200/90 hover:border-[#008542]/45 hover:bg-[#F6F8F7]/60 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#008542]/30 text-[#FDB913] border border-[#FDB913]/40'
                        : 'bg-[#EFF4F1] text-[#006837]'
                    }`}
                  >
                    {getMacroIcon(macro.id, 'w-4 h-4')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <SubjectBaseBadge category={macroSubject} compact />
                    <span
                      className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md font-bold ${
                        isSelected ? 'bg-[#0C2F1E] text-[#FDB913]' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Peso {macro.pesoEstimado}%
                    </span>
                  </div>
                </div>

                <div
                  className={`text-[11px] font-bold uppercase tracking-wider mb-0.5 ${
                    isSelected ? 'text-orange-400' : 'text-slate-500'
                  }`}
                >
                  Pareto #{index + 1}
                </div>
                <h3 className="text-sm sm:text-base font-display font-extrabold tracking-tight leading-snug">
                  {macro.nome}
                </h3>
                <p
                  className={`text-xs mt-1 line-clamp-2 ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {macro.descricao}
                </p>
              </div>

              <div
                className={`mt-4 pt-3 border-t ${
                  isSelected ? 'border-[#15412B]' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1.5">
                  <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                    {stats.done}/{stats.total} tópicos
                  </span>
                  <span className={`font-bold ${isSelected ? 'text-[#FDB913]' : 'text-[#008542]'}`}>
                    {stats.pct}%
                  </span>
                </div>
                <ProgressBar
                  value={stats.pct}
                  tone={isSelected ? 'gold' : 'emerald'}
                  trackTheme={isSelected ? 'dark' : 'light'}
                  label={`Progresso em ${macro.nome}`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Macro + Origin Filter Tabs + Search Bar */}
      <Card padding="sm" className="space-y-3.5">
        <div className="space-y-3">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Filtrar por Macro Área Técnica:</span>
              {selectedMacro !== 'todas' && (
                <button
                  type="button"
                  onClick={() => setSelectedMacro('todas')}
                  className="text-[#006837] hover:text-[#071F14] font-semibold cursor-pointer"
                >
                  Ver Todas as Macro Áreas
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                id="tab-macro-todas"
                aria-pressed={selectedMacro === 'todas'}
                onClick={() => setSelectedMacro('todas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
                  selectedMacro === 'todas'
                    ? 'bg-[#071F14] text-[#FDB913]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Todas ({totalItems})</span>
              </button>

              {orderedMacroDivisoes.map((macro) => {
                const isActive = selectedMacro === macro.id;
                const stats = getMacroStats(macro.id);

                return (
                  <button
                    key={macro.id}
                    type="button"
                    id={`tab-macro-btn-${macro.id}`}
                    aria-pressed={isActive}
                    onClick={() => setSelectedMacro(macro.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#008542] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {getMacroIcon(macro.id, 'w-3.5 h-3.5')}
                    <span>{macro.nome}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono tabular-nums ${
                        isActive ? 'bg-[#006837] text-[#FDB913]' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {stats.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Origin Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" aria-hidden="true" /> Origem no Edital:
            </span>
            {(
              [
                { id: 'todas', label: `Todos (${SYLLABUS_COUNTS.total})` },
                { id: 'ambos', label: `Transpetro + Petrobras (${SYLLABUS_COUNTS.ambos})` },
                { id: 'transpetro', label: `Exclusivo Transpetro (${SYLLABUS_COUNTS.transpetro})` },
                { id: 'petrobras', label: `Exclusivo Petrobras (${SYLLABUS_COUNTS.petrobras})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                id={`filter-origin-${opt.id}`}
                type="button"
                aria-pressed={selectedOrigin === opt.id}
                onClick={() => setSelectedOrigin(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  selectedOrigin === opt.id
                    ? 'bg-[#071F14] text-[#FDB913] border-b-2 border-orange-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Secondary Filter Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 pt-3 border-t border-slate-100">
          <div className="relative flex-1">
            <label htmlFor="input-search-vertical" className="sr-only">
              Filtrar tópicos do edital verticalizado
            </label>
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="input-search-vertical"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar tópicos (ex: Bernoulli, 4-20 mA, Carnot, Clapeyron, Refino, NR-33, TP-12, PB-B3)..."
              className="w-full pl-9 pr-4 py-2 bg-[#F6F8F7] border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542] transition-[border-color,box-shadow] duration-150"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label htmlFor="select-priority-filter" className="sr-only">
              Filtrar por prioridade
            </label>
            <select
              id="select-priority-filter"
              value={selectedPrioridade}
              onChange={(e) => setSelectedPrioridade(e.target.value as PriorityFilter)}
              className="px-3 py-2 bg-[#F6F8F7] border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
            >
              <option value="todas">Todas as Prioridades</option>
              <option value="CRÍTICA">Prioridade Crítica</option>
              <option value="ALTA">Alta Prioridade</option>
              <option value="MÉDIA">Média Prioridade</option>
            </select>

            <label htmlFor="select-status-filter" className="sr-only">
              Filtrar por status de conclusão
            </label>
            <select
              id="select-status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-[#F6F8F7] border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
              <option value="dominado">Dominado</option>
            </select>
          </div>
        </div>

        {/* Results Counter & Bulk Expand Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <div className="tabular-nums">
            Exibindo <strong className="text-slate-800">{filteredItems.length}</strong> de{' '}
            {totalItems} tópicos unificados
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              id="btn-expand-all-topics"
              onClick={handleExpandAllInView}
              className="text-[#006837] hover:text-[#071F14] font-semibold cursor-pointer flex items-center gap-1"
            >
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Expandir Todos</span>
            </button>
            <span className="text-slate-300" aria-hidden="true">|</span>
            <button
              type="button"
              id="btn-collapse-all-topics"
              onClick={handleCollapseAllInView}
              className="text-slate-600 hover:text-slate-800 font-semibold cursor-pointer flex items-center gap-1"
            >
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Recolher Todos</span>
            </button>

            {(searchQuery ||
              selectedMacro !== 'todas' ||
              selectedOrigin !== 'todas' ||
              selectedPrioridade !== 'todas' ||
              selectedStatus !== 'todos') && (
              <>
                <span className="text-slate-300" aria-hidden="true">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedMacro('todas');
                    setSelectedOrigin('todas');
                    setSelectedPrioridade('todas');
                    setSelectedStatus('todos');
                  }}
                  className="text-orange-700 hover:text-orange-800 font-semibold cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Macro Sections Container */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="Nenhum tópico encontrado com os filtros atuais"
          description="Ajuste a busca textual ou limpe os filtros de origem, prioridade, status e macro área."
          actionLabel="Limpar todos os filtros"
          onAction={() => {
            setSearchQuery('');
            setSelectedMacro('todas');
            setSelectedOrigin('todas');
            setSelectedPrioridade('todas');
            setSelectedStatus('todos');
          }}
        />
      ) : (
        <div className="space-y-8">
          {visibleMacroList.map((macro, macroIdx) => {
            const itemsInThisMacro = groupedByMacro[macro.id] || [];
            const isSectionCollapsed = collapsedMacroSections[macro.id] ?? false;
            const stats = getMacroStats(macro.id);
            const theme = getMacroTheme(macro.id);

            if (itemsInThisMacro.length === 0) {
              return null;
            }

            return (
              <section
                key={macro.id}
                id={`macro-section-${macro.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
              >
                {/* Macro Section Header */}
                <div className="bg-[#071F14] text-white p-5 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-xs font-bold font-mono ${theme.iconBg}`}
                        >
                          Macro Área {macroIdx + 1}
                        </span>
                        <span className="font-mono font-semibold tabular-nums">
                          Peso estimado: {macro.pesoEstimado}%
                        </span>
                        <span className="text-emerald-700" aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {stats.commonCount} TP+PB · {stats.tpCount} TP · {stats.pbCount} PB
                        </span>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme.iconBg} shrink-0`}
                        >
                          {getMacroIcon(macro.id, 'w-5 h-5')}
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-display font-bold tracking-tight text-white">
                            {macro.nome}
                          </h3>
                          <p className="text-xs text-slate-300">{macro.descricao}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                      <div className="bg-[#0A281A] p-3 rounded-xl border border-[#184831] min-w-[155px] text-right">
                        <div className="text-[11px] text-slate-300 font-medium">
                          Progresso da Macro
                        </div>
                        <div className="text-base font-bold text-[#FDB913] font-mono tabular-nums mb-1.5">
                          {stats.done} de {stats.total} ({stats.pct}%)
                        </div>
                        <ProgressBar
                          value={stats.pct}
                          tone="gold"
                          trackTheme="dark"
                          label={`Progresso em ${macro.nome}`}
                        />
                      </div>

                      <button
                        type="button"
                        aria-expanded={!isSectionCollapsed}
                        aria-label={
                          isSectionCollapsed
                            ? `Expandir tópicos de ${macro.nome}`
                            : `Recolher tópicos de ${macro.nome}`
                        }
                        onClick={() => toggleMacroSection(macro.id)}
                        className="p-2.5 bg-[#0A281A] hover:bg-[#113825] border border-[#184831] rounded-xl text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        {isSectionCollapsed ? (
                          <ChevronDown className="w-5 h-5" aria-hidden="true" />
                        ) : (
                          <ChevronUp className="w-5 h-5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Topics List within this Macro */}
                {!isSectionCollapsed && (
                  <div className="p-4 sm:p-5 space-y-3">
                    {itemsInThisMacro.map((item) => {
                      const prog = getTopicProgress(item.id);
                      const isExpanded = expandedTopics[item.id] ?? false;

                      return (
                        <div
                          key={item.id}
                          id={`topic-card-${item.id}`}
                          className={`bg-white border rounded-2xl transition-colors overflow-hidden ${
                            item.priority === 'CRÍTICA'
                              ? 'border-slate-200/90 hover:border-orange-300'
                              : 'border-slate-200/90 hover:border-[#008542]/40'
                          }`}
                        >
                          <div className="p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <OriginBadge
                                    origem={item.origem}
                                    showCodes
                                    codigoTranspetro={item.codigoTranspetro}
                                    codigoPetrobras={item.codigoPetrobras}
                                  />
                                  <SubjectBaseBadge
                                    category={classifyTopicById(item.id)}
                                    showPhaseHint
                                  />
                                  {getPriorityBadge(item.priority)}
                                  {getStatusBadge(prog.status)}
                                </div>

                                <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug pt-0.5">
                                  {item.subtopic}
                                </h4>

                                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                                  <span>
                                    Área: <strong className="text-slate-700">{item.macroName}</strong>
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums">
                                    Base Pareto:{' '}
                                    <strong className="text-[#006837]">
                                      {item.paretoSharePct.toFixed(1)}%
                                    </strong>{' '}
                                    ({item.mappedQuestions}q · {item.examPresenceCount}/5 provas)
                                  </span>
                                </div>
                              </div>

                              <Button
                                id={`btn-toggle-details-${item.id}`}
                                variant="outline"
                                size="sm"
                                aria-expanded={isExpanded}
                                onClick={() => toggleExpand(item.id)}
                                rightIcon={
                                  isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                                  )
                                }
                                className="self-end sm:self-start"
                              >
                                {isExpanded ? 'Recolher' : 'Detalhes & Anotações'}
                              </Button>
                            </div>

                            {/* Quick 3-Step Mini Checklist */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                              <label
                                htmlFor={`check-teoria-${item.id}`}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors text-xs font-medium text-slate-700"
                              >
                                <input
                                  id={`check-teoria-${item.id}`}
                                  type="checkbox"
                                  checked={prog.teoria}
                                  onChange={(e) =>
                                    updateTopicProgress(item.id, { teoria: e.target.checked })
                                  }
                                  className="w-4 h-4 rounded accent-[#008542] cursor-pointer"
                                />
                                <span className="flex items-center gap-1.5">
                                  <BookOpen
                                    className="w-3.5 h-3.5 text-sky-600 shrink-0"
                                    aria-hidden="true"
                                  />
                                  1. Teoria &amp; Base
                                </span>
                              </label>

                              <label
                                htmlFor={`check-questoes-${item.id}`}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors text-xs font-medium text-slate-700"
                              >
                                <input
                                  id={`check-questoes-${item.id}`}
                                  type="checkbox"
                                  checked={prog.questoes}
                                  onChange={(e) =>
                                    updateTopicProgress(item.id, {
                                      questoes: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 rounded accent-[#008542] cursor-pointer"
                                />
                                <span className="flex items-center gap-1.5">
                                  <HelpCircle
                                    className="w-3.5 h-3.5 text-[#008542] shrink-0"
                                    aria-hidden="true"
                                  />
                                  2. Questões de Prova
                                </span>
                              </label>

                              <label
                                htmlFor={`check-revisao-${item.id}`}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors text-xs font-medium text-slate-700"
                              >
                                <input
                                  id={`check-revisao-${item.id}`}
                                  type="checkbox"
                                  checked={prog.revisao}
                                  onChange={(e) =>
                                    updateTopicProgress(item.id, {
                                      revisao: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 rounded accent-[#008542] cursor-pointer"
                                />
                                <span className="flex items-center gap-1.5">
                                  <PenTool
                                    className="w-3.5 h-3.5 text-orange-600 shrink-0"
                                    aria-hidden="true"
                                  />
                                  3. Caderno de Erros
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Expanded Strategic Drawer */}
                          {isExpanded && (
                            <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 space-y-4 animate-fadeIn">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                  <Target
                                    className="w-4 h-4 text-[#008542] shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>Escopo Técnico &amp; Foco de Prova (Fundação Cesgranrio)</span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                                  {item.resumoEstrategico}
                                </p>

                                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                                    <Tag className="w-3 h-3" aria-hidden="true" /> Termos-chave:
                                  </span>
                                  {item.palavrasChave.map((k) => (
                                    <span
                                      key={k}
                                      className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 font-mono"
                                    >
                                      {k}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                  <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                                    <span>Registro de Questões Realizadas</span>
                                    <span className="text-[11px] font-normal text-slate-500">
                                      Padrão Cesgranrio
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                      <label
                                        htmlFor={`input-questoes-${item.id}`}
                                        className="block text-[11px] font-medium text-slate-600 mb-1"
                                      >
                                        Total de Questões:
                                      </label>
                                      <input
                                        id={`input-questoes-${item.id}`}
                                        type="number"
                                        min="0"
                                        value={prog.questoesFeitas || ''}
                                        onChange={(e) =>
                                          updateTopicProgress(item.id, {
                                            questoesFeitas: parseInt(e.target.value, 10) || 0,
                                          })
                                        }
                                        placeholder="Ex: 25"
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                                      />
                                    </div>
                                    <div>
                                      <label
                                        htmlFor={`input-acertos-${item.id}`}
                                        className="block text-[11px] font-medium text-slate-600 mb-1"
                                      >
                                        Total de Acertos:
                                      </label>
                                      <input
                                        id={`input-acertos-${item.id}`}
                                        type="number"
                                        min="0"
                                        max={prog.questoesFeitas || 999}
                                        value={prog.questoesAcertos || ''}
                                        onChange={(e) =>
                                          updateTopicProgress(item.id, {
                                            questoesAcertos: parseInt(e.target.value, 10) || 0,
                                          })
                                        }
                                        placeholder="Ex: 22"
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-[#006837] tabular-nums focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                                      />
                                    </div>
                                  </div>

                                  {prog.questoesFeitas > 0 && (
                                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 tabular-nums">
                                      <span>Aproveitamento neste tópico:</span>
                                      <strong
                                        className={
                                          Math.round(
                                            (prog.questoesAcertos / prog.questoesFeitas) * 100
                                          ) >= 80
                                            ? 'text-[#006837]'
                                            : 'text-orange-700'
                                        }
                                      >
                                        {Math.round(
                                          (prog.questoesAcertos / prog.questoesFeitas) * 100
                                        )}
                                        % de acertos
                                      </strong>
                                    </div>
                                  )}
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between">
                                  <div>
                                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between mb-1.5">
                                      <label htmlFor={`textarea-notas-${item.id}`}>
                                        Minhas Anotações &amp; Pontos de Atenção
                                      </label>
                                      {savedTopicToasts[item.id] ? (
                                        <StatusBadge
                                          tone="success"
                                          icon={<Check className="w-3 h-3" />}
                                        >
                                          Salvo!
                                        </StatusBadge>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-normal">
                                          Gravado no JSON
                                        </span>
                                      )}
                                    </div>
                                    <textarea
                                      id={`textarea-notas-${item.id}`}
                                      value={prog.notas || ''}
                                      onChange={(e) =>
                                        updateTopicProgress(item.id, {
                                          notas: e.target.value,
                                        })
                                      }
                                      placeholder="Ex: Sinal 4–20 mA possui zero vivo; em Bernoulli maior velocidade reduz pressão estática..."
                                      rows={3}
                                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                                    />
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        id={`btn-save-topic-${item.id}`}
                                        variant="primary"
                                        size="sm"
                                        leftIcon={<Save className="w-3.5 h-3.5" aria-hidden="true" />}
                                        onClick={() => handleExplicitSaveTopic(item.id)}
                                      >
                                        Salvar
                                      </Button>
                                      <Button
                                        id={`btn-complete-topic-${item.id}`}
                                        variant="outline"
                                        size="sm"
                                        leftIcon={
                                          <CheckCircle2
                                            className="w-3.5 h-3.5 text-[#008542]"
                                            aria-hidden="true"
                                          />
                                        }
                                        onClick={() => handleMarkTopicFullyCompleted(item.id)}
                                        title="Marcar Teoria, Questões e Revisão como concluídas"
                                      >
                                        Concluir 3 Etapas
                                      </Button>
                                    </div>

                                    {prog.notas && (
                                      <button
                                        type="button"
                                        onClick={() => handleClearTopicNotes(item.id)}
                                        className="text-slate-500 hover:text-rose-600 text-[11px] flex items-center gap-1 transition-colors p-1 cursor-pointer"
                                        title="Limpar anotações"
                                      >
                                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                                        <span>Limpar</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmAction === 'mark_critica'}
        title="Ativar itens de Prioridade Crítica"
        message="Deseja marcar a etapa de Teoria como concluída para todos os tópicos de Prioridade Crítica?"
        confirmLabel="Marcar Teoria"
        variant="warning"
        onConfirm={executeMarkAllCritica}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'reset'}
        title="Resetar progresso do Edital Verticalizado"
        message="Tem certeza de que deseja apagar todo o progresso e anotações do edital verticalizado? Esta ação não pode ser desfeita."
        confirmLabel="Resetar tudo"
        variant="danger"
        onConfirm={executeResetProgress}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
