import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  StatusBadge,
  Modal,
  EmptyState,
  ToastBanner,
  OriginBadge,
  SubjectBaseBadge,
} from './ui';
import type { OrigemEdital } from './ui/OriginBadge';
import { classifyErrorEntry, classifyMacroArea } from '../utils/subjectClassification';
import { getMacroParetoRank } from '../utils/paretoOrdering';
import {
  BookOpen,
  Plus,
  Trash2,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Filter,
  Edit,
  Save,
  Database,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  exportFullBackup,
  STORAGE_KEYS,
  exportErrorNotebookJson,
} from '../utils/backupStorage';

export interface ErrorEntry {
  id: string;
  data: string;
  disciplina: string;
  origem?: OrigemEdital;
  subtopico: string;
  enunciadoResumido: string;
  motivoErro: string;
  regraCorreta: string;
  revisado: boolean;
}

export interface DisciplinaCorrelation {
  id: string;
  nome: string;
  nomeCurto: string;
  filtroKey: string;
  origem: OrigemEdital;
  categoria: 'Conhecimentos Específicos (Mesclados)' | 'Conhecimentos Gerais';
  escopoInfo: string;
  colorTheme: {
    badgeBg: string;
    badgeText: string;
  };
  subtopicosFrequentes: string[];
}

export const CORRELACOES_DISCIPLINAS: DisciplinaCorrelation[] = [
  {
    id: 'instrumentacao',
    nome: 'Instrumentação, Metrologia & Controle',
    nomeCurto: 'Instrumentação & Controle',
    filtroKey: 'Instrumentação',
    origem: 'ambos',
    categoria: 'Conhecimentos Específicos (Mesclados)',
    escopoInfo: '10 tópicos · TP-01..09 + PB-B1.14,16 / B2.08 / B3.01,06',
    colorTheme: {
      badgeBg: 'bg-[#E6F4EC] border border-[#008542]/25',
      badgeText: 'text-[#006837]',
    },
    subtopicosFrequentes: [],
  },
  {
    id: 'mecanica_fluidos',
    nome: 'Mecânica, Fluidos, Termodinâmica & Equipamentos',
    nomeCurto: 'Fluidos, Termo & Equipamentos',
    filtroKey: 'Fluidos',
    origem: 'ambos',
    categoria: 'Conhecimentos Específicos (Mesclados)',
    escopoInfo: '11 tópicos · TP-10..17 + PB-B1.05,09,13 / B2.01..04,07 / B3.03,05',
    colorTheme: {
      badgeBg: 'bg-amber-50 border border-amber-300',
      badgeText: 'text-amber-900',
    },
    subtopicosFrequentes: [],
  },
  {
    id: 'quimica_processos',
    nome: 'Química, Operações Unitárias, Refino & SMS',
    nomeCurto: 'Química, Refino & SMS',
    filtroKey: 'Química',
    origem: 'ambos',
    categoria: 'Conhecimentos Específicos (Mesclados)',
    escopoInfo: '15 tópicos · TP-18..30,32,33 + PB-B1.01..04,06,07,15 / B2.05,09 / B3.02,04',
    colorTheme: {
      badgeBg: 'bg-orange-50 border border-orange-200',
      badgeText: 'text-orange-900',
    },
    subtopicosFrequentes: [],
  },
  {
    id: 'eletricidade',
    nome: 'Eletricidade, Eletromagnetismo & Eletrônica',
    nomeCurto: 'Eletricidade & Eletrônica',
    filtroKey: 'Eletricidade',
    origem: 'ambos',
    categoria: 'Conhecimentos Específicos (Mesclados)',
    escopoInfo: '6 tópicos · TP-31,34..38 + PB-B1.08,10..12,17 / B2.06',
    colorTheme: {
      badgeBg: 'bg-sky-50 border border-sky-200',
      badgeText: 'text-sky-900',
    },
    subtopicosFrequentes: [],
  },
  {
    id: 'portugues',
    nome: 'Língua Portuguesa',
    nomeCurto: 'Português',
    filtroKey: 'Português',
    origem: 'ambos',
    categoria: 'Conhecimentos Gerais',
    escopoInfo: 'Base comum · Interpretação, Coesão e Norma Culta',
    colorTheme: {
      badgeBg: 'bg-slate-100 border border-slate-200',
      badgeText: 'text-slate-800',
    },
    subtopicosFrequentes: [],
  },
  {
    id: 'matematica',
    nome: 'Matemática',
    nomeCurto: 'Matemática',
    filtroKey: 'Matemática',
    origem: 'ambos',
    categoria: 'Conhecimentos Gerais',
    escopoInfo: 'Base comum · Proporção, Porcentagem e Modelagem',
    colorTheme: {
      badgeBg: 'bg-indigo-50 border border-indigo-200',
      badgeText: 'text-indigo-900',
    },
    subtopicosFrequentes: [],
  },
];

const LEGACY_SAMPLE_IDS = new Set([
  'err-port-1',
  'err-port-2',
  'err-mat-1',
  'err-mat-2',
  'err-1',
  'err-2',
  'err-3',
  'err-4',
  'err-5',
  'err-tec-inst-1',
  'err-tec-mec-1',
  'err-tec-equip-1',
  'err-tec-qui-1',
  'err-tec-ref-1',
  'err-tec-ele-1',
]);

const AREA_CUSTOM_STORAGE_KEY = 'transpetro_caderno_areas_custom_v1';

const normalizeStr = (str: string) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const ORDERED_CORRELACOES_DISCIPLINAS = [...CORRELACOES_DISCIPLINAS].sort((a, b) => {
  const rankA = getMacroParetoRank(a.id);
  const rankB = getMacroParetoRank(b.id);
  if (rankA !== rankB) return rankA - rankB;
  return a.nome.localeCompare(b.nome, 'pt-BR');
});

export const ErrorNotebook: React.FC = () => {
  const [errors, setErrors] = useState<ErrorEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ERROR_NOTEBOOK);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((e: any) => !LEGACY_SAMPLE_IDS.has(e?.id));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEYS.ERROR_NOTEBOOK, JSON.stringify(cleaned));
          }
          return cleaned;
        }
      }
    } catch (e) {
      console.error('Error loading error notebook from storage', e);
    }
    return [];
  });

  const [customAreas, setCustomAreas] = useState<
    Record<string, { nomeCurto: string; escopoInfo: string }>
  >(() => {
    try {
      const saved = localStorage.getItem(AREA_CUSTOM_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [editingAreaCard, setEditingAreaCard] = useState<{
    id: string;
    nomeCurto: string;
    escopoInfo: string;
  } | null>(null);

  const [filterDisc, setFilterDisc] = useState<string>('todas');
  const [filterOrigin, setFilterOrigin] = useState<'todas' | OrigemEdital>('todas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingError, setEditingError] = useState<ErrorEntry | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const errorsRef = React.useRef<ErrorEntry[]>(errors);
  useEffect(() => {
    errorsRef.current = errors;
  }, [errors]);

  const [formData, setFormData] = useState<{
    disciplina: string;
    origem: OrigemEdital;
    subtopico: string;
    enunciadoResumido: string;
    motivoErro: string;
    regraCorreta: string;
  }>({
    disciplina: 'Instrumentação, Metrologia & Controle',
    origem: 'ambos',
    subtopico: '',
    enunciadoResumido: '',
    motivoErro: '',
    regraCorreta: '',
  });

  // Simulador de Acertos por Área Técnica (Base percentual sem quantidades fictícias de edital aberto)
  const [simInst, setSimInst] = useState<number>(80);
  const [simMec, setSimMec] = useState<number>(75);
  const [simQui, setSimQui] = useState<number>(78);
  const [simEle, setSimEle] = useState<number>(70);
  const [simGerais, setSimGerais] = useState<number>(80);

  const mediaEspecificos = Math.round(
    simInst * 0.17 + simMec * 0.35 + simQui * 0.39 + simEle * 0.09
  );
  const isGeraisCritico = simGerais < 50;
  const mediaGlobalEstimada = Math.round(mediaEspecificos * 0.75 + simGerais * 0.25);

  const saveErrorsImmediately = (newErrors: ErrorEntry[]) => {
    errorsRef.current = newErrors;
    setErrors(newErrors);
    try {
      localStorage.setItem(STORAGE_KEYS.ERROR_NOTEBOOK, JSON.stringify(newErrors));
      localStorage.setItem('transpetro_caderno_erros_customized', 'true');
    } catch (e) {
      console.error('Error writing error notebook to storage', e);
    }
  };

  useEffect(() => {
    const handleStorageRestore = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string }>;
      if (customEvent?.detail?.key && customEvent.detail.key !== STORAGE_KEYS.ERROR_NOTEBOOK) {
        return;
      }
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ERROR_NOTEBOOK);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((e: any) => !LEGACY_SAMPLE_IDS.has(e?.id));
            errorsRef.current = cleaned;
            setErrors(cleaned);
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('transpetro_data_restored', handleStorageRestore);
    return () => {
      window.removeEventListener('transpetro_data_restored', handleStorageRestore);
    };
  }, []);

  const handleAddError = (e?: React.FormEvent | React.MouseEvent, downloadJson = false) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const subtopicoTrimmed = (formData.subtopico || '').trim();
    const regraCorretaTrimmed = (formData.regraCorreta || '').trim();
    const motivoErroTrimmed = (formData.motivoErro || '').trim();

    if (!subtopicoTrimmed || !regraCorretaTrimmed) {
      setFormError(
        'Por favor, preencha o Subtópico Exato e a Regra Correta para registrar o erro.'
      );
      return;
    }

    setFormError(null);
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const newEntry: ErrorEntry = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      data: todayStr,
      disciplina: formData.disciplina || 'Instrumentação, Metrologia & Controle',
      origem: formData.origem || 'ambos',
      subtopico: subtopicoTrimmed,
      enunciadoResumido: (formData.enunciadoResumido || '').trim(),
      motivoErro: motivoErroTrimmed || 'Revisar conceito e pegadinhas da banca',
      regraCorreta: regraCorretaTrimmed,
      revisado: false,
    };

    const updated = [newEntry, ...errorsRef.current];
    saveErrorsImmediately(updated);

    setFormData({
      disciplina: formData.disciplina,
      origem: formData.origem,
      subtopico: '',
      enunciadoResumido: '',
      motivoErro: '',
      regraCorreta: '',
    });

    setShowAddModal(false);
    setFilterDisc('todas');
    setFilterOrigin('todas');

    setSaveToast(`Novo erro registrado com sucesso no Caderno de ${newEntry.disciplina}!`);
    setTimeout(() => setSaveToast(null), 4000);

    if (downloadJson) {
      exportErrorNotebookJson();
    }
  };

  const handleOpenAddForDiscipline = (disciplinaNome: string, subtopicoInicial = '') => {
    setFormError(null);
    setFormData({
      disciplina: disciplinaNome,
      origem: 'ambos',
      subtopico: subtopicoInicial,
      enunciadoResumido: '',
      motivoErro: '',
      regraCorreta: '',
    });
    setShowAddModal(true);
  };

  const handleSaveEdit = (e?: React.FormEvent | React.MouseEvent, downloadJson = false) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editingError) return;

    const updated = errorsRef.current.map((err) =>
      err.id === editingError.id ? editingError : err
    );
    saveErrorsImmediately(updated);
    setEditingError(null);
    setSaveToast('Alterações salvas com sucesso no Caderno!');
    setTimeout(() => setSaveToast(null), 3000);

    if (downloadJson) {
      exportErrorNotebookJson();
    }
  };

  const handleToggleRevisado = (id: string) => {
    const updated = errors.map((err) =>
      err.id === id ? { ...err, revisado: !err.revisado } : err
    );
    saveErrorsImmediately(updated);
  };

  const handleDeleteError = (id: string) => {
    const updated = errors.filter((err) => err.id !== id);
    saveErrorsImmediately(updated);
    setSaveToast('Registro de erro removido com sucesso!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const persistCustomAreas = (
    next: Record<string, { nomeCurto: string; escopoInfo: string }>
  ) => {
    setCustomAreas(next);
    try {
      localStorage.setItem(AREA_CUSTOM_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleSaveAreaCardEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAreaCard) return;
    const next = {
      ...customAreas,
      [editingAreaCard.id]: {
        nomeCurto: editingAreaCard.nomeCurto.trim() || 'Área de Estudo',
        escopoInfo: editingAreaCard.escopoInfo.trim(),
      },
    };
    persistCustomAreas(next);
    setEditingAreaCard(null);
    setSaveToast('Card da área atualizado com sucesso!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleDeleteAreaErrorsOrReset = (disc: DisciplinaCorrelation) => {
    const areaCount = errorsRef.current.filter((e) =>
      normalizeStr(e.disciplina).includes(normalizeStr(disc.filtroKey))
    ).length;

    if (areaCount > 0) {
      const remaining = errorsRef.current.filter(
        (e) => !normalizeStr(e.disciplina).includes(normalizeStr(disc.filtroKey))
      );
      saveErrorsImmediately(remaining);
      setSaveToast(
        `${areaCount} ${areaCount === 1 ? 'erro removido' : 'erros removidos'} de ${
          customAreas[disc.id]?.nomeCurto || disc.nomeCurto
        }.`
      );
      setTimeout(() => setSaveToast(null), 3500);
      return;
    }

    if (customAreas[disc.id]) {
      const next = { ...customAreas };
      delete next[disc.id];
      persistCustomAreas(next);
      setSaveToast('Configuração padrão do card restaurada.');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    setSaveToast('Nenhum erro cadastrado neste card para remover.');
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleExportCSV = () => {
    const headers = [
      'Data',
      'Origem',
      'Disciplina',
      'Subtópico',
      'Enunciado Resumido',
      'Por que errei',
      'Regra Correta',
      'Revisado',
    ];
    const rows = errors.map((e) => [
      `"${e.data}"`,
      `"${e.origem || 'ambos'}"`,
      `"${e.disciplina}"`,
      `"${e.subtopico.replace(/"/g, '""')}"`,
      `"${e.enunciadoResumido.replace(/"/g, '""')}"`,
      `"${e.motivoErro.replace(/"/g, '""')}"`,
      `"${e.regraCorreta.replace(/"/g, '""')}"`,
      `"${e.revisado ? 'Sim' : 'Não'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `caderno_erros_transpetro_petrobras_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredErrors = errors.filter((err) => {
    const normDisc = normalizeStr(err.disciplina);
    const normFilter = normalizeStr(filterDisc);
    const matchesDisc = filterDisc === 'todas' || normDisc.includes(normFilter);

    const errOrigin = err.origem || 'ambos';
    const matchesOrigin = filterOrigin === 'todas' || errOrigin === filterOrigin;

    const normSearch = normalizeStr(searchTerm);
    const matchesSearch =
      searchTerm === '' ||
      normalizeStr(err.subtopico).includes(normSearch) ||
      normalizeStr(err.motivoErro).includes(normSearch) ||
      normalizeStr(err.regraCorreta).includes(normSearch) ||
      normDisc.includes(normSearch);

    return matchesDisc && matchesOrigin && matchesSearch;
  });

  const getDisciplineBadge = (disc: string) => {
    const norm = normalizeStr(disc);
    if (norm.includes('instrument')) return { bg: 'bg-[#E6F4EC] text-[#006837] border-[#008542]/25' };
    if (norm.includes('fluid') || norm.includes('mecan') || norm.includes('equip')) {
      return { bg: 'bg-amber-50 text-amber-900 border-amber-300' };
    }
    if (norm.includes('quim') || norm.includes('refino') || norm.includes('sms')) {
      return { bg: 'bg-orange-50 text-orange-900 border-orange-200' };
    }
    if (norm.includes('eletr')) return { bg: 'bg-sky-50 text-sky-900 border-sky-200' };
    if (norm.includes('portug')) return { bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    if (norm.includes('matemat')) return { bg: 'bg-indigo-50 text-indigo-900 border-indigo-200' };
    return { bg: 'bg-slate-100 text-slate-800 border-slate-200' };
  };

  const especStatus =
    mediaEspecificos >= 80
      ? { label: 'Alto Rendimento (Competitivo)', tone: 'text-emerald-300', icon: TrendingUp }
      : mediaEspecificos >= 65
      ? { label: 'Bom Nível (Refinar Erros)', tone: 'text-[#FDB913]', icon: CheckCircle2 }
      : { label: 'Abaixo da Meta de Aprovação', tone: 'text-rose-300', icon: ShieldAlert };
  const EspecIcon = especStatus.icon;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <Card padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-600 mb-2">
              <StatusBadge tone="orange">Ferramenta de Aprendizado Ativo</StatusBadge>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span>Correlações do Conteúdo Programático Mesclado</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              Caderno de Erros Digital &amp; Simulador de Rendimento
            </h2>
            <p className="text-slate-600 mt-1 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Registre cada questão errada com <strong>causa raiz</strong>,{' '}
              <strong>regra correta</strong> e <strong>origem (Transpetro / Petrobras)</strong> nas
              4 macro áreas técnicas e nos conhecimentos gerais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              id="btn-error-backup-json"
              variant="primary"
              size="sm"
              leftIcon={<Database className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => exportFullBackup()}
              title="Baixar backup único completo (Petrobras_Enfase_Operacao_Jr.json)"
            >
              Backup Completo (.JSON)
            </Button>
            <Button
              id="btn-export-csv-errors"
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={handleExportCSV}
            >
              Exportar CSV
            </Button>
            <Button
              id="btn-open-add-error"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => {
                setFormError(null);
                setShowAddModal(true);
              }}
            >
              Novo Registro de Erro
            </Button>
          </div>
        </div>

        {saveToast && (
          <div className="mt-4">
            <ToastBanner tone="success" message={saveToast} />
          </div>
        )}
      </Card>

      {/* Grid de Cadernos de Erros por Área */}
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-display font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#008542] shrink-0" aria-hidden="true" />
            <span>Cadernos por Área &amp; Correlações Cesgranrio</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Clique em um tópico para anotar diretamente no caderno
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ORDERED_CORRELACOES_DISCIPLINAS.map((disc) => {
            const areaErrors = errors.filter((e) =>
              normalizeStr(e.disciplina).includes(normalizeStr(disc.filtroKey))
            );
            const countErros = areaErrors.length;
            const countRevisados = areaErrors.filter((e) => e.revisado).length;
            const isAtivo = normalizeStr(filterDisc).includes(normalizeStr(disc.filtroKey));
            const discSubject = classifyMacroArea(disc.id);
            const displayNomeCurto = customAreas[disc.id]?.nomeCurto || disc.nomeCurto;
            const displayEscopo = customAreas[disc.id]?.escopoInfo ?? disc.escopoInfo;

            return (
              <Card
                key={disc.id}
                variant="interactive"
                padding="md"
                className={`flex flex-col justify-between ${
                  isAtivo ? 'ring-2 ring-[#008542] border-[#008542]/40' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <OriginBadge origem={disc.origem} compact />
                      <SubjectBaseBadge category={discSubject} compact />
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${disc.colorTheme.badgeBg} ${disc.colorTheme.badgeText}`}
                      >
                        {disc.categoria.includes('Específicos') ? 'Específico' : 'Geral'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-mono tabular-nums font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {countErros} {countErros === 1 ? 'erro' : 'erros'} ({countRevisados} rev.)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingAreaCard({
                            id: disc.id,
                            nomeCurto: displayNomeCurto,
                            escopoInfo: displayEscopo,
                          })
                        }
                        title={`Editar card ${displayNomeCurto}`}
                        aria-label={`Editar card ${displayNomeCurto}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#008542] hover:bg-[#E6F4EC] transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAreaErrorsOrReset(disc)}
                        title={
                          countErros > 0
                            ? `Excluir erros de ${displayNomeCurto}`
                            : `Limpar personalização de ${displayNomeCurto}`
                        }
                        aria-label={`Excluir registros de ${displayNomeCurto}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-display font-extrabold text-slate-900 mb-1">
                    {displayNomeCurto}
                  </h4>
                  <p className="text-xs text-slate-500 mb-3 font-medium">{displayEscopo}</p>

                  {areaErrors.length > 0 ? (
                    <div className="mb-4 space-y-1.5">
                      {areaErrors.slice(0, 3).map((err) => (
                        <div
                          key={err.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px]"
                        >
                          <span className="font-medium text-slate-800 truncate">
                            {err.subtopico}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingError(err)}
                              title={`Editar erro: ${err.subtopico}`}
                              aria-label={`Editar erro ${err.subtopico}`}
                              className="p-1 rounded text-slate-500 hover:text-[#008542] hover:bg-white transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteError(err.id)}
                              title={`Excluir erro: ${err.subtopico}`}
                              aria-label={`Excluir erro ${err.subtopico}`}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-4 py-2 px-3 rounded-lg bg-slate-50/70 border border-dashed border-slate-200 text-[11px] text-slate-400">
                      Nenhum erro registrado nesta área.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant={isAtivo ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setFilterDisc(isAtivo ? 'todas' : disc.filtroKey)}
                  >
                    {isAtivo ? 'Filtrando' : 'Ver Erros'}
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                    onClick={() => handleOpenAddForDiscipline(disc.nome)}
                    title={`Adicionar erro no caderno de ${displayNomeCurto}`}
                  >
                    Anotar Erro
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Simulador de Aproveitamento Técnico (%) */}
      <Card variant="dark" padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#FDB913] text-xs font-bold uppercase font-mono">
              <Calculator className="w-4 h-4 shrink-0" aria-hidden="true" /> Simulador de
              Desempenho por Área Técnica (%)
            </div>
            <h3 className="text-base sm:text-lg font-display font-bold text-white tracking-tight">
              Projeção Ponderada pelos Pesos do Conteúdo Mesclado
            </h3>
            <p className="text-xs text-slate-200 max-w-xl leading-relaxed">
              Ajuste seu percentual de acertos em simulados por macro área técnica (pesos reais
              Pareto nos 42 tópicos: Química/Processos/SMS 39%, Fluidos/Mec./Termo/Equip. 35%,
              Instrumentação 17%, Eletricidade/Radiações 9%).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-[#0A281A] p-3.5 rounded-xl border border-[#184831]">
              <div className="text-[10px] font-mono uppercase text-slate-300">
                Média Específicos
              </div>
              <div className="text-xl font-bold text-[#FDB913] font-mono tabular-nums">
                {mediaEspecificos}%
              </div>
              <div className={`text-[11px] font-semibold flex items-center gap-1 mt-1 ${especStatus.tone}`}>
                <EspecIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{especStatus.label}</span>
              </div>
            </div>

            <div className="bg-[#0A281A] p-3.5 rounded-xl border border-[#184831]">
              <div className="text-[10px] font-mono uppercase text-slate-300">
                Conhecimentos Gerais
              </div>
              <div
                className={`text-xl font-bold font-mono tabular-nums ${
                  isGeraisCritico ? 'text-rose-400' : 'text-orange-400'
                }`}
              >
                {simGerais}%
              </div>
              <div
                className={`text-[11px] font-bold flex items-center gap-1 mt-1 ${
                  isGeraisCritico ? 'text-rose-300' : 'text-emerald-300'
                }`}
              >
                {isGeraisCritico ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Abaixo de 50%</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Faixa Segura</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-[#008542]/25 border border-[#FDB913]/40 p-3.5 rounded-xl">
              <div className="text-[10px] font-mono uppercase text-[#FDB913]">Índice Global</div>
              <div className="text-xl font-bold text-white font-mono tabular-nums">
                {mediaGlobalEstimada}%
              </div>
              <div className="text-[11px] text-slate-200 mt-1">Aproveitamento combinado</div>
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div className="mt-5 pt-4 border-t border-[#15412B] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <div className="flex justify-between font-medium text-slate-200 mb-1.5">
              <label htmlFor="sim-range-inst">Instrumentação (17%):</label>
              <span className="font-bold text-[#FDB913] font-mono tabular-nums">{simInst}%</span>
            </div>
            <input
              id="sim-range-inst"
              type="range"
              min="0"
              max="100"
              value={simInst}
              onChange={(e) => setSimInst(Number(e.target.value))}
              className="w-full accent-[#008542] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-medium text-slate-200 mb-1.5">
              <label htmlFor="sim-range-mec">Fluidos/Mec./Equip. (35%):</label>
              <span className="font-bold text-[#FDB913] font-mono tabular-nums">{simMec}%</span>
            </div>
            <input
              id="sim-range-mec"
              type="range"
              min="0"
              max="100"
              value={simMec}
              onChange={(e) => setSimMec(Number(e.target.value))}
              className="w-full accent-[#008542] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-medium text-slate-200 mb-1.5">
              <label htmlFor="sim-range-qui">Química/Refino/SMS (39%):</label>
              <span className="font-bold text-[#FDB913] font-mono tabular-nums">{simQui}%</span>
            </div>
            <input
              id="sim-range-qui"
              type="range"
              min="0"
              max="100"
              value={simQui}
              onChange={(e) => setSimQui(Number(e.target.value))}
              className="w-full accent-[#008542] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-medium text-slate-200 mb-1.5">
              <label htmlFor="sim-range-ele">Eletricidade/Ondas (9%):</label>
              <span className="font-bold text-[#FDB913] font-mono tabular-nums">{simEle}%</span>
            </div>
            <input
              id="sim-range-ele"
              type="range"
              min="0"
              max="100"
              value={simEle}
              onChange={(e) => setSimEle(Number(e.target.value))}
              className="w-full accent-[#008542] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-medium text-slate-200 mb-1.5">
              <label htmlFor="sim-range-gerais">Português / Mat.:</label>
              <span
                className={`font-bold font-mono tabular-nums ${
                  isGeraisCritico ? 'text-rose-400' : 'text-orange-400'
                }`}
              >
                {simGerais}%
              </span>
            </div>
            <input
              id="sim-range-gerais"
              type="range"
              min="0"
              max="100"
              value={simGerais}
              onChange={(e) => setSimGerais(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Erros List Toolbar & Entries */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" aria-hidden="true" /> Caderno:
              </span>
              {[
                { key: 'todas', label: 'Todos' },
                { key: 'Química', label: 'Química & SMS' },
                { key: 'Fluidos', label: 'Fluidos & Equip.' },
                { key: 'Instrumentação', label: 'Instrumentação' },
                { key: 'Eletricidade', label: 'Eletricidade' },
                { key: 'Português', label: 'Português' },
                { key: 'Matemática', label: 'Matemática' },
              ].map((disc) => {
                const isSelected = filterDisc === disc.key;
                const badgeCount =
                  disc.key === 'todas'
                    ? errors.length
                    : errors.filter((e) =>
                        normalizeStr(e.disciplina).includes(normalizeStr(disc.key))
                      ).length;

                return (
                  <button
                    key={disc.key}
                    type="button"
                    id={`btn-filter-disc-${normalizeStr(disc.key)}`}
                    aria-pressed={isSelected}
                    onClick={() => setFilterDisc(disc.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#071F14] text-[#FDB913] border-b-2 border-orange-500'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/70'
                    }`}
                  >
                    <span>{disc.label}</span>
                    <span
                      className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-[#008542] text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1">Origem:</span>
              {(
                [
                  { id: 'todas', label: 'Todas' },
                  { id: 'ambos', label: 'Transpetro + Petrobras' },
                  { id: 'transpetro', label: 'Transpetro' },
                  { id: 'petrobras', label: 'Petrobras' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={filterOrigin === opt.id}
                  onClick={() => setFilterOrigin(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterOrigin === opt.id
                      ? 'bg-[#008542] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full lg:w-64">
            <label htmlFor="input-error-search" className="sr-only">
              Buscar nos cadernos de erros
            </label>
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="input-error-search"
              type="text"
              placeholder="Buscar em todos os cadernos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542] font-medium"
            />
          </div>
        </div>

        {/* Errors List */}
        {filteredErrors.length > 0 ? (
          <div className="space-y-3">
            {filteredErrors.map((err) => {
              const discTheme = getDisciplineBadge(err.disciplina);
              const origem = err.origem || 'ambos';
              const entrySubject = classifyErrorEntry(err.disciplina, err.subtopico);

              return (
                <div
                  key={err.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    err.revisado
                      ? 'bg-slate-50/70 border-slate-200'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <OriginBadge origem={origem} compact />
                      <SubjectBaseBadge category={entrySubject} compact />
                      <span className="text-[11px] font-mono tabular-nums font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {err.data}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border ${discTheme.bg}`}
                      >
                        {err.disciplina}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {err.subtopico}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit className="w-3.5 h-3.5" aria-hidden="true" />}
                        onClick={() => setEditingError(err)}
                      >
                        Editar
                      </Button>
                      <button
                        type="button"
                        aria-pressed={err.revisado}
                        onClick={() => handleToggleRevisado(err.id)}
                        className={`text-xs px-2.5 h-8 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                          err.revisado
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{err.revisado ? 'Revisado' : 'Marcar Revisado'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteError(err.id)}
                        aria-label={`Excluir registro ${err.subtopico}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Registro"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {err.enunciadoResumido && (
                      <div className="bg-slate-50 p-3 rounded-xl text-slate-700 border border-slate-200/70 leading-relaxed">
                        <div className="font-bold text-slate-900 mb-1">
                          Questão / Enunciado:
                        </div>
                        <p>{err.enunciadoResumido}</p>
                      </div>
                    )}
                    <div className="bg-rose-50/70 p-3 rounded-xl text-rose-950 border border-rose-200/70 leading-relaxed">
                      <div className="font-bold text-rose-900 mb-1">
                        Por que errei? (Causa Raiz):
                      </div>
                      <p>{err.motivoErro}</p>
                    </div>
                    <div
                      className={`bg-emerald-50/70 p-3 rounded-xl text-emerald-950 border border-emerald-200/70 leading-relaxed ${
                        err.enunciadoResumido ? '' : 'md:col-span-2'
                      }`}
                    >
                      <div className="font-bold text-emerald-900 mb-1">
                        Regra Correta / Gabarito Definitivo:
                      </div>
                      <p>{err.regraCorreta}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Nenhum erro registrado neste filtro"
            description='Clique em "Novo Registro de Erro" após resolver questões ou limpe os filtros.'
            actionLabel="Novo Registro de Erro"
            onAction={() => {
              setFormError(null);
              setShowAddModal(true);
            }}
          />
        )}
      </Card>

      {/* Add Error Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormError(null);
        }}
        title="Novo Registro no Caderno de Erros"
        subtitle="Documente a causa raiz, origem no edital e regra definitiva"
        icon={<Edit className="w-5 h-5" aria-hidden="true" />}
        maxWidth="xl"
      >
        <div className="p-5 sm:p-6">
          {formError && (
            <div className="mb-4">
              <ToastBanner tone="error" message={formError} />
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddError(e, false);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="add-err-disc" className="block font-bold text-slate-700 mb-1">
                  Caderno / Área:
                </label>
                <select
                  id="add-err-disc"
                  value={formData.disciplina}
                  onChange={(e) => setFormData({ ...formData, disciplina: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542] font-medium"
                >
                  {ORDERED_CORRELACOES_DISCIPLINAS.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="add-err-origem" className="block font-bold text-slate-700 mb-1">
                  Origem no Edital:
                </label>
                <select
                  id="add-err-origem"
                  value={formData.origem}
                  onChange={(e) =>
                    setFormData({ ...formData, origem: e.target.value as OrigemEdital })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542] font-medium"
                >
                  <option value="ambos">Transpetro + Petrobras</option>
                  <option value="transpetro">Exclusivo Transpetro</option>
                  <option value="petrobras">Exclusivo Petrobras</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="add-err-subtopico" className="block font-bold text-slate-700 mb-1">
                Subtópico Exato / Correlação:
              </label>
              <input
                id="add-err-subtopico"
                type="text"
                required
                placeholder="Ex: Transmissores 4–20 mA — Cálculo de Span"
                value={formData.subtopico}
                onChange={(e) => {
                  setFormData({ ...formData, subtopico: e.target.value });
                  if (formError) setFormError(null);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
              />
            </div>

            <div>
              <label htmlFor="add-err-enunciado" className="block font-bold text-slate-700 mb-1">
                Resumo do Enunciado (opcional):
              </label>
              <input
                id="add-err-enunciado"
                type="text"
                placeholder="Ex: Questão sobre cavitação em bomba centrífuga ou ciclo de Carnot..."
                value={formData.enunciadoResumido}
                onChange={(e) => setFormData({ ...formData, enunciadoResumido: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
              />
            </div>

            <div>
              <label htmlFor="add-err-motivo" className="block font-bold text-rose-800 mb-1">
                Por que errei? (Causa raiz do erro):
              </label>
              <input
                id="add-err-motivo"
                type="text"
                placeholder="Ex: Usei temperatura em °C em vez de Kelvin na equação dos gases..."
                value={formData.motivoErro}
                onChange={(e) => setFormData({ ...formData, motivoErro: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
              />
            </div>

            <div>
              <label htmlFor="add-err-regra" className="block font-bold text-emerald-800 mb-1">
                Regra Correta / Macete para não errar na prova:
              </label>
              <textarea
                id="add-err-regra"
                required
                rows={3}
                placeholder="Ex: Em Clapeyron (PV = nRT) e rendimento de Carnot, usar sempre T em Kelvin (K = °C + 273)..."
                value={formData.regraCorreta}
                onChange={(e) => {
                  setFormData({ ...formData, regraCorreta: e.target.value });
                  if (formError) setFormError(null);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                leftIcon={<Trash2 className="w-4 h-4 text-rose-600" aria-hidden="true" />}
                onClick={() => {
                  setFormData({
                    ...formData,
                    subtopico: '',
                    enunciadoResumido: '',
                    motivoErro: '',
                    regraCorreta: '',
                  });
                  setFormError(null);
                }}
                title="Limpar os campos preenchidos"
              >
                Limpar Campos
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Download className="w-4 h-4 text-sky-600" aria-hidden="true" />}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddError(e, true);
                  }}
                  title="Salva o registro e baixa o arquivo completo Petrobras_Enfase_Operacao_Jr.json"
                >
                  Salvar e Baixar Backup
                </Button>
                <Button
                  id="btn-confirm-save-error"
                  variant="primary"
                  size="md"
                  leftIcon={<Save className="w-4 h-4" aria-hidden="true" />}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddError(e, false);
                  }}
                >
                  Salvar Registro
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Error Modal */}
      <Modal
        isOpen={Boolean(editingError)}
        onClose={() => setEditingError(null)}
        title="Editar Detalhes & Anotações do Erro"
        subtitle={editingError?.subtopico}
        icon={<Edit className="w-5 h-5" aria-hidden="true" />}
        maxWidth="xl"
      >
        {editingError && (
          <div className="p-5 sm:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSaveEdit(e, false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="edit-err-disc" className="block font-bold text-slate-700 mb-1">
                    Caderno / Área:
                  </label>
                  <select
                    id="edit-err-disc"
                    value={editingError.disciplina}
                    onChange={(e) =>
                      setEditingError({ ...editingError, disciplina: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542] font-medium"
                  >
                    {CORRELACOES_DISCIPLINAS.map((c) => (
                      <option key={c.id} value={c.nome}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-err-origem" className="block font-bold text-slate-700 mb-1">
                    Origem no Edital:
                  </label>
                  <select
                    id="edit-err-origem"
                    value={editingError.origem || 'ambos'}
                    onChange={(e) =>
                      setEditingError({
                        ...editingError,
                        origem: e.target.value as OrigemEdital,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542] font-medium"
                  >
                    <option value="ambos">Transpetro + Petrobras</option>
                    <option value="transpetro">Exclusivo Transpetro</option>
                    <option value="petrobras">Exclusivo Petrobras</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-err-subtopico" className="block font-bold text-slate-700 mb-1">
                  Subtópico Exato / Correlação:
                </label>
                <input
                  id="edit-err-subtopico"
                  type="text"
                  required
                  value={editingError.subtopico}
                  onChange={(e) => setEditingError({ ...editingError, subtopico: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                />
              </div>

              <div>
                <label htmlFor="edit-err-enunciado" className="block font-bold text-slate-700 mb-1">
                  Resumo do Enunciado:
                </label>
                <textarea
                  id="edit-err-enunciado"
                  rows={2}
                  value={editingError.enunciadoResumido}
                  onChange={(e) =>
                    setEditingError({ ...editingError, enunciadoResumido: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                />
              </div>

              <div>
                <label htmlFor="edit-err-motivo" className="block font-bold text-rose-800 mb-1">
                  Por que errei? (Diagnóstico):
                </label>
                <textarea
                  id="edit-err-motivo"
                  rows={2}
                  required
                  value={editingError.motivoErro}
                  onChange={(e) =>
                    setEditingError({ ...editingError, motivoErro: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                />
              </div>

              <div>
                <label htmlFor="edit-err-regra" className="block font-bold text-emerald-800 mb-1">
                  Regra Correta / Macete para Prova:
                </label>
                <textarea
                  id="edit-err-regra"
                  required
                  rows={3}
                  value={editingError.regraCorreta}
                  onChange={(e) =>
                    setEditingError({ ...editingError, regraCorreta: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="md" onClick={() => setEditingError(null)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    leftIcon={<Trash2 className="w-4 h-4 text-rose-600" aria-hidden="true" />}
                    onClick={() => {
                      handleDeleteError(editingError.id);
                      setEditingError(null);
                    }}
                    className="text-rose-700 border-rose-200 hover:bg-rose-50"
                    title="Excluir este registro de erro"
                  >
                    Excluir
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    leftIcon={<Download className="w-4 h-4 text-sky-600" aria-hidden="true" />}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSaveEdit(e, true);
                    }}
                    title="Salva as alterações e baixa o arquivo completo Petrobras_Enfase_Operacao_Jr.json"
                  >
                    Salvar e Baixar Backup
                  </Button>
                  <Button
                    id="btn-confirm-save-edit"
                    variant="primary"
                    size="md"
                    leftIcon={<Save className="w-4 h-4" aria-hidden="true" />}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSaveEdit(e, false);
                    }}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Edit Area Card Modal */}
      <Modal
        isOpen={Boolean(editingAreaCard)}
        onClose={() => setEditingAreaCard(null)}
        title="Editar Card da Área"
        subtitle="Personalize o título e a descrição exibidos no card"
        icon={<Edit className="w-5 h-5" aria-hidden="true" />}
        maxWidth="md"
      >
        {editingAreaCard && (
          <form onSubmit={handleSaveAreaCardEdit} className="p-5 sm:p-6 space-y-4 text-xs">
            <div>
              <label htmlFor="edit-area-nome" className="block font-bold text-slate-700 mb-1">
                Nome do Card:
              </label>
              <input
                id="edit-area-nome"
                type="text"
                required
                value={editingAreaCard.nomeCurto}
                onChange={(e) =>
                  setEditingAreaCard({ ...editingAreaCard, nomeCurto: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
              />
            </div>

            <div>
              <label htmlFor="edit-area-escopo" className="block font-bold text-slate-700 mb-1">
                Descrição / Escopo:
              </label>
              <input
                id="edit-area-escopo"
                type="text"
                value={editingAreaCard.escopoInfo}
                onChange={(e) =>
                  setEditingAreaCard({ ...editingAreaCard, escopoInfo: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />}
                onClick={() => {
                  const next = { ...customAreas };
                  delete next[editingAreaCard.id];
                  persistCustomAreas(next);
                  setEditingAreaCard(null);
                  setSaveToast('Card restaurado para o texto padrão.');
                  setTimeout(() => setSaveToast(null), 3000);
                }}
              >
                Restaurar Padrão
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingAreaCard(null)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<Save className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Salvar Card
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
